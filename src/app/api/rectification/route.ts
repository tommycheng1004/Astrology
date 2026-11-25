import { taiwanNow } from "@/lib/chartSummary";
import { parseLifeEvents, rankBirthTimes, type LifeEvent } from "@/lib/rectification";
import { notConfigured, privateJson, readDocument, requestMember, usageConfigured, writeDocuments } from "@/lib/server/firebase";
import { parseShareHash } from "@/lib/shareLink";

const path = (uid: string) => ["users", uid, "settings", "rectification"];

export async function GET(request: Request) {
  const member = await requestMember(request);
  if (!member) return privateJson({ error: "請先登入會員。" }, 401);
  if (!usageConfigured) return notConfigured("事件定盤");
  const record = await readDocument<{ events: LifeEvent[] }>(path(member.uid));
  return privateJson({ events: record?.data.events ?? [] });
}

export async function POST(request: Request) {
  const member = await requestMember(request);
  if (!member) return privateJson({ error: "請先登入會員。" }, 401);
  if (!usageConfigured) return notConfigured("事件定盤");
  const body = await request.json().catch(() => null);
  const saved = typeof body?.birth === "string" && body.birth.length <= 150 ? parseShareHash(`#c=${body.birth}`) : null;
  if (!saved) return privateJson({ error: "生辰資料有誤。" }, 400);
  const latest = Number(taiwanNow().date.split("-")[0]);
  const events = parseLifeEvents(body.events, saved.input.year, latest);
  if (!events) return privateJson({ error: "請填寫 5 到 10 件不重複的事件，年份須介於出生年與今年。" }, 400);
  const current = await readDocument(path(member.uid));
  const ranking = await rankBirthTimes(saved, events);
  if (!await writeDocuments([{ path: path(member.uid), data: { events }, version: current?.version ?? false }]))
    return privateJson({ error: "事件已在另一個分頁更新，請重新整理。" }, 409);
  return privateJson({ ranking });
}

export async function DELETE(request: Request) {
  const member = await requestMember(request);
  if (!member) return privateJson({ error: "請先登入會員。" }, 401);
  if (!usageConfigured) return notConfigured("事件定盤");
  const current = await readDocument(path(member.uid));
  if (current && !await writeDocuments([{ path: path(member.uid), version: current.version }]))
    return privateJson({ error: "事件已在另一個分頁更新，請再試一次。" }, 409);
  return privateJson({ deleted: true });
}
