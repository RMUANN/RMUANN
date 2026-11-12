import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import "../globals.css";

export default async function LocalizedLayout({ children, params }: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "en" && locale !== "zh") notFound();
  return <html lang={locale === "zh" ? "zh-Hans" : "en"}><body>{children}</body></html>;
}
