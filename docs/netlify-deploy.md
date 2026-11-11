# 部署到 Netlify

建置設定已寫在專案根目錄的 `netlify.toml`，Netlify 會自動認出 Next.js，不用另外裝外掛。
你只需要連結 GitHub 並在後台填環境變數。**金鑰只填在 Netlify 後台，不要寫進 `netlify.toml` 或任何檔案。**

---

## 1. 建立網站

1. 打開 <https://app.netlify.com> →「Add new project」→「Import an existing project」→ GitHub。
2. 選 `Astrology` 這個 repo，分支 `main`。
3. 建置設定會自動帶入（`npm run build`、發布目錄 `.next`），不用改。
4. **先不要按 Deploy**，往下展開「Add environment variables」，或建好後到第 2 步再填。

## 2. 環境變數

「Site configuration」→「Environment variables」→「Add a variable」。

### 必填

| 變數 | 值 | 備註 |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | 正式網址，例如 `https://ziwei.netlify.app` | sitemap、分享圖、canonical 用；換正式網域時要改並重新部署 |
| `NEXT_PUBLIC_AI_ENABLED` | `1` | 開啟 AI 問答 |
| `GEMINI_API_KEY` | 你的金鑰 | 勾「Contains secret values」 |

### 會員（Firebase，見 [firebase-setup.md](firebase-setup.md)）

| 變數 | 備註 |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | **不要**勾 secret（這個值本來就會出現在網頁裡） |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | 同上 |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | 同上 |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | 同上 |
| `FIREBASE_CLIENT_EMAIL` | 服務帳戶，AI 每日題數用 |
| `FIREBASE_PRIVATE_KEY` | 勾「Contains secret values」；整段貼上，含 `-----BEGIN` 與 `-----END` |

### 選填

| 變數 | 備註 |
| --- | --- |
| `NEXT_PUBLIC_CONTACT_EMAIL` | 隱私權政策頁的聯絡信箱。有會員資料後**建議設定**，使用者才知道怎麼申請刪除帳號 |
| `AI_DAILY_GUEST`、`AI_DAILY_MEMBER` | 每日題數，預設 2 與 10 |
| `AI_MODEL` | AI 模型，預設見 `.env.example` |

**不要設定**：`NEXT_PUBLIC_FIREBASE_EMULATOR`、`FIREBASE_AUTH_EMULATOR_HOST`、`FIRESTORE_EMULATOR_HOST`、`GEMINI_BASE_URL`（這些只給本機測試用）。

> `NEXT_PUBLIC_` 開頭的值是在**建置時**寫進網頁的，改了之後一定要重新部署才會生效。

## 3. 部署

「Deploys」→「Trigger deploy」→「Deploy project」。之後每次 push 到 `main` 都會自動部署。

### 如果建置因為「secret」失敗

Netlify 會掃描建置結果，看到像金鑰的字串就擋下。Firebase 的 `NEXT_PUBLIC_FIREBASE_API_KEY`（`AIza` 開頭）本來就是公開的，可能被誤判。
處理方式：新增環境變數 `SECRETS_SCAN_SMART_DETECTION_OMIT_VALUES`，值填**同一把 Firebase API key**，再重新部署。
不要用 `SECRETS_SCAN_ENABLED=false` 整個關掉，那樣 Gemini 金鑰外洩時也不會被攔下。

## 4. 部署後

1. 把 Netlify 網址（和之後的正式網域）加到 Firebase「Authentication → 設定 → 授權網域」，否則無法登入。
2. 照 [firebase-setup.md](firebase-setup.md) 第 7 步檢查登入、驗證信、命盤同步、AI 題數。
3. 綁正式網域後：改 `NEXT_PUBLIC_SITE_URL`、在 Firebase 加授權網域、重新部署。
