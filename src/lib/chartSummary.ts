import type { IFunctionalStar } from "iztro/lib/star/FunctionalStar";
import { analyzeLayer, analyzeNatal, gradeOf, overallGradeOf, overallOf } from "@/lib/fortune";
import { analyzePatterns } from "@/lib/patterns";
import { horoscopeAt, nowSelection, yearEndDate, yearGanzhi, yearStartDate } from "@/lib/periods";
import { decadeColumns, yearColumns } from "@/lib/trend";
import { palaceTitle, timeIndexFromClock, toTraditionalLunar, type Astrolabe } from "@/lib/ziwei";

/**
 * 把命盤整理成給 AI 讀的文字。AI 只能根據這份資料解盤，不能自行推算星曜位置，
 * 所以宮位、星曜、四化、格局、運限都要寫清楚；用字沿用網站畫面（交友宮等）。
 */

const star = (s: IFunctionalStar) => {
  const notes = [s.brightness, s.mutagen ? `化${s.mutagen}` : ""].filter(Boolean).join("、");
  return notes ? `${s.name}（${notes}）` : s.name;
};

/** 台灣現在的日期與時辰（伺服器可能在 UTC 時區） */
export function taiwanNow(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Taipei", hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric" })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

export function chartSummary(astrolabe: Astrolabe, now = new Date()) {
  const lines: string[] = [];
  const tw = taiwanNow(now);
  // nowSelection 以本機時區計算，這裡改用台灣時間建出對應的 Date
  const [ty, tm, td] = tw.date.split("-").map(Number);
  const twDate = new Date(ty, tm - 1, td, tw.hour);
  const sel = nowSelection(astrolabe, twDate);

  lines.push("【基本資料】");
  lines.push(
    `性別：${astrolabe.gender}（${astrolabe.gender === "男" ? "乾造" : "坤造"}）；五行局：${astrolabe.fiveElementsClass}；命主：${astrolabe.soul}；身主：${astrolabe.body}`,
  );
  lines.push(`四柱：${astrolabe.chineseDate}；農曆生日：${toTraditionalLunar(astrolabe.lunarDate)} ${astrolabe.time}；生肖：${astrolabe.zodiac}`);
  lines.push("排盤規則：通行版安星與四化、農曆正月初一換年、晚子時以隔日子時排盤。");

  const birthMutagens = astrolabe.palaces
    .flatMap((p) => [...p.majorStars, ...p.minorStars])
    .filter((s) => s.scope === "origin" && s.mutagen)
    .sort((a, b) => "祿權科忌".indexOf(a.mutagen!) - "祿權科忌".indexOf(b.mutagen!));
  lines.push(`生年四化：${birthMutagens.map((s) => `${s.name}化${s.mutagen}`).join("、")}`);

  lines.push("", "【十二宮】宮名・干支・大限歲數：主星｜輔星與煞星｜雜曜");
  const soul = astrolabe.palaces.find((p) => p.name === "命宮")!;
  for (let k = 0; k < 12; k++) {
    const p = astrolabe.palaces[(soul.index + k) % 12];
    const majors = p.majorStars.filter((s) => s.scope === "origin");
    const tags = [p.isBodyPalace ? "身宮" : "", p.isOriginalPalace ? "來因宮" : ""].filter(Boolean).join("、");
    lines.push(
      `${palaceTitle(p.name)}${tags ? `（${tags}）` : ""}・${p.heavenlyStem}${p.earthlyBranch}・${p.decadal.range[0]}–${p.decadal.range[1]}歲：` +
        `${majors.length ? majors.map(star).join("、") : "無主星（借對宮）"}｜${p.minorStars.map(star).join("、") || "—"}｜${p.adjectiveStars.map((s) => s.name).join("、") || "—"}`,
    );
  }

  const patterns = analyzePatterns(astrolabe);
  lines.push("", "【格局】");
  lines.push(
    patterns.length
      ? patterns.map((p) => `${p.name}（${p.kind}${p.status ? `，${p.status}` : ""}${p.reason ? `：${p.reason}` : ""}）`).join("；")
      : "沒有符合典型格局",
  );

  lines.push("", "【本命五運】本站規則式評分，僅供參考");
  lines.push(analyzeNatal(astrolabe).map((r) => `${r.label}${r.level}（看${r.palaceLabel}）`).join("；"));

  lines.push("", `【目前運限】台灣時間 ${tw.date}`);
  // 23:00 後屬晚子時，與 nowSelection 一樣以隔日的子時推算
  const lateZi = tw.hour === 23;
  const chartDay = lateZi ? new Date(ty, tm - 1, td + 1) : twDate;
  const h = horoscopeAt(
    astrolabe,
    `${chartDay.getFullYear()}-${chartDay.getMonth() + 1}-${chartDay.getDate()}`,
    lateZi ? 0 : timeIndexFromClock(tw.hour),
  );
  if (h) {
    const decadalPalace = astrolabe.palaces[h.decadal.index];
    const isChildhood = h.decadal.name === "童限";
    lines.push(
      `${isChildhood ? "童限" : `大限 ${decadalPalace.decadal.range[0]}–${decadalPalace.decadal.range[1]} 歲`}：` +
        `命宮走到本命${palaceTitle(decadalPalace.name)}（${h.decadal.heavenlyStem}${h.decadal.earthlyBranch}）；` +
        `四化：${h.decadal.mutagen.map((s, i) => `${s}化${"祿權科忌"[i]}`).join("、")}；` +
        `五運：${analyzeLayer(astrolabe, h, "decadal").map((r) => `${r.label}${r.level}`).join("、")}`,
    );
    const yearPalace = astrolabe.palaces[h.yearly.index];
    const yearly = analyzeLayer(astrolabe, h, "yearly", true);
    lines.push(
      `流年 ${sel.year} ${yearGanzhi(sel.year)}年（虛歲 ${h.age.nominalAge}，國曆 ${yearStartDate(sel.year)} 起）：` +
        `流年命宮走到本命${palaceTitle(yearPalace.name)}；小限在本命${palaceTitle(astrolabe.palaces[h.age.index].name)}；` +
        `四化：${h.yearly.mutagen.map((s, i) => `${s}化${"祿權科忌"[i]}`).join("、")}；` +
        `整體${overallGradeOf(overallOf(yearly).score)}，五運：${yearly.map((r) => `${r.label}${gradeOf(r.score)}`).join("、")}`,
    );
  } else {
    lines.push("目前不在可推算的運限範圍（出生前或超過 120 歲）。");
  }

  lines.push("", "【一生大限整體評分】");
  lines.push(
    decadeColumns(astrolabe, sel)
      .map((c) => `${c.title}${c.sub.startsWith("童限") ? "（童限）" : `（${c.sub}）`}${c.overall === null ? "" : overallGradeOf(c.overall)}${c.current ? "←目前" : ""}`)
      .join("；"),
  );
  // 每年附上流年命宮與四化，問到「明年」「後年」時 AI 才有星曜可以論，不只看評分
  lines.push("", "【近十年流年】年份 干支・虛歲：流年命宮所在的本命宮位；流年四化；整體評分；犯太歲");
  for (const c of yearColumns(astrolabe, sel.year, sel)) {
    const start = yearStartDate(c.key);
    const end = yearEndDate(c.key);
    const yh = start ? horoscopeAt(astrolabe, start, 0, end ? { date: end, hour: 11 } : undefined) : null;
    const detail = yh
      ? `流年命宮在本命${palaceTitle(astrolabe.palaces[yh.yearly.index].name)}；${yh.yearly.mutagen.map((s, i) => `${s}化${"祿權科忌"[i]}`).join("、")}`
      : "無法推算";
    lines.push(`${c.title} ${c.sub}：${detail}${c.overall === null ? "" : `；${overallGradeOf(c.overall)}`}${c.tag ? `；${c.tag}` : ""}`);
  }

  return lines.join("\n");
}
