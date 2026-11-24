import { adminJson, guard, PERMISSIONS, ROLE_LABEL, can, type Permission } from "@/lib/server/admin";
import type { AdminSession } from "@/lib/adminTypes";

export async function GET(request: Request) {
  const actor = await guard(request, "dashboard.read");
  if (actor instanceof Response) return actor;
  const session: AdminSession = {
    email: actor.email,
    role: actor.role,
    roleLabel: ROLE_LABEL[actor.role],
    permissions: (Object.keys(PERMISSIONS) as Permission[]).filter((p) => can(actor.role, p)),
  };
  return adminJson(session);
}
