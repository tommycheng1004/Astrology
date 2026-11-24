import type { AdminOverview, DayStat } from "@/lib/adminTypes";
import { adminJson, guard } from "@/lib/server/admin";
import { taiwanDate } from "@/lib/server/firebase";
import { appConfig } from "@/lib/server/members";
import { aggregate, getDocs } from "@/lib/server/store";

const DAYS = 14;

export async function GET(request: Request) {
  const actor = await guard(request, "dashboard.read");
  if (actor instanceof Response) return actor;
  const weekAgo = new Date(Date.now() - 7 * 86400_000);
  const dates = Array.from({ length: DAYS }, (_, i) => taiwanDate(Date.now() - i * 86400_000));
  try {
    const [total, new7d, active7d, charts, reports, stats, config] = await Promise.all([
      aggregate({ collection: "members" }, { count: true }),
      aggregate({ collection: "members", where: [["firstSeen", ">=", weekAgo]] }, { count: true }),
      aggregate({ collection: "members", where: [["lastSeen", ">=", weekAgo]] }, { count: true }),
      aggregate({ collection: "charts", allDescendants: true }, { count: true }),
      aggregate({ collection: "reports", allDescendants: true }, { count: true }),
      getDocs<Partial<DayStat>>(dates.map((date) => ["stats", date])),
      appConfig(),
    ]);
    const days: DayStat[] = dates.map((date, i) => ({
      date,
      questionsMember: stats[i]?.data.questionsMember ?? 0,
      questionsGuest: stats[i]?.data.questionsGuest ?? 0,
      newMembers: stats[i]?.data.newMembers ?? 0,
    }));
    const overview: AdminOverview = { members: { total, new7d, active7d }, charts, reports, days, config };
    return adminJson(overview);
  } catch (e) {
    console.error("[admin] 儀表板讀取失敗", e);
    return adminJson({ error: "統計資料讀取失敗，請稍後再試。" }, 502);
  }
}
