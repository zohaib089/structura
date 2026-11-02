# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/engine/package.json packages/engine/

COPY packages/engine/tsconfig.json packages/engine/tsconfig.build.json packages/engine/
COPY packages/engine/grammars.manifest.json packages/engine/
COPY packages/engine/schema packages/engine/schema
COPY packages/engine/data packages/engine/data
COPY packages/engine/src packages/engine/src

COPY apps/api/tsconfig.json apps/api/
COPY apps/api/src apps/api/src

RUN npm ci -w api --ignore-scripts
RUN npm run build -w @atlasmith/engine
RUN npm run build -w api

FROM node:22-alpine AS runtime
WORKDIR /repo

RUN addgroup -S structura && adduser -S structura -G structura

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/engine/package.json packages/engine/

RUN npm ci -w api --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=build /repo/packages/engine/dist packages/engine/dist
COPY --from=build /repo/packages/engine/schema packages/engine/schema
COPY --from=build /repo/packages/engine/data packages/engine/data
COPY --from=build /repo/packages/engine/grammars.manifest.json packages/engine/
COPY --from=build /repo/apps/api/dist apps/api/dist

WORKDIR /repo/apps/api
ENV NODE_ENV=production
EXPOSE 4100
USER structura
CMD ["node", "dist/index.js"]
