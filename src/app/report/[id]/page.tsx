import { Suspense } from "react";
import { notFound } from "next/navigation";
import ReportReader from "@/components/ReportReader";
import { ANNUAL_REPORT } from "@/lib/annualReport";

export const metadata = { title: "會員命盤報告", robots: { index: false, follow: false } };
const ids = [ANNUAL_REPORT, "monthly", "deep"];
export const dynamicParams = false;
export function generateStaticParams() {
  return ids.map((id) => ({ id }));
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ids.includes(id)) notFound();
  return <Suspense fallback={<p role="status" className="mx-auto p-4">正在載入報告…</p>}><ReportReader /></Suspense>;
}
