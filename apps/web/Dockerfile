# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/

RUN npm ci -w web --ignore-scripts

FROM deps AS build-viewer
COPY apps/web/tsconfig.json apps/web/tsconfig.app.json apps/web/tsconfig.node.json apps/web/
COPY apps/web/index.html apps/web/viewer/index.html apps/web/
COPY apps/web/vite.config.ts apps/web/vite.viewer.config.ts apps/web/vite-csp-hash.ts apps/web/
COPY apps/web/public apps/web/public
COPY apps/web/src apps/web/src

RUN npm run build:viewer -w web

FROM nginx:1.27-alpine AS viewer
COPY --from=build-viewer /repo/apps/web/dist-viewer /usr/share/nginx/html
EXPOSE 80

FROM deps AS dev
COPY apps/web apps/web
WORKDIR /repo
EXPOSE 5173
USER node
CMD ["npm", "run", "dev", "-w", "web", "--", "--host", "0.0.0.0", "--port", "5173"]
