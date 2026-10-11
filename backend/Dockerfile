FROM node:24-bookworm-slim AS dependencies
WORKDIR /app/backend
ENV NEXT_TELEMETRY_DISABLED=1
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM dependencies AS build
COPY backend/app ./app
COPY backend/scripts ./scripts
COPY index.html styles.css future.css /app/
COPY js /app/js
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app/backend
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000
COPY --from=dependencies --chown=node:node /app/backend/node_modules ./node_modules
COPY --from=build --chown=node:node /app/backend/.next ./.next
COPY --from=build --chown=node:node /app/backend/public ./public
COPY --from=build --chown=node:node /app/backend/package.json ./package.json
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:3000', {signal: AbortSignal.timeout(4000)}).then(r => process.exit(r.status === 200 ? 0 : 1)).catch(() => process.exit(1))"]
CMD ["node", "node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0"]
