# 會員系統設定步驟（Firebase）

會員功能有 Google 登入、Email 註冊、命盤雲端同步、AI 每日題數，全部用 Firebase 免費方案（Spark）就夠。
**金鑰都只放在 `.env.local` 與 Netlify 環境變數，不要貼到對話、程式碼或 git。**

沒做完這些設定之前，網站照舊運作，只是不會出現登入按鈕。

---

## 1. 建立 Firebase 專案

1. 打開 <https://console.firebase.google.com>，按「建立專案」。
2. 專案名稱例如 `ziwei`。記下畫面上的**專案 ID**（例如 `ziwei-1a2b3`），後面會用到。
3. Google Analytics 可以關掉（本站沒用到）。

## 2. 開啟登入方式

左側選單「Authentication」→「開始使用」→「登入方式」：

1. **Google**：啟用，「專案的公開名稱」填 `紫微命盤`，「專案支援電子郵件」選你的信箱，儲存。
2. **電子郵件/密碼**：啟用（上面那個開關就好，下面的「電子郵件連結（無密碼登入）」不用開），儲存。

接著到 Authentication 的「設定」分頁：

3. **授權網域**：按「新增網域」，加入你的 Netlify 網址（例如 `ziwei.netlify.app`）和之後的正式網域。`localhost` 預設已經有了。
   沒加的網域按登入會出現「這個網址還不能登入」。
4. **密碼政策**（建議）：最少 8 個字元，和網站上的要求一致。
5. 「使用者動作」裡的**電子郵件列舉保護**維持開啟（預設就是開的），別人才無法藉登入錯誤訊息試出誰註冊過。

再到 Authentication 的「範本」分頁：

6. 右上角的範本語言選「中文（台灣）」，驗證信、重設密碼信就會是繁體中文。寄件者名稱可改成 `紫微命盤`。

## 3. 建立 Firestore 資料庫

左側選單「Firestore Database」→「建立資料庫」：

1. 版本選 **Standard**。
2. 位置選 **`asia-east1`（台灣）**，台灣使用者最快。**建立後不能改**。
3. 安全規則選「以正式版模式啟動」。
4. 建好後到「規則」分頁，把專案裡 `firestore.rules` 的內容整份貼上，按「發布」。
5. （建議）到「TTL」或「存留時間」分頁新增政策：集合群組 `usage`、時間戳記欄位 `expireAt`。
   AI 每日題數的紀錄兩天後會自動刪除，不會一直累積。

## 4. 取得前端設定值

齒輪「專案設定」→「一般」→ 下方「你的應用程式」→ 按 `</>`（網頁）：

1. 應用程式暱稱填 `紫微命盤`，**不要**勾 Firebase Hosting，註冊。
2. 畫面會出現 `firebaseConfig`，把其中四個值填進 `.env.local`：

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=（apiKey）
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=（authDomain，例如 ziwei-1a2b3.firebaseapp.com）
NEXT_PUBLIC_FIREBASE_PROJECT_ID=（projectId）
NEXT_PUBLIC_FIREBASE_APP_ID=（appId）
```

這四個值本來就會寫進網頁，是公開的；安全性靠第 3 步的安全規則與第 2 步的授權網域。

## 5. 建立服務帳戶（AI 每日題數用）

伺服器要記錄每個人每天問了幾題，需要一個只能讀寫資料庫的服務帳戶。
**不要用 Firebase 專案設定裡預設的那個 Admin SDK 帳戶**，那個權限太大。

1. 打開 <https://console.cloud.google.com/iam-admin/serviceaccounts>，左上角選同一個專案。
2. 「建立服務帳戶」→ 名稱 `ziwei-usage` → 角色選 **Cloud Datastore 使用者**（Cloud Datastore User）→ 完成。
3. 點進這個帳戶 →「金鑰」→「新增金鑰」→「建立新的金鑰」→ JSON，會下載一個檔案。
4. 打開檔案，把兩個值填進 `.env.local`：

```bash
FIREBASE_CLIENT_EMAIL=（client_email）
FIREBASE_PRIVATE_KEY="（private_key，整段含 -----BEGIN PRIVATE KEY----- 到 -----END PRIVATE KEY-----\n）"
```

5. 填好後**刪掉下載的 JSON 檔**，也不要放進專案資料夾。

沒設定服務帳戶時，AI 問答仍可使用，只是不限每日題數（只剩每 10 分鐘 15 題的頻率限制）。

## 6. 設定 Netlify

Netlify 網站 →「Site configuration」→「Environment variables」，把第 4、5 步的六個值都加進去：

| 變數 | 說明 |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`、`_AUTH_DOMAIN`、`_PROJECT_ID`、`_APP_ID` | 前端設定，建置時會寫進網頁 |
| `FIREBASE_CLIENT_EMAIL` | 服務帳戶 |
| `FIREBASE_PRIVATE_KEY` | 服務帳戶私鑰，勾選「Contains secret values」 |
| `AI_DAILY_GUEST`、`AI_DAILY_MEMBER` | 選填，每日題數（預設 2 與 10） |

存好後重新部署（Deploys →「Trigger deploy」）。

## 7. 上線後檢查

1. 用無痕視窗打開網站，右上角有人像圖示 → 用 Google 登入、用 Email 註冊各試一次。
2. Email 註冊後收得到繁體中文的驗證信，點連結後回網站按「我已完成驗證」。
3. 排一張命盤，到 Firebase 後台 Firestore 看得到 `users/（你的 uid）/charts/`。
4. 未登入問 AI，第 3 題會提示登入；登入後顯示「今天還可以問 N 題」。

---

## 本機開發（不用真的專案）

用 Firebase 模擬器，資料都在本機，不會碰到正式資料：

```bash
# 終端機 1：啟動模擬器（需要 Java）
npx firebase-tools emulators:start --project demo-ziwei --only auth,firestore

# 終端機 2：以模擬器設定建置並啟動
NEXT_PUBLIC_FIREBASE_API_KEY=demo NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-ziwei.firebaseapp.com \
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-ziwei NEXT_PUBLIC_FIREBASE_APP_ID=1:0:web:demo \
NEXT_PUBLIC_FIREBASE_EMULATOR=1 npm run build
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-ziwei npm start

# 安全規則測試
npx tsx scripts/check-rules.ts
```

模擬器的 Google 登入會跳出假的帳號選擇畫面；Email 驗證信不會真的寄出，連結可以在
<http://127.0.0.1:9099/emulator/v1/projects/demo-ziwei/oobCodes> 找到。

**正式環境絕對不要設定** `NEXT_PUBLIC_FIREBASE_EMULATOR`、`FIREBASE_AUTH_EMULATOR_HOST`、`FIRESTORE_EMULATOR_HOST`。
