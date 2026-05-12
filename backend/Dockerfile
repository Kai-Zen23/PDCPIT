# Production Multi-Stage Dockerfile for Distributed Node Game Server

# Stage 1: Build compilation dependencies
FROM node:22-alpine AS builder
WORKDIR /app

# Copy dependency graphs
COPY package*.json tsconfig.json ./
RUN npm install

# Copy source maps
COPY src ./src
RUN npm run build

# Stage 2: Runtime Production Bundle
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install production dependencies only to optimize layer caching sizes
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled execution bundle from builder stage
COPY --from=builder /app/dist ./dist

# Run container execution under least privileged non-root node user
USER node

EXPOSE 4000
CMD ["node", "dist/server.js"]
