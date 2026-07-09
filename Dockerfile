FROM node:22-alpine

WORKDIR /app

COPY --chown=node:node game ./game
COPY --chown=node:node telegram ./telegram

RUN mkdir -p /app/game/data && chown -R node:node /app/game/data

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5178

EXPOSE 5178

USER node

CMD ["node", "game/server.mjs"]
