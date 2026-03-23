#!/bin/bash
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-default-364617}"

# All deployment env vars managed in Secret Manager
# Format: "secret-name:ENV_KEY"
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

echo "Project: $PROJECT_ID"
echo ""

gcloud services enable secretmanager.googleapis.com --project="$PROJECT_ID" --quiet

for entry in "${ENTRIES[@]}"; do
  secret_name="${entry%%:*}"
  env_key="${entry##*:}"

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

for entry in "${ENTRIES[@]}"; do
  secret_name="${entry%%:*}"
  gcloud secrets add-iam-policy-binding "$secret_name" \
    --member="serviceAccount:$SA" \
    --role="roles/secretmanager.secretAccessor" \
    --project="$PROJECT_ID" \
    --quiet &>/dev/null
done

echo ""
echo "Done. Run ./scripts/deploy.sh to deploy."
