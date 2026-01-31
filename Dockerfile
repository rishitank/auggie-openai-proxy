# Auggie OpenAI Proxy Dockerfile
# Node version is defined in .nvmrc (single source of truth)
ARG NODE_VERSION=25
FROM node:${NODE_VERSION}-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
COPY tsconfig.json tsup.config.ts ./

# Install all dependencies including devDependencies for build
# --include=dev ensures devDeps are installed even if NODE_ENV=production (e.g., Coolify)
# --ignore-scripts prevents husky from running during build
RUN npm ci --include=dev --ignore-scripts

# Add node_modules/.bin to PATH for build commands
ENV PATH="/app/node_modules/.bin:$PATH"

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage - minimal runtime image
ARG NODE_VERSION=25
FROM node:${NODE_VERSION}-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Install curl for healthchecks (required by Coolify - it ignores Dockerfile HEALTHCHECK)
RUN apk add --no-cache curl

# Copy package files and install production deps only
# --ignore-scripts prevents husky from running (it's a dev dependency)
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S auggie -u 1001 -G nodejs

# Switch to non-root user
USER auggie

EXPOSE 3456

# Health check using curl (required for Coolify compatibility)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3456/health || exit 1

CMD ["node", "--enable-source-maps", "dist/index.js"]

