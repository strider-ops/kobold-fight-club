# Podman Container Setup

This project includes a Podman container configuration for running the Kobold Fight Club application.

## Prerequisites

- [Podman](https://podman.io/docs/installation) installed on your system
- Unix-like shell (bash, zsh, etc.) or PowerShell on Windows

## Quick Start

```bash
./run-podman.sh build-and-run
```

This will:
1. Build the Vue 3 frontend
2. Create a Podman image with Node.js and Java runtime
3. Start a container serving the app on http://localhost:8080

## Commands

### Build the image
```bash
./run-podman.sh build
```

### Run the container
```bash
./run-podman.sh run
```

### View logs
```bash
./run-podman.sh logs
```

### Open a shell in the container
```bash
./run-podman.sh shell
```

### Check container status
```bash
./run-podman.sh status
```

### Stop the container
```bash
./run-podman.sh stop
```

### Clean up (remove container and image)
```bash
./run-podman.sh clean
```

## Configuration

### Custom Port
To run on a different port, modify the script or run:
```bash
podman run -d -p 3000:8080 -v $(pwd)/app:/app/app kobold-fight-club:latest
```

### Environment Variables
Set `PODMAN_CMD` to use an alternative podman executable:
```bash
PODMAN_CMD=/usr/local/bin/podman ./run-podman.sh build-and-run
```

### Live Development
The container volume-mounts your `app` directory, so changes to Vue components are reflected (requires dev server in container). To enable live reload in development, you can modify the Dockerfile to use `vite dev` instead of `npm start`.

## Container Details

- **Base Image**: node:22-alpine (lightweight Node.js with Alpine Linux)
- **Java Runtime**: OpenJDK 21 JRE (for future Java backend integration)
- **Port**: 8080 (inside container) → 8080 (host)
- **Health Check**: Enabled with 30s interval

## Troubleshooting

### Container won't start
Check logs with:
```bash
./run-podman.sh logs
```

### Port already in use
Kill the existing container:
```bash
./run-podman.sh clean
```

Or use a different port:
```bash
podman run -d -p 9000:8080 kobold-fight-club:latest
```

### Permission denied on script
Make it executable:
```bash
chmod +x run-podman.sh
```

## Building for Production

For a production build, you can use the Dockerfile directly:
```bash
podman build -t kobold-fight-club:v1.0.0 .
```

## Dockerfile Explanation

The Dockerfile uses a multi-stage build:

1. **Builder Stage**: Installs dependencies and builds the Vue app
2. **Final Stage**: 
   - Alpine Linux base with Node.js 22
   - Includes OpenJDK 21 JRE (for Java backend)
   - Copies pre-built Vue dist files
   - Includes health checks
   - Runs `npm start` to serve the app

This approach:
- Minimizes final image size
- Separates build-time from runtime dependencies
- Enables quick iterations during development
