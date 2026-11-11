import type { SavedBirth } from "@/components/BirthForm";
import { resolveBirth, type ResolvedBirth } from "@/lib/birthtime";
import { analyzeNatal, type AspectResult } from "@/lib/fortune";
import { nowSelection, type Selection } from "@/lib/periods";
import { bodyPalaceText, soulPersona } from "@/lib/personality";
import { computeAstrolabe, TIME_SLOTS, type Astrolabe, type BirthInput } from "@/lib/ziwei";

/**
 * 排盤與解讀的進入點。首頁只在使用者按下排盤時才載入這個模組（連同 iztro、解讀資料），
 * 讓第一次開啟網頁時要下載的程式盡量少。
 */

export type Chart = {
  id: number;
  input: BirthInput;
  saved: SavedBirth;
  resolved: ResolvedBirth;
  /** main：依輸入時間排盤；alt：時辰交界時改看相鄰時辰 */
  variant: "main" | "alt";
  /** form：自己輸入；share：從分享連結開啟（不自動存進「我的命盤」） */
  source: "form" | "share";
  astrolabe: Astrolabe;
  natal: AspectResult[];
  now: Selection;
};

export async function buildChart(saved: SavedBirth, variant: Chart["variant"], source: Chart["source"]): Promise<Chart> {
  const resolved = resolveBirth(saved.input, saved);
  const useAlt = variant === "alt" && resolved.alt !== null;
  const astrolabe = await computeAstrolabe(useAlt ? resolved.alt! : resolved, saved.input.gender);
  return {
    id: Date.now(),
    input: saved.input,
    saved,
    resolved,
    variant: useAlt ? "alt" : "main",
    source,
    astrolabe,
    natal: analyzeNatal(astrolabe),
    now: nowSelection(astrolabe),
  };
}

export type TimeChoice = {
  timeIndex: number;
  label: string;
  range: string;
  /** 命宮地支與主星，例如「午宮・紫微」 */
  soul: string;
  title: string;
  text: string;
  body: string | null;
};

/** 不知道時辰：每個時辰各排一張盤，列出命宮主星與個性供使用者挑選 */
export async function buildTimeChoices(saved: SavedBirth): Promise<TimeChoice[]> {
  return Promise.all(
    TIME_SLOTS.map(async (slot) => {
      const input = { ...saved.input, timeIndex: slot.index };
      const astrolabe = await computeAstrolabe(resolveBirth(input, { ...saved, timeMode: "slot" }), input.gender);
      const soul = astrolabe.palaces.find((p) => p.name === "命宮")!;
      const persona = soulPersona(astrolabe);
      const majors = soul.majorStars.map((s) => s.name).join("、");
      const body = bodyPalaceText(astrolabe);
      return {
        timeIndex: slot.index,
        label: slot.label,
        range: slot.range,
        soul: `${soul.earthlyBranch}宮・${majors || `無主星（借${persona?.stars ?? "對宮"}）`}`,
        title: persona?.title ?? "",
        text: persona?.text ?? "",
        body: body ? `身宮在${body.palace}` : null,
      };
    }),
  );
}
