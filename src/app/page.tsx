import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import YearBanner from "@/components/YearBanner";
import ZiweiApp from "@/components/ZiweiApp";
import { featuredYear, liunianYears } from "@/content/liunian";
import { FIREBASE_ENABLED } from "@/lib/firebaseConfig";
import { AI_ENABLED, pageMetadata, PUBLISHER, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "紫微斗數免費線上排盤｜命盤解析與流年運勢",
  description: SITE_DESCRIPTION,
  path: "/",
  absoluteTitle: true,
});

/** 建置當下要推的流年；瀏覽器會再依當天日期更新 */
const BUILD_YEAR = featuredYear();

const FEATURES = [
  "國曆、農曆皆可輸入，自動校正夏令時間與閏月",
  "格局判定、命宮性格、十二宮與五運解讀",
  "大運到時運的運勢，加上紫微擇日與合盤配對",
];

const GUIDE = [
  {
    title: "十二宮",
    body: "命盤分為命宮、兄弟、夫妻、子女、財帛、疾厄、遷移、交友、官祿、田宅、福德、父母十二宮，各自對應人生的一個面向。",
    href: "/palaces",
    more: "認識十二宮",
  },
  {
    title: "主星與輔星",
    body: "紫微、天府等十四主星決定宮位的基本性格；左輔右弼、文昌文曲等吉星加分，擎羊陀羅、火鈴空劫等煞星則帶來考驗。",
    href: "/stars",
    more: "十四主星解析",
  },
  {
    title: "四化與三方四正",
    body: "生年天干讓四顆星化祿、化權、化科、化忌，是論命的關鍵。看一個宮位時，要連同對宮與兩個三合宮一起看，稱為三方四正。",
    href: "/method#sihua",
    more: "十干四化表",
  },
];

/** 首頁常見問題：畫面文字與 FAQPage 結構化資料共用同一份 */
const FAQ = [
  {
    q: "紫微斗數排盤需要哪些資料？",
    a: "需要出生年、月、日、時與性別，國曆或農曆都可以。出生地用來校正夏令時間與時差；知道幾點幾分會比只知道時辰更準確。",
  },
  {
    q: "不知道確切出生時間可以排盤嗎？",
    a: "可以先選大概的時辰排盤，但命宮、身宮與五行局都由時辰決定，時辰錯了整張命盤就不同。建議向家人或出生證明確認；出生時間離時辰交界只差幾分鐘時，本站會提供相鄰時辰的命盤讓你比對。",
  },
  {
    q: "晚上 11 點後出生（晚子時）怎麼排？",
    a: "本站採「子時換日」：23:00 以後出生，以隔天的日期、子時排盤，這是目前最通行的做法。另有一派主張晚子時仍算當天，兩派排出的命盤可能不同。",
  },
  {
    q: "閏月出生怎麼排？",
    a: "以十五日為界：閏月初一到十五以本月論，十六日以後以下個月論。用農曆輸入時，選單會自動列出當年的閏月。",
  },
  {
    q: "出生在夏令時間或日治時期，時間要自己調整嗎？",
    a: "不用。選擇出生地並輸入當時的鐘錶時間，系統會依歷史紀錄自動扣回：台灣在 1945–1979 年間多次實施夏令時間，1937–1945 年使用東京時間，都比標準時間快一小時。",
  },
  {
    q: "紫微斗數和八字有什麼不同？",
    a: "兩者都用出生年月日時。紫微斗數把星曜安進十二宮，分別看個性、感情、事業、財運等領域與運勢起伏；八字以年月日時四柱的天干地支論五行生剋。年份分界也不同：紫微斗數以農曆正月初一換年，八字以立春換年。",
  },
  {
    q: "我的生辰資料會被保存嗎？",
    a: `排盤完全在你的瀏覽器中計算，不會上傳到伺服器。排過的命盤會存在你自己瀏覽器的「我的命盤」清單，可以隨時按「管理」刪除。${
      FIREBASE_ENABLED ? "註冊或登入會員時，「我的命盤」會同步存到你的帳號，換裝置也看得到，只有你本人能讀取。" : ""
    }分享連結時，出生日期與時間放在網址的 # 之後，不會傳到伺服器，也不含姓名。${
      AI_ENABLED ? "只有使用「問 AI」時，才會把生辰（不含姓名）與你的提問送出，由 AI 產生回答；本站不保存對話內容。" : ""
    }詳見隱私權政策。`,
  },
];

const jsonLd = {
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      inLanguage: "zh-Hant-TW",
      description: SITE_DESCRIPTION,
      publisher: PUBLISHER,
    },
    {
      "@type": "WebApplication",
      name: `${SITE_NAME}・紫微斗數免費排盤`,
      url: SITE_URL,
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Any",
      browserRequirements: "需啟用 JavaScript",
      inLanguage: "zh-Hant-TW",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: 0, priceCurrency: "TWD" },
      featureList: [
        "紫微斗數命盤：十二宮、十四主星、輔星、四化、大限",
        "自動校正夏令時間、日治時期東京時間、晚子時與閏月",
        "可選真太陽時校正",
        "大運、流年、流月、流日、流時運勢",
        "紫微擇日與合盤配對",
      ],
      publisher: PUBLISHER,
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function Home() {
  return (
    <main id="main" className="flex-1">
      <JsonLd data={jsonLd} />
      <ZiweiApp
        intro={
          <>
            <h1>
              <span className="block text-sm font-medium tracking-[0.3em] text-gold">紫微斗數・免費線上排盤</span>
              <span className="sr-only">：</span>
              <span className="mt-4 block font-serif text-4xl leading-tight font-bold tracking-wide text-balance sm:text-5xl">
                看懂你的命盤，
                <br />
                從十二宮開始
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-soft sm:mt-5 sm:text-lg">
              輸入出生年月日與時間，立即排出完整的紫微斗數命盤。主星、輔星、四化、大限一次呈現，排盤結果清楚好讀。
            </p>
            <ul className="mt-7 hidden space-y-2.5 sm:block">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-3 text-[15px] text-ink-soft">
                  <span aria-hidden className="size-1.5 rotate-45 bg-gold" />
                  {f}
                </li>
              ))}
            </ul>
            <YearBanner buildYear={BUILD_YEAR} years={liunianYears()} />
          </>
        }
        outro={<HomeGuide />}
      />
    </main>
  );
}

/** 首頁的入門說明與常見問題，排盤後會收起來 */
function HomeGuide() {
  return (
    <>
      <section aria-labelledby="guide-title" className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
        <h2 id="guide-title" className="font-serif text-2xl font-bold tracking-wide">
          命盤怎麼看
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {GUIDE.map((g, i) => (
            <article key={g.title} className="flex flex-col rounded-xl border border-line bg-surface/70 p-6">
              <span className="font-serif text-sm text-gold">{["壹", "貳", "參"][i]}</span>
              <h3 className="mt-2 font-serif text-lg font-bold">{g.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">{g.body}</p>
              <Link href={g.href} className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-accent hover:underline">
                {g.more} →
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="faq-title" className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <h2 id="faq-title" className="font-serif text-2xl font-bold tracking-wide">
          常見問題
        </h2>
        <div className="mt-6 grid gap-x-10 gap-y-7 md:grid-cols-2">
          {FAQ.map((f) => (
            <div key={f.q}>
              <h3 className="font-serif text-lg font-bold">{f.q}</h3>
              <p className="mt-2 max-w-[38em] text-[15px] leading-relaxed text-ink-soft">{f.a}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm text-ink-soft">
          更多排盤規則（四化版本、真太陽時、時辰交界）請見
          <Link href="/method" className="mx-1 font-medium text-accent underline underline-offset-4">
            排盤方法與準確度說明
          </Link>
          。
        </p>
      </section>
    </>
  );
}
