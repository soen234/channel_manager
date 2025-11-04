#!/bin/bash

# Cloud Run Deployment Script
# This script deploys the Booking.com sync service to Google Cloud Run

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Cloud Run Deployment${NC}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI not found${NC}"
    echo "Please install: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-channel-manager}"
SERVICE_NAME="booking-sync"
REGION="${GCP_REGION:-asia-northeast3}"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "  Project ID: ${PROJECT_ID}"
echo "  Service Name: ${SERVICE_NAME}"
echo "  Region: ${REGION}"
echo "  Image: ${IMAGE_NAME}"
echo ""

# Set project
echo -e "${YELLOW}🔧 Setting GCP project...${NC}"
gcloud config set project ${PROJECT_ID}

# Build Docker image
echo -e "${YELLOW}🔨 Building Docker image...${NC}"
gcloud builds submit --tag ${IMAGE_NAME}

# Deploy to Cloud Run
echo -e "${YELLOW}🚢 Deploying to Cloud Run...${NC}"
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --set-env-vars "SUPABASE_URL=${SUPABASE_URL},SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}" \
  --set-env-vars "BOOKING_COM_USERNAME=${BOOKING_COM_USERNAME},BOOKING_COM_PASSWORD=${BOOKING_COM_PASSWORD}" \
  --set-env-vars "BOOKING_COM_HOTEL_ID=${BOOKING_COM_HOTEL_ID},CRON_SECRET=${CRON_SECRET}"

# Get service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format 'value(status.url)')

echo ""
echo -e "${GREEN}✅ Deployment successful!${NC}"
echo ""
echo -e "${GREEN}🌐 Service URL: ${SERVICE_URL}${NC}"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Test health check:"
echo "   curl ${SERVICE_URL}/health"
echo ""
echo "2. Test booking sync:"
echo "   curl -X POST ${SERVICE_URL}/api/sync/booking -H \"x-cron-secret: \${CRON_SECRET}\""
echo ""
echo "3. Set up Cloud Scheduler:"
echo "   gcloud scheduler jobs create http booking-sync-cron \\"
echo "     --schedule=\"*/10 * * * *\" \\"
echo "     --uri=\"${SERVICE_URL}/api/sync/booking\" \\"
echo "     --http-method=POST \\"
echo "     --headers=\"x-cron-secret=\${CRON_SECRET}\" \\"
echo "     --location=${REGION}"
echo ""
