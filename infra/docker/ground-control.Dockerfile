FROM node:22-alpine AS build
WORKDIR /workspace
ENV SECFLY_STANDALONE_BUILD=true
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @secfly/ground-control build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build --chown=node:node /workspace/apps/ground-control/.next/standalone ./
COPY --from=build --chown=node:node /workspace/apps/ground-control/.next/static ./apps/ground-control/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/ground-control/server.js"]
