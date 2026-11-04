# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY packages/brand/package.json packages/brand/

RUN npm ci -w web --include=dev --ignore-scripts

FROM deps AS dev
COPY packages/brand/src packages/brand/src
COPY packages/scan-analysis/schema packages/scan-analysis/schema
COPY packages/scan-analysis/src/report.v1.types.ts packages/scan-analysis/src/report.v1.types.ts
COPY apps/web apps/web
RUN chown -R node:node /repo/node_modules /repo/apps/web /repo/packages/brand /repo/packages/scan-analysis
WORKDIR /repo
EXPOSE 5173
USER node
CMD ["npm", "run", "dev", "-w", "web", "--", "--host", "0.0.0.0", "--port", "5173"]
