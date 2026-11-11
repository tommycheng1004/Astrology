import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import JsonLd from "@/components/JsonLd";
import { Breadcrumbs, ChartCta } from "@/components/SiteChrome";
import { mutagenInPalace, PALACES, palaceBySlug, starInPalace, surroundingOf } from "@/content/palaces";
import { MUTAGENS } from "@/content/sihua";
import { STARS } from "@/content/stars";
import { absoluteUrl, breadcrumbLd, CONTENT_UPDATED, pageMetadata, PUBLISHER } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return PALACES.map((p) => ({ slug: p.slug }));
}

function describe(slug: string) {
  const palace = palaceBySlug(slug);
  if (!palace) return null;
  const title = `${palace.title}${palace.alias ? `（${palace.alias}）` : ""}看什麼？十四主星在${palace.title}`;
  return { palace, title, description: palace.summary };
}

export async function generateMetadata({ params }: PageProps<"/palaces/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const info = describe(slug);
  if (!info) return {};
  return pageMetadata({ title: info.title, description: info.description, path: `/palaces/${slug}`, type: "article" });
}

const MUTAGEN_TONE: Record<string, string> = { 祿: "text-lu", 權: "text-quan", 科: "text-ke", 忌: "text-ji" };

export default async function PalacePage({ params }: PageProps<"/palaces/[slug]">) {
  const { slug } = await params;
  const info = describe(slug);
  if (!info) notFound();
  const { palace, title, description } = info;
  const path = `/palaces/${slug}`;
  const crumbs = [
    { name: "首頁", path: "/" },
    { name: "十二宮", path: "/palaces" },
    { name: palace.title, path },
  ];
  const { opposite, trines } = surroundingOf(palace);
  const index = PALACES.indexOf(palace);
  const prev = PALACES[(index + 11) % 12];
  const next = PALACES[(index + 1) % 12];

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
              dateModified: CONTENT_UPDATED,
              author: PUBLISHER,
              publisher: PUBLISHER,
              about: { "@type": "Thing", name: `${palace.title}（紫微斗數十二宮）` },
            },
          ],
        }}
      />
      <Breadcrumbs items={crumbs} />

      <article className="mt-4">
        <header className="max-w-[42em]">
          <p className="text-sm font-medium tracking-[0.2em] text-gold">紫微斗數十二宮・第 {index + 1} 宮</p>
          <h1 className="mt-3 font-serif text-3xl leading-snug font-bold tracking-wide sm:text-4xl">
            {palace.title}
            {palace.alias && <span className="text-2xl text-ink-soft sm:text-3xl">（{palace.alias}）</span>}
            看什麼？
          </h1>
          <p className="mt-4 text-[17px] leading-relaxed text-ink">{palace.summary}</p>
        </header>

        <section aria-labelledby="covers" className="mt-10 max-w-[42em]">
          <h2 id="covers" className="font-serif text-2xl font-bold">
            {palace.title}主管的事
          </h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {palace.covers.map((c) => (
              <li key={c} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-ink-soft">
                <span aria-hidden className="size-1.5 shrink-0 rotate-45 bg-gold" />
                {c}
              </li>
            ))}
          </ul>
          <p className="mt-5 leading-relaxed text-ink-soft">{palace.reading}</p>
        </section>

        <section aria-labelledby="sanfang" className="mt-12 max-w-[42em]">
          <h2 id="sanfang" className="font-serif text-2xl font-bold">
            {palace.title}的三方四正
          </h2>
          <p className="mt-3 leading-relaxed text-ink-soft">
            看{palace.title}時，要一起看對宮
            <Link href={`/palaces/${opposite.slug}`} className="mx-0.5 text-accent underline underline-offset-4">
              {opposite.title}
            </Link>
            ，以及三合宮
            {trines.map((t, i) => (
              <Fragment key={t.slug}>
                {i > 0 && "與"}
                <Link href={`/palaces/${t.slug}`} className="mx-0.5 text-accent underline underline-offset-4">
                  {t.title}
                </Link>
              </Fragment>
            ))}
            。對宮的星曜與四化對本宮影響最直接，例如對宮化忌稱為「沖」，往往比本宮化忌更明顯。
          </p>
        </section>

        <section aria-labelledby="stars" className="mt-12">
          <h2 id="stars" className="font-serif text-2xl font-bold">
            十四主星在{palace.title}的意義
          </h2>
          <p className="mt-2 max-w-[42em] leading-relaxed text-ink-soft">
            以下是各主星單獨坐守{palace.title}的基本解讀；雙星同宮、亮度與四化會讓解讀更細緻。
          </p>
          <div className="mt-6 grid gap-x-10 gap-y-6 md:grid-cols-2">
            {STARS.map((s) => (
              <div key={s.slug} className="max-w-[40em]">
                <h3 className="font-serif text-lg font-bold">
                  <Link href={`/stars/${s.slug}`} className="inline-flex min-h-11 items-center text-star-major underline-offset-4 hover:underline">
                    {s.name}
                  </Link>
                  在{palace.title}
                </h3>
                <p className="leading-relaxed text-ink-soft">{starInPalace(s.name, palace.key)}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="empty" className="mt-12 max-w-[42em]">
          <h2 id="empty" className="font-serif text-2xl font-bold">
            {palace.title}沒有主星怎麼看？
          </h2>
          <p className="mt-3 leading-relaxed text-ink-soft">
            {palace.title}沒有主星稱為「空宮」，傳統做法是借對宮（{opposite.title}）的主星來看，但力量打折，也更容易受宮內輔星、煞星與四化影響。空宮不代表不好，而是該領域的狀況較有彈性、較受環境左右。
          </p>
        </section>

        <section aria-labelledby="sihua" className="mt-12 max-w-[42em]">
          <h2 id="sihua" className="font-serif text-2xl font-bold">
            {palace.title}化祿、化權、化科、化忌
          </h2>
          <dl className="mt-4 space-y-3">
            {MUTAGENS.map((m) => (
              <div key={m} className="rounded-lg border border-line bg-surface px-4 py-3">
                <dt className={`font-serif font-bold ${MUTAGEN_TONE[m]}`}>
                  {palace.title}化{m}
                </dt>
                <dd className="mt-1 leading-relaxed text-ink-soft">{mutagenInPalace(m, palace.key)}</dd>
              </div>
            ))}
          </dl>
        </section>
      </article>

      <div className="mt-14">
        <ChartCta
          title={`看看你的${palace.title}`}
          body={`排出命盤後點選${palace.title}，就能看到宮內主星、亮度、四化與三方四正，以及大限、流年走到這一宮時的變化。`}
        />
      </div>

      <nav aria-label="上一宮與下一宮" className="mt-10 grid grid-cols-2 gap-3">
        <Link href={`/palaces/${prev.slug}`} className="flex min-h-14 flex-col justify-center rounded-xl border border-line bg-surface px-4 hover:border-accent">
          <span className="text-xs text-muted">← 上一宮</span>
          <span className="font-serif font-bold">{prev.title}</span>
        </Link>
        <Link href={`/palaces/${next.slug}`} className="flex min-h-14 flex-col items-end justify-center rounded-xl border border-line bg-surface px-4 text-right hover:border-accent">
          <span className="text-xs text-muted">下一宮 →</span>
          <span className="font-serif font-bold">{next.title}</span>
        </Link>
      </nav>
    </main>
  );
}
