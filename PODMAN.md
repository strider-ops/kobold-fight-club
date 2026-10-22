# Podman Container Setup

Kobold Fight Club builds to a fully static site. SQLite runs in the browser via sql.js against
`/data/monsters.db`, so there is no backend process — the container is nginx serving the Vite build.

- **Image name:** `kobold-fight-club`
- **Port:** 8095, inside the container and on the host
- **Size:** ~64 MB
- **Runs as:** non-root (UID 101), works under rootless Podman

## Prerequisites

- [Podman](https://podman.io/docs/installation) installed and, on macOS/Windows, a running machine
  (`podman machine start`)

## Quick Start

```bash
./run-podman.sh build-and-run
```

Then open http://localhost:8095.

## Commands

| Command                        | Effect                                           |
| ------------------------------ | ------------------------------------------------ |
| `./run-podman.sh build`         | Build the image                                  |
| `./run-podman.sh run`           | Run the container (builds first if no image)     |
| `./run-podman.sh build-and-run` | Both (default when no argument is given)         |
| `./run-podman.sh stop`          | Stop the container                               |
| `./run-podman.sh restart`       | Restart the container                            |
| `./run-podman.sh logs`          | Follow container logs                            |
| `./run-podman.sh shell`         | Open a shell inside the container                |
| `./run-podman.sh status`        | Show container status                            |
| `./run-podman.sh clean`         | Remove the container and the image               |

`run` replaces any existing container, so it is safe to re-run after a rebuild.

## Configuration

Environment variables, all optional:

```bash
PORT=9000 ./run-podman.sh run          # publish on a different host port
IMAGE_TAG=v1.0.0 ./run-podman.sh build # tag something other than :latest
PODMAN_CMD=/usr/local/bin/podman ./run-podman.sh build-and-run
```

`PORT` only changes the host side; the container always listens on 8095.

## Using Podman directly

```bash
podman build --format docker -t kobold-fight-club:latest .
podman run -d --name kobold-fight-club-app -p 8095:8095 kobold-fight-club:latest
```

`--format docker` matters: Podman's default OCI image format has no `HEALTHCHECK` field and will drop
the one in the Dockerfile with a warning.

## How the image is built

Two stages:

1. **Builder** (`node:22-alpine`) — `npm ci` then `npm run build`. Dev dependencies are needed here
   because sass compiles `src/styles/*.scss` during the build.
2. **Runtime** (`nginxinc/nginx-unprivileged:1.29-alpine`) — copies `dist/` and `nginx.conf`. No Node,
   no npm, no application code at runtime.

`.containerignore` keeps `node_modules`, the host `dist/`, `.git`, and the data-pipeline directories out
of the build context. Note that Podman reads `.containerignore` or `.dockerignore` — a `.podmanignore`
file is silently ignored.

## nginx configuration notes

`nginx.conf` handles four things that the app will break without:

- **SPA fallback** — Vue Router uses `createWebHistory`, so `/battle-tracker` and friends are real URLs
  that must return `index.html`.
- **WASM MIME type** — sql.js refuses to instantiate unless `sql-wasm.wasm` arrives as
  `application/wasm`. nginx's bundled `mime.types` already covers this. Do not add a `types` block to
  override it: a nested `types` block *replaces* the inherited map instead of extending it, and
  `mime.types` cannot be included inside one because it is already wrapped in its own `types` block.
  Doing so serves every file as `application/octet-stream`.
- **`.db` type and gzip** — `default_type` on `/data/` names `monsters.db` as `application/vnd.sqlite3`,
  which lets `gzip_types` match it. That takes the download from 1.9 MB to ~820 KB.
- **Cache headers** — Vite fingerprints `/assets/`, so those are `immutable` for a year, while
  `index.html` is `no-cache` so a new deploy is picked up instead of pointing at deleted bundles.

## Updating the deployed app

The monster database ships inside the image. After changing data or code:

```bash
./run-podman.sh build-and-run
```

## Troubleshooting

**Container exits immediately.** Almost always an nginx config error. `./run-podman.sh logs` will show
the `[emerg]` line.

**Port already in use.** `./run-podman.sh clean`, or publish elsewhere with `PORT=9000`.

**Permission denied running the script.** `chmod +x run-podman.sh`

**Blank page with console errors about MIME types.** The nginx `types` trap described above.
