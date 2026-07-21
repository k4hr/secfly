FROM node:22-alpine AS build
WORKDIR /workspace
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
ARG SECFLY_APP_PACKAGE
RUN pnpm --filter "${SECFLY_APP_PACKAGE}..." build

FROM node:22-alpine AS runtime
WORKDIR /workspace
ENV NODE_ENV=production
ARG SECFLY_APP_PACKAGE
ENV SECFLY_APP_PACKAGE=${SECFLY_APP_PACKAGE}
COPY --from=build --chown=node:node /workspace /workspace
USER node
CMD ["sh", "-c", "corepack pnpm --filter \"${SECFLY_APP_PACKAGE}\" start"]
