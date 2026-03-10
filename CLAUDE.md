# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cloudflare Drop 是一個基於 Cloudflare Workers 的輕量級文件分享工具，使用 D1 Database（SQLite）和 KV 存儲實現文件上傳、分享和管理功能。

**技術棧**：

- **後端**: Cloudflare Workers + Hono (Web framework) + Chanfana (OpenAPI)
- **數據庫**: Drizzle ORM + D1 Database (SQLite)
- **存儲**: Cloudflare KV (文件二進制存儲)
- **前端**: Preact + Vite + MobX + Material-UI
- **包管理器**: pnpm (必須使用，不要用 npm 或 yarn)

## Development Commands

### 本地開發

```bash
# 首次啟動前的準備工作（生成 wrangler.toml、應用遷移）
pnpm prestart

# 同時啟動前後端開發伺服器（推薦）
pnpm start

# 僅啟動前端（Vite dev server，端口由 SHARE_PORT 環境變量決定）
pnpm dev:web

# 僅啟動 Worker（Wrangler dev server，監聽 0.0.0.0）
pnpm dev:app
```

### 構建和部署

```bash
# 構建前端靜態資源
pnpm build:web

# 生成數據庫遷移文件（修改 schema 後執行）
pnpm generate

# 部署到生產環境（包含前置任務：構建前端 + 生成遷移 + 應用遷移）
pnpm deploy
```

### 數據庫遷移

```bash
# 應用本地 D1 遷移
wrangler d1 migrations apply airdrop --local

# 應用生產環境遷移
wrangler d1 migrations apply airdrop --remote --env production
```

### 代碼質量

```bash
# 自動格式化和修復 lint 錯誤
pnpm lint
```

## Architecture

### 後端架構（Cloudflare Worker）

**入口**: `src/index.ts`
使用 Hono 框架構建 API，通過 Chanfana 提供 OpenAPI 支持。

**核心組件**:

- **Endpoint 基類** (`src/endpoint.ts`): 所有 API 端點的基類

  - `getDB(c)`: 獲取 Drizzle D1 Database 實例
  - `getKV(c)`: 獲取 KV Namespace 實例
  - `success(data)`: 統一成功響應格式
  - `error(message)`: 統一錯誤響應格式

- **中間件系統** (`src/middlewares/`):

  - `db.middleware.ts`: 注入 Drizzle DB 實例到 context
  - `auth.middleware.ts`: 管理後台認證（驗證 ADMIN_TOKEN）
  - `limit.middleware.ts`: 上傳頻率限制（使用 Cloudflare Rate Limit API）
  - `terminal.middleware.ts`: 終端處理中間件

- **文件處理** (`src/files/`):

  - `fileCreate.ts`: 創建文件分享記錄
  - `fileChunkCreate.ts`: 上傳文件分塊（支持大文件分塊上傳）
  - `mergeFileChunk.ts`: 合併文件分塊
  - `fileFetch.ts`: 下載文件
  - `fileShareCodeFetch.ts`: 根據分享碼獲取文件信息

- **管理後台** (`src/admin/`):

  - `listShares.ts`: 列出所有分享
  - `deleteShare.ts`: 刪除分享
  - `getInfo.ts`: 獲取統計信息

- **定時任務** (`src/scheduled.ts`):
  每 10 分鐘執行一次，清理過期的 KV 存儲和 D1 記錄（見 `wrangler.example.toml` 的 `triggers.crons`）

### 前端架構（Preact）

**入口**: `web/index.tsx`
使用 Preact + MobX 狀態管理 + Material-UI 組件庫。

**目錄結構**:

- `web/views/`: 頁面組件
  - `Home/`: 首頁（文件上傳和分享）
  - `Admin/`: 管理後台
- `web/components/`: 可重用組件
- `web/api/`: API 客戶端（Axios）
- `web/theme/`: Material-UI 自定義主題
- `web/helpers/`: 工具函數

### 數據庫架構（D1 + Drizzle）

**Schema 定義**: `data/schemas/files.schema.ts`
**遷移目錄**: `data/migrations/`
**配置文件**: `data/drizzle.config.ts`

主要表結構：

- `files`: 文件分享記錄
  - `id`: 主鍵（CUID2）
  - `objectId`: KV 中的文件 ID
  - `filename`: 文件名
  - `hash`: 文件 hash 值
  - `code`: 分享碼（唯一）
  - `size`: 文件大小
  - `is_ephemeral`: 是否閱後即焚
  - `expires_at`: 過期時間
  - `created_at`: 創建時間

## Environment Configuration

### 本地開發

創建 `.dev.vars` 文件（參考 `.dev.vars.example`）：

```bash
ADMIN_TOKEN=your-admin-token
SHARE_DURATION=1hour
SHARE_MAX_SIZE_IN_MB=10
```

### Cloudflare 配置

需要在 Cloudflare Dashboard 創建：

1. **D1 Database** (名稱: `airdrop`)
2. **KV Namespace** (binding: `file_drops`)

然後配置 `wrangler.toml`（可通過 `prepare.sh` 自動生成）：

- `D1_ID` 和 `D1_NAME`: D1 Database 配置
- `KV_ID`: KV Namespace ID
- `CUSTOM_DOMAIN`: 自定義域名（可選）
- `RATE_LIMIT`: 上傳頻率限制（每 10 秒的請求數）

## Key Patterns

### API 響應格式

所有 API 端點使用統一的響應格式（來自 `Endpoint` 基類）：

```typescript
// 成功
{ message: 'ok', result: true, data: <payload> }

// 錯誤
{ message: <error message>, result: false, data: null }
```

### 文件上傳流程

1. 前端將大文件分塊（通過 `fileChunkCreate` 端點）
2. 所有分塊上傳完成後調用 `mergeFileChunk` 合併
3. 合併後返回分享碼和下載鏈接

### 分享碼生成

使用 CUID2 生成唯一的分享碼（見 `@paralleldrive/cuid2`）

### 認證機制

管理後台通過 URL 路徑中的 token 認證：
`/admin/{ADMIN_TOKEN}` - 訪問管理後台
後端通過 `auth.middleware.ts` 驗證

## Important Notes

- **使用 pnpm**: 項目配置了 `packageManager: "pnpm@9.15.3"`，必須使用 pnpm
- **TypeScript 配置**: 專案有多個 tsconfig 文件：
  - `tsconfig.web.json`: 前端配置
  - `tsconfig.worker.json`: Worker 配置
  - `tsconfig.node.json`: Node.js 工具配置
- **Drizzle Schema 修改**: 修改 `data/schemas/*.schema.ts` 後必須執行 `pnpm generate` 生成遷移
- **Worker 限制**:
  - Cloudflare Workers 有 CPU 時間限制（免費版 10ms，付費版 50ms）
  - 文件通過 KV 存儲，單個值最大 25MB
- **定時任務**: Cron 觸發器僅在生產環境運行，本地開發不會執行
- **Husky Git Hooks**: 提交前會自動執行 `prettier` 和 `eslint`（見 `lint-staged` 配置）
