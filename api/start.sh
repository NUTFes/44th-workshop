#!/bin/bash
set -e

echo "=== API Server Starting ==="
echo "Current directory: $(pwd)"
echo "User: $(whoami)"

# Goのモジュールを初期化
echo "Running go mod tidy..."
go mod tidy

# データベース接続を待つ（オプション）
echo "Waiting for database..."
sleep 3

# Airがインストールされているか確認
echo "Checking Air installation..."
which air || echo "Air not found in PATH"

# Goのバージョン確認
echo "Go version: $(go version)"

# AirでGoを実行(ホットリロードが有効になる)
echo "Starting with Air..."
exec air -c .air.toml