import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { Breadcrumbs, ChartCta } from "@/components/SiteChrome";
import { STARS } from "@/content/stars";
import { PERSONAS } from "@/lib/personality";
import { absoluteUrl, breadcrumbLd, pageMetadata } from "@/lib/site";

const TITLE = "紫微斗數十四主星解析";
const DESCRIPTION =
  "紫微斗數十四主星一次看懂：紫微、天機、太陽、武曲、天同、廉貞、天府、太陰、貪狼、巨門、天相、天梁、七殺、破軍的個性、五行、化氣、廟旺利陷與在十二宮的意義。";

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/stars" });

const CRUMBS = [
  { name: "首頁", path: "/" },
  { name: "十四主星", path: "/stars" },
];

export default function StarsPage() {
  const families = ["紫微星系", "天府星系"] as const;
  return (
    <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-20 sm:px-6">
      <JsonLd
        data={{
          "@graph": [
            breadcrumbLd(CRUMBS),
            {
              "@type": "ItemList",
              name: TITLE,
              itemListElement: STARS.map((s, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: `${s.name}星`,
                url: absoluteUrl(`/stars/${s.slug}`),
              })),
            },
          ],
        }}
      />
      <Breadcrumbs items={CRUMBS} />
      <h1 className="mt-4 font-serif text-3xl font-bold tracking-wide sm:text-4xl">{TITLE}</h1>
      <p className="mt-4 max-w-[40em] text-[17px] leading-relaxed text-ink-soft">
        十四主星是紫微斗數命盤的骨幹，決定每個宮位的基本性格。安星時分為兩組：以紫微為首的「紫微星系」六顆，以及以天府為首的「天府星系」八顆。命宮主星大致描繪一個人的個性，落在其他宮位則說明該領域的狀況。
      </p>

      {families.map((family) => (
        <section key={family} aria-labelledby={`family-${family}`} className="mt-10">
          <h2 id={`family-${family}`} className="font-serif text-2xl font-bold">
            {family}
          </h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STARS.filter((s) => s.family === family).map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/stars/${s.slug}`}
                  className="flex h-full flex-col rounded-xl border border-line bg-surface/80 p-5 transition hover:border-accent hover:shadow-sm"
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-serif text-xl font-bold text-star-major">{s.name}星</span>
                    <span className="text-xs text-muted">
                      {s.element}・化氣為{s.essence}
                    </span>
                  </span>
                  <span className="mt-1 text-sm font-medium text-ink">{s.tagline}</span>
                  <span className="mt-2 text-sm leading-relaxed text-ink-soft">坐命：{PERSONAS[s.name].title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="mt-14">
        <ChartCta title="你的命宮是哪顆主星？" body="輸入出生年月日與時間，免費排出你的紫微斗數命盤，看看十四主星分別落在你的哪些宮位。" />
      </div>
    </main>
  );
}
