export const pageKeys = ["about", "research", "publications", "projects", "experience", "contact"] as const;
export type PageKey = (typeof pageKeys)[number];
export type Locale = "en" | "zh";

export function alternateLocale(locale: Locale): Locale {
  return locale === "en" ? "zh" : "en";
}

export function isPageKey(value: string): value is PageKey {
  return pageKeys.some((page) => page === value);
}

export function pageHref(locale: Locale, page?: PageKey, slug?: string) {
  return "/" + [locale, page, slug].filter(Boolean).join("/") + "/";
}
