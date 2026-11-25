#!/usr/bin/env bash
# =============================================================================
# AEROPIX — deploy the application to an Ubuntu EC2 instance.
#
# RUN THIS ON THE EC2 INSTANCE, from a clone of this repository:
#
#   sudo bash scripts/deploy_ec2.sh --domain gallery.example.com
#
# What it does (and does NOT do):
#   * installs Ubuntu packages (Python, Nginx, rsync, curl)
#   * creates a system user "aeropix" and /opt/aeropix
#   * copies the backend and the pre-built frontend/dist
#   * creates /opt/aeropix/.env on first run (random SECRET_KEY)
#   * installs the systemd service and Nginx site, starts both
#   * optionally seeds the demo account (uploads a few MB to S3)
#   * DOES NOT create buckets, IAM roles, security groups or DNS records
#   * DOES NOT request a TLS certificate automatically
#
# Prerequisites:
#   * Ubuntu 22.04 or 24.04, instance profile with S3 access attached
#   * an existing private S3 bucket with Block Public Access enabled
#   * frontend built locally: cd frontend && npm run build
#   * this repository cloned on the instance
#
# Options:
#   --domain NAME              Nginx server_name + HTTPS origin hint
#   --skip-apt                 skip apt-get install
#   --allow-local-storage      permit STORAGE_BACKEND=local (not recommended)
#   --seed                     seed demo account after deployment (writes to S3)
#   --verify-s3                run scripts/check_s3.py after deployment
#   -h, --help                 show this help
# =============================================================================
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="/opt/aeropix"
ENV_FILE="$APP_DIR/.env"
SERVICE_FILE="/etc/systemd/system/aeropix.service"
NGINX_SITE="/etc/nginx/sites-available/aeropix"

DOMAIN=""
SKIP_APT=0
ALLOW_LOCAL=0
SEED=0
VERIFY_S3=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMAIN="${2:-}"; shift 2 ;;
    --skip-apt) SKIP_APT=1; shift ;;
    --allow-local-storage) ALLOW_LOCAL=1; shift ;;
    --seed) SEED=1; shift ;;
    --verify-s3) VERIFY_S3=1; shift ;;
    -h|--help) sed -n '2,30p' "$0"; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ $EUID -ne 0 ]]; then
  echo "Run this script with sudo: sudo bash scripts/deploy_ec2.sh" >&2
  exit 1
fi

if [[ -n "$DOMAIN" && ! "$DOMAIN" =~ ^[A-Za-z0-9.-]+$ ]]; then
  echo "Invalid --domain value: $DOMAIN" >&2
  exit 1
fi

echo
echo "AEROPIX EC2 deployment"
echo "Repository: $REPO"
echo

# --- Preflight ---------------------------------------------------------------
if [[ ! -f "$REPO/frontend/dist/index.html" ]]; then
  echo "frontend/dist/index.html is missing." >&2
  echo "Build it first on your computer:  cd frontend && npm run build" >&2
  exit 1
fi
if [[ ! -f "$REPO/backend/requirements.txt" ]]; then
  echo "backend/requirements.txt not found — run this script from the repository." >&2
  exit 1
fi
if [[ ! -f /etc/os-release ]] || ! grep -qi '^ID=ubuntu' /etc/os-release; then
  echo "Warning: this script targets Ubuntu. Continuing on an unsupported distribution in 5s..."
  sleep 5
fi

# --- Determine bucket / region ----------------------------------------------
BUCKET="${AWS_BUCKET_NAME:-}"
REGION="${AWS_REGION:-ap-south-1}"

if [[ -f "$ENV_FILE" ]]; then
  existing_bucket="$(grep -E '^AWS_BUCKET_NAME=' "$ENV_FILE" | head -n1 | cut -d= -f2- || true)"
  existing_region="$(grep -E '^AWS_REGION=' "$ENV_FILE" | head -n1 | cut -d= -f2- || true)"
  [[ -z "$BUCKET" && -n "$existing_bucket" ]] && BUCKET="$existing_bucket"
  [[ -n "$existing_region" ]] && REGION="$existing_region"
fi

if [[ -z "$BUCKET" && -t 0 ]]; then
  read -r -p "Private S3 bucket name (must already exist): " BUCKET
fi
if [[ -z "$BUCKET" ]]; then
  echo "No S3 bucket configured." >&2
  echo "Create the bucket first, then re-run with:" >&2
  echo "  sudo AWS_BUCKET_NAME=your-bucket bash scripts/deploy_ec2.sh" >&2
  exit 1
fi
if [[ ! "$BUCKET" =~ ^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$ ]]; then
  echo "Warning: '$BUCKET' does not look like a valid S3 bucket name." >&2
fi

# --- Packages ----------------------------------------------------------------
if [[ "$SKIP_APT" == "0" ]]; then
  echo "Installing system packages ..."
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq python3 python3-venv python3-pip nginx rsync curl ca-certificates
fi

# --- System user and directories --------------------------------------------
if ! id aeropix >/dev/null 2>&1; then
  echo "Creating system user 'aeropix' ..."
  useradd --system --home-dir "$APP_DIR" --shell /usr/sbin/nologin aeropix
fi

mkdir -p "$APP_DIR/backend" "$APP_DIR/frontend/dist" "$APP_DIR/backend/data"

# --- Environment file --------------------------------------------------------
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Creating $ENV_FILE ..."
  SECRET="$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')"
  ORIGINS=""
  if [[ -n "$DOMAIN" ]]; then
    ORIGINS="https://$DOMAIN,http://$DOMAIN"
  fi
  cat > "$ENV_FILE" <<EOF
# AEROPIX production configuration — created by scripts/deploy_ec2.sh
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=$SECRET
LOG_LEVEL=INFO

DATABASE_URL=sqlite:////opt/aeropix/backend/data/aeropix.db

STORAGE_BACKEND=s3
AWS_REGION=$REGION
AWS_BUCKET_NAME=$BUCKET
S3_PRESIGN_EXPIRE_SECONDS=900
S3_USE_SSE=true
# No AWS_ACCESS_KEY_ID here: credentials come from the EC2 instance profile.

MAX_UPLOAD_MB=15
STORAGE_QUOTA_MB=5120
ALLOWED_HOSTS=*
ALLOWED_ORIGINS=$ORIGINS

FRONTEND_DIST=/opt/aeropix/frontend/dist
SEED_DEMO_DATA=true
EOF
  chmod 600 "$ENV_FILE"
  chown aeropix:www-data "$ENV_FILE"
else
  echo "Keeping existing $ENV_FILE (edit it manually to change settings)."
  if grep -qE '^STORAGE_BACKEND=local' "$ENV_FILE" && [[ "$ALLOW_LOCAL" != "1" ]]; then
    echo "Refusing to deploy with STORAGE_BACKEND=local." >&2
    echo "Set STORAGE_BACKEND=s3 in $ENV_FILE, or pass --allow-local-storage." >&2
    exit 1
  fi
fi

# --- Copy application --------------------------------------------------------
echo "Copying backend ..."
rsync -a --delete \
  --exclude '.venv' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude '.pytest_cache' \
  --exclude 'data' \
  --exclude '.env' \
  --exclude 'demo_assets' \
  "$REPO/backend/" "$APP_DIR/backend/"

echo "Copying frontend build ..."
rsync -a --delete "$REPO/frontend/dist/" "$APP_DIR/frontend/dist/"

# --- Python environment ------------------------------------------------------
echo "Creating Python virtual environment ..."
if [[ ! -x "$APP_DIR/.venv/bin/python" ]]; then
  python3 -m venv "$APP_DIR/.venv"
fi
"$APP_DIR/.venv/bin/python" -m pip install --upgrade pip --quiet
"$APP_DIR/.venv/bin/pip" install -r "$APP_DIR/backend/requirements.txt" --quiet

# --- Permissions -------------------------------------------------------------
chown -R aeropix:www-data "$APP_DIR"
chmod 755 "$APP_DIR" "$APP_DIR/frontend" "$APP_DIR/frontend/dist"
chmod 750 "$APP_DIR/backend" "$APP_DIR/backend/data"
chmod 600 "$ENV_FILE"

# --- systemd -----------------------------------------------------------------
echo "Installing systemd service ..."
install -m 644 "$REPO/infrastructure/systemd/aeropix.service" "$SERVICE_FILE"
systemctl daemon-reload
systemctl enable aeropix >/dev/null
systemctl restart aeropix

# --- Nginx -------------------------------------------------------------------
echo "Installing Nginx site ..."
install -m 644 "$REPO/infrastructure/nginx/aeropix.conf" "$NGINX_SITE"
if [[ -n "$DOMAIN" ]]; then
  sed -i "s/server_name _;/server_name $DOMAIN;/" "$NGINX_SITE"
fi
ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/aeropix
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx >/dev/null
systemctl reload nginx

# --- Health check ------------------------------------------------------------
echo "Waiting for the API to become healthy ..."
HEALTHY=0
for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:8000/api/health >/dev/null 2>&1; then
    HEALTHY=1
    break
  fi
  sleep 1
done
if [[ "$HEALTHY" != "1" ]]; then
  echo "The API did not become healthy." >&2
  systemctl status aeropix --no-pager -l || true
  journalctl -u aeropix -n 60 --no-pager || true
  exit 1
fi
echo "API health check passed."

# --- Optional demo seed ------------------------------------------------------
if [[ "$SEED" == "1" ]]; then
  echo "Seeding demo account (uploads demo artwork to S3) ..."
  (cd "$APP_DIR/backend" && runuser -u aeropix -- "$APP_DIR/.venv/bin/python" -m app.seed)
fi

# --- Optional S3 verification ------------------------------------------------
if [[ "$VERIFY_S3" == "1" ]]; then
  echo "Verifying S3 bucket configuration and round-trip ..."
  (
    set -a
    # shellcheck disable=SC1090
    . "$ENV_FILE"
    set +a
    "$APP_DIR/.venv/bin/python" "$REPO/scripts/check_s3.py"
  )
fi

# --- Summary -----------------------------------------------------------------
PUBLIC_IP=""
TOKEN="$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 60" 2>/dev/null || true)"
if [[ -n "$TOKEN" ]]; then
  PUBLIC_IP="$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
    http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || true)"
fi

echo
echo "Deployment complete."
echo "  Local health : http://127.0.0.1:8000/api/health"
if [[ -n "$PUBLIC_IP" ]]; then
  echo "  Public URL   : http://$PUBLIC_IP/"
fi
echo "  API docs     : /api/docs"
echo
echo "Next steps:"
if [[ -z "$DOMAIN" ]]; then
  echo "  * Point a DNS A record at the Elastic IP and re-run with --domain your.domain"
fi
echo "  * Enable HTTPS (after DNS is live):"
echo "      sudo apt-get install -y certbot python3-certbot-nginx"
echo "      sudo certbot --nginx -d ${DOMAIN:-your.domain}"
echo "  * Verify from your computer:"
echo "      bash scripts/verify_deployment.sh https://${DOMAIN:-your.domain}"
echo
