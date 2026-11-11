// Firestore 安全規則測試（對 Firebase 模擬器）。先在另一個終端機執行：
//   npx firebase-tools emulators:start --project demo-ziwei --only firestore
// 再執行：npx tsx scripts/check-rules.ts
const HOST = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
const PROJECT = "demo-ziwei";
const DOCS = `http://${HOST}/v1/projects/${PROJECT}/databases/(default)/documents`;

/** 模擬器接受沒有簽章的 token，用來扮演不同使用者 */
function tokenFor(uid: string) {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  return `${b64({ alg: "none", typ: "JWT" })}.${b64({
    sub: uid,
    user_id: uid,
    aud: PROJECT,
    iss: `https://securetoken.google.com/${PROJECT}`,
    iat: now,
    exp: now + 3600,
    auth_time: now,
    firebase: { sign_in_provider: "google.com" },
  })}.`;
}

type Value = { stringValue: string } | { integerValue: string } | { booleanValue: boolean } | { mapValue: { fields: Record<string, Value> } };
function encode(v: unknown): Value {
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return { integerValue: String(v) };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v as object).map(([k, x]) => [k, encode(x)])) } };
}

async function request(method: string, path: string, uid: string | null, data?: object) {
  const res = await fetch(`${DOCS}/${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(uid ? { Authorization: `Bearer ${uid === "owner" ? "owner" : tokenFor(uid)}` } : {}) },
    body: data ? JSON.stringify({ fields: (encode(data) as { mapValue: { fields: object } }).mapValue.fields }) : undefined,
  });
  return res.status;
}

let failed = 0;
function check(name: string, status: number, allowed: boolean) {
  const ok = allowed ? status === 200 : status === 403;
  if (!ok) failed++;
  console.log(`${ok ? "✓" : "✗"} ${name}（HTTP ${status}）`);
}

const chart = {
  saved: {
    input: { name: "王小明", gender: "男", calendar: "solar", year: 1990, month: 1, day: 1, isLeapMonth: false, timeIndex: 6 },
    timeMode: "clock",
    clock: "12:30",
    place: "taipei",
    trueSolar: false,
  },
  at: 1762000000000,
};
const withInput = (patch: object) => ({ ...chart, saved: { ...chart.saved, input: { ...chart.saved.input, ...patch } } });

(async () => {
  check("本人寫入自己的命盤", await request("PATCH", "users/alice/charts/abc123", "alice", chart), true);
  check("本人讀取自己的命盤", await request("GET", "users/alice/charts/abc123", "alice"), true);
  check("別人不能讀", await request("GET", "users/alice/charts/abc123", "bob"), false);
  check("別人不能寫", await request("PATCH", "users/alice/charts/abc999", "bob", chart), false);
  check("別人不能刪", await request("DELETE", "users/alice/charts/abc123", "bob"), false);
  check("沒登入不能讀", await request("GET", "users/alice/charts/abc123", null), false);
  check("多餘欄位不能寫", await request("PATCH", "users/alice/charts/abc124", "alice", { ...chart, extra: "x" }), false);
  check("姓名超過 20 字不能寫", await request("PATCH", "users/alice/charts/abc125", "alice", withInput({ name: "一".repeat(21) })), false);
  check("年份超出範圍不能寫", await request("PATCH", "users/alice/charts/abc126", "alice", withInput({ year: 3000 })), false);
  check("性別不對不能寫", await request("PATCH", "users/alice/charts/abc127", "alice", withInput({ gender: "x" })), false);
  check("命盤 id 格式不對不能寫", await request("PATCH", "users/alice/charts/ABC_bad", "alice", chart), false);
  check("使用者不能讀 AI 用量", await request("GET", "usage/2026-11-11_m_alice", "alice"), false);
  check("使用者不能改 AI 用量", await request("PATCH", "usage/2026-11-11_m_alice", "alice", { count: 0 }), false);
  check("其他集合一律不能寫", await request("PATCH", "anything/doc", "alice", { a: "b" }), false);
  check("本人刪除自己的命盤", await request("DELETE", "users/alice/charts/abc123", "alice"), true);
  console.log(failed ? `\n${failed} 項不符` : "\n全部通過");
  process.exit(failed ? 1 : 0);
})();
