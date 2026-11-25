#!/usr/bin/env bash
# =============================================================================
# AEROPIX — read-only deployment verification.
#
#   bash scripts/verify_deployment.sh https://gallery.example.com
#
# Optional authenticated checks (recommended after seeding the demo account):
#   DEMO_EMAIL=demo@aeropix.app DEMO_PASSWORD='AeropixDemo123!' \
#     bash scripts/verify_deployment.sh https://gallery.example.com
#
# This script only performs GET requests, one login, and one private-media
# check. It never uploads, deletes or changes anything.
# =============================================================================
set -uo pipefail

BASE="${1:-${BASE_URL:-http://localhost}}"
BASE="${BASE%/}"
PASS=0
FAIL=0

green() { printf '\033[32m%s\033[0m\n' "$*"; }
red()   { printf '\033[31m%s\033[0m\n' "$*"; }
dim()   { printf '\033[2m%s\033[0m\n' "$*"; }

ok()   { PASS=$((PASS + 1)); green "PASS  $*"; }
bad()  { FAIL=$((FAIL + 1)); red   "FAIL  $*"; }
info() { dim   "      $*"; }

http_code() {
  curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "$1" 2>/dev/null || echo "000"
}

json_field() {
  # json_field '<json>' key
  printf '%s' "$1" | python3 -c 'import json,sys; d=json.load(sys.stdin); v=d.get(sys.argv[1],""); print("" if v is None else v)' "$2" 2>/dev/null || true
}

if ! command -v curl >/dev/null 2>&1 || ! command -v python3 >/dev/null 2>&1; then
  echo "curl and python3 are required." >&2
  exit 1
fi

echo
echo "AEROPIX deployment verification"
echo "Target: $BASE"
echo

# --- 1. API health -----------------------------------------------------------
health="$(curl -fsS --max-time 20 "$BASE/api/health" 2>/dev/null || true)"
if [[ -n "$health" ]] && [[ "$(json_field "$health" status)" == "ok" ]]; then
  ok "GET /api/health — status ok"
  info "app=$(json_field "$health" app) version=$(json_field "$health" version) storage=$(json_field "$health" storage_backend) database=$(json_field "$health" database)"
else
  bad "GET /api/health — expected JSON status 'ok'"
  [[ -n "$health" ]] && info "$health"
fi

# --- 2. API root + docs ------------------------------------------------------
api_root="$(curl -fsS --max-time 20 "$BASE/api" 2>/dev/null || true)"
if [[ "$(json_field "$api_root" name)" == "AEROPIX" ]]; then
  ok "GET /api — API metadata returned"
else
  bad "GET /api — unexpected response"
fi

code="$(http_code "$BASE/api/docs")"
[[ "$code" == "200" ]] && ok "GET /api/docs — $code" || bad "GET /api/docs — expected 200, got $code"

# --- 3. SPA routes -----------------------------------------------------------
landing="$(curl -fsS --max-time 20 "$BASE/" 2>/dev/null || true)"
if [[ "$landing" == *"AEROPIX"* ]]; then
  ok "GET / — React application served"
else
  bad "GET / — AEROPIX markup not found"
fi

for route in /login /register /app /app/gallery /app/albums; do
  code="$(http_code "$BASE$route")"
  [[ "$code" == "200" ]] && ok "GET $route — $code (SPA fallback)" || bad "GET $route — expected 200, got $code"
done

# --- 4. Unauthenticated API access is rejected -------------------------------
code="$(http_code "$BASE/api/images")"
[[ "$code" == "401" ]] && ok "GET /api/images without token — 401" || bad "GET /api/images without token — expected 401, got $code"

# --- 5. Security headers -----------------------------------------------------
headers="$(curl -sS -D - -o /dev/null --max-time 20 "$BASE/" 2>/dev/null | tr -d '\r')"
if grep -qi '^X-Content-Type-Options: *nosniff' <<<"$headers"; then
  ok "X-Content-Type-Options: nosniff"
else
  bad "X-Content-Type-Options header missing"
fi
if grep -qi '^X-Frame-Options: *DENY' <<<"$headers"; then
  ok "X-Frame-Options: DENY"
else
  bad "X-Frame-Options header missing"
fi
if grep -qi '^Referrer-Policy: *strict-origin-when-cross-origin' <<<"$headers"; then
  ok "Referrer-Policy: strict-origin-when-cross-origin"
else
  bad "Referrer-Policy header missing"
fi
if grep -qi '^Content-Security-Policy:' <<<"$headers"; then
  ok "Content-Security-Policy present"
else
  info "Content-Security-Policy not present on / (check Nginx config)"
fi

api_headers="$(curl -sS -D - -o /dev/null --max-time 20 "$BASE/api/health" 2>/dev/null | tr -d '\r')"
if grep -qi '^Cache-Control: *no-store' <<<"$api_headers"; then
  ok "API responses use Cache-Control: no-store"
else
  bad "API Cache-Control: no-store missing"
fi

# --- 6. Optional authenticated checks ---------------------------------------
if [[ -n "${DEMO_EMAIL:-}" && -n "${DEMO_PASSWORD:-}" ]]; then
  payload="$(python3 -c 'import json,os; print(json.dumps({"email": os.environ["DEMO_EMAIL"], "password": os.environ["DEMO_PASSWORD"]}))')"
  login="$(curl -sS --max-time 20 -X POST "$BASE/api/auth/login" \
    -H 'Content-Type: application/json' -d "$payload" 2>/dev/null || true)"
  token="$(json_field "$login" access_token)"
  if [[ -n "$token" ]]; then
    ok "POST /api/auth/login — demo account authenticated"

    status="$(curl -fsS --max-time 20 -H "Authorization: Bearer $token" "$BASE/api/storage/status" 2>/dev/null || true)"
    backend="$(json_field "$status" backend)"
    if [[ -n "$backend" ]]; then
      ok "GET /api/storage/status — backend=$backend"
      info "reachable=$(json_field "$status" reachable) bucket=$(json_field "$status" bucket) encryption=$(json_field "$status" encryption)"
    else
      bad "GET /api/storage/status — no response"
    fi

    images="$(curl -fsS --max-time 20 -H "Authorization: Bearer $token" "$BASE/api/images?limit=1" 2>/dev/null || true)"
    image_url="$(printf '%s' "$images" | python3 -c '
import json, sys
try:
    data = json.load(sys.stdin)
    items = data.get("items") or []
    print(items[0].get("url") or "" if items else "")
except Exception:
    print("")
' 2>/dev/null || true)"
    if [[ -n "$image_url" ]]; then
      case "$image_url" in
        http*) media_url="$image_url" ;;
        *)     media_url="$BASE$image_url" ;;
      esac
      code="$(http_code "$media_url")"
      if [[ "$code" == "200" ]]; then
        ok "Signed media URL loads — 200"
      else
        bad "Signed media URL — expected 200, got $code"
      fi

      if [[ "$image_url" == *"?"* ]]; then
        unsigned="${media_url%%\?*}"
        code="$(http_code "$unsigned")"
        if [[ "$code" == "403" ]]; then
          ok "Unsigned media URL rejected — 403"
        else
          bad "Unsigned media URL — expected 403, got $code"
        fi
      fi
    else
      info "No images available for the signed-URL check (seed the demo account to test it)."
    fi
  else
    bad "POST /api/auth/login — demo login failed (is the demo account seeded?)"
  fi
else
  info "Authenticated checks skipped (set DEMO_EMAIL and DEMO_PASSWORD to enable)."
fi

# --- Summary -----------------------------------------------------------------
echo
if [[ "$FAIL" -eq 0 ]]; then
  green "All $PASS checks passed."
  echo
  exit 0
else
  red "$FAIL check(s) failed, $PASS passed."
  echo
  exit 1
fi
