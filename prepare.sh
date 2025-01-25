#!/usr/bin/env bash

set +e

# Create wrangler.toml file
cp wrangler.example.toml wrangler.toml

# 設定基本配置
if [ -n "$CUSTOM_DOMAIN" ]; then
  echo "route = { pattern = \"${CUSTOM_DOMAIN}\", custom_domain = true }" >> ./wrangler.toml
else
  echo "workers_dev = true" >> ./wrangler.toml
fi

# 設定 D1 資料庫
if [ -n "$D1_ID" ] && [ -n "$D1_NAME" ]; then
  sed -i "s/database_id = \".*\"/database_id = \"$D1_ID\"/" ./wrangler.toml
fi

# 設定 KV namespace
if [ -n "$KV_ID" ]; then
  sed -i "s/id = \".*\"/id = \"$KV_ID\"/" ./wrangler.toml
fi

# 設定 R2 bucket
if [ -n "$R2_BUCKET_NAME" ]; then
  sed -i "s/bucket_name = \".*\"/bucket_name = \"$R2_BUCKET_NAME\"/" ./wrangler.toml
fi

# 設定上傳限制
if [ -n "$RATE_LIMIT" ]; then
  echo -e "unsafe = { bindings = [{ name = \"UPLOAD_LIMIT\", type = \"ratelimit\", namespace_id = \"1001\", simple = { limit = 1, period = 10 } }] }" >> ./wrangler.toml
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
if [ "$vars_line" != "vars = {" ]; then
  # 移除最後一個逗號並加上結束括號
  vars_line="${vars_line%,} }"
  echo -e "$vars_line" >> ./wrangler.toml
fi

# 建置和部署
npm run generate
npm run build:web

if [ -n "$D1_ID" ] && [ -n "$D1_NAME" ]; then
  yes | npx wrangler d1 migrations apply "$D1_NAME" --remote --env production
fi
