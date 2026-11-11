// 產生只含本站用字的 Noto Serif TC（500、700 兩個字重），取代整套 Google Fonts 分片。
// 用字來源：src/ 下所有原始碼，加上 iztro 繁中語系檔（雜曜、神煞名稱由它產生）。
// 執行：npm run font:subset（原始字型不在時會自動下載到 fonts-src/，該資料夾不進版控）
// 檢查：npm run font:check（有新字沒進子集就失敗；改了文字內容後請重新產生）
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import subsetFont from "subset-font";

const ROOT = new URL("..", import.meta.url).pathname;
const SOURCE = join(ROOT, "fonts-src/NotoSerifTC[wght].ttf");
const SOURCE_URL = "https://github.com/google/fonts/raw/main/ofl/notoseriftc/NotoSerifTC%5Bwght%5D.ttf";
const OUT = join(ROOT, "src/app/fonts");
const CHARS_FILE = join(OUT, "subset-chars.txt");
const WEIGHTS = [500, 700];

function walk(dir, exts) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path, exts);
    return exts.some((e) => name.endsWith(e)) ? [path] : [];
  });
}

/** 網站可能用到的所有字：ASCII 可見字元 + 原始碼與 iztro 語系檔裡的非 ASCII 字元 */
export function collectChars() {
  const files = [
    ...walk(join(ROOT, "src"), [".ts", ".tsx", ".css", ".txt"]).filter((f) => !f.startsWith(OUT)),
    ...walk(join(ROOT, "node_modules/iztro/lib/i18n/locales/zh-TW"), [".js", ".json"]),
  ];
  const set = new Set();
  for (let c = 0x20; c < 0x7f; c++) set.add(String.fromCharCode(c));
  for (const f of files) for (const ch of readFileSync(f, "utf8")) if (ch.codePointAt(0) > 0x7f && !/\s/.test(ch)) set.add(ch);
  return [...set].sort((a, b) => a.codePointAt(0) - b.codePointAt(0)).join("");
}

if (process.argv.includes("--check")) {
  const have = new Set(readFileSync(CHARS_FILE, "utf8"));
  const missing = [...collectChars()].filter((ch) => !have.has(ch));
  if (missing.length) {
    console.error(`✗ 字型子集缺 ${missing.length} 個字：${missing.join("")}\n  請執行 npm run font:subset`);
    process.exit(1);
  }
  console.log("✓ 字型子集涵蓋所有用字");
} else {
  if (!existsSync(SOURCE)) {
    mkdirSync(join(ROOT, "fonts-src"), { recursive: true });
    console.log("下載原始字型…");
    const res = await fetch(SOURCE_URL);
    if (!res.ok) throw new Error(`下載失敗：${res.status}`);
    writeFileSync(SOURCE, Buffer.from(await res.arrayBuffer()));
  }
  const font = readFileSync(SOURCE);
  const chars = collectChars();
  for (const wght of WEIGHTS) {
    const out = await subsetFont(font, chars, { targetFormat: "woff2", variationAxes: { wght } });
    writeFileSync(join(OUT, `noto-serif-tc-${wght}.woff2`), out);
    console.log(`noto-serif-tc-${wght}.woff2：${chars.length} 字，${Math.round(out.length / 1024)} KB`);
  }
  writeFileSync(CHARS_FILE, chars);
}
