# 流量分析（GA4）

網站用 GA4 追蹤「排盤 → 看報告預覽 → 登入 → 閱讀報告」每一步的人數，找出流失最多的地方再改。
沒設定 `NEXT_PUBLIC_GA_ID` 時，網站完全不載入分析程式，隱私權政策也不會出現「流量分析」段落。

## 隱私原則（改程式時要守住）

- 分享連結把生辰放在網址 `#c=` 之後。`src/lib/analytics.ts` 每個事件都帶 `safeLocation()`：去掉 `#` 與白名單以外的查詢參數（報告代碼 `record` 會被去掉，`utm_*`、`gclid`、`fbclid`、`liunian` 保留）。
- 事件與參數只能用 `analytics.ts` 的 `Events` 型別列出的固定值。**不可**加入姓名、生辰、命盤內容、提問文字、Email、Firebase uid。
- 已關閉 Google 信號與廣告個人化。日後要投廣告、要開這兩項時，先改隱私權政策（`src/app/privacy/page.tsx` 的「流量分析」段落）。

## 設定步驟（網站經營者）

1. 到 [analytics.google.com](https://analytics.google.com) 建立資源：時區選「台灣」、貨幣選「新台幣 TWD」。
2. 建立「網站」資料串流，填正式網址，取得 `G-` 開頭的評估 ID。
3. 在資料串流的「加強型評估」：
   - **關閉「網頁瀏覽 → 根據瀏覽器記錄事件判斷網頁變更」**（換頁由程式自己送，GA 自動偵測的版本可能帶到 `#` 之後的生辰）。
   - **關閉「表單互動」**（生辰表單不需要被追蹤）。
   - 捲動、外連點擊可以保留。
4. 管理 → 資料收集與修改 → 資料保留：事件資料改為 **14 個月**（隱私權政策寫的是 14 個月）；Google 信號資料收集保持關閉。
5. Netlify → Site configuration → Environment variables 新增 `NEXT_PUBLIC_GA_ID=G-XXXXXXX`，重新部署（`NEXT_PUBLIC_` 變數在建置時寫入）。
6. 管理 → 自訂定義 → 建立下列「事件範圍」自訂維度，報表才看得到參數：
   `source`、`time_known`、`report`、`signed_in`、`tab`、`suggested`、`content_type`（`method` 是 GA4 內建參數，不用建立）。
7. 管理 → 事件：把 `sign_up`、`report_view` 標成「關鍵事件」。

## 事件清單

| 事件 | 何時送出 | 參數 |
| --- | --- | --- |
| `page_view` | 每次換頁 | `page_title` |
| `chart_create` | 排盤完成（漏斗 1） | `source`：form／share；`time_known` |
| `report_preview` | 打開「預覽農曆正月」 | `report` |
| `report_start` | 按報告按鈕（漏斗 2） | `report`：annual／monthly／deep；`signed_in` |
| `login_open` | 打開登入框 | — |
| `sign_up`、`login` | 註冊、登入成功（漏斗 3） | `method`：google／email |
| `report_view` | 報告整理完成並顯示（漏斗 4） | `report` |
| `chart_save` | 存到我的命盤 | — |
| `share` | 分享連結、傳到 LINE、存圖、複製 AI 文字盤 | `method`：link／line／image／text；`content_type`：chart／persona |
| `ai_question` | 問 AI | `suggested`：是否為建議問題 |
| `tab_view` | 結果頁切換分頁 | `tab`：chart／fortune／days／synastry／ai |

## 看漏斗

探索 → 漏斗探索：步驟依序設 `chart_create` → `report_start` → `sign_up` 或 `login` → `report_view`，
細分維度選「裝置類別」，可以看出手機和桌機哪一步流失比較多。
