import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/SiteChrome";
import { FIREBASE_ENABLED } from "@/lib/firebaseConfig";
import { AI_ENABLED, CONTACT_EMAIL, pageMetadata, SITE_NAME } from "@/lib/site";

const TITLE = "隱私權政策";
const DESCRIPTION = `${SITE_NAME}如何處理你的生辰資料：排盤在瀏覽器中計算、「我的命盤」存在哪裡、登入會員與使用 AI 問答時會送出哪些資料。`;
const PATH = "/privacy";
/** 政策內容修改時請一併更新 */
const UPDATED = "2026-11-11";

/** 開頭的摘要：依有沒有開啟會員與 AI 問答，說明生辰什麼時候會離開你的瀏覽器 */
const SENDS = [FIREBASE_ENABLED && "登入會員同步命盤", AI_ENABLED && "使用「問 AI」"].filter(Boolean).join("或");
const INTRO = `${SITE_NAME}不使用廣告追蹤，${FIREBASE_ENABLED ? "不登入也能使用全部排盤功能" : "不需要註冊"}。排盤在你的瀏覽器中計算，${
  SENDS ? `只有${SENDS}時，才會把生辰送出。` : "生辰資料不會上傳到伺服器。"
}`;

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: PATH });

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line pt-8">
      <h2 className="font-serif text-xl font-bold">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-20 sm:px-6">
      <Breadcrumbs
        items={[
          { name: "首頁", path: "/" },
          { name: TITLE, path: PATH },
        ]}
      />
      <article className="mt-4 max-w-[42em] space-y-8">
        <header>
          <h1 className="font-serif text-3xl font-bold tracking-wide">{TITLE}</h1>
          <p className="mt-3 text-[17px] leading-relaxed text-ink">{INTRO}</p>
          <p className="mt-2 text-sm text-muted">最後更新：{UPDATED}</p>
        </header>

        <Section title="排盤時">
          <p>出生日期、時間、性別、出生地與姓名都只在你的瀏覽器中計算命盤，不會傳到本站的伺服器。</p>
        </Section>

        <Section title="存在你瀏覽器裡的資料">
          <ul className="space-y-2">
            <li>・「我的命盤」清單（最多 20 筆，含你填的姓名），下次開啟時帶入表單。</li>
            {AI_ENABLED && <li>・是否已同意 AI 問答的使用說明。</li>}
            {FIREBASE_ENABLED && <li>・登入狀態（登入會員時）。</li>}
          </ul>
          <p>
            這些資料只存在這台裝置的這個瀏覽器，本站看不到。可以在首頁「我的命盤」按「管理」刪除，或清除瀏覽器的網站資料。
            在 LINE 等 App 的內建瀏覽器裡存的資料，和你平常用的瀏覽器是分開的。
          </p>
        </Section>

        <Section title="分享連結與命盤圖片">
          <p>
            分享連結裡有出生日期、時間、性別與出生地（不含姓名），放在網址的 # 之後，開啟時不會傳到伺服器；但收到連結的人都看得到，請只傳給信任的人。
            存成圖片時，圖片在你的瀏覽器中產生，圖上會有你填的姓名。
          </p>
        </Section>

        {FIREBASE_ENABLED && (
          <Section title="登入會員時">
            <p>會員可以用 Google 帳號登入，或用 Email 與密碼註冊，登入服務由 Firebase Authentication（Google 提供）處理。本站會取得：</p>
            <ul className="space-y-2">
              <li>・名稱、Email 與帳號識別碼（Google 登入另有大頭貼），用來顯示登入狀態與辨識你的資料。</li>
              <li>・用 Email 註冊時，密碼由 Firebase 加密保存，本站看不到你的密碼；註冊後會寄一封驗證信到你的信箱，忘記密碼時也以 Email 寄送重設連結。</li>
              <li>・「我的命盤」清單（含你填的姓名與生辰），存放在 Google Cloud 的 Firebase 資料庫，讓你換裝置登入也看得到。安全規則限定只有你本人能讀寫。</li>
            </ul>
            <p>
              在「我的命盤」按「管理」刪除命盤，帳號裡的資料會一起刪除。登出時，這台裝置上的命盤會清除，資料仍保存在帳號裡。
              {CONTACT_EMAIL ? "要刪除整個帳號，請來信告知（見下方聯絡方式）。" : ""}
            </p>
          </Section>
        )}

        {AI_ENABLED && (
          <Section title="使用「問 AI」時">
            <p>為了讓 AI 依你的命盤回答，會送出以下資料：</p>
            <ul className="space-y-2">
              <li>・出生日期、時間、性別與出生地（不含姓名）。本站伺服器依此重新排盤，整理成命盤摘要。</li>
              <li>・你的提問與這次對話的內容。</li>
            </ul>
            <p>
              命盤摘要與對話會交給本站使用的第三方 AI 服務產生回答，並依該服務的條款處理。本站伺服器不保存命盤與對話內容。
              為了防止濫用並計算每日題數，伺服器會記錄每天問了幾題：登入會員以帳號識別碼計算，未登入以 IP 位址經過不可還原的雜湊後計算（不保存原始 IP），紀錄約兩天後刪除。
            </p>
            <p>請不要在提問中輸入姓名、電話、身分證字號、地址等可以認出你的資料。不使用 AI 問答，就不會傳出任何生辰資料。</p>
          </Section>
        )}

        <Section title="網站主機的連線紀錄">
          <p>和多數網站一樣，網站主機服務商可能依其政策記錄連線資訊（例如 IP 位址、瀏覽器類型、造訪時間），用於維運與資安，本站不會用這些資料辨識個人。</p>
        </Section>

        <Section title="你的權利與聯絡方式">
          <p>
            依個人資料保護法，你可以查詢、請求刪除或停止利用你的個人資料。存在你瀏覽器裡的資料可以直接自行刪除；
            {FIREBASE_ENABLED ? "帳號裡的命盤可以在「我的命盤」刪除。" : "本站不保存你的生辰與對話。"}
            {CONTACT_EMAIL ? (
              <>
                其他問題請來信
                <a href={`mailto:${CONTACT_EMAIL}`} className="mx-1 font-medium text-accent underline underline-offset-4">
                  {CONTACT_EMAIL}
                </a>
                。
              </>
            ) : null}
          </p>
          <p>本政策如有修改，會更新本頁並標示最後更新日期。</p>
        </Section>
      </article>
    </main>
  );
}
