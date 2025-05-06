FROM node:20

# ネイティブモジュールのビルドに必要な可能性のあるツールをインストールします
# (Debian/Ubuntuベースの公式Nodeイメージ用)
RUN apt-get update && \
    apt-get install -y python3 make g++ --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY admin/package*.json ./

RUN npm install

COPY admin/ .

EXPOSE 3000
CMD ["npm", "run", "dev"]