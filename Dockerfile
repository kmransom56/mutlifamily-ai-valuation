# Use Node.js 20 Alpine as base image for better compatibility
FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    curl

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for Tailwind CSS)
RUN npm ci

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p uploads outputs storage/exports storage/temp

# Expose the port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# For production, build and start
# For development, this will be overridden by docker-compose to run npm run dev
CMD ["sh", "-c", "npm run build && npm start"]