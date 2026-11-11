import type { SavedBirth } from "@/components/BirthForm";

/**
 * 「我的命盤」清單：只存在使用者自己的瀏覽器（localStorage），最新的排在最前面。
 * 舊版只存最近一筆（ziwei:last-birth），讀取時自動併入清單。
 */

export type SavedChart = { id: string; saved: SavedBirth; at: number };

const LIST_KEY = "ziwei:charts";
const LEGACY_KEY = "ziwei:last-birth";
const CHANGE_EVENT = "ziwei:charts-change";
export const MAX_CHARTS = 20;

/** 生辰資料相同（不含姓名）就視為同一張命盤 */
export function chartId(saved: SavedBirth) {
  const { input, timeMode, clock, place, trueSolar } = saved;
  const text = JSON.stringify([{ ...input, name: "" }, timeMode, timeMode === "clock" ? clock : "", place, trueSolar]);
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function subscribeCharts(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

/** 給 useSyncExternalStore 用的快照：回傳原始字串，內容沒變時參照不變 */
export function readChartsRaw() {
  try {
    return localStorage.getItem(LIST_KEY) ?? localStorage.getItem(LEGACY_KEY);
  } catch {
    return null;
  }
}

export function isSaved(value: unknown): value is SavedBirth {
  const v = value as SavedBirth;
  return !!v?.input && typeof v.input.year === "number" && (v.input.gender === "男" || v.input.gender === "女");
}

export function parseCharts(raw: string | null): SavedChart[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (Array.isArray(value)) return value.filter((c) => isSaved(c?.saved)) as SavedChart[];
    // 舊版單筆格式
    return isSaved(value) ? [{ id: chartId(value), saved: value, at: 0 }] : [];
  } catch {
    return [];
  }
}

function write(list: SavedChart[]) {
  try {
    localStorage.setItem(LIST_KEY, JSON.stringify(list));
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // 無痕模式等情況存不了，不影響排盤
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * 登入後的雲端同步。登入時由 cloudCharts.ts 設定，登出時清掉；
 * 這裡的新增、刪除都會同步過去，同步失敗不影響本機清單。
 */
export type ChartsSync = { put: (chart: SavedChart) => void; remove: (ids: string[]) => void };
let sync: ChartsSync | null = null;

export function setChartsSync(next: ChartsSync | null) {
  sync = next;
}

/** 新增或更新一張命盤，移到最前面 */
export function upsertChart(saved: SavedBirth) {
  const id = chartId(saved);
  const previous = parseCharts(readChartsRaw());
  const chart = { id, saved, at: Date.now() };
  const next = [chart, ...previous.filter((c) => c.id !== id)].slice(0, MAX_CHARTS);
  write(next);
  sync?.put(chart);
  // 超過上限被擠掉的舊命盤，雲端也一併刪除，兩邊數量一致
  const dropped = previous.filter((c) => !next.some((n) => n.id === c.id)).map((c) => c.id);
  if (dropped.length) sync?.remove(dropped);
}

export function removeChart(id: string) {
  write(parseCharts(readChartsRaw()).filter((c) => c.id !== id));
  sync?.remove([id]);
}

export function clearCharts() {
  const ids = parseCharts(readChartsRaw()).map((c) => c.id);
  write([]);
  if (ids.length) sync?.remove(ids);
}

/** 以整份清單取代本機資料（同步合併後使用，不再回寫雲端） */
export function replaceCharts(list: SavedChart[]) {
  write(list.slice(0, MAX_CHARTS));
}

/** 清單上顯示的簡短說明，例如「1990/1/1 午時・女」 */
export function chartCaption(saved: SavedBirth) {
  const { input } = saved;
  const date = `${input.calendar === "lunar" ? "農曆 " : ""}${input.year}/${input.isLeapMonth ? "閏" : ""}${input.month}/${input.day}`;
  const time = saved.timeMode === "clock" ? saved.clock : null;
  return [date, time, input.gender].filter(Boolean).join("・");
}
