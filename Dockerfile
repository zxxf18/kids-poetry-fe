FROM public.ecr.aws/docker/library/node:22-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM public.ecr.aws/docker/library/node:22-alpine
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=builder --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
# Vinext currently emits basePath assets below dist/client/poetry/_next, while
# its production static handler resolves _next from the client root. Nginx
# strips /poetry for this one route, so expose the same immutable bundle there.
RUN cp -a ./dist/client/poetry/_next ./dist/client/_next
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:3000/poetry/ || exit 1
CMD ["npm", "run", "start", "--", "-p", "3000", "-H", "0.0.0.0"]
