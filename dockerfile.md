# Multi-stage Docker build for ColorPro Backend
# Stage 1: Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Install dependencies for build tools
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat \
    vips-dev

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY config/ ./config/
COPY locales/ ./locales/

# Build TypeScript to JavaScript
RUN npm run build

# Stage 2: Production stage
FROM node:18-alpine AS production

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Create app directory
WORKDIR /usr/src/app

# Add non-root user for security
RUN addgroup -g 1001 -S colorpro && \
    adduser -S colorpro -u 1001

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    vips

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force && \
    rm -rf /tmp/*

# Copy built application from builder stage
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/locales ./locales

# Create necessary directories
RUN mkdir -p logs uploads && \
    chown -R colorpro:colorpro /usr/src/app

# Switch to non-root user
USER colorpro

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node dist/healthcheck.js || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/server.js"]

# Labels for metadata
LABEL maintainer="ColorPro Team <dev@colorpro.com>"
LABEL version="1.0.0"
LABEL description="ColorPro Backend API - Professional Color Analysis Platform"