import type { MetadataRoute } from "next";
import { liunianYears } from "@/content/liunian";
import { PALACES } from "@/content/palaces";
import { STARS } from "@/content/stars";
import { absoluteUrl, CONTENT_DATES, type ContentSection } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: [string, ContentSection][] = [
    ["/", "home"],
    ["/method", "method"],
    ["/stars", "stars"],
    ...STARS.map((s): [string, ContentSection] => [`/stars/${s.slug}`, "stars"]),
    ["/palaces", "palaces"],
    ...PALACES.map((p): [string, ContentSection] => [`/palaces/${p.slug}`, "palaces"]),
    ...liunianYears().map((y): [string, ContentSection] => [`/liunian/${y}`, "liunian"]),
    ...liunianYears().map((y): [string, ContentSection] => [`/taisui/${y}`, "taisui"]),
    ["/privacy", "privacy"],
  ];
  return pages.map(([path, section]) => ({ url: absoluteUrl(path), lastModified: new Date(CONTENT_DATES[section].modified) }));
}
