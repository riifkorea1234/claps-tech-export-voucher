FROM node:22.22.0-bookworm-slim@sha256:dd9d21971ec4395903fa6143c2b9267d048ae01ca6d3ea96f16cb30df6187d94 AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install --global pnpm@10.34.5

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS builder
COPY . .
RUN pnpm build

FROM base AS web
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
RUN mkdir -p /app/uploads && chown node:node /app/uploads
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/messages ./messages
USER node
EXPOSE 3000
CMD ["node", "server.js"]

FROM dependencies AS tools
ENV NODE_ENV=production
COPY --chown=node:node db ./db
COPY --chown=node:node lib ./lib
COPY --chown=node:node messages ./messages
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node workers ./workers
COPY tsconfig.json ./
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node

FROM tools AS migrate
CMD ["pnpm", "db:migrate"]

FROM tools AS worker
CMD ["node", "--conditions=react-server", "--import", "tsx", "workers/index.ts"]

FROM dependencies AS test
# The ZIP interoperability test uses Python's independent stdlib reader.
RUN apt-get update && apt-get install -y --no-install-recommends python3 && rm -rf /var/lib/apt/lists/*
COPY . .
RUN chown node:node /app && mkdir -p /app/node_modules/.vite-temp && chown node:node /app/node_modules/.vite-temp
USER node
CMD ["pnpm", "test:unit"]
