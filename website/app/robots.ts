import type { MetadataRoute } from "next";
import { publicPath, siteOrigin } from "@/lib/origin";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: origin ? origin + publicPath("/sitemap.xml") : undefined,
  };
}
