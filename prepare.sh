#!/usr/bin/env bash

set +e

# Create wrangler.toml file
cat ./wrangler.example.toml > ./wrangler.toml

# 準備根層級和 production 環境的設定
root_config=""
prod_config="[env.production]\n"

if [ -n "$CUSTOM_DOMAIN" ]; then
  root_config="${root_config}route = { pattern = \"${CUSTOM_DOMAIN}\", custom_domain = true }\n"
  prod_config="${prod_config}route = { pattern = \"${CUSTOM_DOMAIN}\", custom_domain = true }\n"
else
  root_config="${root_config}workers_dev = true\n"
  prod_config="${prod_config}workers_dev = true\n"
fi

if [ -n "$D1_ID" ] && [ -n "$D1_NAME" ]; then
  db_config="d1_databases = [{ binding = \"DB\", database_name = \"$D1_NAME\", database_id = \"$D1_ID\", migrations_dir = \"data/migrations\" }]"
  root_config="${root_config}${db_config}\n"
  prod_config="${prod_config}${db_config}\n"
fi

if [ -n "$KV_ID" ]; then
  kv_config="kv_namespaces = [{ binding = \"file_drops\", id = \"$KV_ID\" }]"
  root_config="${root_config}${kv_config}\n"
  prod_config="${prod_config}${kv_config}\n"
fi

if [ -n "$R2_BUCKET_NAME" ]; then
  r2_config="r2_buckets = [{ binding = \"FILE_BUCKET\", bucket_name = \"$R2_BUCKET_NAME\" }]"
  root_config="${root_config}${r2_config}\n"
  prod_config="${prod_config}${r2_config}\n"
fi

if [ -n "$RATE_LIMIT" ]; then
  rate_limit_config="unsafe = { bindings = [{ name = \"UPLOAD_LIMIT\", type = \"ratelimit\", namespace_id = \"1001\", simple = { limit = 1, period = 10 } }] }"
  root_config="${root_config}${rate_limit_config}\n"
  prod_config="${prod_config}${rate_limit_config}\n"
fi

# 設定環境變數
vars_line="vars = {"

if [ -n "$SHARE_DURATION" ]; then
  vars_line="$vars_line SHARE_DURATION = \"$SHARE_DURATION\","
fi

# 如果沒有設定 SHARE_MAX_SIZE_IN_MB，使用預設值 25
if [ -n "$SHARE_MAX_SIZE_IN_MB" ]; then
  vars_line="$vars_line SHARE_MAX_SIZE_IN_MB = \"$SHARE_MAX_SIZE_IN_MB\","
else
  vars_line="$vars_line SHARE_MAX_SIZE_IN_MB = \"25\","
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
  root_config="${root_config}${vars_line}\n"
  prod_config="${prod_config}${vars_line}\n"
fi

# 寫入所有設定
echo -e "$root_config" >> ./wrangler.toml
echo -e "$prod_config" >> ./wrangler.toml

# Build web
npm run build:web

if [ -n "$D1_ID" ] && [ -n "$D1_NAME" ]; then
  # 刪除資料庫
  yes | npx wrangler d1 execute "$D1_NAME" --remote --env production --command "DROP TABLE IF EXISTS chunks; DROP TABLE IF EXISTS files;"
  # 應用基礎遷移
  yes | npx wrangler d1 migrations apply "$D1_NAME" --remote --env production
fi
