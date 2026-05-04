# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs appuser \
  && mkdir -p uploads/chat \
  && chown -R appuser:nodejs /app

COPY --from=deps --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --chown=appuser:nodejs package.json package-lock.json ./
COPY --chown=appuser:nodejs sql ./sql
COPY --chown=appuser:nodejs scripts ./scripts
COPY --chown=appuser:nodejs src ./src

USER appuser
EXPOSE 4000
CMD ["node", "src/composition/server.js"]
