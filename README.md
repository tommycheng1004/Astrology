# 紫微命盤

紫微斗數免費線上排盤網站。排盤在使用者的瀏覽器中以 [iztro](https://github.com/SylarLong/iztro) 計算（通行版排法），並自動校正夏令時間、日治時期東京時間、晚子時與閏月；提供格局判定、十二宮解讀、大限到流時的運勢、擇日、合盤與 AI 問答。

## 開發

```bash
npm install
cp .env.example .env.local   # 依需要填入 NEXT_PUBLIC_SITE_URL、GEMINI_API_KEY
npm run dev                  # http://localhost:3000
npm run build && npm start   # 正式建置
```

技術：Next.js 16（App Router、Turbopack）、React 19、TypeScript、Tailwind CSS v4。靜態頁為主，只有 `/api/ask`（AI 問答）在伺服器執行。

## 部署（Netlify）

建置設定在 `netlify.toml`（Netlify 自動套用 Next.js 執行環境）。環境變數清單與步驟見 [docs/netlify-deploy.md](docs/netlify-deploy.md)。

## 會員（Firebase）

Google 登入與 Email 註冊、「我的命盤」雲端同步、AI 每日題數。設定步驟見 [docs/firebase-setup.md](docs/firebase-setup.md)；沒設定時網站照舊運作、不顯示登入。

- 前端只在打開登入視窗或之前登入過時才載入 Firebase（`src/lib/account.ts`），同步用 Firestore Lite（`src/lib/cloudCharts.ts`）。
- 伺服器不用 firebase-admin：`src/lib/server/firebase.ts` 以 jose 驗證 ID token、以 Firestore REST API 記錄每日題數。
  伺服器程式不可 import `firebase` 套件（它帶的 `@grpc/grpc-js` 有伺服器端漏洞公告，前端用不到）。
- 安全規則在 `firestore.rules`，修改後要到 Firebase 後台發布，並跑 `npx tsx scripts/check-rules.ts`（需模擬器）。
- 之後若加資安標頭，`Cross-Origin-Opener-Policy` 要用 `same-origin-allow-popups`，否則 Google 登入的彈出視窗會失效。

## 字型

全站使用自架的 Noto Serif TC 子集（`src/app/fonts/`）。程式或文案新增中文字後要重跑：

```bash
npm run font:subset   # 由 src/ 用字重新產生子集（原始字型自動下載到 fonts-src/）
npm run font:check    # 檢查子集是否已涵蓋所有用字
```

## 驗證腳本

```bash
npx tsx scripts/verify-chart.ts     # 以古法安星驗算 iztro 排盤（1900–2100 隨機 3,000 盤、33 項）
npx tsx scripts/verify-lunar.ts     # 農曆曆表逐日比對
npx tsx scripts/verify-periods.ts   # 以斗君古訣驗算流月、流日、流時、各層四化與流曜，並檢查擇日因人而異
npx tsx scripts/check-readings.ts   # 解讀文字與格局的一致性
npx tsx scripts/check-periods.ts    # 運勢卡片與詳情分數一致
npx tsx scripts/check-birthtime.ts  # 出生時間校正、閏月、童限的回歸測試
npx tsx scripts/check-folk.ts       # 農民曆避忌（歲破、月破、農曆七月）、節氣表、流年頁資料與擇日排除
npx tsx scripts/check-rules.ts      # Firestore 安全規則（需先啟動 Firebase 模擬器）
```

節氣表 `src/lib/solarTermsData.ts` 由香港天文台曆表產生：把 1901–2100 的 `T{年}c.txt`
（https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T2027c.txt）下載到同一個資料夾後執行
`npx tsx scripts/gen-solar-terms.ts <資料夾>`。

升級 iztro 或改動排盤設定後請全部重跑。

## 目錄

- `src/app/`：頁面、SEO 路由（robots、sitemap、manifest、llms.txt）與 `/api/ask`
- `src/components/`：表單、命盤、運勢、擇日、合盤、AI 聊天
- `src/lib/`：排盤設定（`ziwei.ts`）、出生時間校正（`birthtime.ts`）、農曆（`lunar.ts`）、運限（`periods.ts`）、五運（`fortune.ts`）、格局（`patterns.ts`）等
- `src/content/`：靜態內容頁的資料（含流年頁 `liunian.ts`）
- `src/lib/folkCalendar.ts`：農民曆避忌（歲破、月破、農曆七月），擇日用
- `scripts/`：字型子集與驗證腳本
