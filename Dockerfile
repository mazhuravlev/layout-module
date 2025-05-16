FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/layout-module/package.json ./packages/layout-module/
COPY packages/demo/package.json ./packages/demo/

RUN pnpm install --frozen-lockfile

COPY . .