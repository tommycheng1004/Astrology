import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { Breadcrumbs, ChartCta } from "@/components/SiteChrome";
import { PALACES } from "@/content/palaces";
import { absoluteUrl, breadcrumbLd, pageMetadata } from "@/lib/site";

const TITLE = "紫微斗數十二宮是什麼？各宮代表意義";
const DESCRIPTION =
  "紫微斗數十二宮完整說明：命宮、兄弟宮、夫妻宮、子女宮、財帛宮、疾厄宮、遷移宮、交友宮（僕役宮）、官祿宮、田宅宮、福德宮、父母宮各看什麼，以及三方四正怎麼看。";

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/palaces" });

const CRUMBS = [
  { name: "首頁", path: "/" },
  { name: "十二宮", path: "/palaces" },
];

export default function PalacesPage() {
  return (
    <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-20 sm:px-6">
      <JsonLd
        data={{
          "@graph": [
            breadcrumbLd(CRUMBS),
            {
              "@type": "ItemList",
              name: "紫微斗數十二宮",
              itemListElement: PALACES.map((p, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: p.title,
                url: absoluteUrl(`/palaces/${p.slug}`),
              })),
            },
          ],
        }}
      />
      <Breadcrumbs items={CRUMBS} />
      <h1 className="mt-4 font-serif text-3xl font-bold tracking-wide sm:text-4xl">{TITLE}</h1>
      <p className="mt-4 max-w-[40em] text-[17px] leading-relaxed text-ink-soft">
        紫微斗數把人生分成十二個面向，稱為十二宮。從命宮開始依序為兄弟、夫妻、子女、財帛、疾厄、遷移、交友（古稱僕役）、官祿、田宅、福德、父母。看任何一宮都要連同「三方四正」——對宮與兩個三合宮——一起判斷。
      </p>

      <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PALACES.map((p, i) => (
          <li key={p.slug}>
            <Link
              href={`/palaces/${p.slug}`}
              className="flex h-full flex-col rounded-xl border border-line bg-surface/80 p-5 transition hover:border-accent hover:shadow-sm"
            >
              <span className="flex items-baseline gap-2">
                <span className="font-serif text-sm text-gold tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <span className="font-serif text-xl font-bold">{p.title}</span>
                {p.alias && <span className="text-xs text-muted">又稱{p.alias}</span>}
              </span>
              <span className="mt-2 text-sm leading-relaxed text-ink-soft">{p.summary}</span>
            </Link>
          </li>
        ))}
      </ol>

      <section aria-labelledby="sanfang" className="mt-14 max-w-[42em]">
        <h2 id="sanfang" className="font-serif text-2xl font-bold">
          什麼是三方四正？
        </h2>
        <p className="mt-3 leading-relaxed text-ink-soft">
          三方四正是看宮位時的基本方法：「本宮」加上正對面的「對宮」，再加上前後各隔四宮的兩個「三合宮」，共四個宮位。例如看命宮，要一起看遷移宮（對宮）、財帛宮與官祿宮（三合宮）。本宮是主體，對宮的影響最直接，三合宮是外來的助力或牽制。
        </p>
      </section>

      <div className="mt-14">
        <ChartCta title="排出你的十二宮" body="輸入出生資料，免費排出命盤，點任一宮位就能看到它的主星、四化與三方四正。" />
      </div>
    </main>
  );
}
