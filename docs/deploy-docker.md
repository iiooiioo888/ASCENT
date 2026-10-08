# Docker 正式環境部署（Ubuntu VPS）

本文件說明如何在 Ubuntu 22.04+ VPS 上用 **Docker Compose** 部署《帝國掘起》 monorepo：`postgres` + NestJS `api` + 以 **nginx** 提供靜態前端並反向代理 `/api`。

本機工程預設仍可用 SQLite（`pnpm setup:db`）；**Compose 正式棧固定使用 PostgreSQL**（與 `apps/api/prisma/migrations` 一致）。

## 架構

```text
瀏覽器 :HTTP_PORT
    │
    ▼
┌─────────────┐     /api/*     ┌─────────────┐
│  web (nginx)│ ─────────────► │  api (Nest) │
│  靜態 SPA   │                │  :3000      │
└─────────────┘                └──────┬──────┘
                                      │
                                      ▼
                               ┌─────────────┐
                               │  postgres   │
                               └─────────────┘
```

- 前端以相對路徑呼叫 `/api/v1/...`（與 Vite 開發代理相同），由 nginx 轉發至 `api`。
- 首次啟動時 API 會執行 `prisma migrate deploy`；若資料庫尚無玩家資料則自動 `seed`（可重複 `up` 而不會每次清空已有進度）。

## 需求

| 項目 | 建議 |
| --- | --- |
| OS | Ubuntu 22.04 LTS 或更新 |
| RAM | ≥ 2 GB |
| 磁碟 | ≥ 10 GB 可用 |
| 軟體 | Docker Engine 24+、Docker Compose v2 |

### 安裝 Docker（Ubuntu）

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker "$USER"
# 重新登入後驗證：
docker compose version
```

## 部署步驟

在 VPS 上 clone 本 repo（或上傳發佈 tarball），於**專案根目錄**操作。

### 1. 設定環境變數

```bash
cp .env.production.example .env.production
```

編輯 `.env.production`：

- **`POSTGRES_PASSWORD`**：改為強密碼（必填；Compose 會拒絕未設定）。
- **`HTTP_PORT`**：對外埠，預設 `8080`（80 需 root 權限或另行配置）。
- **`PUBLIC_WEB_ORIGIN`**：玩家實際開啟遊戲的 URL（含埠），供 API CORS 使用。  
  例：VPS IP 為 `203.0.113.10`、埠 `8080` → `PUBLIC_WEB_ORIGIN=http://203.0.113.10:8080`

### 2. 建置並啟動

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up --build -d
```

首次建置會編譯 `@ascent/shared`、`@ascent/api`、`@ascent/web`，並拉取 `postgres:16-alpine`。映像建置**不需要**在 VPS 安裝 Python／node-gyp（正式 API 映像使用 PostgreSQL，會略過 `better-sqlite3` 的原生編譯腳本）。

### 3. 驗證

```bash
# 服務狀態（api / web 應為 healthy）
docker compose -f docker-compose.prod.yml --env-file .env.production ps

# API 健康（經 nginx 同域）
curl -fsS "http://127.0.0.1:${HTTP_PORT:-8080}/api/v1/state" | head -c 200
echo

# 前端
curl -fsSI "http://127.0.0.1:${HTTP_PORT:-8080}/" | head -n 5
```

在瀏覽器開啟 `http://<VPS_IP>:<HTTP_PORT>/`，應能看到建築、庫存並可進行採集等操作。

### 4. 日誌與更新

```bash
# 追蹤日誌
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f api web

# 拉取新程式碼後重建
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up --build -d
```

### 5. 停止與資料

```bash
# 停止容器（保留 Postgres volume）
docker compose -f docker-compose.prod.yml --env-file .env.production down

# 停止並刪除資料庫 volume（會清掉所有進度）
docker compose -f docker-compose.prod.yml --env-file .env.production down -v
```

## 環境變數參考

| 變數 | 說明 | 預設 |
| --- | --- | --- |
| `POSTGRES_USER` | DB 使用者 | `ascent` |
| `POSTGRES_PASSWORD` | DB 密碼 | **必填** |
| `POSTGRES_DB` | DB 名稱 | `ascent` |
| `HTTP_PORT` | 對外 HTTP 埠 | `8080` |
| `API_PORT` | API 容器內埠 | `3000` |
| `PUBLIC_WEB_ORIGIN` | CORS 允許的網頁來源 | `http://localhost:8080` |

`DATABASE_URL` 由 Compose 依 Postgres 服務自動組裝，無需在 `.env.production` 手動設定。

## 疑難排解

| 現象 | 可能原因 | 處理 |
| --- | --- | --- |
| 瀏覽器可開頁但 API 失敗 | `PUBLIC_WEB_ORIGIN` 與實際 URL 不符 | 改成完整來源（含 `http://` 與埠）後 `docker compose ... up -d` 重建 `api` |
| `api` 一直 restarting | Postgres 未就緒或密碼錯誤 | `docker compose ... logs api postgres` |
| 502 / 空白 API | `api` 尚未 healthy | 等待 seed／migration 完成或查 `api` 日誌 |
| 想重置世界 | — | `down -v` 後再 `up --build`（會重新 migrate + seed） |

## 本機試跑正式 Compose（選用）

在開發機上可不經 VPS 驗證同一套檔案：

```bash
cp .env.production.example .env.production
# 編輯 POSTGRES_PASSWORD
docker compose -f docker-compose.prod.yml --env-file .env.production up --build
```

開啟 http://localhost:8080（或你設定的 `HTTP_PORT`）。

## 相關檔案

| 路徑 | 用途 |
| --- | --- |
| `docker-compose.prod.yml` | 正式三服務編排 |
| `apps/api/Dockerfile` | API 多階段映像 |
| `apps/api/docker-entrypoint.sh` | 啟動前 `migrate deploy`、空庫自動 seed、以 `dist/src/main.js` 啟動 Nest |
| `apps/web/Dockerfile` | Web 建置 + nginx |
| `apps/web/nginx.conf` | 靜態檔與 `/api` 代理 |
| `.env.production.example` | 環境變數範本 |

開發用僅 Postgres 的 `docker-compose.yml` 不受影響。
