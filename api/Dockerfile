FROM golang:1.26

WORKDIR /app

# 必要なパッケージをインストール
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y locales imagemagick libheif-dev && \
    locale-gen ja_JP.UTF-8 && \
    echo "export LANG=ja_JP.UTF-8" >> ~/.bashrc && \
    rm -rf /var/lib/apt/lists/*

# 環境変数を設定
ENV CGO_ENABLED=0
ENV GOOS=linux
ENV LANG=ja_JP.UTF-8
ENV LANGUAGE=en_US:

# Airをインストール
# NOTE: air は v1.67.2 以降 go >= 1.26.0 を要求する。
#       air の pin を上げるときは上の FROM の Go バージョンも必ず確認すること。
#       @latest は使わない（過去2回、air の Go 要求引き上げでビルドが壊れている: e360bd1 / 2026-07）
RUN go install github.com/air-verse/air@v1.67.3

# Go関連ファイルを先にコピー
COPY go.mod go.sum ./
RUN go mod download

# 残りのファイルをコピー
COPY . .

# ファイルの存在確認
RUN echo "=== Files in /app ===" && ls -la
RUN echo "=== Checking start.sh ===" && ls -la start.sh || echo "start.sh not found"

# start.shに実行権限を付与（存在する場合）
RUN if [ -f start.sh ]; then chmod +x start.sh; fi

# デフォルトコマンド（配列形式で指定）
CMD ["/bin/bash", "./start.sh"]