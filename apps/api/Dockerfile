FROM node:22-bookworm-slim

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8787 \
    DB_PATH=/var/lib/dmahub/dma-hub.sqlite

WORKDIR /opt/dma-hub
COPY apps/api/package.json ./package.json
COPY apps/api/src/ ./src/

RUN mkdir -p /var/lib/dmahub && chown node:node /var/lib/dmahub
USER node
EXPOSE 8787
VOLUME ["/var/lib/dmahub"]

CMD ["node", "src/server.mjs"]
