import { adminJson, guard } from "@/lib/server/admin";
import { toRow, UID_PATTERN, type MemberDoc } from "@/lib/server/members";
import { getDoc, query, type Doc } from "@/lib/server/store";

const PAGE = 50;

/**
 * 會員列表：沒有關鍵字時依最近使用時間排序（after 為上一頁最後一筆的 lastSeen）；
 * 關鍵字含 @ 或英數時以 Email 開頭比對，看起來像 uid 時直接查那一筆。
 */
export async function GET(request: Request) {
  const actor = await guard(request, "members.read");
  if (actor instanceof Response) return actor;
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase().slice(0, 120);
  const after = url.searchParams.get("after");
  try {
    let rows: Doc<MemberDoc>[];
    if (!q) {
      const cursor = after && !Number.isNaN(Date.parse(after)) ? [new Date(after)] : undefined;
      rows = await query<MemberDoc>({ collection: "members", orderBy: [["lastSeen", "desc"]], limit: PAGE, startAfter: cursor });
    } else {
      rows = await query<MemberDoc>({
        collection: "members",
        where: [["email", ">=", q], ["email", "<", `${q}`]],
        orderBy: [["email", "asc"]],
        limit: PAGE,
      });
      const original = (url.searchParams.get("q") ?? "").trim();
      if (!rows.length && UID_PATTERN.test(original)) {
        const one = await getDoc<MemberDoc>(["members", original]);
        if (one) rows = [one];
      }
    }
    return adminJson({ members: rows.map(toRow), more: !q && rows.length === PAGE });
  } catch (e) {
    console.error("[admin] 會員列表讀取失敗", e);
    return adminJson({ error: "會員資料讀取失敗，請稍後再試。" }, 502);
  }
}
