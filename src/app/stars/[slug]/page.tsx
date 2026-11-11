import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import { Breadcrumbs, ChartCta } from "@/components/SiteChrome";
import { PALACES, starInPalace } from "@/content/palaces";
import { MUTAGEN_MEANING, mutagensOfStar } from "@/content/sihua";
import { brightnessOf, combosOf, STARS, starBySlug } from "@/content/stars";
import { PERSONAS } from "@/lib/personality";
import { absoluteUrl, breadcrumbLd, CONTENT_UPDATED, pageMetadata, PUBLISHER } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return STARS.map((s) => ({ slug: s.slug }));
}

function describe(slug: string) {
  const star = starBySlug(slug);
  if (!star) return null;
  const persona = PERSONAS[star.name];
  const title = `${star.name}星坐命：${persona.title}｜${star.name}在十二宮`;
  const description = `${star.name}星是紫微斗數十四主星之一，${star.tagline}，五行屬${star.element}，化氣為「${star.essence}」。${persona.text}`.slice(0, 150);
  return { star, persona, title, description };
}

export async function generateMetadata({ params }: PageProps<"/stars/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const info = describe(slug);
  if (!info) return {};
  return pageMetadata({ title: info.title, description: info.description, path: `/stars/${slug}`, type: "article" });
}

const LEVEL_TONE: Record<string, string> = {
  廟: "bg-lu text-surface",
  旺: "bg-lu/10 text-lu",
  得: "bg-ke/15 text-ke",
  利: "bg-ke/10 text-ke",
  平: "bg-surface-2 text-ink-soft",
  不: "bg-ji/10 text-ji",
  陷: "bg-ji text-surface",
};

export default async function StarPage({ params }: PageProps<"/stars/[slug]">) {
  const { slug } = await params;
  const info = describe(slug);
  if (!info) notFound();
  const { star, persona, title, description } = info;
  const path = `/stars/${slug}`;
  const crumbs = [
    { name: "首頁", path: "/" },
    { name: "十四主星", path: "/stars" },
    { name: `${star.name}星`, path },
  ];
  const brightness = brightnessOf(star);
  const best = brightness.filter((b) => b.level === "廟").map((b) => b.branch);
  const worst = brightness.filter((b) => b.level === "陷").map((b) => b.branch);
  const mutagens = mutagensOfStar(star.name);
  const combos = combosOf(star);
  const others = STARS.filter((s) => s.slug !== slug);

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
              about: { "@type": "Thing", name: `${star.name}星（紫微斗數主星）` },
            },
          ],
        }}
      />
      <Breadcrumbs items={crumbs} />

      <article className="mt-4">
        <header className="max-w-[42em]">
          <p className="text-sm font-medium tracking-[0.2em] text-gold">紫微斗數十四主星・{star.family}</p>
          <h1 className="mt-3 font-serif text-3xl leading-snug font-bold tracking-wide sm:text-4xl">
            {star.name}星坐命：{persona.title}
          </h1>
          <p className="mt-4 text-[17px] leading-relaxed text-ink">
            <strong>{star.name}星</strong>是紫微斗數十四主星之一，{star.tagline}。{persona.text}
          </p>
        </header>

        <dl className="mt-6 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line text-sm sm:grid-cols-4">
          {[
            ["星系", star.family],
            ["五行", star.element],
            ["化氣", star.essence],
            ["四化", mutagens.length ? mutagens.map((m) => `${m.stem}干化${m.mutagen}`).join("、") : "不參與四化"],
          ].map(([k, v]) => (
            <div key={k} className="bg-surface px-4 py-3">
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="mt-0.5 font-serif font-bold text-ink">{v}</dd>
            </div>
          ))}
        </dl>

        <section aria-labelledby="traits" className="mt-12 max-w-[42em]">
          <h2 id="traits" className="font-serif text-2xl font-bold">
            {star.name}星坐命的人有什麼特質？
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-lu/30 bg-surface p-5">
              <h3 className="font-serif font-bold text-lu">優點</h3>
              <ul className="mt-2 space-y-1.5 text-ink-soft">
                {persona.strengths.map((s) => (
                  <li key={s}>・{s}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-ji/30 bg-surface p-5">
              <h3 className="font-serif font-bold text-ji">要留意</h3>
              <ul className="mt-2 space-y-1.5 text-ink-soft">
                {persona.cautions.map((s) => (
                  <li key={s}>・{s}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section aria-labelledby="palaces" className="mt-12">
          <h2 id="palaces" className="font-serif text-2xl font-bold">
            {star.name}星在十二宮代表什麼？
          </h2>
          <p className="mt-2 max-w-[42em] leading-relaxed text-ink-soft">
            同一顆星落在不同宮位，說的是人生不同面向。以下是{star.name}星單獨坐守各宮的基本解讀，實際論命還要看同宮星曜、四化與三方四正。
          </p>
          <div className="mt-6 grid gap-x-10 gap-y-6 md:grid-cols-2">
            {PALACES.map((p) => (
              <div key={p.slug} className="max-w-[40em]">
                <h3 className="font-serif text-lg font-bold">
                  {star.name}在
                  <Link href={`/palaces/${p.slug}`} className="inline-flex min-h-11 items-center text-accent underline-offset-4 hover:underline">
                    {p.title}
                  </Link>
                </h3>
                <p className="leading-relaxed text-ink-soft">{starInPalace(star.name, p.key)}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="brightness" className="mt-12">
          <h2 id="brightness" className="font-serif text-2xl font-bold">
            {star.name}星的廟旺利陷
          </h2>
          <p className="mt-2 max-w-[42em] leading-relaxed text-ink-soft">
            亮度代表星曜在該地支發揮力量的程度，由強到弱為廟、旺、得、利、平、不、陷。
            {best.length > 0 && `${star.name}星在${best.join("、")}宮入廟，力量最完整`}
            {worst.length > 0 ? `；在${worst.join("、")}宮落陷，優點較難發揮、缺點較明顯。` : best.length > 0 ? "。" : ""}
          </p>
          <table className="mt-5 w-full max-w-3xl table-fixed border-collapse overflow-hidden rounded-xl text-center text-sm">
            <caption className="sr-only">{star.name}星在十二地支的亮度</caption>
            <thead>
              <tr>
                {brightness.map((b) => (
                  <th key={b.branch} scope="col" className="border border-line bg-surface-2 py-2 font-serif font-bold">
                    {b.branch}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {brightness.map((b) => (
                  <td key={b.branch} className={`border border-line py-2 font-serif font-bold ${LEVEL_TONE[b.level] ?? ""}`}>
                    {b.level}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted">亮度表與本站排盤引擎一致（通行版）；各家流派對少數宮位的評等略有出入。</p>
        </section>

        {mutagens.length > 0 && (
          <section aria-labelledby="mutagen" className="mt-12 max-w-[42em]">
            <h2 id="mutagen" className="font-serif text-2xl font-bold">
              {star.name}星什麼時候化祿、化權、化科、化忌？
            </h2>
            <ul className="mt-4 space-y-2 leading-relaxed text-ink-soft">
              {mutagens.map((m) => (
                <li key={m.stem + m.mutagen}>
                  <strong className="text-ink">
                    {m.stem}年生或{m.stem}干：{star.name}化{m.mutagen}
                  </strong>
                  ——{MUTAGEN_MEANING[m.mutagen]}。
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-muted">
              依通行版十干四化。生年天干決定本命四化，大限、流年的宮干則產生運限四化，
              <Link href="/method#sihua" className="text-accent underline underline-offset-4">
                完整四化表
              </Link>
              。
            </p>
          </section>
        )}

        {combos.length > 0 && (
          <section aria-labelledby="combos" className="mt-12">
            <h2 id="combos" className="font-serif text-2xl font-bold">
              {star.name}星的雙星組合
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {combos.map((c) => (
                <div key={c.key} className="rounded-xl border border-line bg-surface/80 p-5">
                  <h3 className="font-serif text-lg font-bold">
                    {c.pair}同宮：{c.title}
                  </h3>
                  <p className="mt-1.5 leading-relaxed text-ink-soft">{c.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </article>

      <div className="mt-14">
        <ChartCta
          title={`${star.name}星在你命盤的哪一宮？`}
          body={`排出你的紫微斗數命盤，就能看到${star.name}星落在哪個宮位、亮度如何、有沒有化祿化忌，以及它對你這十年、這一年的影響。`}
        />
      </div>

      <nav aria-labelledby="more-stars" className="mt-12">
        <h2 id="more-stars" className="font-serif text-xl font-bold">
          其他主星
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {others.map((s) => (
            <li key={s.slug}>
              <Link
                href={`/stars/${s.slug}`}
                className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-3.5 font-serif hover:border-accent hover:text-accent"
              >
                {s.name}星
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
