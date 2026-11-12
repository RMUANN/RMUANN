import type { ReactNode } from "react";
import Link from "next/link";
import { site } from "@/content/site";
import { ui } from "@/content/ui";
import { alternateLocale, pageHref, type Locale, type PageKey } from "@/lib/routes";

const navOrder = ["about", "research", "projects", "publications", "experience", "contact"] as const;

export default function SiteFrame({ locale, page, slug, children }: {
  locale: Locale; page?: PageKey; slug?: string; children: ReactNode;
}) {
  const copy = site[locale];
  const labels = ui[locale];
  const other = alternateLocale(locale);
  return <>
    <a className="skip" href="#main">{labels.skip}</a>
    <header className="site-header">
      <div className="wrap header-inner">
        <Link className="brand" href={pageHref(locale)} aria-current={page ? undefined : "page"}>
          <svg className="brand-mark" viewBox="0 0 30 30" aria-hidden="true">
            <path d="M3 23 11 9 18 18 26 5" fill="none" stroke="currentColor" strokeWidth="1.7" />
            <circle cx="3" cy="23" r="2.1" fill="currentColor" /><circle cx="11" cy="9" r="2.1" fill="currentColor" />
            <circle cx="18" cy="18" r="2.1" fill="currentColor" /><circle cx="26" cy="5" r="2.1" fill="currentColor" />
          </svg>
          {copy.name}
        </Link>
        <nav className="nav" aria-label={labels.navigation}>
          {navOrder.map((item) => <Link key={item} href={pageHref(locale, item)} aria-current={page === item ? (slug ? "location" : "page") : undefined}>{copy.nav[item]}</Link>)}
        </nav>
        <Link className="language" href={pageHref(other, page, slug)} hrefLang={other === "zh" ? "zh-Hans" : "en"} lang={other === "zh" ? "zh-Hans" : "en"}>{other === "zh" ? "简体中文" : "English"}</Link>
      </div>
    </header>
    <main id="main" tabIndex={-1} className="wrap">{children}</main>
    <footer className="site-footer">
      <div className="wrap footer-inner">
        <span>{copy.name} · {copy.role}</span>
        <div className="paper-links">
          <Link className="text-link" href={pageHref(locale, "contact")}>{copy.nav.contact}</Link>
          {copy.contact.map((item) => <a className="text-link" key={item.href} href={item.href}>{item.label} <span aria-hidden="true">↗</span></a>)}
        </div>
      </div>
    </footer>
  </>;
}
