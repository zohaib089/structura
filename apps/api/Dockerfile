FROM node:22-alpine AS build
WORKDIR /repo

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/engine/package.json packages/engine/
COPY packages/source-ingest/package.json packages/source-ingest/
COPY packages/scan-analysis/package.json packages/scan-analysis/

COPY packages/engine/tsconfig.json packages/engine/tsconfig.build.json packages/engine/
COPY packages/engine/grammars.manifest.json packages/engine/
COPY packages/engine/schema packages/engine/schema
COPY packages/engine/data packages/engine/data
COPY packages/engine/src packages/engine/src

COPY packages/source-ingest/tsconfig.json packages/source-ingest/tsconfig.build.json packages/source-ingest/
COPY packages/source-ingest/src packages/source-ingest/src

COPY packages/scan-analysis/tsconfig.json packages/scan-analysis/tsconfig.build.json packages/scan-analysis/
COPY packages/scan-analysis/schema packages/scan-analysis/schema
COPY packages/scan-analysis/configs packages/scan-analysis/configs
COPY packages/scan-analysis/src packages/scan-analysis/src

COPY apps/api/tsconfig.json apps/api/
COPY apps/api/src apps/api/src

RUN npm ci -w api -w @atlasmith/engine -w @atlasmith/source-ingest -w @atlasmith/scan-analysis --include=dev --ignore-scripts
RUN npm run build -w @atlasmith/engine
RUN npm run build -w @atlasmith/source-ingest
RUN npm run build -w @atlasmith/scan-analysis
RUN npm run build -w api

FROM node:22-alpine AS runtime
WORKDIR /repo

RUN addgroup -S structura && adduser -S structura -G structura
RUN apk add --no-cache git

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/engine/package.json packages/engine/
COPY packages/source-ingest/package.json packages/source-ingest/
COPY packages/scan-analysis/package.json packages/scan-analysis/

RUN npm ci -w api --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=build /repo/packages/engine/dist packages/engine/dist
COPY --from=build /repo/packages/engine/schema packages/engine/schema
COPY --from=build /repo/packages/engine/data packages/engine/data
COPY --from=build /repo/packages/engine/grammars.manifest.json packages/engine/
COPY --from=build /repo/packages/source-ingest/dist packages/source-ingest/dist
COPY --from=build /repo/packages/scan-analysis/dist packages/scan-analysis/dist
COPY --from=build /repo/packages/scan-analysis/schema packages/scan-analysis/schema
COPY --from=build /repo/packages/scan-analysis/configs packages/scan-analysis/configs
COPY --from=build /repo/apps/api/dist apps/api/dist

WORKDIR /repo/apps/api
ENV NODE_ENV=production
EXPOSE 4100
USER structura
CMD ["node", "dist/index.js"]
