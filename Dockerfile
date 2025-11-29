# Dockerfile for Railway deployment
FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/local/package.json ./packages/local/
COPY packages/react/package.json ./packages/react/
COPY packages/vibex/package.json ./packages/vibex/
COPY packages/tools/package.json ./packages/tools/
COPY packages/defaults/package.json ./packages/defaults/
COPY packages/supabase/package.json ./packages/supabase/
COPY docs/package.json ./docs/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY . .

# Build
RUN pnpm turbo run build --filter=@vibex/docs

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy workspace configuration
COPY --from=base /app/package.json ./
COPY --from=base /app/pnpm-workspace.yaml ./
COPY --from=base /app/pnpm-lock.yaml ./

# Copy all built workspace packages (simpler and more maintainable)
COPY --from=base /app/packages ./packages

# Copy built docs application
COPY --from=base /app/docs/.next ./docs/.next
COPY --from=base /app/docs/public ./docs/public
COPY --from=base /app/docs/package.json ./docs/

# Copy node_modules (needed for runtime dependencies)
COPY --from=base /app/docs/node_modules ./docs/node_modules
COPY --from=base /app/node_modules ./node_modules

WORKDIR /app/docs

# Railway automatically sets PORT environment variable (usually 8080)
# Next.js will use PORT env var if set, otherwise defaults to 3000
# We expose 8080 as that's Railway's default, but Next.js will use whatever PORT is set
EXPOSE 8080
ENV NODE_ENV=production

# Next.js start command respects PORT environment variable automatically
CMD ["pnpm", "start"]

