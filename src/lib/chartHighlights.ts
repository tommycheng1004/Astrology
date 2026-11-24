import { analyzeLayer, aspectByKey, type AspectResult } from "@/lib/fortune";
import { soulPersona } from "@/lib/personality";
import { daysOf, horoscopeAt, monthsOf, nowSelection, yearEndDate, yearStartDate } from "@/lib/periods";
import type { Astrolabe } from "@/lib/ziwei";

const dailyActions: Partial<Record<AspectResult["key"], string>> = {
  career: "挑一件重要的事先做完，給自己一個清楚的進度。",
  wealth: "花幾分鐘整理帳目，先分清必要支出與可延後的開銷。",
  love: "留一點時間好好聽對方說話，再說出自己的感受。",
  health: "在行程裡留一段休息時間，照自己的步調來。",
  social: "主動聯繫一位你想關心的人，從一句問候開始。",
};

const yearActions: Partial<Record<AspectResult["key"], string>> = {
  career: "把心力放在一項能逐步累積成果的工作上。",
  wealth: "把收支整理成一個可持續的習慣，為重要目標預留空間。",
  love: "把對關係的期待說清楚，從日常互動培養默契。",
  health: "把休息和活動納入日程，建立自己能長期維持的節奏。",
  social: "經營讓你自在的關係，也可以主動尋找合作機會。",
};

const strongest = (items: AspectResult[]) => items.reduce((best, item) => item.score > best.score ? item : best);

export function personalityHighlight(astrolabe: Astrolabe) {
  const persona = soulPersona(astrolabe);
  if (!persona) return null;
  return {
    title: persona.title,
    sentence: persona.text.match(/^[^。！？]+[。！？]?/)?.[0] ?? persona.text,
    stars: persona.borrowedFrom ? `命宮沒有主星，參考對面${persona.borrowedFrom}的${persona.stars}` : `命宮的主星是${persona.stars}`,
  };
}

export function dailyHighlight(astrolabe: Astrolabe, now = new Date()) {
  const selection = nowSelection(astrolabe, now);
  const month = monthsOf(astrolabe, selection.year)[selection.monthKey];
  const day = daysOf(selection.year, month).find((day) => day.day === selection.day);
  const horoscope = day && horoscopeAt(astrolabe, day.date, 0, { date: day.date, hour: 11 });
  if (!day || !horoscope) return null;
  const focus = strongest(analyzeLayer(astrolabe, horoscope, "daily", true));
  const [, m, d] = day.date.split("-");
  return { date: `${m}/${d}`, topic: aspectByKey(focus.key)!.noun, text: dailyActions[focus.key]! };
}

export function yearHighlight(astrolabe: Astrolabe, year: number) {
  const start = yearStartDate(year);
  const end = yearEndDate(year);
  const horoscope = start && horoscopeAt(astrolabe, start, 0, end ? { date: end, hour: 11 } : undefined);
  if (!horoscope) return null;
  const focus = strongest(analyzeLayer(astrolabe, horoscope, "yearly", true));
  return { topic: aspectByKey(focus.key)!.noun, text: yearActions[focus.key]! };
}
