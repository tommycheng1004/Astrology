import type { IFunctionalPalace } from "iztro/lib/astro/FunctionalPalace";
import type { IFunctionalStar } from "iztro/lib/star/FunctionalStar";
import { GRID_POSITION, palaceName, toTraditionalLunar, type Astrolabe } from "@/lib/ziwei";

/**
 * 把命盤畫成 PNG（1080 寬，適合存進手機相簿或傳 LINE）。
 * 直接用 canvas 依資料重畫，不截取畫面，所以不受深色模式、捲動位置或螢幕寬度影響。
 * 一律使用淺色配色，與網站淺色模式相同。
 */

const C = {
  paper: "#f5f0e6",
  surface: "#fffdf8",
  line: "#bfae90",
  ink: "#221c18",
  inkSoft: "#4d443d",
  muted: "#6e645a",
  accent: "#5b3a8c",
  accentSoft: "#ede5f6",
  gold: "#7d5e26",
  major: "#5b2a86",
  soft: "#2c6a63",
  tough: "#93412f",
  祿: "#276c44",
  權: "#9a5217",
  科: "#2a68a8",
  忌: "#c0392b",
} as const;

const MARGIN = 36;
const CELL_W = 252;
const CELL_H = 336;
const FOOTER = 96;
const WIDTH = MARGIN * 2 + CELL_W * 4;
const HEIGHT = MARGIN * 2 + CELL_H * 4 + FOOTER;
const PAD = 12;

type Ctx = CanvasRenderingContext2D;

function fontFamily() {
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-noto-serif-tc").trim();
  return `${family ? `${family}, ` : ""}"Songti TC", "PMingLiU", serif`;
}

function text(ctx: Ctx, value: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = "left") {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillText(value, x, y);
}

/** 圓角色塊上的白字，用於四化與「身」標記 */
function badge(ctx: Ctx, value: string, x: number, y: number, size: number, bg: string, family: string) {
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, 4);
  ctx.fill();
  text(ctx, value, x + size / 2, y + size * 0.12, `700 ${Math.round(size * 0.74)}px ${family}`, "#fff", "center");
}

/** 直書的一顆星：星名、亮度、四化，回傳佔用的高度 */
function starColumn(ctx: Ctx, star: IFunctionalStar, kind: "major" | "minor" | "adjective", x: number, y: number, family: string) {
  const size = kind === "major" ? 30 : kind === "minor" ? 24 : 20;
  const color = kind === "major" ? C.major : kind === "minor" ? (star.type === "tough" ? C.tough : C.soft) : C.muted;
  const weight = kind === "major" ? 700 : 500;
  let h = 0;
  for (const ch of star.name) {
    text(ctx, ch, x + COLUMN_W[kind] / 2, y + h, `${weight} ${size}px ${family}`, color, "center");
    h += size + 2;
  }
  if (star.brightness) {
    text(ctx, star.brightness, x + COLUMN_W[kind] / 2, y + h + 2, `500 17px ${family}`, C.muted, "center");
    h += 22;
  }
  if (star.mutagen && star.mutagen in C) {
    badge(ctx, star.mutagen, x + (COLUMN_W[kind] - 24) / 2, y + h + 2, 24, C[star.mutagen as "祿"], family);
    h += 28;
  }
  return h;
}

const COLUMN_W = { major: 36, minor: 30, adjective: 25 } as const;

function drawPalace(ctx: Ctx, palace: IFunctionalPalace, family: string) {
  const { row, col } = GRID_POSITION[palace.index];
  const x0 = MARGIN + col * CELL_W;
  const y0 = MARGIN + row * CELL_H;
  const isSoul = palace.name === "命宮";
  ctx.fillStyle = isSoul ? C.accentSoft : C.surface;
  ctx.fillRect(x0, y0, CELL_W, CELL_H);

  const footerTop = y0 + CELL_H - 64;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, CELL_W, footerTop - y0 - 26);
  ctx.clip();
  const stars: [IFunctionalStar, "major" | "minor" | "adjective"][] = [
    ...palace.majorStars.filter((s) => s.scope === "origin").map((s) => [s, "major"] as [IFunctionalStar, "major"]),
    ...palace.minorStars.map((s) => [s, "minor"] as [IFunctionalStar, "minor"]),
    ...palace.adjectiveStars.map((s) => [s, "adjective"] as [IFunctionalStar, "adjective"]),
  ];
  let x = x0 + PAD;
  let y = y0 + PAD;
  let rowH = 0;
  for (const [star, kind] of stars) {
    const w = COLUMN_W[kind];
    if (x + w > x0 + CELL_W - PAD) {
      x = x0 + PAD;
      y += rowH + 8;
      rowH = 0;
    }
    rowH = Math.max(rowH, starColumn(ctx, star, kind, x, y, family));
    x += w + 2;
  }
  ctx.restore();

  // 大限歲數、宮名、干支
  text(ctx, `${palace.decadal.range[0]}–${palace.decadal.range[1]}`, x0 + PAD, footerTop - 24, `500 18px ${family}`, C.muted);
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0 + PAD, footerTop);
  ctx.lineTo(x0 + CELL_W - PAD, footerTop);
  ctx.stroke();
  const name = palaceName(palace.name);
  text(ctx, name, x0 + PAD, footerTop + 14, `700 30px ${family}`, isSoul ? C.accent : C.ink);
  ctx.font = `700 30px ${family}`;
  const nameW = ctx.measureText(name).width;
  if (palace.isBodyPalace) badge(ctx, "身", x0 + PAD + nameW + 6, footerTop + 18, 26, C.gold, family);
  text(ctx, `${palace.heavenlyStem}${palace.earthlyBranch}`, x0 + CELL_W - PAD, footerTop + 18, `500 24px ${family}`, C.inkSoft, "right");
}

function drawCenter(ctx: Ctx, astrolabe: Astrolabe, name: string, family: string) {
  const x0 = MARGIN + CELL_W;
  const y0 = MARGIN + CELL_H;
  const w = CELL_W * 2;
  const cx = x0 + w / 2;
  ctx.fillStyle = C.surface;
  ctx.fillRect(x0, y0, w, CELL_H * 2);

  let y = y0 + 64;
  text(ctx, name || "命盤", cx, y, `700 48px ${family}`, C.ink, "center");
  y += 70;
  text(ctx, `${astrolabe.gender === "男" ? "乾造" : "坤造"}・${astrolabe.fiveElementsClass}`, cx, y, `500 26px ${family}`, C.inkSoft, "center");
  y += 64;

  // 四柱直書
  const pillars = astrolabe.chineseDate.split(" ");
  ["年", "月", "日", "時"].forEach((label, i) => {
    const px = cx + (i - 1.5) * 80;
    text(ctx, label, px, y, `500 20px ${family}`, C.muted, "center");
    [...pillars[i]].forEach((ch, k) => text(ctx, ch, px, y + 32 + k * 40, `700 34px ${family}`, C.ink, "center"));
  });
  y += 140;

  text(ctx, `命主 ${astrolabe.soul}　身主 ${astrolabe.body}`, cx, y, `500 24px ${family}`, C.inkSoft, "center");
  y += 52;
  text(ctx, `國曆 ${astrolabe.solarDate}`, cx, y, `500 22px ${family}`, C.inkSoft, "center");
  y += 34;
  text(ctx, `農曆 ${toTraditionalLunar(astrolabe.lunarDate)} ${astrolabe.time}`, cx, y, `500 22px ${family}`, C.inkSoft, "center");
  y += 34;
  text(ctx, `生肖 ${astrolabe.zodiac}`, cx, y, `500 22px ${family}`, C.inkSoft, "center");
  y += 56;

  // 生年四化
  const order = ["祿", "權", "科", "忌"];
  const mutagens = astrolabe.palaces
    .flatMap((p) => [...p.majorStars, ...p.minorStars].filter((s) => s.scope === "origin" && s.mutagen))
    .sort((a, b) => order.indexOf(a.mutagen as string) - order.indexOf(b.mutagen as string));
  ctx.font = `500 24px ${family}`;
  const itemW = mutagens.map((s) => ctx.measureText(s.name).width + 34);
  let x = cx - (itemW.reduce((a, b) => a + b, 0) + 16 * (mutagens.length - 1)) / 2;
  mutagens.forEach((s, i) => {
    text(ctx, s.name, x, y, `500 24px ${family}`, C.inkSoft);
    badge(ctx, s.mutagen as string, x + itemW[i] - 28, y + 1, 26, C[s.mutagen as "祿"], family);
    x += itemW[i] + 16;
  });
}

export async function renderChartImage(astrolabe: Astrolabe, name: string): Promise<Blob> {
  const family = fontFamily();
  // 確保襯線字型已下載，否則 canvas 會先用系統字畫
  await Promise.all([document.fonts.load(`500 24px ${family}`, "命盤紫微"), document.fonts.load(`700 30px ${family}`, "命盤紫微")]);

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  // 格線：先鋪底色，各宮之間留 2px 縫
  ctx.fillStyle = C.line;
  ctx.fillRect(MARGIN - 2, MARGIN - 2, CELL_W * 4 + 4, CELL_H * 4 + 4);
  for (const palace of astrolabe.palaces) drawPalace(ctx, palace, family);
  // 宮與宮之間的分隔線
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(MARGIN + i * CELL_W, MARGIN);
    ctx.lineTo(MARGIN + i * CELL_W, MARGIN + CELL_H * 4);
    ctx.moveTo(MARGIN, MARGIN + i * CELL_H);
    ctx.lineTo(MARGIN + CELL_W * 4, MARGIN + i * CELL_H);
    ctx.stroke();
  }
  drawCenter(ctx, astrolabe, name, family);

  const fy = MARGIN + CELL_H * 4 + 30;
  text(ctx, "紫微命盤", MARGIN, fy, `700 32px ${family}`, C.accent);
  text(ctx, `${location.host}・免費紫微斗數排盤`, WIDTH - MARGIN, fy + 6, `500 22px ${family}`, C.muted, "right");

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("無法產生圖片"))), "image/png"));
}
