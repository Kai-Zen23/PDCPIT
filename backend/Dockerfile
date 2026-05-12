# Production Multi-Stage Dockerfile for Distributed Node Game Server

# Stage 1: Build compilation dependencies
FROM node:22-alpine AS builder
WORKDIR /app

# Copy dependency manifests first for layer caching efficiency
COPY package*.json tsconfig.json ./
RUN npm ci --include=dev

# Copy source and compile
COPY src ./src
RUN npm run build

# Stage 2: Runtime Production Bundle - Minimal base image
FROM node:22-alpine AS runner
WORKDIR /app

# Set production environment early for caching benefits
ENV NODE_ENV=production \
    NODE_OPTIONS="--enable-source-maps"

# Create non-root user upfront for better layer organization
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package manifests and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy compiled output from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Switch to non-root user
USER nodejs

# Health check for orchestration awareness
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 4000

CMD ["node", "dist/server.js"]
