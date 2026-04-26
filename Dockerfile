# ── Build stage ───────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# ── Production image ──────────────────────────────────────────
FROM node:20-alpine

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy source files
COPY package*.json ./
COPY server.js ./
COPY fetcher.js ./
COPY classifier.js ./
COPY sources.js ./
COPY public/ ./public/

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -q --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
