# Multi-stage build for NEXUS Hub

# Stage 1: Dependencies
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Builder
FROM node:18-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for environment variables
ARG NEXT_PUBLIC_WRITER_API_URL
ARG NEXT_PUBLIC_SHEETS_API_URL
ARG NEXT_PUBLIC_SLIDES_API_URL
ARG NEXT_PUBLIC_DRIVE_API_URL
ARG NEXT_PUBLIC_MEET_API_URL
ARG NEXT_PUBLIC_AUTH_API_URL

ENV NEXT_PUBLIC_WRITER_API_URL=$NEXT_PUBLIC_WRITER_API_URL
ENV NEXT_PUBLIC_SHEETS_API_URL=$NEXT_PUBLIC_SHEETS_API_URL
ENV NEXT_PUBLIC_SLIDES_API_URL=$NEXT_PUBLIC_SLIDES_API_URL
ENV NEXT_PUBLIC_DRIVE_API_URL=$NEXT_PUBLIC_DRIVE_API_URL
ENV NEXT_PUBLIC_MEET_API_URL=$NEXT_PUBLIC_MEET_API_URL
ENV NEXT_PUBLIC_AUTH_API_URL=$NEXT_PUBLIC_AUTH_API_URL

# Build the application
RUN npm run build

# Stage 3: Runner
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set correct permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
