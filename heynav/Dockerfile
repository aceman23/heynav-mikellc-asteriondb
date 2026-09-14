# Hey Nav front end — multi-stage build producing a small standalone Next.js server.
# Build:  docker build -t heynav .
# Run:    docker run --rm -p 3000:3000 -e DB_TWIG_URL=https://cloud-test.asteriondb.com/dbTwig heynav

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# next/font downloads Archivo / Spectral / JetBrains Mono at build time and
# self-hosts them, so the running container makes no request to Google.
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup -S heynav && adduser -S heynav -G heynav
COPY --from=build --chown=heynav:heynav /app/.next/standalone ./
COPY --from=build --chown=heynav:heynav /app/.next/static ./.next/static
COPY --from=build --chown=heynav:heynav /app/public ./public
USER heynav
EXPOSE 3000
CMD ["node", "server.js"]
