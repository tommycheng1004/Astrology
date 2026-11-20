import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import { Breadcrumbs } from "@/components/SiteChrome";
import { liunianInfo, liunianYears, rocBirthYears } from "@/content/liunian";
import { lunarToSolar } from "@/lib/lunar";
import { articleLd, breadcrumbLd, pageMetadata } from "@/lib/site";
import { TAISUI_EFFECT, TAISUI_KINDS, TAISUI_RULE, taisuiOf, taisuiText, ZODIAC } from "@/lib/taisui";

/**
 * 犯太歲查詢頁（/taisui/2027）。內容全部由 taisui.ts 的規則與曆表算出，不手寫某一年的內容；
 * 太歲關係屬民俗參考，文案不恐嚇、不推銷開運物品或代辦服務。
 */

const BRANCHES = "子丑寅卯辰巳午未申酉戌亥";

export const dynamicParams = false;

export function generateStaticParams() {
  return liunianYears().map((year) => ({ year: String(year) }));
}

function describe(param: string) {
  const year = Number(param);
  if (!liunianYears().includes(year)) return null;
  const info = liunianInfo(year);
  // 十二生肖都列出（沒有犯太歲的也列），出生年次以民國 30 年到前一年為範圍
  const rows = [...BRANCHES].map((branch, i) => {
    const kinds = taisuiOf(branch, info.branch);
    const roc = rocBirthYears(i, year - 1);
    return { branch, zodiac: ZODIAC[i], kinds, roc, ad: roc.map((y) => y + 1911) };
  });
  // 值太歲排第一，其餘依沖、刑、害、破（與流年頁相同）；生肖之間用「；」分隔，免得「沖、刑太歲」被拆錯
  const affected = rows
    .filter((r) => r.kinds.length > 0)
    .sort((a, b) => TAISUI_KINDS.indexOf(a.kinds[0]) - TAISUI_KINDS.indexOf(b.kinds[0]));
  const summary = affected.map((r) => `屬${r.zodiac}${r.kinds.join("、")}太歲`).join("；");
  const lantern = lunarToSolar(year, 1, 15);
  const title = `${year} 犯太歲生肖查詢｜${info.ganzhi}年值沖刑害破太歲`;
  const description = `${year} 年是${info.ganzhi}年（肖${info.zodiac}），${info.newYearShort} 春節換年。犯太歲的生肖：${summary}。附十二生肖太歲關係表與出生年次對照。`;
  return { year, info, rows, affected, summary, lantern: `${lantern.solarMonth}/${lantern.solarDay}`, title, description };
}

export async function generateMetadata({ params }: PageProps<"/taisui/[year]">): Promise<Metadata> {
  const { year } = await params;
  const d = describe(year);
  if (!d) return {};
  return pageMetadata({ title: d.title, description: d.description, path: `/taisui/${year}`, type: "article" });
}

export default async function TaisuiPage({ params }: PageProps<"/taisui/[year]">) {
  const { year: param } = await params;
  const d = describe(param);
  if (!d) notFound();
  const { year, info, rows, affected, summary, lantern, title, description } = d;
  const path = `/taisui/${year}`;
  const crumbs = [
    { name: "首頁", path: "/" },
    { name: `${year} 流年運勢`, path: `/liunian/${year}` },
    { name: "犯太歲生肖查詢", path },
  ];
  const kindsThisYear = TAISUI_KINDS.map((kind) => ({
    kind,
    zodiacs: rows.filter((r) => r.kinds.includes(kind)).map((r) => `屬${r.zodiac}`),
  }));
  const free = rows.filter((r) => r.kinds.length === 0).map((r) => `屬${r.zodiac}`);
  const faq = [
    {
      q: `${year} 年犯太歲的生肖有哪些？`,
      a: `${year} 年是${info.ganzhi}年，太歲在「${info.branch}」。犯太歲的生肖共 ${affected.length} 個：${summary}。其餘${free.join("、")}今年沒有犯太歲。`,
    },
    {
      q: `${year} 年從哪一天開始算${info.zodiac}年？`,
      a: `生肖與紫微斗數以農曆正月初一換年，${info.newYear}（春節）起是${info.ganzhi}年、屬${info.zodiac}，到 ${info.eve}（除夕）為止。八字與農民曆則以立春（${info.lichun}）換年。${
        info.lichunFirst
          ? `所以 ${info.lichunShort} 到春節前出生的人，生肖仍算前一年。`
          : `所以春節到 ${info.lichunShort} 立春前出生的人，生肖已算${info.zodiac}，八字仍算前一年。`
      }國曆 1、2 月出生的人，查犯太歲前要先確認自己的生肖。`,
    },
    {
      q: "犯太歲就代表這一年運勢不好嗎？",
      a: "不一定。犯太歲只看出生年與流年兩個地支的關係，同一年出生的人都一樣，是民俗上的提醒。個人的流年要看流年命宮落在你命盤的哪一宮、流年四化進了哪些宮，有人犯太歲反而是忙碌而有收穫的一年。",
    },
    {
      q: "安太歲通常在什麼時候？",
      a: `台灣習俗多在農曆正月到廟裡安太歲，${year} 年春節是 ${info.newYearShort}、元宵是 ${lantern}，許多廟宇在這段期間受理，年底農曆十二月再謝太歲。各廟時間不同，請以廟方公告為準。`,
    },
    {
      q: "紫微斗數怎麼看犯太歲？",
      a: `紫微斗數的流年命宮在地支「${info.branch}」的宮位，每個人都一樣，但這一宮在你本命盤是哪一宮、坐什麼星、有沒有化忌，人人不同。排盤後在運勢分頁選 ${year} 年，可以看到流年命宮、四化落宮與每個月的起伏，比只看生肖更細。`,
    },
  ];

  return (
    <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-20 sm:px-6">
      <JsonLd
        data={{
          "@graph": [
            breadcrumbLd(crumbs),
            articleLd({ headline: title, description, path, section: "taisui", about: `${year} 年犯太歲` }),
            {
              "@type": "FAQPage",
              mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
            },
          ],
        }}
      />
      <Breadcrumbs items={crumbs} />

      <article className="mt-4">
        <header className="max-w-[42em]">
          <p className="text-sm font-medium tracking-[0.2em] text-gold">生肖太歲・民國 {info.roc} 年</p>
          <h1 className="mt-3 font-serif text-3xl leading-snug font-bold tracking-wide sm:text-4xl">{year} 犯太歲生肖查詢</h1>
          <p className="mt-4 text-[17px] leading-relaxed text-ink">
            {year} 年是<strong>{info.ganzhi}年</strong>（肖{info.zodiac}），從 {info.newYear} 春節開始。犯太歲的生肖是
            <strong>{summary}</strong>。
          </p>
          <Link
            href={`/?liunian=${year}`}
            className="mt-6 inline-flex h-12 items-center rounded-xl bg-accent px-6 font-serif font-bold tracking-[0.15em] text-surface transition hover:brightness-110"
          >
            輸入生日看完整流年
          </Link>
        </header>

        <dl className="mt-8 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line text-sm sm:grid-cols-4">
          {[
            ["太歲年", `${info.ganzhi}年・肖${info.zodiac}`],
            ["春節（換年）", info.newYear],
            ["立春", info.lichun],
            ["元宵", `${year}/${lantern}`],
          ].map(([k, v]) => (
            <div key={k} className="bg-surface px-4 py-3">
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="mt-0.5 font-serif font-bold text-ink tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>

        <section aria-labelledby="affected" className="mt-12 max-w-[42em]">
          <h2 id="affected" className="font-serif text-2xl font-bold">
            {year} 年哪些生肖犯太歲？
          </h2>
          <ul className="mt-4 space-y-3">
            {affected.map((r) => (
              <li key={r.zodiac} className="rounded-xl border border-line bg-surface p-5">
                <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-serif text-xl font-bold">屬{r.zodiac}</span>
                  <span className="rounded-full bg-ji/10 px-2.5 py-0.5 text-sm font-bold text-ji">{r.kinds.join("、")}太歲</span>
                </p>
                <p className="mt-2 leading-relaxed text-ink-soft">{taisuiText(r.kinds)}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  民國 {r.roc.join("、")} 年次；西元 {r.ad.slice(-6).join("、")} 年等（以農曆春節為界）
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm leading-relaxed text-muted">今年沒有犯太歲的生肖：{free.join("、")}。</p>
        </section>

        <section aria-labelledby="table" className="mt-12 max-w-3xl">
          <h2 id="table" className="font-serif text-2xl font-bold">
            十二生肖 {year} 年太歲關係一覽
          </h2>
          <table className="mt-4 w-full rounded-xl border border-line bg-surface text-sm">
            <caption className="sr-only">
              {year} {info.ganzhi}年十二生肖與太歲的關係
            </caption>
            <thead>
              <tr className="bg-surface-2 text-left">
                <th scope="col" className="p-3">生肖</th>
                <th scope="col" className="p-3">太歲關係</th>
                <th scope="col" className="p-3">民國出生年次</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.zodiac} className="border-t border-line align-top">
                  <th scope="row" className="p-3 text-left whitespace-nowrap">
                    {r.zodiac}
                    <span className="ml-1 font-normal text-muted">（{r.branch}）</span>
                  </th>
                  <td className={`p-3 whitespace-nowrap ${r.kinds.length ? "font-bold text-ji" : "text-ink-soft"}`}>
                    {r.kinds.map((kind) => `${kind}太歲`).join("、") || "無"}
                  </td>
                  <td className="p-3 leading-relaxed text-ink-soft tabular-nums">{r.roc.join("、")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section aria-labelledby="kinds" className="mt-12 max-w-[42em]">
          <h2 id="kinds" className="font-serif text-2xl font-bold">
            值、沖、刑、害、破太歲是什麼意思？
          </h2>
          <p className="mt-2 leading-relaxed text-ink-soft">
            犯太歲是看出生年的地支與流年地支（{year} 年是「{info.branch}」）的關係，依關係不同分成五種：
          </p>
          <dl className="mt-4 space-y-3">
            {kindsThisYear.map(({ kind, zodiacs }) => (
              <div key={kind} className="rounded-lg border border-line bg-surface px-4 py-3">
                <dt className="font-serif font-bold text-ink">{kind}太歲</dt>
                <dd className="mt-1 leading-relaxed text-ink-soft">
                  {TAISUI_RULE[kind]}。民俗說法是{TAISUI_EFFECT[kind].replace(/^.+?太歲，/, "")}。
                  <span className="mt-1 block text-sm text-muted">
                    {year} 年：{zodiacs.length ? zodiacs.join("、") : "沒有生肖"}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="faq" className="mt-12 max-w-[42em]">
          <h2 id="faq" className="font-serif text-2xl font-bold">
            常見問題
          </h2>
          <div className="mt-4 space-y-6">
            {faq.map((f) => (
              <div key={f.q}>
                <h3 className="font-serif text-lg font-bold">{f.q}</h3>
                <p className="mt-2 leading-relaxed text-ink-soft">{f.a}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm leading-relaxed text-muted">太歲關係屬民俗參考，不構成任何專業建議。個人流年需搭配完整命盤看。</p>
        </section>

        <aside aria-label="免費排盤" className="mt-12 max-w-3xl rounded-2xl border border-accent/30 bg-accent-soft p-6 sm:p-8">
          <p className="font-serif text-xl font-bold">比生肖更細：看你自己的 {year} 年</p>
          <p className="mt-2 max-w-[38em] leading-relaxed text-ink-soft">
            輸入生辰，看{info.ganzhi}年的流年命宮落在你哪一宮、流年四化進了哪些宮，以及每個月的運勢起伏。
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link
              href={`/?liunian=${year}`}
              className="inline-flex h-12 items-center rounded-xl bg-accent px-6 font-serif font-bold tracking-[0.15em] text-surface transition hover:brightness-110"
            >
              免費排盤看 {year} 運勢
            </Link>
            <Link href={`/liunian/${year}`} className="inline-flex min-h-11 items-center font-bold text-accent underline underline-offset-4">
              {year} 流年四化與重要日期
            </Link>
          </div>
        </aside>

        <nav aria-label="其他年份" className="mt-10 flex flex-wrap gap-2">
          {liunianYears()
            .filter((y) => y !== year)
            .map((y) => (
              <Link
                key={y}
                href={`/taisui/${y}`}
                className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-sm text-ink-soft hover:border-accent hover:text-accent"
              >
                {y} 犯太歲查詢
              </Link>
            ))}
        </nav>
      </article>
    </main>
  );
}
