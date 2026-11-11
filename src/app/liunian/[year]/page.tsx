import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import { Breadcrumbs } from "@/components/SiteChrome";
import { liunianInfo, liunianYears } from "@/content/liunian";
import { absoluteUrl, breadcrumbLd, pageMetadata, PUBLISHER } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return liunianYears().map((y) => ({ year: String(y) }));
}

function describe(param: string) {
  const year = Number(param);
  if (!liunianYears().includes(year)) return null;
  const info = liunianInfo(year);
  const title = `${year} ${info.ganzhi}年流年運勢｜犯太歲生肖、流年四化與重要日期`;
  const names = info.taisui.map((t) => `屬${t.zodiac}`).join("、");
  const description = `${year} 年是${info.ganzhi}年（民國 ${info.roc} 年，肖${info.zodiac}），${info.newYear} 春節換年。犯太歲的生肖：${names}。流年四化${info.sihua.map((s) => `${s.star}化${s.mutagen}`).join("、")}，排盤看落在你命盤的哪一宮。`;
  return { info, title, description };
}

export async function generateMetadata({ params }: PageProps<"/liunian/[year]">): Promise<Metadata> {
  const { year } = await params;
  const d = describe(year);
  if (!d) return {};
  return pageMetadata({ title: d.title, description: d.description, path: `/liunian/${year}`, type: "article" });
}

const MUTAGEN_BADGE: Record<string, string> = {
  祿: "bg-lu text-surface",
  權: "bg-quan text-surface",
  科: "bg-ke text-surface",
  忌: "bg-ji text-surface",
};

export default async function LiunianPage({ params }: PageProps<"/liunian/[year]">) {
  const { year: param } = await params;
  const d = describe(param);
  if (!d) notFound();
  const { info, title, description } = d;
  const { year } = info;
  const path = `/liunian/${year}`;
  const crumbs = [
    { name: "首頁", path: "/" },
    { name: `${year} 流年運勢`, path },
  ];
  const faq = [
    {
      q: `${year} 年什麼時候換生肖？`,
      a: `紫微斗數與一般說的生肖，以農曆正月初一換年：${info.newYear}（春節）起是${info.ganzhi}年、屬${info.zodiac}。八字與農民曆則以立春（${info.lichun}）換年。${
        info.lichunFirst
          ? `所以 ${info.lichunShort} 到春節前出生的人，八字已算${info.ganzhi}年，紫微與生肖仍算前一年。`
          : `所以春節到 ${info.lichunShort} 立春前出生的人，紫微與生肖已算${info.ganzhi}年，八字仍算前一年。`
      }`,
    },
    {
      q: `${year} 年的流年命宮在哪裡？`,
      a: `流年命宮在命盤上地支為「${info.branch}」的那一宮，每個人都一樣；但這一宮在你本命盤是什麼宮、坐什麼星，人人不同，所以要排盤才看得出你這一年的重點。`,
    },
    {
      q: `${year} 年的鬼月是什麼時候？`,
      a: `農曆七月是國曆 ${year}/${info.ghost}${info.leap === "閏七月" ? "（閏七月不算）" : ""}。台灣習俗這段期間避開嫁娶、入宅、開市、動土與買房買車等大事。`,
    },
  ];

  return (
    <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-20 sm:px-6">
      <JsonLd
        data={{
          "@graph": [
            breadcrumbLd(crumbs),
            {
              "@type": "Article",
              headline: title,
              description,
              inLanguage: "zh-Hant-TW",
              url: absoluteUrl(path),
              mainEntityOfPage: absoluteUrl(path),
              author: PUBLISHER,
              publisher: PUBLISHER,
            },
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
          <p className="text-sm font-medium tracking-[0.2em] text-gold">紫微斗數流年・民國 {info.roc} 年</p>
          <h1 className="mt-3 font-serif text-3xl leading-snug font-bold tracking-wide sm:text-4xl">
            {year} {info.ganzhi}年流年運勢
          </h1>
          <p className="mt-4 text-[17px] leading-relaxed text-ink">
            {year} 年是<strong>{info.ganzhi}年</strong>，生肖屬{info.zodiac}。流年天干「{info.stem}」讓
            {info.sihua.map((s) => `${s.star}化${s.mutagen}`).join("、")}
            ，每個人都受影響，但落在命盤哪一宮因人而異；犯太歲的生肖是
            {info.taisui.map((t) => `屬${t.zodiac}`).join("、")}。
          </p>
          <Link
            href={`/?liunian=${year}`}
            className="mt-6 inline-flex h-12 items-center rounded-xl bg-accent px-6 font-serif font-bold tracking-[0.15em] text-surface transition hover:brightness-110"
          >
            排盤看我的 {year} 年運勢
          </Link>
        </header>

        <dl className="mt-8 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line text-sm sm:grid-cols-4">
          {[
            ["春節（換年）", info.newYear],
            ["立春", info.lichun],
            ["農曆七月", info.ghost],
            ["閏月", info.leap ?? "無"],
          ].map(([k, v]) => (
            <div key={k} className="bg-surface px-4 py-3">
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="mt-0.5 font-serif font-bold text-ink tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-sm text-muted">
          {info.ganzhi}年從 {info.newYear} 到 {info.eve}（除夕）。
        </p>

        <section aria-labelledby="taisui" className="mt-12 max-w-[42em]">
          <h2 id="taisui" className="font-serif text-2xl font-bold">
            {year} 年哪些生肖犯太歲？
          </h2>
          <ul className="mt-4 space-y-3">
            {info.taisui.map((t) => (
              <li key={t.zodiac} className="rounded-xl border border-line bg-surface p-5">
                <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-serif text-xl font-bold">屬{t.zodiac}</span>
                  <span className="rounded-full bg-ji/10 px-2.5 py-0.5 text-sm font-bold text-ji">{t.label}</span>
                </p>
                <p className="mt-2 leading-relaxed text-ink-soft">{t.text}</p>
                <p className="mt-1.5 text-sm text-muted">民國 {t.years.join("、")} 年次（以農曆春節為界）</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            犯太歲是民俗說法，台灣習俗會在農曆正月到廟裡安太歲，求個心安。紫微斗數看的是流年落在你命盤的宮位與四化，比生肖更細，可以合參。
          </p>
        </section>

        <section aria-labelledby="sihua" className="mt-12 max-w-[42em]">
          <h2 id="sihua" className="font-serif text-2xl font-bold">
            {year} 年的流年四化是什麼？
          </h2>
          <p className="mt-2 leading-relaxed text-ink-soft">
            {info.stem}干四化：每個人的命盤這一年都是這四顆星化祿、權、科、忌。化在哪一宮，就應在那個人生面向，例如化忌落在財帛宮，就是錢財上要多留意。
          </p>
          <ul className="mt-4 space-y-3">
            {info.sihua.map((s) => (
              <li key={s.mutagen} className="flex gap-4 rounded-xl border border-line bg-surface p-5">
                <span className={`grid size-9 shrink-0 place-items-center rounded-md font-serif text-lg font-bold ${MUTAGEN_BADGE[s.mutagen]}`}>
                  {s.mutagen}
                </span>
                <span>
                  <span className="block font-serif text-lg font-bold">
                    {s.star}化{s.mutagen}
                  </span>
                  <span className="mt-1 block leading-relaxed text-ink-soft">{s.text}</span>
                </span>
              </li>
            ))}
          </ul>
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
        </section>

        <aside aria-label="免費排盤" className="mt-12 max-w-3xl rounded-2xl border border-accent/30 bg-accent-soft p-6 sm:p-8">
          <p className="font-serif text-xl font-bold">看你自己的 {year} 年運勢</p>
          <p className="mt-2 max-w-[38em] leading-relaxed text-ink-soft">
            輸入生辰，看{info.ganzhi}年的流年命宮落在你哪一宮、四化進了哪些宮，以及每個月的運勢起伏與犯太歲提醒。
          </p>
          <Link
            href={`/?liunian=${year}`}
            className="mt-5 inline-flex h-12 items-center rounded-xl bg-accent px-6 font-serif font-bold tracking-[0.15em] text-surface transition hover:brightness-110"
          >
            免費排盤看 {year} 運勢
          </Link>
        </aside>

        <nav aria-label="其他年份" className="mt-10 flex flex-wrap gap-2">
          {liunianYears()
            .filter((y) => y !== year)
            .map((y) => (
              <Link
                key={y}
                href={`/liunian/${y}`}
                className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-sm text-ink-soft hover:border-accent hover:text-accent"
              >
                {y} {liunianInfo(y).ganzhi}年運勢
              </Link>
            ))}
        </nav>
      </article>
    </main>
  );
}
