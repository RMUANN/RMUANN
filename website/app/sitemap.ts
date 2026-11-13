import type { MetadataRoute } from "next";
import { locales, site } from "@/content/site";
import { publicPath, siteOrigin } from "@/lib/origin";
import { pageHref, pageKeys } from "@/lib/routes";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  if (!origin) return [];
  return locales.flatMap((locale) => [
    { url: origin + publicPath(pageHref(locale)) },
    ...pageKeys.map((page) => ({ url: origin + publicPath(pageHref(locale, page)) })),
    ...site[locale].projects.map(({ slug }) => ({ url: origin + publicPath(pageHref(locale, "projects", slug)) })),
  ]);
}
