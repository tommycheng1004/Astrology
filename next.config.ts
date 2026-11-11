import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 不啟用 cacheComponents / partialPrefetching：本站以靜態頁為主，
  // 排盤在瀏覽器端計算，不需要伺服器端快取，也藉此縮小攻擊面。
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
