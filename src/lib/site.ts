import type { Metadata } from "next";

/** 網站共用設定。正式網址請在 Netlify 設定 NEXT_PUBLIC_SITE_URL；沒設時用 Netlify 建置時提供的 URL */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.URL ?? "http://localhost:3000").replace(/\/+$/, "");

export const SITE_NAME = "紫微命盤";

export const SITE_DESCRIPTION =
  "免費紫微斗數線上排盤：輸入出生年月日與時間，排出十二宮、十四主星、四化與大限流年。自動校正夏令時間、日治時期東京時間與晚子時，可選真太陽時。";

/** 聯絡信箱（隱私權政策用），在 Netlify 設定 NEXT_PUBLIC_CONTACT_EMAIL；沒設時頁面不顯示信箱 */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || null;

/** AI 問答是否開啟（前端分頁與 /api/ask 共用同一個開關） */
export const AI_ENABLED = process.env.NEXT_PUBLIC_AI_ENABLED === "1";

/** 內容頁最後一次實質修改的日期，改寫解讀內容時請一併更新 */
export const CONTENT_UPDATED = "2026-10-31";

export const absoluteUrl = (path: string) => `${SITE_URL}${path === "/" ? "" : path}`;

export const PUBLISHER = { "@type": "Organization", name: SITE_NAME, url: SITE_URL } as const;

/** 麵包屑的 JSON-LD */
export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

const OG_IMAGE = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
  alt: "紫微命盤：紫微斗數免費線上排盤，示意命盤為紫微在午坐命",
};

/**
 * 各頁的 metadata。openGraph、twitter 在子頁會整個覆蓋上層設定，
 * 所以網站名稱、語系與分享圖每頁都要帶齊。
 */
export function pageMetadata({
  title,
  description,
  path,
  type = "website",
  absoluteTitle = false,
}: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  /** 首頁標題不套用「｜紫微命盤」後綴 */
  absoluteTitle?: boolean;
}): Metadata {
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { type, url: path, title, description, siteName: SITE_NAME, locale: "zh_TW", images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE.url] },
  };
}
