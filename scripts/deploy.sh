#!/bin/bash
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-default-364617}"
REGION="${GCP_REGION:-asia-northeast1}"
SERVICE_NAME="${CLOUD_RUN_SERVICE:-flowit}"

# All env vars from Secret Manager
SECRETS=(
  "CORS_ORIGIN=flowit-cors-origin:latest"
  "FRONTEND_URL=flowit-frontend-url:latest"
  "OIDC_ISSUER=flowit-oidc-issuer:latest"
  "OIDC_CLIENT_ID=flowit-oidc-client-id:latest"
  "OIDC_CLIENT_SECRET=flowit-oidc-client-secret:latest"
  "OIDC_REDIRECT_URI=flowit-oidc-redirect-uri:latest"
  "OIDC_AUDIENCE=flowit-oidc-audience:latest"
  "ADMIN_USER_IDS=flowit-admin-user-ids:latest"
  "TURSO_DATABASE_URL=flowit-turso-database-url:latest"
  "TURSO_AUTH_TOKEN=flowit-turso-auth-token:latest"
)

# Join secrets with comma
SECRETS_FLAG=$(IFS=,; echo "${SECRETS[*]}")

echo "Deploying $SERVICE_NAME to $REGION (project: $PROJECT_ID)"
echo ""

gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 1 \
  --set-secrets "$SECRETS_FLAG" \
  --quiet

echo ""
echo "Deployed: $(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --project "$PROJECT_ID" --format="value(status.url)")"
