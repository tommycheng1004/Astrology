import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

/**
 * 只含本站用字的 Noto Serif TC 子集（scripts/subset-font.mjs 產生），每個字重一個檔、全站共用快取。
 * Google Fonts 的分片版每頁要下載 1–2.6 MB；子集兩個字重合計約 0.7 MB。
 * 使用者輸入的姓名等子集外的字，瀏覽器會自動改用系統襯線字。
 */
const notoSerifTC = localFont({
  src: [
    { path: "./fonts/noto-serif-tc-500.woff2", weight: "500" },
    { path: "./fonts/noto-serif-tc-700.woff2", weight: "700" },
  ],
  variable: "--font-noto-serif-tc",
  preload: false,
  display: "swap",
  // 自動備援字型是以 Arial 校正拉丁字寬，對中文沒有意義
  adjustFontFallback: false,
});

// canonical 由各頁自行設定，避免子頁繼承到首頁網址
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "紫微斗數免費線上排盤｜命盤解析與流年運勢",
    template: `%s｜${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  category: "lifestyle",
  formatDetection: { telephone: false, address: false, email: false },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    siteName: SITE_NAME,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  // 讓底部導覽列能避開 iPhone 的 Home 指示條
  viewportFit: "cover",
  // Android 鍵盤彈出時縮小版面，AI 聊天的輸入框才會留在鍵盤上方（iOS 會自動把輸入框捲進畫面）
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f0e6" },
    { media: "(prefers-color-scheme: dark)", color: "#13111a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant-TW" className={`${notoSerifTC.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
