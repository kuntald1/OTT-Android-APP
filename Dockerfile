FROM node:18-bullseye

WORKDIR /app

# Install deps first so this layer is cached across code changes
COPY package.json ./
RUN npm install
# Tunnel mode (--tunnel) needs this; pre-installed so the container never
# hits an interactive "install @expo/ngrok?" prompt.
RUN npm install --no-save @expo/ngrok@^4.1.0

# Rest of the source is bind-mounted in docker-compose.yml for live reload,
# but copy it too so `docker build` alone also produces a runnable image.
COPY . .

EXPOSE 8081 19000 19001 19002

CMD ["npx", "expo", "start", "--tunnel"]
