import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { Breadcrumbs, ChartCta } from "@/components/SiteChrome";
import { TAIWAN_CLOCK_SHIFTS } from "@/content/dst";
import { MUTAGENS, SIHUA, STEMS } from "@/content/sihua";
import { starByName } from "@/content/stars";
import { BOUNDARY_MINUTES, longitudeCorrection, PLACES } from "@/lib/birthtime";
import { absoluteUrl, breadcrumbLd, CONTENT_UPDATED, pageMetadata, PUBLISHER } from "@/lib/site";

const TITLE = "紫微斗數排盤方法與準確度說明";
const DESCRIPTION =
  "紫微斗數怎麼排才準？說明本站採用的通行版排法、十干四化表、晚子時與閏月規則、台灣夏令時間年表、真太陽時與時辰交界的處理方式，以及排盤結果的驗證方法。";
const PATH = "/method";

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: PATH, type: "article" });

const CRUMBS = [
  { name: "首頁", path: "/" },
  { name: "排盤說明", path: PATH },
];

const SOLAR_EXAMPLES = ["taipei", "tainan", "kinmen", "hongkong", "shanghai", "chengdu", "urumqi", "singapore", "tokyo", "losangeles"];

const TOC = [
  { id: "school", label: "採用哪一派的排法" },
  { id: "sihua", label: "十干四化表" },
  { id: "year", label: "年份從哪天開始算" },
  { id: "late-zi", label: "晚子時怎麼排" },
  { id: "leap", label: "閏月怎麼排" },
  { id: "dst", label: "夏令時間與日治時期" },
  { id: "true-solar", label: "要不要用真太陽時" },
  { id: "boundary", label: "出生時間在時辰交界" },
  { id: "verify", label: "怎麼驗證排盤正確" },
  { id: "limits", label: "命理分析的限制" },
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="scroll-mt-6 border-t border-line pt-10">
      <h2 id={id} className="font-serif text-2xl font-bold">
        {title}
      </h2>
      <div className="mt-4 space-y-4 leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}

const MUTAGEN_TONE: Record<string, string> = { 祿: "text-lu", 權: "text-quan", 科: "text-ke", 忌: "text-ji" };

export default function MethodPage() {
  return (
    <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-20 sm:px-6">
      <JsonLd
        data={{
          "@graph": [
            breadcrumbLd(CRUMBS),
            {
              "@type": "Article",
              headline: TITLE,
              description: DESCRIPTION,
              inLanguage: "zh-Hant-TW",
              url: absoluteUrl(PATH),
              mainEntityOfPage: absoluteUrl(PATH),
              dateModified: CONTENT_UPDATED,
              author: PUBLISHER,
              publisher: PUBLISHER,
            },
          ],
        }}
      />
      <Breadcrumbs items={CRUMBS} />

      <div className="mt-4 lg:grid lg:grid-cols-[minmax(0,42em)_1fr] lg:gap-16">
        <article>
          <header>
            <h1 className="font-serif text-3xl leading-snug font-bold tracking-wide sm:text-4xl">{TITLE}</h1>
            <p className="mt-4 text-[17px] leading-relaxed text-ink">
              本站採用台灣最通行的紫微斗數排法，並自動處理夏令時間、日治時期東京時間、晚子時與閏月這些最容易排錯的細節。以下逐項說明規則、各派差異與我們的驗證方式。
            </p>
            <p className="mt-2 text-sm text-muted">最後更新：{CONTENT_UPDATED}</p>
          </header>

          <nav aria-label="本頁目錄" className="mt-8 rounded-xl border border-line bg-surface p-5 lg:hidden">
            <p className="font-serif font-bold">本頁目錄</p>
            <TocList />
          </nav>

          <div className="mt-10 space-y-10">
            <Section id="school" title="本站採用哪一派的排法？">
              <p>
                <strong className="text-ink">採用「通行版」</strong>，也就是以《紫微斗數全書》安星法為基礎、台灣多數排盤軟體預設的排法：
              </p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>命宮、身宮依出生月份與時辰安立；五行局由命宮干支的納音決定。</li>
                <li>十四主星依五行局與農曆出生日安星，各派相同。</li>
                <li>大限從命宮起，陽男陰女順行、陰男陽女逆行，起運歲數等於五行局數（水二局 2 歲起，依此類推）。起運之前稱為「童限」，依一命、二財帛、三疾厄、四夫妻、五福德、六官祿逐年換宮。</li>
                <li>流年以農曆正月初一換年，小限以年為界。</li>
              </ul>
              <p>
                各派的差異主要在少數天干的四化、部分雜曜的位置與亮度評等；十四主星、命宮身宮與五行局的排法各派一致，所以命盤的骨架不會因流派而改變。
              </p>
            </Section>

            <Section id="sihua" title="十干四化表（本站採用的版本）">
              <p>生年天干決定本命四化；大限、流年等運限則用該宮的宮干起四化。本站採用的十干四化如下：</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[22rem] border-collapse text-center">
                  <caption className="sr-only">十干四化表</caption>
                  <thead>
                    <tr className="bg-surface-2 font-serif">
                      <th scope="col" className="border border-line px-2 py-2">天干</th>
                      {MUTAGENS.map((m) => (
                        <th key={m} scope="col" className={`border border-line px-2 py-2 ${MUTAGEN_TONE[m]}`}>
                          化{m}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {STEMS.map((stem) => (
                      <tr key={stem} className="bg-surface">
                        <th scope="row" className="border border-line px-2 py-2 font-serif text-ink">
                          {stem}
                        </th>
                        {SIHUA[stem].map((star, i) => {
                          const meta = starByName(star);
                          return (
                            <td key={i} className="border border-line font-serif">
                              {meta ? (
                                <Link
                                  href={`/stars/${meta.slug}`}
                                  className="flex min-h-11 items-center justify-center px-2 text-star-major underline-offset-4 hover:bg-accent-soft hover:underline"
                                >
                                  {star}
                                </Link>
                              ) : (
                                <span className="flex min-h-11 items-center justify-center px-2">{star}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                <strong className="text-ink">庚干是各派最有爭議的一干</strong>：本站採「太陽化祿、武曲化權、太陰化科、天同化忌」，另有「天同化科、太陰化忌」等版本；戊、壬兩干的化科在少數流派也有不同說法。天府、天相、七殺三顆主星不參與生年四化。
              </p>
            </Section>

            <Section id="year" title="紫微斗數的年份從哪天開始算？">
              <p>
                <strong className="text-ink">以農曆正月初一換年</strong>，不是立春。例如國曆 2 月初出生、但還沒過農曆新年，生年天干地支仍算前一年，四化也跟著前一年。八字以立春換年，所以同一個生日，紫微斗數與八字的年柱可能不同，這是正常的。
              </p>
            </Section>

            <Section id="late-zi" title="晚子時（23:00–24:00）出生怎麼排？">
              <p>
                <strong className="text-ink">本站採「子時換日」</strong>：子時從前一天 23:00 開始，23:00 以後出生就以隔天的日期、子時排盤。這是台灣目前最通行的做法。
              </p>
              <p>
                另一派主張「晚子時不換日」，日期仍用當天。兩種算法在農曆日期不同時，紫微星的位置會不一樣。本站排盤時會先把晚子時換成隔天的日期與子時再計算，命宮、身宮、五行局與所有星曜都以隔天為準。
              </p>
            </Section>

            <Section id="leap" title="閏月出生怎麼排？">
              <p>
                <strong className="text-ink">以十五日為界</strong>：閏月初一到十五日視為本月，十六日以後視為下個月。例如閏四月二十日出生，以五月排盤。用農曆輸入時，月份選單只會列出當年真正存在的閏月；農曆曆表已與香港天文台、中央氣象署的官方曆表核對。
              </p>
            </Section>

            <Section id="dst" title="出生在夏令時間或日治時期，時間怎麼處理？">
              <p>
                紫微斗數的時辰要用「太陽的時間」，而不是被人為撥快的鐘錶時間。只要選擇出生地並輸入當時的鐘錶時間，系統會自動扣回一小時，不需要自己換算。台灣歷年時鐘撥快的期間如下：
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[22rem] border-collapse text-left text-[15px]">
                  <caption className="sr-only">台灣歷年夏令時間與日治時期東京時間</caption>
                  <thead>
                    <tr className="bg-surface-2 font-serif">
                      <th scope="col" className="border border-line px-3 py-2">年份</th>
                      <th scope="col" className="border border-line px-3 py-2">期間</th>
                      <th scope="col" className="border border-line px-3 py-2">名稱</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TAIWAN_CLOCK_SHIFTS.map((row) => (
                      <tr key={row.years} className="bg-surface">
                        <th scope="row" className="border border-line px-3 py-2 font-medium whitespace-nowrap text-ink tabular-nums">
                          {row.years}
                        </th>
                        <td className="border border-line px-3 py-2 tabular-nums">{row.period}</td>
                        <td className="border border-line px-3 py-2">{row.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                夏令時間開始那天，時鐘撥快所跳過的鐘點並不存在；結束那天，撥回的鐘點會出現兩次。遇到這兩種情況，系統會提醒，若兩種解釋排出不同命盤，也會提供另一張命盤比對。上表以外的年份（1962–1973、1976–1978、1980 年以後）台灣沒有實施夏令時間。香港（1941–1979）、中國大陸（1986–1991）及海外各地的夏令時間，也會依出生地的時區歷史資料自動處理，包含南半球與美國二戰時期的「戰時時間」。
              </p>
            </Section>

            <Section id="true-solar" title="要不要用真太陽時？">
              <p>
                真太陽時是依出生地的經度與季節，把鐘錶時間換算成當地太陽實際的時間。時區是以一條中央經線為準（台灣是東經 120 度），出生地每偏東一度，太陽時就早 4 分鐘；再加上地球公轉造成的「均時差」，一年中在約 −14 到 +16 分鐘之間變動。
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[20rem] border-collapse text-left text-[15px]">
                  <caption className="sr-only">各地經度造成的時間差</caption>
                  <thead>
                    <tr className="bg-surface-2 font-serif">
                      <th scope="col" className="border border-line px-3 py-2">出生地</th>
                      <th scope="col" className="border border-line px-3 py-2">經度修正</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SOLAR_EXAMPLES.map((id) => {
                      const place = PLACES.find((p) => p.id === id)!;
                      const gap = Math.round(longitudeCorrection(id, 2000) ?? 0);
                      return (
                        <tr key={id} className="bg-surface">
                          <th scope="row" className="border border-line px-3 py-2 font-medium text-ink">
                            {place.name}
                          </th>
                          <td className="border border-line px-3 py-2 tabular-nums">
                            {gap === 0 ? "約 0 分鐘" : `${gap > 0 ? "+" : "−"}${Math.abs(gap)} 分鐘`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p>
                <strong className="text-ink">本站的建議</strong>：台灣出生的修正量只有幾分鐘，傳統論命多數不用真太陽時，預設不勾選；但出生時間剛好在時辰交界附近，或出生在新加坡、馬來西亞、中國西部這類與時區中央經線相差半小時以上的地方，建議勾選，否則時辰很可能排錯。勾選後系統會用 NOAA 天文演算法計算均時差，誤差在數秒以內。
              </p>
            </Section>

            <Section id="boundary" title="出生時間剛好在時辰交界怎麼辦？">
              <p>
                時辰每兩小時一換（23:00、01:00、03:00……）。出生時間離交界在 {BOUNDARY_MINUTES} 分鐘以內時，記錄時間或醫院鐘錶的誤差就可能讓時辰排錯。本站會在排盤結果上方提醒，並可一鍵切換到相鄰時辰的命盤比對。
              </p>
              <p>判斷哪一張才是你的命盤（俗稱「定盤」），可以從這幾點對照：</p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>命宮主星描述的個性，哪一張比較像你。</li>
                <li>兄弟宮、父母宮反映的手足與父母狀況。</li>
                <li>過去發生重大事件（升學、結婚、搬家、換工作）的年份，落在哪一張命盤的哪個大限與流年比較吻合。</li>
              </ul>
            </Section>

            <Section id="verify" title="本站怎麼驗證排盤是正確的？">
              <p>
                排盤引擎採用開源的 iztro（MIT 授權），我們另外依古法安星口訣寫了一套獨立的驗算程式，從 1900–2100 年隨機抽 3,000 組生辰交叉比對 33 個項目：命宮、身宮、五行局、十四主星、六吉六煞、祿存、天馬、紅鸞天喜、天刑天姚、龍池鳳閣、三台八座、恩光天貴、天官天福等雜曜，長生與博士十二神、命主身主、生年四化、大限、小限與流年，全部相符。
              </p>
              <p>
                農曆換算逐日檢查了 1900–2100 年共 73,384 天，國曆與農曆往返全部一致。其中 1917、1922、1954–1955、1987、1999、2012、2018、2027、2030、2070 年有少數月份的初一，與瀏覽器內建農曆的推算不同；逐一對照香港天文台的官方曆表，本站的結果正確。另外我們發現並修正了換算套件的一個問題：17 個「閏月三十天、本月只有二十九天」的閏月（例如 1955 年閏三月、2017 年閏六月），原本無法輸入閏月三十日。台灣夏令時間的每一年起訖日，也與中央氣象署年表及當年政府公文逐一核對。每次升級排盤引擎都會重跑這些驗算。
              </p>
            </Section>

            <Section id="limits" title="命理分析的限制">
              <p>
                排盤是依規則計算，結果可以驗證；但解讀屬於命理經驗的歸納，本站的運勢分數只是方便比較的指數，不代表吉凶的精確量化。命理內容僅供參考，不構成任何醫療、法律、投資等專業建議；健康問題請以醫師診斷為準。
              </p>
            </Section>
          </div>
        </article>

        <div className="hidden lg:block">
          <nav aria-label="本頁目錄" className="sticky top-6 rounded-xl border border-line bg-surface p-5">
            <p className="font-serif font-bold">本頁目錄</p>
            <TocList />
          </nav>
        </div>
      </div>

      <div className="mt-14">
        <ChartCta title="照這套規則排出你的命盤" body="輸入出生地與鐘錶時間，夏令時間、晚子時與閏月都會自動處理，排盤前也會先告訴你做了哪些校正。" />
      </div>
    </main>
  );
}

function TocList() {
  return (
    <ol className="mt-2 space-y-0.5 text-[15px]">
      {TOC.map((t) => (
        <li key={t.id}>
          <a href={`#${t.id}`} className="flex min-h-11 items-center text-ink-soft hover:text-accent">
            {t.label}
          </a>
        </li>
      ))}
    </ol>
  );
}
