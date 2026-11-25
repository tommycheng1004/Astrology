"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { GA_ID, startAnalytics, trackPageView } from "@/lib/analytics";

/** GA4：只在設定了 NEXT_PUBLIC_GA_ID 時載入；每次換頁送一次去掉生辰雜湊的 page_view */
export default function Analytics() {
  const pathname = usePathname();
  useEffect(() => {
    if (!GA_ID) return;
    startAnalytics();
    trackPageView();
  }, [pathname]);
  if (!GA_ID) return null;
  return <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`} strategy="afterInteractive" />;
}
