# ==============================================================================
# Multi-Stage Dockerfile for κουίζυ (Embedded Quiz System)
# ==============================================================================

# Stage 1: Build & Dependencies
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Stage 2: Minimal Production Runtime
FROM node:20-alpine

WORKDIR /app

# Set production environment
ENV NODE_ENV=production \
    PORT=7000

# Copy node_modules from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Copy application source and assets
COPY src/ ./src/
COPY public/ ./public/
COPY database/ ./database/

# Create runtime directories for uploads and exports
RUN mkdir -p uploads exports

# Expose server port
EXPOSE 7000

# Run server
CMD ["node", "src/server.js"]
