#!/usr/bin/env bash
# One-time local setup for AEROPIX on Linux / macOS (no AWS account required).
#
#   chmod +x scripts/setup_local.sh
#   ./scripts/setup_local.sh
#
# Options:
#   --skip-seed       do not create the demo account / demo artwork
#   --skip-frontend   do not run npm install
#   --recreate        delete and recreate .venv (venv only)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
VENV="$ROOT/.venv"
PYTHON="${PYTHON:-python3}"

SKIP_SEED=0
SKIP_FRONTEND=0
RECREATE=0
for arg in "$@"; do
  case "$arg" in
    --skip-seed) SKIP_SEED=1 ;;
    --skip-frontend) SKIP_FRONTEND=1 ;;
    --recreate) RECREATE=1 ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

echo
echo "AEROPIX local setup"
echo "Workspace: $ROOT"
echo

if ! command -v "$PYTHON" >/dev/null 2>&1; then
  echo "Python 3 was not found. Install Python 3.11+ and try again." >&2
  exit 1
fi

"$PYTHON" - <<'PY'
import sys
if sys.version_info < (3, 11):
    raise SystemExit("AEROPIX requires Python 3.11 or newer.")
print(f"Python {sys.version.split()[0]} found.")
PY

if [[ "$RECREATE" == "1" && -d "$VENV" ]]; then
  echo "Removing existing virtual environment (--recreate)..."
  rm -rf "$VENV"
fi

if [[ ! -x "$VENV/bin/python" ]]; then
  echo "Creating virtual environment at .venv ..."
  "$PYTHON" -m venv "$VENV"
fi

echo "Installing backend dependencies (this can take a minute) ..."
"$VENV/bin/python" -m pip install --upgrade pip --quiet
"$VENV/bin/python" -m pip install -r "$BACKEND/requirements-dev.txt" --quiet

if [[ ! -f "$ROOT/.env" ]]; then
  echo "Creating .env at the project root with a random SECRET_KEY ..."
  SECRET="$("$VENV/bin/python" -c 'import secrets; print(secrets.token_urlsafe(48))')"
  sed "s|^SECRET_KEY=.*|SECRET_KEY=$SECRET|" "$BACKEND/.env.example" > "$ROOT/.env"
  chmod 600 "$ROOT/.env"
else
  echo "Keeping existing .env (delete it to regenerate)."
fi

if [[ "$SKIP_SEED" == "0" ]]; then
  echo "Seeding the demo account and original demo artwork ..."
  (cd "$BACKEND" && "$VENV/bin/python" -m app.seed)
fi

if [[ "$SKIP_FRONTEND" == "0" ]]; then
  if ! command -v npm >/dev/null 2>&1; then
    echo "npm was not found. Install Node.js 20+ then run 'npm install' inside frontend/." >&2
  else
    echo "Installing frontend dependencies ..."
    (cd "$FRONTEND" && { [[ -f package-lock.json ]] && npm ci || npm install; })
  fi
fi

cat <<'EOF'

Setup complete.

Start the backend (terminal 1):
  cd backend
  ../.venv/bin/python -m uvicorn app.main:app --reload --port 8000

Start the frontend (terminal 2):
  cd frontend
  npm run dev

Open http://localhost:5173
Demo login: demo@aeropix.app / AeropixDemo123!

Run the test suite:
  cd backend
  ../.venv/bin/python -m pytest -q

EOF
