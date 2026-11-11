import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME}・紫微斗數免費排盤`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    lang: "zh-Hant-TW",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f0e6",
    theme_color: "#5b3a8c",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    ],
  };
}
