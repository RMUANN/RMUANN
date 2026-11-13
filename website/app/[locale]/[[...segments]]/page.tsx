import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Home, ProjectDetail, SectionPage } from "@/components/Portfolio";
import SiteFrame from "@/components/SiteFrame";
import { locales, site } from "@/content/site";
import { ui } from "@/content/ui";
import { portfolioMetadata } from "@/lib/metadata";
import { publicPath } from "@/lib/origin";
import { researchPreview } from "@/lib/research-preview";
import { canonicalPage, isPageKey, legacyAboutHref, pageKeys } from "@/lib/routes";

type Params = Promise<{ locale: string; segments?: string[] }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.flatMap((locale) => [
    { locale, segments: [] },
    ...pageKeys.map((page) => ({ locale, segments: [page] })),
    ...site[locale].projects.map(({ slug }) => ({ locale, segments: ["projects", slug] })),
  ]);
}

async function resolve(params: Params) {
  const { locale, segments = [] } = await params;
  const [key, slug] = segments;
  if (locale !== "en" && locale !== "zh") notFound();
  if (segments.length > 2 || (key && !isPageKey(key)) || (slug && key !== "projects")) notFound();
  const page = key && isPageKey(key) ? key : undefined;
  const copy = site[locale];
  const project = slug ? copy.projects.find((item) => item.slug === slug) : undefined;
  if (slug && !project) notFound();
  return { locale, page, slug, project, copy } as const;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, page, slug, project, copy } = await resolve(params);
  const canonical = canonicalPage(page);
  const item = project ?? (canonical ? copy.pages[canonical] : undefined);
  const title = (item?.title ?? copy.role) + " | " + copy.name;
  return portfolioMetadata(locale, title, item?.description ?? copy.intro, page, slug);
}

export default async function PortfolioPage({ params }: { params: Params }) {
  const { locale, page, slug, project, copy } = await resolve(params);
  const legacyHref = legacyAboutHref(locale, page);
  if (legacyHref) {
    return <SiteFrame locale={locale} page={page}>
      <meta httpEquiv="refresh" content={`0;url=${publicPath(legacyHref)}`} />
      <header className="page-head">
        <h1>{copy.pages.about.title}</h1>
        <Link className="text-link" href={legacyHref}>{page === "contact" ? ui[locale].contact : ui[locale].background}</Link>
      </header>
    </SiteFrame>;
  }
  const preview = page === "research" || page === "publications" ? researchPreview(locale) : undefined;
  return <SiteFrame locale={locale} page={page} slug={slug}>
    {project ? <ProjectDetail locale={locale} project={project} /> : page ? <SectionPage locale={locale} page={page} preview={preview} /> : <Home locale={locale} />}
  </SiteFrame>;
}
