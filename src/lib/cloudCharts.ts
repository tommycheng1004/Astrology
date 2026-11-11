import type { FirebaseApp } from "firebase/app";
import { FIREBASE_EMULATOR } from "@/lib/firebaseConfig";
import { isSaved, MAX_CHARTS, parseCharts, readChartsRaw, replaceCharts, setChartsSync, type SavedChart } from "@/lib/savedCharts";

/**
 * 「我的命盤」的雲端同步：users/{uid}/charts/{命盤 id}，內容是 { saved, at }。
 * 用 Firestore Lite（只有一般讀寫、體積小），登入後才載入。
 * 安全規則（firestore.rules）只允許本人讀寫自己的命盤，並檢查欄位格式。
 */

type Lite = typeof import("firebase/firestore/lite");
let lite: { fs: Lite; db: ReturnType<Lite["getFirestore"]> } | null = null;

async function firestore(app: FirebaseApp) {
  if (!lite) {
    const fs = await import("firebase/firestore/lite");
    const db = fs.getFirestore(app);
    if (FIREBASE_EMULATOR) fs.connectFirestoreEmulator(db, "127.0.0.1", 8080);
    lite = { fs, db };
  }
  return lite;
}

/**
 * 登入後合併本機與雲端：同一張命盤以較新的為準，只在一邊的補到另一邊，
 * 合併後超過上限的舊命盤兩邊都刪掉。之後本機的新增、刪除會自動同步。回傳合併後的張數。
 */
export async function startCloudSync(app: FirebaseApp, uid: string) {
  const { fs, db } = await firestore(app);
  const col = fs.collection(db, "users", uid, "charts");
  const remote: SavedChart[] = (await fs.getDocs(col)).docs
    .map((d) => ({ id: d.id, saved: d.get("saved"), at: Number(d.get("at")) || 0 }))
    .filter((c) => isSaved(c.saved));

  const local = parseCharts(readChartsRaw());
  const byId = new Map<string, SavedChart>();
  for (const c of [...remote, ...local]) {
    const prev = byId.get(c.id);
    if (!prev || c.at > prev.at) byId.set(c.id, c);
  }
  const merged = [...byId.values()].sort((a, b) => b.at - a.at);
  const keep = merged.slice(0, MAX_CHARTS);
  const drop = merged.slice(MAX_CHARTS);

  const batch = fs.writeBatch(db);
  let writes = 0;
  for (const c of keep) {
    const r = remote.find((x) => x.id === c.id);
    if (!r || r.at < c.at) {
      batch.set(fs.doc(col, c.id), { saved: c.saved, at: c.at });
      writes++;
    }
  }
  for (const c of drop) {
    if (remote.some((x) => x.id === c.id)) {
      batch.delete(fs.doc(col, c.id));
      writes++;
    }
  }
  if (writes) await batch.commit();
  replaceCharts(keep);

  setChartsSync({
    put: (c) => {
      fs.setDoc(fs.doc(col, c.id), { saved: c.saved, at: c.at }).catch((e) => console.warn("命盤同步失敗", e));
    },
    remove: (ids) => {
      const b = fs.writeBatch(db);
      for (const id of ids) b.delete(fs.doc(col, id));
      b.commit().catch((e) => console.warn("命盤同步失敗", e));
    },
  });
  return keep.length;
}

export function stopCloudSync() {
  setChartsSync(null);
}
