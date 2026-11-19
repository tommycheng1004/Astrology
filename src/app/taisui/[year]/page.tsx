import Link from "next/link";
import { notFound } from "next/navigation";
import { liunianYears } from "@/content/liunian";
import { yearGanzhi, yearStartDate } from "@/lib/periods";
import { pageMetadata } from "@/lib/site";
import { taisuiTable, zodiacOf } from "@/lib/taisui";

type Params = { params: Promise<{ year: string }> };
export const dynamicParams = false;
export function generateStaticParams() {
  return liunianYears().map((year) => ({ year: String(year) }));
}

export async function generateMetadata({ params }: Params) {
  const { year } = await params;
  return pageMetadata({
    title: `${year} 年犯太歲生肖查詢`,
    description: `查詢 ${year} 年十二生肖值、沖、刑、害、破太歲的情形與農曆換年日期。`,
    path: `/taisui/${year}`,
  });
}

export default async function TaisuiPage({ params }: Params) {
  const { year } = await params;
  if (!liunianYears().includes(Number(year))) notFound();
  const ganzhi = yearGanzhi(Number(year));
  const rows = taisuiTable(ganzhi[1]);
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <h1 className="font-serif text-3xl font-bold">{year} 年犯太歲生肖查詢</h1>
      <p className="text-ink-soft">{ganzhi}年屬{zodiacOf(ganzhi[1])}，自國曆 {yearStartDate(Number(year))} 的農曆正月初一開始。</p>
      <table className="w-full rounded-xl border border-line bg-surface text-sm">
        <thead><tr className="bg-surface-2 text-left"><th scope="col" className="p-3">生肖</th><th scope="col" className="p-3">太歲關係</th></tr></thead>
        <tbody>
          {rows.map(({ zodiac, kinds }) => (
            <tr key={zodiac} className="border-t border-line">
              <th scope="row" className="p-3 text-left">{zodiac}</th>
              <td className="p-3">{kinds.map((kind) => `${kind}太歲`).join("、") || "無"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-sm text-ink-soft">太歲關係屬民俗參考。個人流年需搭配完整命盤看。</p>
      <Link className="inline-flex min-h-11 items-center rounded-lg bg-accent px-4 font-bold text-surface" href={`/?liunian=${year}`}>輸入生日看完整流年</Link>
    </main>
  );
}
