#!/bin/bash

# Podman build and run script for Kobold Fight Club

set -e

# Configuration
IMAGE_NAME="kobold-fight-club"
IMAGE_TAG="latest"
CONTAINER_NAME="kobold-fight-club-app"
PORT="8080"
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
if ! command -v $PODMAN_CMD &> /dev/null; then
  print_error "Podman is not installed. Please install Podman first."
  exit 1
fi

print_info "Using Podman: $($PODMAN_CMD --version)"

# Parse arguments
ACTION="${1:-build-and-run}"

case "$ACTION" in
  build)
    print_info "Building image: ${IMAGE_NAME}:${IMAGE_TAG}"
    $PODMAN_CMD build -t "${IMAGE_NAME}:${IMAGE_TAG}" .
    print_info "Image built successfully!"
    ;;

  run)
    # Check if image exists
    if ! $PODMAN_CMD image exists "${IMAGE_NAME}:${IMAGE_TAG}" &> /dev/null; then
      print_warn "Image not found. Building first..."
      $PODMAN_CMD build -t "${IMAGE_NAME}:${IMAGE_TAG}" .
    fi

    # Stop and remove existing container if running
    if $PODMAN_CMD ps -a --filter "name=${CONTAINER_NAME}" --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
      print_info "Stopping existing container..."
      $PODMAN_CMD stop "${CONTAINER_NAME}" 2>/dev/null || true
      print_info "Removing existing container..."
      $PODMAN_CMD rm "${CONTAINER_NAME}" 2>/dev/null || true
    fi

    print_info "Starting container: ${CONTAINER_NAME}"
    $PODMAN_CMD run -d \
      --name "${CONTAINER_NAME}" \
      -p "${PORT}:8080" \
      -v "$(pwd)/app:/app/app" \
      --healthcheck-interval 30s \
      --healthcheck-timeout 10s \
      --healthcheck-retries 3 \
      "${IMAGE_NAME}:${IMAGE_TAG}"

    print_info "Container started!"
    print_info "App available at: http://localhost:${PORT}"
    print_info "View logs with: $PODMAN_CMD logs -f ${CONTAINER_NAME}"
    ;;

  build-and-run)
    print_info "Building and running..."
    $0 build
    $0 run
    ;;

  stop)
    print_info "Stopping container: ${CONTAINER_NAME}"
    $PODMAN_CMD stop "${CONTAINER_NAME}" 2>/dev/null || print_warn "Container not running"
    ;;

  logs)
    print_info "Showing logs for: ${CONTAINER_NAME}"
    $PODMAN_CMD logs -f "${CONTAINER_NAME}"
    ;;

  shell)
    print_info "Opening shell in: ${CONTAINER_NAME}"
    $PODMAN_CMD exec -it "${CONTAINER_NAME}" sh
    ;;

  status)
    print_info "Container status:"
    $PODMAN_CMD ps --filter "name=${CONTAINER_NAME}" || true
    ;;

  clean)
    print_info "Cleaning up..."
    $PODMAN_CMD stop "${CONTAINER_NAME}" 2>/dev/null || true
    $PODMAN_CMD rm "${CONTAINER_NAME}" 2>/dev/null || true
    $PODMAN_CMD rmi "${IMAGE_NAME}:${IMAGE_TAG}" 2>/dev/null || true
    print_info "Cleanup complete!"
    ;;

  *)
    cat << EOF
Kobold Fight Club - Podman Control Script

Usage: $0 [COMMAND]

Commands:
  build              Build the Podman image
  run                Run the container (builds if needed)
  build-and-run      Build and run (default)
  stop               Stop the running container
  logs               Show container logs (follow mode)
  shell              Open a shell in the container
  status             Show container status
  clean              Stop, remove container and image

Examples:
  $0 build-and-run
  $0 logs
  $0 shell
  $0 clean

Environment Variables:
  PODMAN_CMD         Path to podman executable (default: podman)

EOF
    exit 1
    ;;
esac
