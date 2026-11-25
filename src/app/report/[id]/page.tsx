import { Suspense } from "react";
import { notFound } from "next/navigation";
import ReportReader from "@/components/ReportReader";
import { reportInfo } from "@/content/reports";
import { ANNUAL_REPORT, REPORT_YEAR } from "@/lib/annualReport";
import { PURPOSES } from "@/lib/dateSelect";
import { AI_ENABLED } from "@/lib/site";

const ids = [ANNUAL_REPORT, "monthly", "deep"];
export const dynamicParams = false;
export function generateStaticParams() {
  return ids.map((id) => ({ id }));
}

const infoOf = (id: string) => reportInfo(id, REPORT_YEAR, PURPOSES.length, AI_ENABLED);

export async function generateMetadata({ params }: PageProps<"/report/[id]">) {
  const { id } = await params;
  return { title: ids.includes(id) ? infoOf(id).title : "會員命盤報告", robots: { index: false, follow: false } };
}

export default async function ReportPage({ params }: PageProps<"/report/[id]">) {
  const { id } = await params;
  if (!ids.includes(id)) notFound();
  return (
    <Suspense fallback={<p role="status" className="mx-auto p-4">正在載入報告…</p>}>
      <ReportReader info={infoOf(id)} kind={id === ANNUAL_REPORT ? "annual" : (id as "monthly" | "deep")} />
    </Suspense>
  );
}
