import type { ReactNode } from "react";
import Link from "next/link";
import { site } from "@/content/site";
import { ui } from "@/content/ui";
import { alternateLocale, legacyAboutHref, navigationHref, navigationKeys, navigationPage, pageHref, type Locale, type PageKey } from "@/lib/routes";

export default function SiteFrame({ locale, page, slug, children }: {
  locale: Locale; page?: PageKey; slug?: string; children: ReactNode;
}) {
  const copy = site[locale];
  const labels = ui[locale];
  const other = alternateLocale(locale);
  const activePage = navigationPage(page, slug);
  const alternateHref = legacyAboutHref(other, page) ?? pageHref(other, page, slug);
  const alternateLanguage = other === "zh" ? "zh-Hans" : "en";
  const navigation = { home: labels.home, ...copy.nav };
  return <>
    <a className="skip" href="#main">{labels.skip}</a>
    <header className="site-header">
      <div className="wrap header-inner">
        <Link className="brand" href={pageHref(locale)}>
          <svg className="brand-mark" viewBox="0 0 30 30" aria-hidden="true">
            <path d="M3 23 11 9 18 18 26 5" fill="none" stroke="currentColor" strokeWidth="1.7" />
            <circle cx="3" cy="23" r="2.1" fill="currentColor" /><circle cx="11" cy="9" r="2.1" fill="currentColor" />
            <circle cx="18" cy="18" r="2.1" fill="currentColor" /><circle cx="26" cy="5" r="2.1" fill="currentColor" />
          </svg>
          {copy.name}
        </Link>
        <nav className="nav" aria-label={labels.navigation}>
          {navigationKeys.map((item) => (
            <Link key={item} href={navigationHref(locale, item)} aria-current={activePage === item ? (item === (page ?? "home") && !slug ? "page" : "location") : undefined}>
              {navigation[item]}
            </Link>
          ))}
        </nav>
        <Link className="language" href={alternateHref} hrefLang={alternateLanguage} lang={alternateLanguage}>{other === "zh" ? "简体中文" : "English"}</Link>
      </div>
    </header>
    <main id="main" tabIndex={-1} className="wrap">{children}</main>
    <footer className="site-footer">
      <div className="wrap footer-inner">
        <span>{copy.name} · {copy.role}</span>
        <nav className="footer-nav" aria-label={labels.footerNavigation}>
          {navigationKeys.map((item) => <Link className="text-link" key={item} href={navigationHref(locale, item)}>{navigation[item]}</Link>)}
          <Link className="text-link" href={`${pageHref(locale, "about")}#contact`}>{labels.contact}</Link>
          {copy.contact.map((item) => <a className="text-link" key={item.href} href={item.href}>{item.label} <span aria-hidden="true">↗</span></a>)}
        </nav>
      </div>
    </footer>
  </>;
}
