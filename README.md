# Cloudflare Drop

基於 Cloudflare Worker、D1Database 和 KV 實作的輕量級檔案分享工具。

<img src="assets/IMG_5810.png" width="200">
<img src="assets/IMG_5811.png" width="200">
<img src="assets/IMG_5812.png" width="200">
<img src="assets/IMG_5813.png" width="200">

## 功能特點

- 支援小檔案（≤25MB）使用 KV 儲存
- 支援大檔案使用 R2 分片上傳
- 自動產生分享碼
- 檔案自動過期清理
- 支援上傳頻率限制

## 自動部署

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/bs10081/cloudflare-drop)

### 部署步驟

1. 點擊按鈕，跳轉至自動部署頁面
2. 依照頁面指引，關聯 GitHub & Cloudflare，設定 Cloudflare Account ID & API Key
3. Fork 儲存庫
4. 開啟 Action
5. 部署

> 建立 Cloudflare API Key 時，需要包含以下權限：
> - Workers 部署權限
> - D1 資料庫權限
> - KV 讀寫權限
> - R2 讀寫權限

## 服務設定

### 1. D1 資料庫設定

1. 在 Cloudflare Dashboard 建立 D1 資料庫：
   ```bash
   # 建立資料庫
   wrangler d1 create airdrop
   
   # 取得資料庫資訊
   wrangler d1 list
   ```

2. 在 GitHub Secrets 中設定：
   - `D1_NAME`: 資料庫名稱（例如：airdrop）
   - `D1_ID`: 資料庫 ID

### 2. KV 儲存設定

1. 建立 KV namespace：
   ```bash
   # 建立 namespace
   wrangler kv:namespace create file_drops
   ```

2. 在 GitHub Secrets 中設定：
   - `KV_ID`: KV namespace ID

### 3. R2 儲存設定

1. 在 Cloudflare Dashboard 建立 R2 bucket：
   - 進入 R2 頁面
   - 點擊 "Create bucket"
   - 輸入您想要的 bucket 名稱

2. 建立 R2 API Token：
   - 進入 "R2" -> "Manage R2 API Tokens"
   - 點擊 "Create API Token"
   - 選擇 "Create Custom Token"
   - 設定權限：Account -> R2 -> Edit

3. 在 GitHub Secrets 中設定：
   - `R2_ACCESS_KEY_ID`: R2 存取金鑰 ID
   - `R2_SECRET_ACCESS_KEY`: R2 存取金鑰密碼
   - `R2_BUCKET_NAME`: R2 bucket 名稱（您在步驟 1 中建立的 bucket 名稱）

### 4. 其他設定

在 GitHub Actions Variables 中設定：

1. 檔案大小限制：
   - 名稱：`SHARE_MAX_SIZE_IN_MB`
   - 值：數字，例如 `20`（最大 25）
   - 說明：小於此值的檔案使用 KV，大於此值使用 R2

2. 分享過期時間：
   - 名稱：`SHARE_DURATION`
   - 格式：`數值+單位`
   - 支援單位：`minute`, `hour`, `day`, `week`, `month`, `year`
   - 例如：`1day`、`7day`、`1month`

3. IP 上傳頻率限制：
   - 名稱：`RATE_LIMIT`
   - 值：每 10 秒可請求數
   - 例如：`10`

4. 自訂網域（選填）：
   - 名稱：`CUSTOM_DOMAIN`
   - 值：您的網域，例如 `drop.example.com`

## 本地開發

1. 複製設定檔：
   ```bash
   cp wrangler.example.toml wrangler.toml
   ```

2. 修改 `wrangler.toml`：
   - 填入 D1 資料庫 ID
   - 填入 KV namespace ID
   - 填入 R2 存取金鑰

3. 安裝依賴：
   ```bash
   pnpm install
   ```

4. 執行開發環境：
   ```bash
   pnpm dev
   ```

## 注意事項

1. 檔案儲存：
   - 小於等於設定值（最大 25MB）的檔案使用 KV 儲存
   - 大於設定值的檔案自動使用 R2 分片上傳
   - R2 服務有額外的儲存費用（首 10GB 免費）

2. 檔案清理：
   - 系統每 10 分鐘自動清理過期檔案
   - 同時清理 KV 和 R2 中的檔案

3. 安全性：
   - 請妥善保管 API Token
   - 建議設定適當的上傳頻率限制
   - 可以設定較短的分享過期時間
