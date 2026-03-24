#!/bin/bash
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-default-364617}"
APP_NAME="${APP_NAME:-flowit}"

# Env keys to manage in Secret Manager
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

echo "Project: $PROJECT_ID / App: $APP_NAME"
echo ""

gcloud services enable secretmanager.googleapis.com --project="$PROJECT_ID" --quiet

for env_key in "${ENV_KEYS[@]}"; do
  secret_name="${APP_NAME}-$(echo "$env_key" | tr '_' '-' | tr '[:upper:]' '[:lower:]')"

  value="${!env_key:-}"
  if [ -z "$value" ]; then
    read -rp "Enter value for $env_key ($secret_name): " value
  fi

  if [ -z "$value" ]; then
    echo "SKIP: $secret_name (empty value)"
    continue
  fi

  if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" &>/dev/null; then
    echo -n "$value" | gcloud secrets versions add "$secret_name" --data-file=- --project="$PROJECT_ID" --quiet
    echo "UPDATE: $secret_name"
  else
    echo -n "$value" | gcloud secrets create "$secret_name" --data-file=- --project="$PROJECT_ID" --quiet
    echo "CREATE: $secret_name"
  fi
done

# Grant Cloud Run service account access
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

for env_key in "${ENV_KEYS[@]}"; do
  secret_name="${APP_NAME}-$(echo "$env_key" | tr '_' '-' | tr '[:upper:]' '[:lower:]')"
  gcloud secrets add-iam-policy-binding "$secret_name" \
    --member="serviceAccount:$SA" \
    --role="roles/secretmanager.secretAccessor" \
    --project="$PROJECT_ID" \
    --quiet &>/dev/null
done

echo ""
echo "Done. Run ./scripts/deploy.sh to deploy."
