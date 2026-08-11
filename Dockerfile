# Multi-stage build: compile Vue 3 frontend
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build Vue app
RUN npm run build:vue

# Final stage: serve with Node.js and Java runtime
FROM node:22-alpine

# Install Java
RUN apk add --no-cache openjdk21-jre-headless

WORKDIR /app

# Copy built Vue app from builder
COPY --from=builder /app/app/vue/dist ./dist

# Copy package files for runtime dependencies
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the app
CMD ["npm", "start"]
