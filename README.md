# Cloudflare Drop

基於 Cloudflare Worker、D1Database 和 KV 實作的輕量級檔案分享工具。

<img src="assets/IMG_5810.png" width="200">
<img src="assets/IMG_5811.png" width="200">
<img src="assets/IMG_5812.png" width="200">
<img src="assets/IMG_5813.png" width="200">

## 自動部署

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/bs10081/cloudflare-drop)

1. 點擊按鈕，跳轉至自動部署頁面
2. 依照頁面指引，關聯 GitHub & Cloudflare，設定 Cloudflare Account ID & API Key
3. Fork 儲存庫
4. 開啟 Action
5. 部署

> 建立 Cloudflare API Key 時，如果使用 worker 範本建立，請記得加入 D1 的編輯權限。

## 設定 GitHub Action Secret

1. 在初次部署完成後，還需要建立 [D1Database](https://developers.cloudflare.com/d1/get-started/#2-create-a-database) & [KV](https://developers.cloudflare.com/kv/get-started/#2-create-a-kv-namespace)，請參考對應文件。
2. 設定 Secret：在已 fork 的儲存庫中 -> **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**
3. 設定以下 Secret：
   - CUSTOM_DOMAIN （選填，網域名稱，例如 drop.example.cn）
   - D1_ID (D1Database ID)
   - D1_NAME (D1Database Name)
   - KV_ID (KV Namespace ID)
4. 重新執行 Github Actions

## 其他設定

### 檔案大小限制

預設檔案限制為 10M，可以透過新增 Action 變數來修改。

新增 `SHARE_MAX_SIZE_IN_MB` Action 變數，值為最大允許的 MB 數字，例如 20，設定路徑：在已 fork 的儲存庫中 -> **Settings** -> **Secrets and variables** -> **Actions** -> **New repository variable**

### 分享過期時間設定

分享預設有效期為一小時，可以透過新增 Action 變數來修改。

新增 `SHARE_DURATION` Action 變數，設定格式為 `數值+單位`，例如 (5minute)，支援的單位有 `minute`, `hour`, `day`, `week`, `month`, `year`

### 新增 IP 上傳頻率限制

預設無限制，可以透過新增 Action 變數來修改。

新增 `RATE_LIMIT` Action 變數，值為每 10 秒可請求數，例如 10

## 過期清理

Worker 新增了一個 10 分鐘的定時任務，自動清理過期的 KV 儲存和 D1 中的記錄。
