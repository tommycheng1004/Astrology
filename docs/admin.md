# 管理後台

網址：`/admin`（不會被搜尋引擎收錄，也不在網站選單裡；有權限的帳號在「會員中心」會看到「管理後台」連結）。

## 功能

| 分頁 | 內容 | 可使用的角色 |
| --- | --- | --- |
| 總覽 | 會員數、近 7 天新會員與活躍會員、會員存的命盤數、報告數、今天與近 14 天 AI 提問數 | 全部 |
| 會員 | 依 Email 開頭或會員 ID 搜尋、依最近使用排序；會員詳情（命盤／報告「數量」、近兩天提問數）；調整個人每日 AI 題數 | 全部可看；擁有者、管理員、客服可調題數 |
| 系統設定 | AI 問答開關（緊急關閉）、訪客／會員每日題數，約 30 秒內全站生效，不必重新部署 | 全部可看；擁有者、管理員可改 |
| 稽核紀錄 | 每一筆後台修改：誰、何時、改了什麼（前後值）、原因 | 擁有者、管理員 |
| 後台人員 | 指派／移除管理員、客服、唯讀 | 擁有者 |

## 設計原則

- **權限只在伺服器判斷**：每個 `/api/admin/*` 請求都重新驗證 Firebase 登入憑證並查角色（`src/lib/server/admin.ts`）。前端隱藏按鈕只是方便，不是防線。沒有權限一律回 404，不透露後台存在。
- **最小權限**：服務帳戶維持只有「Cloud Datastore 使用者」，沒有 Firebase Authentication 管理權限。因此後台查會員靠網站自己的會員索引（`members/`），會員第一次登入使用後才會出現；也因此目前**不能停權**帳號。
- **不看個資內容**：後台只看得到命盤、報告的數量，看不到生辰、命盤內容或 AI 提問內容。
- **改了就有紀錄**：每筆修改都必須填原因，並與稽核紀錄寫在同一筆 Firestore 交易，不會有「改了卻沒紀錄」。稽核紀錄只能新增，後台沒有修改或刪除的功能。
- **近期登入**：修改資料時要求 12 小時內登入過。Google 帳號會跳出重新選帳號的視窗；Email 帳號請登出再登入。
- **Firestore 規則**：`members`、`admins`、`config`、`stats`、`auditLog` 前端一律無法讀寫（`firestore.rules` 最後的全擋規則）。

## 設定步驟

1. 先完成 `docs/firebase-setup.md`（後台需要服務帳戶 `FIREBASE_CLIENT_EMAIL`、`FIREBASE_PRIVATE_KEY`）。
2. 在 Netlify →「Site configuration → Environment variables」新增 `ADMIN_OWNER_EMAILS`，值是你的 Email（多位用逗號分隔）。這個 Email 必須已驗證，建議用 Google 登入。
3. 重新部署後，用那個帳號登入網站，打開 `/admin`。
4. 要讓其他人協助：請對方先用自己的 Email 登入網站一次（並完成 Email 驗證），再到「後台人員」指派角色。

## 資料

| 集合 | 內容 | 保存 |
| --- | --- | --- |
| `members/{uid}` | Email、名稱、登入方式、是否驗證、第一次／最近使用時間、個人每日題數 | 長期 |
| `admins/{uid}` | 角色、Email、指派者與時間 | 長期 |
| `config/app` | AI 開關、每日題數、最後修改者 | 長期 |
| `stats/{台灣日期}` | 當天會員／訪客提問數、新會員數（不含個資） | 長期 |
| `auditLog/{時間-亂數}` | 操作者、動作、對象、前後值、原因 | 長期 |

第一次使用若伺服器記錄出現 `requires an index`，點錯誤訊息裡的連結建立索引即可（會員與稽核查詢都只用單一欄位，一般不需要）。

## 本機測試

```bash
npx firebase-tools emulators:start --project demo-ziwei --only auth,firestore
# 另一個終端機
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-ziwei NEXT_PUBLIC_FIREBASE_API_KEY=fake NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-ziwei.firebaseapp.com \
NEXT_PUBLIC_FIREBASE_APP_ID=1:1:web:1 NEXT_PUBLIC_FIREBASE_EMULATOR=1 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 ADMIN_OWNER_EMAILS=owner@test.tw npx next dev
```

瀏覽器開 `/admin`，在主控台執行 `__ziweiTestSignIn("任意ID", "owner@test.tw")` 以擁有者身分登入。
