# ==========================================
# 1. Base image
# ==========================================
FROM node:24-alpine AS base
# Prisma requires openssl for its query engine on alpine
RUN apk add --no-cache openssl libc6-compat

# ==========================================
# 2. Install dependencies & Generate Prisma
# ==========================================
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
# Copy Prisma schema
COPY prisma ./prisma

# Install dependencies
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Generate Prisma Client
RUN npx prisma generate

# ==========================================
# 3. Build the Next.js application
# ==========================================
FROM base AS builder
WORKDIR /app

# Copy deps and prisma client
COPY --from=deps /app/node_modules ./node_modules

COPY --from=deps /app/generated ./generated

COPY . .

# Build Next.js
RUN npm run build

# ==========================================
# 4. Production image, copy all the files and run next
# ==========================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the public directory
COPY --from=builder /app/public ./public

COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/generated ./generated

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

COPY start.sh ./

USER root

RUN chmod +x start.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000

CMD ["./start.sh"]