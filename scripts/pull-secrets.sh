#!/bin/bash
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-default-364617}"

# Secret name -> env key mapping (same as setup-secrets.sh)
ENTRIES=(
  "flowit-cors-origin:CORS_ORIGIN"
  "flowit-frontend-url:FRONTEND_URL"
  "flowit-oidc-issuer:OIDC_ISSUER"
  "flowit-oidc-client-id:OIDC_CLIENT_ID"
  "flowit-oidc-client-secret:OIDC_CLIENT_SECRET"
  "flowit-oidc-redirect-uri:OIDC_REDIRECT_URI"
  "flowit-oidc-audience:OIDC_AUDIENCE"
  "flowit-admin-user-ids:ADMIN_USER_IDS"
  "flowit-turso-database-url:TURSO_DATABASE_URL"
  "flowit-turso-auth-token:TURSO_AUTH_TOKEN"
)

# Target .env files to write
API_ENV="apps/api/.env"
WORKER_ENV="apps/worker/.env"

# Worker only needs these
WORKER_KEYS="TURSO_DATABASE_URL TURSO_AUTH_TOKEN"

echo "Pulling secrets from project: $PROJECT_ID"
echo ""

api_lines=()
worker_lines=()

for entry in "${ENTRIES[@]}"; do
  secret_name="${entry%%:*}"
  env_key="${entry##*:}"

  value=$(gcloud secrets versions access latest --secret="$secret_name" --project="$PROJECT_ID" 2>/dev/null || true)

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
