FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NODE_ENV=production PORT=10000
EXPOSE 10000
CMD ["npx", "tsx", "src/index.ts"]
