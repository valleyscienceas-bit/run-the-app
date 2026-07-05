#!/usr/bin/env bash
# Export Firestore to Google Cloud Storage.
# Requires: gcloud CLI authenticated with Firestore export permissions.
#
# Env (or export before running):
#   GCS_BACKUP_BUCKET  — gs://your-backup-bucket (required)
#   GCP_PROJECT_ID     — defaults to projectId in firebase-applet-config.json
#   FIRESTORE_DATABASE_ID — defaults to firestoreDatabaseId in config or "(default)"
#
# Schedule in production: Cloud Scheduler → HTTP or gcloud cron, or run this script on a VM.
# Example cron (daily 3am UTC): 0 3 * * * /path/to/export-firestore.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
CONFIG_FILE="${BACKEND_DIR}/firebase-applet-config.json"

if [[ ! -f "${CONFIG_FILE}" ]]; then
  echo "Error: missing ${CONFIG_FILE}" >&2
  exit 1
fi

read_config() {
  node -e "
    const c = JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'));
    console.log(c[process.argv[2]] || '');
  " "${CONFIG_FILE}" "$1"
}

PROJECT_ID="${GCP_PROJECT_ID:-$(read_config projectId)}"
DATABASE="${FIRESTORE_DATABASE_ID:-$(read_config firestoreDatabaseId)}"
DATABASE="${DATABASE:-(default)}"
BUCKET="${GCS_BACKUP_BUCKET:-}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "Error: could not resolve GCP project ID" >&2
  exit 1
fi

if [[ -z "${BUCKET}" ]]; then
  echo "Error: set GCS_BACKUP_BUCKET (e.g. gs://valley-science-firestore-backups)" >&2
  exit 1
fi

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUTPUT_URI="${BUCKET%/}/${TIMESTAMP}"

echo "Exporting Firestore database '${DATABASE}' from project '${PROJECT_ID}'"
echo "Destination: ${OUTPUT_URI}"

gcloud firestore export "${OUTPUT_URI}" \
  --project="${PROJECT_ID}" \
  --database="${DATABASE}"

echo "Export operation started. Monitor with:"
echo "  gcloud firestore operations list --project=${PROJECT_ID}"
