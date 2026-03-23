#!/bin/bash
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-default-364617}"

SECRET_NAMES=(
  "flowit-turso-database-url"
  "flowit-turso-auth-token"
  "flowit-oidc-client-secret"
)
ENV_KEYS=(
  "TURSO_DATABASE_URL"
  "TURSO_AUTH_TOKEN"
  "OIDC_CLIENT_SECRET"
)

echo "Project: $PROJECT_ID"
echo ""

gcloud services enable secretmanager.googleapis.com --project="$PROJECT_ID" --quiet

for i in "${!SECRET_NAMES[@]}"; do
  secret_name="${SECRET_NAMES[$i]}"
  env_key="${ENV_KEYS[$i]}"

  value="${!env_key:-}"
  if [ -z "$value" ]; then
    read -rsp "Enter value for $env_key ($secret_name): " value
    echo ""
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

for secret_name in "${SECRET_NAMES[@]}"; do
  gcloud secrets add-iam-policy-binding "$secret_name" \
    --member="serviceAccount:$SA" \
    --role="roles/secretmanager.secretAccessor" \
    --project="$PROJECT_ID" \
    --quiet &>/dev/null
done

echo ""
echo "Done. Use with Cloud Run:"
echo "  gcloud run deploy flowit --set-secrets \\"
echo "    TURSO_DATABASE_URL=flowit-turso-database-url:latest,\\"
echo "    TURSO_AUTH_TOKEN=flowit-turso-auth-token:latest,\\"
echo "    OIDC_CLIENT_SECRET=flowit-oidc-client-secret:latest"
