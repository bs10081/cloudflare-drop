#!/usr/bin/env bash

set +e

# Create wrangler.toml file
cat ./wrangler.example.toml > ./wrangler.toml

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
  rate_limit_config="unsafe = { bindings = [{ name = \"UPLOAD_LIMIT\", type = \"ratelimit\", namespace_id = \"1001\", simple = { limit = 1, period = 10 } }] }"
  echo -e "$rate_limit_config" >> ./wrangler.toml
  echo -e "[env.production]\n$rate_limit_config" >> ./wrangler.toml
fi

# 設定環境變數
vars_line="vars = {"

if [ -n "$SHARE_DURATION" ]; then
  vars_line="$vars_line SHARE_DURATION = \"$SHARE_DURATION\","
fi

if [ -n "$SHARE_MAX_SIZE_IN_MB" ]; then
  vars_line="$vars_line SHARE_MAX_SIZE_IN_MB = \"$SHARE_MAX_SIZE_IN_MB\","
fi

if [ -n "$R2_ACCESS_KEY_ID" ]; then
  vars_line="$vars_line R2_ACCESS_KEY_ID = \"$R2_ACCESS_KEY_ID\","
fi

if [ -n "$R2_SECRET_ACCESS_KEY" ]; then
  vars_line="$vars_line R2_SECRET_ACCESS_KEY = \"$R2_SECRET_ACCESS_KEY\","
fi

if [ -n "$R2_BUCKET_NAME" ]; then
  vars_line="$vars_line R2_BUCKET_NAME = \"$R2_BUCKET_NAME\","
fi

# 如果有任何環境變數，移除最後一個逗號並寫入
if [ "$vars_line" != "vars = {" ]; then
  vars_line="${vars_line%,} }"
  echo -e "$vars_line" >> ./wrangler.toml
fi

# Generate migration
npm run generate

# Build web
npm run build:web

if [ -n "$D1_ID" ] && [ -n "$D1_NAME" ]; then
  # 嘗試執行遷移
  if ! yes | npx wrangler d1 migrations apply "$D1_NAME" --remote --env production; then
    echo "Migration failed, trying to clean up and reapply migrations..."
    # 刪除資料庫
    yes | npx wrangler d1 execute "$D1_NAME" --remote --env production --command "DROP TABLE IF EXISTS chunks; DROP TABLE IF EXISTS files;"
    # 重新應用遷移
    yes | npx wrangler d1 migrations apply "$D1_NAME" --remote --env production
  fi
fi
