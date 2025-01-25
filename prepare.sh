#!/usr/bin/env bash

set +e

# Build web first
echo "Building web application..."
npm run build:web

# Create wrangler.toml file
cat ./wrangler.example.toml > ./wrangler.toml

# 開始寫入 [env.production] 設定
echo -e "\n[env.production]" >> ./wrangler.toml
echo -e "assets = { directory = \"./dist/\", binding = \"ASSETS\", html_handling = \"none\", not_found_handling = \"single-page-application\" }" >> ./wrangler.toml

if [ -n "$CUSTOM_DOMAIN" ]; then
  echo "route = { pattern = \"${CUSTOM_DOMAIN}\", custom_domain = true }" >> ./wrangler.toml
else
  echo  "workers_dev = true" >> ./wrangler.toml
fi

if [ -n "$D1_ID" ] && [ -n "$D1_NAME" ]; then
  echo -e "d1_databases = [{ binding = \"DB\", database_name = \"$D1_NAME\", database_id = \"$D1_ID\", migrations_dir = \"data/migrations\" }]" >> ./wrangler.toml
fi

if [ -n "$KV_ID" ]; then
  echo -e  "kv_namespaces = [{ binding = \"file_drops\", id = \"$KV_ID\" }]" >> ./wrangler.toml
fi

if [ -n "$R2_BUCKET_NAME" ]; then
  echo -e  "r2_buckets = [{ binding = \"FILE_BUCKET\", bucket_name = \"$R2_BUCKET_NAME\" }]" >> ./wrangler.toml
fi

if [ -n "$RATE_LIMIT" ]; then
  echo -e  "unsafe = { bindings = [{ name = \"UPLOAD_LIMIT\", type = \"ratelimit\", namespace_id = \"1001\", simple = { limit = 1, period = 10 } }] }" >> ./wrangler.toml
fi

# 設定環境變數
vars=""

if [ -n "$SHARE_DURATION" ]; then
  vars="$vars SHARE_DURATION = \"$SHARE_DURATION\","
fi

# 設定檔案大小限制，預設為 25MB
if [ -n "$SHARE_MAX_SIZE_IN_MB" ]; then
  vars="$vars SHARE_MAX_SIZE_IN_MB = \"$SHARE_MAX_SIZE_IN_MB\","
else
  vars="$vars SHARE_MAX_SIZE_IN_MB = \"25\","
fi

if [ -n "$R2_ACCESS_KEY_ID" ]; then
  vars="$vars R2_ACCESS_KEY_ID = \"$R2_ACCESS_KEY_ID\","
fi

if [ -n "$R2_SECRET_ACCESS_KEY" ]; then
  vars="$vars R2_SECRET_ACCESS_KEY = \"$R2_SECRET_ACCESS_KEY\","
fi

if [ -n "$R2_BUCKET_NAME" ]; then
  vars="$vars R2_BUCKET_NAME = \"$R2_BUCKET_NAME\","
fi

# 添加版本號和部署時間
VERSION=$(git rev-parse --short HEAD)
DEPLOY_TIME=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
vars="$vars VERSION = \"$VERSION\", DEPLOY_TIME = \"$DEPLOY_TIME\","

# 如果有任何環境變數，移除最後一個逗號並寫入
if [ -n "$vars" ]; then
  vars=${vars%,}
  echo -e "vars = {$vars }" >> ./wrangler.toml
fi

if [ -n "$D1_ID" ] && [ -n "$D1_NAME" ]; then
  # 重置資料庫
  yes | npx wrangler d1 execute "$D1_NAME" --remote --env production --command "DROP TABLE IF EXISTS chunks; DROP TABLE IF EXISTS files;"
  
  # 應用所有遷移
  for migration in data/migrations/*.sql; do
    echo "Applying migration: $migration"
    yes | npx wrangler d1 execute "$D1_NAME" --remote --env production --file="$migration"
  done
fi
