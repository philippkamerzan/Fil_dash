FROM node:22-alpine

WORKDIR /app

ARG TARGETARCH
RUN apk add --no-cache ca-certificates curl && \
    arch="${TARGETARCH:-amd64}" && \
    case "$arch" in \
      amd64) cloudflared_arch="amd64" ;; \
      arm64) cloudflared_arch="arm64" ;; \
      *) echo "Unsupported TARGETARCH: $arch" >&2; exit 1 ;; \
    esac && \
    curl -fsSL \
      "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${cloudflared_arch}" \
      -o /usr/local/bin/cloudflared && \
    chmod +x /usr/local/bin/cloudflared

COPY --chown=node:node game ./game
COPY --chown=node:node telegram ./telegram

RUN mkdir -p /app/game/data && chown -R node:node /app/game/data

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5178

EXPOSE 5178

USER node

CMD ["node", "game/server.mjs"]
