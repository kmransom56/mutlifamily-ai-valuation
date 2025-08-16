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
<<<<<<< HEAD
RUN npm ci
=======
>>>>>>> 7729ef7fd006f35818317aff5db096f8429d4db3

# Install all dependencies (including devDependencies for Tailwind CSS)
RUN npm ci

# Copy source code
COPY . .

<<<<<<< HEAD
# Build the Next.js application
RUN npm install -g npm@11.5.2
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
# Uncomment the following line in case you want to disable telemetry during the build
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the public folder from the project as these are static assets
COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
=======
# Create necessary directories
RUN mkdir -p uploads outputs storage/exports storage/temp
>>>>>>> 7729ef7fd006f35818317aff5db096f8429d4db3

# Expose the port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# For production, build and start
# For development, this will be overridden by docker-compose to run npm run dev
CMD ["sh", "-c", "npm run build && npm start"]