#!/usr/bin/env bash

set +e

# 建立全新的 wrangler.toml
echo "name = \"cloudflare-drop\"" > wrangler.toml
echo "main = \"src/index.ts\"" >> wrangler.toml
echo "compatibility_date = \"2024-01-01\"" >> wrangler.toml

# 設定基本配置
if [ -n "$CUSTOM_DOMAIN" ]; then
  echo "route = { pattern = \"${CUSTOM_DOMAIN}\", custom_domain = true }" >> ./wrangler.toml
else
  echo "workers_dev = true" >> ./wrangler.toml
fi

# 根層級設定
config=""

# 設定 D1 資料庫
if [ -n "$D1_ID" ] && [ -n "$D1_NAME" ]; then
  config="${config}d1_databases = [{ binding = \"DB\", database_name = \"$D1_NAME\", database_id = \"$D1_ID\", migrations_dir = \"data/migrations\" }]\n"
fi

# 設定 KV namespace
if [ -n "$KV_ID" ]; then
  config="${config}kv_namespaces = [{ binding = \"file_drops\", id = \"$KV_ID\" }]\n"
fi

# 設定 R2 bucket
if [ -n "$R2_BUCKET_NAME" ]; then
  config="${config}r2_buckets = [{ binding = \"FILE_BUCKET\", bucket_name = \"$R2_BUCKET_NAME\" }]\n"
fi

# 設定上傳限制
if [ -n "$RATE_LIMIT" ]; then
  config="${config}unsafe = { bindings = [{ name = \"UPLOAD_LIMIT\", type = \"ratelimit\", namespace_id = \"1001\", simple = { limit = 1, period = 10 } }] }\n"
fi

# 設定環境變數
vars_config=""
if [ -n "$SHARE_DURATION" ]; then
  vars_config="${vars_config}SHARE_DURATION = \"$SHARE_DURATION\","
fi
if [ -n "$SHARE_MAX_SIZE_IN_MB" ]; then
  vars_config="${vars_config}SHARE_MAX_SIZE_IN_MB = \"$SHARE_MAX_SIZE_IN_MB\","
fi
if [ -n "$R2_ACCESS_KEY_ID" ]; then
  vars_config="${vars_config}R2_ACCESS_KEY_ID = \"$R2_ACCESS_KEY_ID\","
fi
if [ -n "$R2_SECRET_ACCESS_KEY" ]; then
  vars_config="${vars_config}R2_SECRET_ACCESS_KEY = \"$R2_SECRET_ACCESS_KEY\","
fi
if [ -n "$R2_BUCKET_NAME" ]; then
  vars_config="${vars_config}R2_BUCKET_NAME = \"$R2_BUCKET_NAME\","
fi

# 如果有環境變數，加入到配置中
if [ -n "$vars_config" ]; then
  # 移除最後一個逗號
  vars_config=${vars_config%,}
  config="${config}vars = { $vars_config }\n"
fi

# 寫入根層級設定
echo -e "$config" >> ./wrangler.toml

# 寫入 production 環境設定
echo -e "\n[env.production]" >> ./wrangler.toml
echo -e "$config" >> ./wrangler.toml

# 建置和部署
npm run generate
npm run build:web

if [ -n "$D1_ID" ] && [ -n "$D1_NAME" ]; then
  yes | npx wrangler d1 migrations apply "$D1_NAME" --remote --env production
fi
