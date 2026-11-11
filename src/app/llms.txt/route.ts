import { liunianInfo, liunianYears } from "@/content/liunian";
import { PALACES } from "@/content/palaces";
import { STARS } from "@/content/stars";
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

/**
 * llms.txt：給 AI 助理看的網站摘要（llmstxt.org 格式）。Google 表示 AI 搜尋不需要這個檔案，
 * 其他 AI 是否採用也沒有定論；建置時產生成靜態檔，沒有執行期成本。
 */
export const dynamic = "force-static";

export function GET() {
  const lines = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "排盤在使用者的瀏覽器中計算，採台灣通行版排法：農曆正月初一換年、晚子時（23:00 後）以隔日子時排盤、閏月以十五日為界，並依出生地的時區歷史自動扣除夏令時間與日治時期東京時間，可選真太陽時。",
    "",
    "## 工具",
    `- [紫微斗數免費排盤](${absoluteUrl("/")})：輸入生辰排出命盤、格局、十二宮解讀、大運到時運、擇日與合盤`,
    `- [排盤方法與準確度說明](${absoluteUrl("/method")})：十干四化表、晚子時、閏月、台灣夏令時間年表、真太陽時、驗證方法`,
    "",
    "## 流年運勢",
    ...liunianYears().map((y) => {
      const info = liunianInfo(y);
      return `- [${y} ${info.ganzhi}年流年運勢](${absoluteUrl(`/liunian/${y}`)})：犯太歲生肖（${info.taisui.map((t) => `屬${t.zodiac}${t.label}`).join("、")}）、流年四化、春節與立春日期`;
    }),
    "",
    "## 十四主星",
    ...STARS.map((s) => `- [${s.name}星](${absoluteUrl(`/stars/${s.slug}`)})：${s.tagline}，五行${s.element}，化氣為${s.essence}`),
    "",
    "## 十二宮",
    ...PALACES.map((p) => `- [${p.title}](${absoluteUrl(`/palaces/${p.slug}`)})：${p.summary}`),
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
