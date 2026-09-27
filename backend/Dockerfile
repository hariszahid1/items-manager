FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src

RUN addgroup -S app && adduser -S app -G app \
  && mkdir -p /data \
  && touch /data/.keep \
  && chown -R app:app /app /data

ENV PORT=4000
ENV DATA_DIR=/data
EXPOSE 4000

USER app

CMD ["npm", "start"]
