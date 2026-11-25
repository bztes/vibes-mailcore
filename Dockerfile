# Runs natively on the runner: the output is platform-independent JS, and vite's
# native binaries crash with SIGILL under QEMU arm64 emulation.
# --platform must be on an image, not a stage: a stage reference keeps the target platform.
FROM --platform=$BUILDPLATFORM node:24-slim AS build
WORKDIR /app
RUN npm install -g pnpm@12.21.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Dependencies for the target platform: native packages (@node-rs/argon2) ship per-platform binaries.
FROM node:24-slim AS deps
WORKDIR /app
RUN npm install -g pnpm@12.21.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/build ./build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/drizzle ./drizzle
EXPOSE 3000
# Polls /health (src/routes/health/+server.ts); node, as the slim image has neither curl nor wget.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
	CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
USER node
CMD ["node", "build"]
