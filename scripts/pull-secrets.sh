#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../deploy.config"

# Env keys (same as setup-secrets.sh)
ENV_KEYS=(
  CORS_ORIGIN
  FRONTEND_URL
  OIDC_ISSUER
  OIDC_CLIENT_ID
  OIDC_CLIENT_SECRET
  OIDC_REDIRECT_URI
  OIDC_AUDIENCE
  ADMIN_USER_IDS
  TURSO_DATABASE_URL
  TURSO_AUTH_TOKEN
)

# Target .env files to write
API_ENV="apps/api/.env"
WORKER_ENV="apps/worker/.env"

# Worker only needs these
WORKER_KEYS="TURSO_DATABASE_URL TURSO_AUTH_TOKEN"

echo "Pulling secrets from project: $GCP_PROJECT_ID / App: $APP_NAME"
echo ""

api_lines=()
worker_lines=()

for env_key in "${ENV_KEYS[@]}"; do
  secret_name="${APP_NAME}-$(echo "$env_key" | tr '_' '-' | tr '[:upper:]' '[:lower:]')"

  value=$(gcloud secrets versions access latest --secret="$secret_name" --project="$GCP_PROJECT_ID" 2>/dev/null || true)

  if [ -z "$value" ]; then
    echo "SKIP: $env_key (not found or empty)"
    continue
  fi

  api_lines+=("$env_key=$value")

  if echo "$WORKER_KEYS" | grep -qw "$env_key"; then
    worker_lines+=("$env_key=$value")
  fi

  echo "  OK: $env_key"
done

# Write API .env
printf "%s\n" "${api_lines[@]}" > "$API_ENV"
echo ""
echo "Wrote $API_ENV (${#api_lines[@]} vars)"

# Write Worker .env
printf "%s\n" "${worker_lines[@]}" > "$WORKER_ENV"
echo "Wrote $WORKER_ENV (${#worker_lines[@]} vars)"
