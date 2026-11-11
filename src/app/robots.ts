import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * 全站開放索引，包含 AI 搜尋（OAI-SearchBot、Claude-SearchBot、PerplexityBot 等）。
 * 若不想讓內容被拿去訓練模型，可另外對 GPTBot、ClaudeBot、Google-Extended、CCBot 加 disallow，
 * 不影響一般搜尋與 AI 搜尋的引用。
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
