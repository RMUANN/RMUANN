import type { MetadataRoute } from "next";
import { locales, site } from "@/content/site";
import { siteOrigin } from "@/lib/origin";
import { pageHref, pageKeys } from "@/lib/routes";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  if (!origin) return [];
  return locales.flatMap((locale) => [
    { url: origin + pageHref(locale) },
    ...pageKeys.map((page) => ({ url: origin + pageHref(locale, page) })),
    ...site[locale].projects.map(({ slug }) => ({ url: origin + pageHref(locale, "projects", slug) })),
  ]);
}
