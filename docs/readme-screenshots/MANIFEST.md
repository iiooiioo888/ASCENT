# README 截圖素材（stack tip）

| 項 | 值 |
| --- | --- |
| Git tip | `cf2f53fb5b9fccf5957c14e87c342a4cadcafcd7`（#19 / `cursor/mk-fe-2-market-feedback-4824` 合佊後） |
| 擷取方式 | `apps/web` Vite + Playwright；主介面來自 `prg-demo` harness；水井／耗盡／商行來自 `stack-tip-demo.html` |
| 分支 | `cursor/pr-screenshots-6ff9` |

## 檔案清單

| 檔案 | 內容摘要 |
| --- | --- |
| `01-main-ui-hud-buildings.png` | HUD（品牌、遊戲時鐘、timeScale、離線 chip）、背包、產業鏈、田／倉建築卡 |
| `02-well-building-card.png` | 水井建築卡（高亮）、汲水方式 |
| `03-depletion-ctas-well-seed-market.png` | 耗盡橫幅：「用水井汲水」「用小麥留種」「前往商行」（商行 CTA 主色） |
| `04-trading-post-market-panel-hud-gold.png` | HUD 🪙 10、莊外商行卡、「交易」展開 MarketPanel（買／賣、金幣 10） |
| `05-depletion-go-market-scroll-highlight.png` | 耗盡 CTA + 水井卡 + 商行卡捲動高亮（「前往商行」情境） |

## 重新擷取

```bash
cd apps/web
pnpm run screenshot:pr-g          # 01 來源（會寫入 apps/web/screenshots/，需手動複製或改腳本）
node scripts/capture-stack-tip-screenshots.mjs
```
