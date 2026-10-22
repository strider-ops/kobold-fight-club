# Kobold Fight Club is a fully static SPA: sql.js runs SQLite in the browser
# against /data/monsters.db, so there is no application server to ship.
# Stage 1 builds the bundle, stage 2 is just nginx over the result.

FROM docker.io/library/node:24-alpine AS builder

WORKDIR /build

# Install against the lockfile first so dependency layers cache independently
# of source edits. Dev dependencies are required here: sass compiles
# src/styles/*.scss during the build.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build


# nginx-unprivileged runs as UID 101 and needs no root-owned paths, which keeps
# the container working the same way under rootless Podman as under root.
FROM docker.io/nginxinc/nginx-unprivileged:1.29-alpine

# Match the published port so the app is on 8095 inside and out.
EXPOSE 8095

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /build/dist /usr/share/nginx/html

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --spider http://127.0.0.1:8095/ || exit 1
