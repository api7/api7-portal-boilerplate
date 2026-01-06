#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

# Check required environment variables
if [ -z "${REGISTRY}" ] || [ -z "${REGISTRY_NS}" ] || [ -z "${IMAGE_TAG}" ]; then
	echo "Error: REGISTRY, REGISTRY_NS, and IMAGE_TAG are required"
	exit 1
fi

IMAGE_REF="${REGISTRY}/${REGISTRY_NS}/api7-ee-developer-portal-fe:${IMAGE_TAG}"
IMAGE_DIGEST=$(docker buildx imagetools inspect "${IMAGE_REF}" --format '{{json .}}' | jq -r '.manifest.digest')
IMAGE="${REGISTRY}/${REGISTRY_NS}/api7-ee-developer-portal-fe@${IMAGE_DIGEST}"

echo "=== Signing image with OIDC ==="
echo "IMAGE: ${IMAGE}"
echo "IMAGE_DIGEST: ${IMAGE_DIGEST}"
echo "IMAGE_REF: ${IMAGE_REF}"
echo ""
echo "Starting image signing process..."

cosign sign --yes --recursive "${IMAGE}"

echo ""
echo "✅ Image signing completed successfully!"

