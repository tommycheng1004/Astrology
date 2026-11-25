import { randomBytes } from "node:crypto";
import { calendarDate, calendarPath, tokenPath, type CalendarSettings } from "@/lib/server/calendar";
import { notConfigured, privateJson, readDocument, requestMember, usageConfigured, writeDocuments } from "@/lib/server/firebase";
import { parseShareHash, shareHash } from "@/lib/shareLink";

export async function GET(request: Request) {
  const member = await requestMember(request);
  if (!member) return privateJson({ error: "請先登入會員。" }, 401);
  if (!usageConfigured) return notConfigured("行事曆");
  const config = await readDocument<CalendarSettings>(calendarPath(member.uid));
  return privateJson({ token: config?.data.token, dates: config?.data.dates ?? [], hasChart: !!config?.data.chart });
}

export async function POST(request: Request) {
  const member = await requestMember(request);
  if (!member) return privateJson({ error: "請先登入會員。" }, 401);
  if (!usageConfigured) return notConfigured("行事曆");
  const body = await request.json().catch(() => null);
  if (!body || !["reset", "chart", "save", "remove"].includes(body.action)) return privateJson({ error: "行事曆設定有誤。" }, 400);
  const date = calendarDate(body.date);
  const birth = typeof body.birth === "string" && body.birth.length <= 150 ? parseShareHash(`#c=${body.birth}`) : null;
  if ((body.action === "save" || body.action === "remove") && !date) return privateJson({ error: "日期有誤。" }, 400);
  if (body.action === "chart" && !birth) return privateJson({ error: "命盤資料有誤。" }, 400);
  const path = calendarPath(member.uid);
  for (let attempt = 0; attempt < 4; attempt++) {
    const current = await readDocument<CalendarSettings>(path);
    const data: CalendarSettings = current?.data ?? { dates: [] };
    const previous = data.token;
    if (body.action === "reset" || !previous) data.token = randomBytes(32).toString("base64url");
    if (body.action === "chart") data.chart = { birth: shareHash(birth!).slice(3), variant: body.variant === "alt" ? "alt" : "main" };
    if (body.action === "save" && !data.dates.includes(date!)) {
      if (data.dates.length >= 100) return privateJson({ error: "最多可儲存 100 個日期。" }, 400);
      data.dates.push(date!);
      data.dates.sort();
    }
    if (body.action === "remove") data.dates = data.dates.filter((value) => value !== date);
    const changed = data.token !== previous;
    if (await writeDocuments([
      { path, data, version: current?.version ?? false },
      ...(changed ? [{ path: tokenPath(data.token!), data: { uid: member.uid }, version: false as const }] : []),
      ...(changed && previous ? [{ path: tokenPath(previous) }] : []),
    ])) return privateJson({ token: data.token, dates: data.dates, hasChart: !!data.chart });
  }
  return privateJson({ error: "行事曆設定更新中，請再試一次。" }, 409);
}
