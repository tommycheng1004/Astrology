import type { MetadataRoute } from "next";
import { liunianYears } from "@/content/liunian";
import { PALACES } from "@/content/palaces";
import { STARS } from "@/content/stars";
import { absoluteUrl, CONTENT_UPDATED } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(CONTENT_UPDATED);
  const paths = [
    "/",
    "/method",
    "/stars",
    ...STARS.map((s) => `/stars/${s.slug}`),
    "/palaces",
    ...PALACES.map((p) => `/palaces/${p.slug}`),
    ...liunianYears().map((y) => `/liunian/${y}`),
    "/privacy",
  ];
  return paths.map((path) => ({ url: absoluteUrl(path), lastModified }));
}
