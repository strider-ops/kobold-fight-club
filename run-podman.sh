#!/bin/bash

# Podman build and run script for Kobold Fight Club

set -euo pipefail

# Configuration
IMAGE_NAME="kobold-fight-club"
IMAGE_TAG="${IMAGE_TAG:-latest}"
CONTAINER_NAME="kobold-fight-club-app"
# The container listens on 8095 too, so this is the port end to end.
PORT="${PORT:-8095}"
PODMAN_CMD="${PODMAN_CMD:-podman}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

print_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

# Check if podman is installed
if ! command -v "$PODMAN_CMD" &> /dev/null; then
  print_error "Podman is not installed. Please install Podman first."
  exit 1
fi

# Parse arguments
ACTION="${1:-build-and-run}"

case "$ACTION" in
  build)
    print_info "Using Podman: $($PODMAN_CMD --version)"
    print_info "Building image: ${IMAGE_NAME}:${IMAGE_TAG}"
    # Podman defaults to the OCI image format, which has no HEALTHCHECK field
    # and drops the one in the Dockerfile with a warning.
    $PODMAN_CMD build --format docker -t "${IMAGE_NAME}:${IMAGE_TAG}" .
    print_info "Image built successfully!"
    ;;

  run)
    if ! $PODMAN_CMD image exists "${IMAGE_NAME}:${IMAGE_TAG}"; then
      print_warn "Image not found. Building first..."
      "$0" build
    fi

    # Replace any previous container so re-running is idempotent.
    if $PODMAN_CMD container exists "${CONTAINER_NAME}"; then
      print_info "Removing existing container..."
      $PODMAN_CMD rm --force "${CONTAINER_NAME}" > /dev/null
    fi

    print_info "Starting container: ${CONTAINER_NAME}"
    $PODMAN_CMD run -d \
      --name "${CONTAINER_NAME}" \
      -p "${PORT}:8095" \
      --restart unless-stopped \
      "${IMAGE_NAME}:${IMAGE_TAG}" > /dev/null

    print_info "Container started!"
    print_info "App available at: http://localhost:${PORT}"
    print_info "View logs with: $PODMAN_CMD logs -f ${CONTAINER_NAME}"
    ;;

  build-and-run)
    "$0" build
    "$0" run
    ;;

  stop)
    print_info "Stopping container: ${CONTAINER_NAME}"
    $PODMAN_CMD stop "${CONTAINER_NAME}" 2>/dev/null || print_warn "Container not running"
    ;;

  restart)
    print_info "Restarting container: ${CONTAINER_NAME}"
    $PODMAN_CMD restart "${CONTAINER_NAME}"
    ;;

  logs)
    $PODMAN_CMD logs -f "${CONTAINER_NAME}"
    ;;

  shell)
    print_info "Opening shell in: ${CONTAINER_NAME}"
    $PODMAN_CMD exec -it "${CONTAINER_NAME}" sh
    ;;

  status)
    $PODMAN_CMD ps --filter "name=${CONTAINER_NAME}"
    ;;

  clean)
    print_info "Cleaning up..."
    $PODMAN_CMD rm --force "${CONTAINER_NAME}" 2>/dev/null || true
    $PODMAN_CMD rmi --force "${IMAGE_NAME}:${IMAGE_TAG}" 2>/dev/null || true
    print_info "Cleanup complete!"
    ;;

  *)
    cat << EOF
Kobold Fight Club - Podman Control Script

Usage: $0 [COMMAND]

Commands:
  build              Build the Podman image
  run                Run the container on port ${PORT} (builds if needed)
  build-and-run      Build and run (default)
  stop               Stop the running container
  restart            Restart the running container
  logs               Show container logs (follow mode)
  shell              Open a shell in the container
  status             Show container status
  clean              Remove the container and image

Examples:
  $0 build-and-run
  $0 logs
  $0 clean

Environment Variables:
  PORT               Host port to publish (default: 8095)
  IMAGE_TAG          Image tag to build/run (default: latest)
  PODMAN_CMD         Path to podman executable (default: podman)

EOF
    exit 1
    ;;
esac
