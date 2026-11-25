/**
 * 報告頁的說明文字（還沒登入、還沒選命盤時顯示「這份報告有什麼」）。
 * 只放純文字，不 import 排盤程式，報告頁的前端才不會載入整個排盤引擎。
 * 內容要跟 lib/annualReport.ts、api/reports 實際產生的項目一致。
 */

export type ReportInfo = {
  title: string;
  lead: string;
  items: { title: string; body: string }[];
  note: string;
};

export function reportInfo(id: string, year: number, purposeCount: number, aiEnabled: boolean): ReportInfo {
  const ai = (item: { title: string; body: string }) => (aiEnabled ? [item] : []);
  if (id === "monthly")
    return {
      title: "流月報告",
      lead: "依你的命盤，整理這個月最值得用力的事和最需要小心的地方。",
      items: [
        { title: "可以多花心力", body: "這個月十個面向裡最順的一項，附上盤面依據。" },
        { title: "需要留意", body: "這個月最容易卡住的一項，同樣附上盤面依據。" },
        ...ai({ title: "AI 白話整理（可選）", body: "把計算結果整理成好讀的文字；不想用 AI 也能只看計算結果。" }),
      ],
      note: "也可以在會員中心訂閱流月提醒，每月 1 日出現在手機行事曆。",
    };
  if (id === "deep")
    return {
      title: "深度解盤",
      lead: "AI 讀取本站算好的整張命盤，整理成一份完整的白話解說。",
      items: [
        { title: "整張命盤一起看", body: "十二宮、四化、目前的十年大運與今年流年，放在同一份解說裡。" },
        { title: "每段附上依據", body: "每一段都會指出根據的是哪一項盤面資料，術語第一次出現時附白話說明。" },
        { title: "站內通知", body: "整理需要一點時間，完成後會在網站上通知你，不用一直等。" },
      ],
      note: "AI 只根據本站算好的命盤資料撰寫，不會自己推算星曜位置。",
    };
  return {
    title: `${year} 流年報告`,
    lead: `依你的命盤，推算 ${year} 年（農曆正月初一到除夕）整年的重點，可以列印或存成 PDF。`,
    items: [
      { title: "十項流年運勢", body: "事業、財運、感情、健康、人際、家宅、出行、子女、長輩文書、福德，各有分數與一句話說明。" },
      { title: "犯太歲與流年四化", body: "今年有沒有犯太歲，以及化祿、化權、化科、化忌落在哪一宮。" },
      { title: "十二流月重點", body: "每個農曆月份可以多花心力和需要留意的面向。" },
      { title: "全年擇日", body: `簽約、結婚登記、搬家入宅、開業、出國等 ${purposeCount} 種用途，各挑出全年最適合的日子。` },
      ...ai({ title: "AI 白話整理（可選）", body: "把上面的計算結果整理成好讀的文字，每段附上盤面依據。" }),
    ],
    note: "計算的部分依公開的排盤規則產生，同一張命盤每次打開內容都一樣。",
  };
}
