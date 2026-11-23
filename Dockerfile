FROM node:22-slim

WORKDIR /app

# Primero solo package*.json: así Docker cachea npm install
# y no lo repite salvo que cambien las dependencias
COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run","dev"]