import type { Metadata } from "next";
import { siteOrigin } from "./origin";
import { pageHref, type Locale, type PageKey } from "./routes";

export function portfolioMetadata(locale: Locale, title: string, description: string, page?: PageKey, slug?: string): Metadata {
  const origin = siteOrigin();
  const url = pageHref(locale, page, slug);
  return {
    metadataBase: origin ? new URL(origin) : undefined,
    title,
    description,
    icons: { icon: "/mark.svg" },
    alternates: {
      canonical: url,
      languages: { en: pageHref("en", page, slug), "zh-Hans": pageHref("zh", page, slug), "x-default": pageHref("en", page, slug) },
    },
    openGraph: {
      title, description, type: "website", siteName: "Zeyuan Fan", url,
      locale: locale === "zh" ? "zh_CN" : "en_US",
      alternateLocale: locale === "zh" ? "en_US" : "zh_CN",
      images: origin ? [{ url: "/social-card.png", width: 1200, height: 630, alt: "Zeyuan Fan · HCI Researcher · AI Engineer" }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description, images: origin ? ["/social-card.png"] : undefined },
  };
}
