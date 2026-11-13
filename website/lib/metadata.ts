import type { Metadata } from "next";
import { publicPath, siteOrigin } from "./origin";
import { pageHref, type Locale, type PageKey } from "./routes";

export function portfolioMetadata(locale: Locale, title: string, description: string, page?: PageKey, slug?: string): Metadata {
  const origin = siteOrigin();
  const url = publicPath(pageHref(locale, page, slug));
  const image = publicPath("/social-card.png");
  return {
    metadataBase: origin ? new URL(origin) : undefined,
    title,
    description,
    icons: { icon: publicPath("/mark.svg") },
    alternates: {
      canonical: url,
      languages: {
        en: publicPath(pageHref("en", page, slug)),
        "zh-Hans": publicPath(pageHref("zh", page, slug)),
        "x-default": publicPath(pageHref("en", page, slug)),
      },
    },
    openGraph: {
      title, description, type: "website", siteName: "Zeyuan Fan", url,
      locale: locale === "zh" ? "zh_CN" : "en_US",
      alternateLocale: locale === "zh" ? "en_US" : "zh_CN",
      images: origin ? [{ url: image, width: 1200, height: 630, alt: "Zeyuan Fan · HCI Researcher · AI Engineer" }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description, images: origin ? [image] : undefined },
  };
}
