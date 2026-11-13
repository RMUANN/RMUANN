import type { MetadataRoute } from "next";
import { locales, site } from "@/content/site";
import { publicPath, siteOrigin } from "@/lib/origin";
import { navigationKeys, pageHref, type Locale, type PageKey } from "@/lib/routes";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  if (!origin) return [];

  function entry(locale: Locale, page?: PageKey, slug?: string) {
    const path = (language: Locale) => origin + publicPath(pageHref(language, page, slug));
    return { url: path(locale), alternates: { languages: { en: path("en"), "zh-Hans": path("zh"), "x-default": path("en") } } };
  }

  return locales.flatMap((locale) => [
    ...navigationKeys.map((page) => entry(locale, page === "home" ? undefined : page)),
    ...site[locale].projects.map(({ slug }) => entry(locale, "projects", slug)),
  ]);
}
