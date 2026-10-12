FROM node:20-alpine

ENV NODE_ENV=development
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

RUN chown -R node:node /app
USER node

EXPOSE 8000

CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "8000", "--strictPort"]