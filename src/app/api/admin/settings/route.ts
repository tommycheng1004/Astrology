import { adminJson, auditEntry, guard, reasonOf } from "@/lib/server/admin";
import { appConfig, CONFIG_DEFAULTS, CONFIG_PATH, forgetConfig } from "@/lib/server/members";
import { commit, getDoc } from "@/lib/server/store";

export async function GET(request: Request) {
  const actor = await guard(request, "settings.read");
  if (actor instanceof Response) return actor;
  forgetConfig();
  return adminJson({ config: await appConfig(), defaults: CONFIG_DEFAULTS });
}

/** 修改系統設定：{ aiEnabled, dailyGuest 0–50, dailyMember 0–500, reason } */
export async function PUT(request: Request) {
  const actor = await guard(request, "settings.write", { write: true });
  if (actor instanceof Response) return actor;
  const body = await request.json().catch(() => null);
  const reason = reasonOf(body);
  const int = (v: unknown, max: number) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max;
  if (typeof body?.aiEnabled !== "boolean" || !int(body.dailyGuest, 50) || !int(body.dailyMember, 500))
    return adminJson({ error: "設定值有誤：訪客 0–50 題、會員 0–500 題。" }, 400);
  if (!reason) return adminJson({ error: "請填寫修改原因（2–200 字）。" }, 400);
  const current = await getDoc<Record<string, unknown>>(CONFIG_PATH);
  const before = await appConfig();
  const after = { aiEnabled: body.aiEnabled as boolean, dailyGuest: body.dailyGuest as number, dailyMember: body.dailyMember as number };
  const ok = await commit([
    {
      op: "set",
      path: CONFIG_PATH,
      fields: { ...after, updatedAt: new Date(), updatedBy: actor.email },
      ...(current ? { updateTime: current.updateTime } : { mustExist: false }),
    },
    auditEntry(actor, "settings.update", "系統設定", { before: { aiEnabled: before.aiEnabled, dailyGuest: before.dailyGuest, dailyMember: before.dailyMember }, after }, reason),
  ]);
  forgetConfig();
  if (!ok) return adminJson({ error: "設定剛被其他人更新，請重新整理後再試。" }, 409);
  return adminJson({ ok: true });
}
