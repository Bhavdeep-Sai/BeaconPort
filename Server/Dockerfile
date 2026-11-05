# ==========================================
# Multi-Stage Production Dockerfile for BeaconPort API
# Base: Node 22 LTS (Alpine Linux)
# ==========================================

# ------------------------------------------
# Stage 1: Dependency Builder
# ------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies if native addons require compilation
RUN apk add --no-cache python3 make g++

# Copy package manifests for deterministic install
COPY package*.json ./

# Install production dependencies only (omit devDependencies)
RUN npm ci --omit=dev --ignore-scripts && npm rebuild

# ------------------------------------------
# Stage 2: Production Runtime
# ------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production \
    PORT=5000

# Install dumb-init for clean PID 1 signal forwarding and wget for healthchecks
RUN apk add --no-cache dumb-init wget

# Copy production node_modules from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Copy application source code
COPY app.js server.js ./
COPY auth/ ./auth/
COPY config/ ./config/
COPY controllers/ ./controllers/
COPY jobs/ ./jobs/
COPY middleware/ ./middleware/
COPY models/ ./models/
COPY routes/ ./routes/
COPY schemas/ ./schemas/
COPY services/ ./services/
COPY utils/ ./utils/
COPY scripts/ ./scripts/

# Principle of Least Privilege: Run as non-root user 'node'
RUN chown -R node:node /app

USER node

EXPOSE 5000

# Container liveness health check probing /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

# dumb-init handles process signals (SIGTERM/SIGINT) for graceful shutdown
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

CMD ["node", "server.js"]
