export const pageKeys = ["about", "research", "publications", "projects", "experience", "contact"] as const;
export const navigationKeys = ["home", "research", "projects", "about"] as const;
export type PageKey = (typeof pageKeys)[number];
export type NavigationKey = (typeof navigationKeys)[number];
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

export function navigationHref(locale: Locale, page: NavigationKey) {
  return pageHref(locale, page === "home" ? undefined : page);
}

export function canonicalPage(page?: PageKey) {
  if (page === "contact" || page === "experience") return "about";
  if (page === "publications") return "research";
  return page;
}

export function navigationPage(page?: PageKey, slug?: string): NavigationKey {
  return isResearchProject(slug) ? "research" : canonicalPage(page) ?? "home";
}

export function legacyAboutHref(locale: Locale, page?: PageKey) {
  if (page === "contact") return `${pageHref(locale, "about")}#contact`;
  if (page === "experience") return `${pageHref(locale, "about")}#background`;
}

export function isResearchProject(slug?: string) {
  return slug === "comotion" || slug === "sandtouch";
}
