#!/bin/bash

# setup_gcp.sh - Automates GCP API activation and local environment setup.

set -e

# --- Configuration ---
# Load environment variables from .env file
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "Error: .env file not found. Please create it from .env.example."
  exit 1
fi

# Check if GOOGLE_CLOUD_PROJECT is set
if [ -z "$GOOGLE_CLOUD_PROJECT" ]; then
  echo "Error: GOOGLE_CLOUD_PROJECT is not set in your .env file."
  exit 1
fi

# APIs required for Agent Engine, Telemetry, and Infrastructure
REQUIRED_APIS=(
  "aiplatform.googleapis.com"
  "cloudbuild.googleapis.com"
  "iam.googleapis.com"
  "cloudresourcemanager.googleapis.com"
  "logging.googleapis.com"
  "cloudtrace.googleapis.com"
  "bigquery.googleapis.com"
  "serviceusage.googleapis.com"
)

echo "--------------------------------------------------------"
echo "🚀 Starting GCP Setup for Project: $GOOGLE_CLOUD_PROJECT"
echo "--------------------------------------------------------"

# 1. Check for gcloud CLI
if ! command -v gcloud &> /dev/null; then
  echo "Error: 'gcloud' CLI is not installed. Please install it first: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

# 2. Set the active project
echo "Setting active gcloud project..."
gcloud config set project "$GOOGLE_CLOUD_PROJECT"

# 3. Enable APIs
echo "Enabling required APIs (this may take a minute)..."
gcloud services enable "${REQUIRED_APIS[@]}"

# 4. Local Development Setup (Optional but Recommended)
if [[ "$GOOGLE_GENAI_USE_VERTEXAI" == "True" ]]; then
  echo "--------------------------------------------------------"
  echo "🔧 Local Development Setup (Vertex AI)"
  echo "--------------------------------------------------------"
  
  # Check if Application Default Credentials exist
  if [ ! -f ~/.config/gcloud/application_default_credentials.json ]; then
    echo "No Application Default Credentials (ADC) found."
    echo "Running 'gcloud auth application-default login' to allow local code to use your project..."
    gcloud auth application-default login
  else
    echo "✅ Application Default Credentials already configured."
    echo "   If you face permission issues, run: gcloud auth application-default login"
  fi
fi

echo "--------------------------------------------------------"
echo "✅ Setup Complete!"
echo "--------------------------------------------------------"
echo "You are now ready to:"
echo "1. Run local tests: make test"
echo "2. Launch the playground: make playground"
echo "3. Deploy to dev: make deploy-dev"
