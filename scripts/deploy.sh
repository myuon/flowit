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

# Build --set-secrets flag from env keys
SECRETS=()
for env_key in "${ENV_KEYS[@]}"; do
  secret_name="${APP_NAME}-$(echo "$env_key" | tr '_' '-' | tr '[:upper:]' '[:lower:]')"
  SECRETS+=("$env_key=$secret_name:latest")
done
SECRETS_FLAG=$(IFS=,; echo "${SECRETS[*]}")

echo "Deploying $APP_NAME to $GCP_REGION (project: $GCP_PROJECT_ID)"
echo ""

gcloud run deploy "$APP_NAME" \
  --source . \
  --region "$GCP_REGION" \
  --project "$GCP_PROJECT_ID" \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 1 \
  --set-secrets "$SECRETS_FLAG" \
  --quiet

echo ""
echo "Deployed: $(gcloud run services describe "$APP_NAME" --region "$GCP_REGION" --project "$GCP_PROJECT_ID" --format="value(status.url)")"
