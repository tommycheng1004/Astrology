import "server-only";
import { documentsPath, firestoreFetch } from "@/lib/server/firebase";

/**
 * Firestore 原生欄位的讀寫（會員索引、後台設定、稽核紀錄、統計）。
 * 與 firebase.ts 的 readDocument/writeDocuments 不同：那邊把整份資料存成一個 JSON 字串，
 * 這裡存成原生欄位，才能排序、篩選與計數。時間一律存 Firestore timestamp，讀回來是 ISO 字串。
 */

export type Plain = null | boolean | number | string | Date | Plain[] | { [key: string]: Plain };
export type Fields = Record<string, Plain>;
type Value = Record<string, unknown>;

function encode(v: Plain): Value {
  if (v === null) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encode) } };
  return { mapValue: { fields: encodeFields(v) } };
}

const encodeFields = (fields: Fields) => Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, encode(v)]));

function decode(v: Value): Plain {
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("booleanValue" in v) return v.booleanValue as boolean;
  if ("stringValue" in v) return v.stringValue as string;
  if ("timestampValue" in v) return new Date(v.timestampValue as string).toISOString();
  if ("arrayValue" in v) return ((v.arrayValue as { values?: Value[] }).values ?? []).map(decode);
  if ("mapValue" in v) return decodeFields((v.mapValue as { fields?: Record<string, Value> }).fields);
  return null;
}

const decodeFields = (fields: Record<string, Value> = {}): Record<string, Plain> =>
  Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decode(v)]));

type RawDoc = { name: string; fields?: Record<string, Value>; updateTime: string };
export type Doc<T> = { id: string; data: T; updateTime: string };

const toDoc = <T>(raw: RawDoc): Doc<T> => ({ id: raw.name.split("/").pop()!, data: decodeFields(raw.fields) as T, updateTime: raw.updateTime });
const docPath = (path: string[]) => path.map(encodeURIComponent).join("/");

export async function getDoc<T>(path: string[]): Promise<Doc<T> | null> {
  const res = await firestoreFetch(`/${docPath(path)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore 讀取失敗：${res.status}`);
  return toDoc<T>(await res.json());
}

/** 一次讀多份文件（不存在的回傳 null），順序與 paths 相同 */
export async function getDocs<T>(paths: string[][]): Promise<(Doc<T> | null)[]> {
  if (!paths.length) return [];
  const names = paths.map((p) => `${documentsPath()}/${p.join("/")}`);
  const res = await firestoreFetch(":batchGet", { documents: names });
  if (!res.ok) throw new Error(`Firestore 讀取失敗：${res.status}`);
  const rows = (await res.json()) as { found?: RawDoc; missing?: string }[];
  const byName = new Map(rows.flatMap((r) => (r.found ? [[r.found.name, toDoc<T>(r.found)] as const] : [])));
  return names.map((n) => byName.get(n) ?? null);
}

/** 一筆寫入。set 只寫列出的欄位（其餘保留）；mustExist=false 代表必須是新文件（避免覆蓋） */
export type Write =
  | { op: "set"; path: string[]; fields: Fields; mustExist?: boolean; updateTime?: string }
  | { op: "delete"; path: string[] }
  | { op: "increment"; path: string[]; field: string; by: number };

/** 多筆寫入在同一筆交易完成：全部成功或全部失敗。前置條件不符時回傳 false */
export async function commit(writes: Write[]): Promise<boolean> {
  const name = (path: string[]) => `${documentsPath()}/${path.join("/")}`;
  const res = await firestoreFetch(":commit", {
    writes: writes.map((w) => {
      if (w.op === "delete") return { delete: name(w.path) };
      if (w.op === "increment")
        return { transform: { document: name(w.path), fieldTransforms: [{ fieldPath: w.field, increment: encode(w.by) }] } };
      return {
        update: { name: name(w.path), fields: encodeFields(w.fields) },
        updateMask: { fieldPaths: Object.keys(w.fields).map((k) => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(k) ? k : `\`${k}\``)) },
        ...(w.updateTime ? { currentDocument: { updateTime: w.updateTime } } : w.mustExist !== undefined ? { currentDocument: { exists: w.mustExist } } : {}),
      };
    }),
  });
  if (res.ok) return true;
  const error = (await res.json().catch(() => null)) as { error?: { status?: string } } | null;
  if (["ABORTED", "ALREADY_EXISTS", "FAILED_PRECONDITION", "NOT_FOUND"].includes(error?.error?.status ?? "")) return false;
  throw new Error(`Firestore 寫入失敗：${res.status}`);
}

// ---------- 查詢 ----------

type Op = "==" | "<" | "<=" | ">" | ">=";
const OPS: Record<Op, string> = { "==": "EQUAL", "<": "LESS_THAN", "<=": "LESS_THAN_OR_EQUAL", ">": "GREATER_THAN", ">=": "GREATER_THAN_OR_EQUAL" };

export type Query = {
  collection: string;
  /** 子集合的上層文件，例如 ["users", uid] */
  parent?: string[];
  /** 跨所有同名子集合（collection group） */
  allDescendants?: boolean;
  where?: [field: string, op: Op, value: Plain][];
  orderBy?: [field: string, dir: "asc" | "desc"][];
  limit?: number;
  /** 從這組排序值之後開始（分頁用） */
  startAfter?: Plain[];
};

function structured(q: Query) {
  const filters = (q.where ?? []).map(([field, op, value]) => ({ fieldFilter: { field: { fieldPath: field }, op: OPS[op], value: encode(value) } }));
  return {
    from: [{ collectionId: q.collection, allDescendants: !!q.allDescendants }],
    ...(filters.length === 1 ? { where: filters[0] } : filters.length > 1 ? { where: { compositeFilter: { op: "AND", filters } } } : {}),
    ...(q.orderBy ? { orderBy: q.orderBy.map(([field, dir]) => ({ field: { fieldPath: field }, direction: dir === "asc" ? "ASCENDING" : "DESCENDING" })) } : {}),
    ...(q.startAfter ? { startAt: { values: q.startAfter.map(encode), before: false } } : {}),
    ...(q.limit ? { limit: q.limit } : {}),
  };
}

const parentSuffix = (parent?: string[]) => (parent?.length ? `/${docPath(parent)}` : "");

export async function query<T>(q: Query): Promise<Doc<T>[]> {
  const res = await firestoreFetch(`${parentSuffix(q.parent)}:runQuery`, { structuredQuery: structured(q) });
  if (!res.ok) throw new Error(`Firestore 查詢失敗：${res.status} ${(await res.text()).slice(0, 300)}`);
  const rows = (await res.json()) as { document?: RawDoc }[];
  return rows.flatMap((r) => (r.document ? [toDoc<T>(r.document)] : []));
}

/** 計數或加總（伺服器端彙總，不必把文件讀回來；每 1,000 筆索引只算 1 次讀取） */
export async function aggregate(q: Query, kind: { count: true } | { sum: string }): Promise<number> {
  const aggregation = "count" in kind ? { alias: "v", count: {} } : { alias: "v", sum: { field: { fieldPath: kind.sum } } };
  const res = await firestoreFetch(`${parentSuffix(q.parent)}:runAggregationQuery`, {
    structuredAggregationQuery: { structuredQuery: structured(q), aggregations: [aggregation] },
  });
  if (!res.ok) throw new Error(`Firestore 統計失敗：${res.status} ${(await res.text()).slice(0, 300)}`);
  const rows = (await res.json()) as { result?: { aggregateFields?: { v?: Value } } }[];
  const v = rows[0]?.result?.aggregateFields?.v;
  return v ? Number(decode(v) ?? 0) : 0;
}
