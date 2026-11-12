import type { ReactNode } from "react";
import Link from "next/link";
import MotionStudy from "@/components/MotionStudy";
import ProjectCover from "@/components/ProjectCover";
import { site } from "@/content/site";
import { ui } from "@/content/ui";
import { pageHref, type Locale, type PageKey } from "@/lib/routes";

type Copy = (typeof site)[Locale];
type Project = Copy["projects"][number];
type Publication = Copy["publications"][number];

function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link className="text-link" href={href}>{children} <span aria-hidden="true">↗</span></Link>;
}

function Band({ title, link, children }: { title: string; link?: { href: string; label: string }; children: ReactNode }) {
  return <section className="band">
    <div className="band-head"><h2>{title}</h2>{link && <ArrowLink href={link.href}>{link.label}</ArrowLink>}</div>
    {children}
  </section>;
}

function Projects({ projects, locale, standalone = false }: { projects: Project[]; locale: Locale; standalone?: boolean }) {
  const Heading = standalone ? "h2" : "h3";
  return <div className="project-grid">{projects.map((item) => (
    <article className="project-card" key={item.slug}>
      <Link href={pageHref(locale, "projects", item.slug)}>
        <ProjectCover slug={item.slug} />
        <div className="project-copy">
          <p className="eyebrow">{item.category}</p>
          <div className="card-heading"><Heading>{item.title}</Heading><span aria-hidden="true">↗</span></div>
          <p>{item.description}</p>
        </div>
      </Link>
    </article>
  ))}</div>;
}

function Papers({ papers, locale, standalone = false, related = false }: { papers: Publication[]; locale: Locale; standalone?: boolean; related?: boolean }) {
  const label = ui[locale];
  const Heading = standalone ? "h2" : "h3";
  return <ul className="paper-list">{papers.map((paper) => (
    <li key={paper.title}>
      <p className="paper-meta">{paper.venue} · {paper.status}</p>
      <Heading lang="en">{paper.title}</Heading>
      {paper.authors && <p lang="en">{paper.authors}</p>}
      <p>{paper.description}</p>
      <div className="paper-links">
        {!related && <ArrowLink href={pageHref(locale, "projects", paper.projectSlug)}>{label.project}</ArrowLink>}
        {paper.href && <a className="text-link" href={paper.href}>{label.paper} <span aria-hidden="true">↗</span></a>}
      </div>
    </li>
  ))}</ul>;
}

function Experience({ copy, locale, standalone = false }: { copy: Copy; locale: Locale; standalone?: boolean }) {
  const label = ui[locale];
  const Heading = standalone ? "h2" : "h3";
  const Subheading = standalone ? "h3" : "h4";
  return <div className="experience-grid">
    <section><Heading>{label.education}</Heading><ul className="timeline">{copy.education.map((entry) => (
      <li key={entry.institution}>
        {entry.period && <p className="paper-meta">{entry.period}</p>}
        <Subheading>{entry.institution}</Subheading><p>{entry.degree}</p>
        {standalone && <p>{entry.description}</p>}
      </li>
    ))}</ul></section>
    <section><Heading>{label.engineering}</Heading><ul className="timeline">{copy.engineering.map((entry) => (
      <li key={entry.title}><Subheading>{entry.title}</Subheading><p>{entry.description}</p></li>
    ))}</ul></section>
  </div>;
}

function Contact({ copy }: { copy: Copy }) {
  return <div className="hero-actions">{copy.contact.map((item) =>
    <a className="button primary" key={item.href} href={item.href}>{item.label} <span aria-hidden="true">↗</span></a>
  )}</div>;
}

export function Home({ locale }: { locale: Locale }) {
  const copy = site[locale];
  const labels = ui[locale];
  const research = copy.projects.filter(({ slug }) => slug === "comotion" || slug === "sandtouch");
  const engineering = copy.projects.filter((item) => !research.includes(item));
  return <>
    <section className="hero">
      <div>
        <p className="eyebrow">{labels.affiliation}</p>
        <h1>{copy.name}</h1>
        <p className="subtitle">{copy.role}</p>
        <p className="lede">{copy.intro}</p>
        <div className="hero-actions">
          <Link className="button primary" href={pageHref(locale, "research")}>{copy.nav.research} <span aria-hidden="true">↗</span></Link>
          <Link className="button secondary" href={pageHref(locale, "projects")}>{copy.nav.projects}</Link>
          <Link className="button secondary" href={pageHref(locale, "publications")}>{copy.nav.publications}</Link>
          <Link className="button secondary" href={pageHref(locale, "contact")}>{copy.nav.contact}</Link>
        </div>
      </div>
      <MotionStudy locale={locale} />
    </section>
    <Band title={labels.researchWork} link={{ href: pageHref(locale, "research"), label: labels.allResearch }}>
      <Projects projects={research} locale={locale} />
    </Band>
    <Band title={labels.engineeringWork} link={{ href: pageHref(locale, "projects"), label: labels.allProjects }}>
      <Projects projects={engineering} locale={locale} />
    </Band>
    <Band title={labels.papers} link={{ href: pageHref(locale, "publications"), label: labels.allPapers }}>
      <Papers papers={copy.publications} locale={locale} />
    </Band>
    <Band title={labels.about} link={{ href: pageHref(locale, "about"), label: copy.nav.about }}>
      <p className="lede">{copy.pages.about.description}</p>
    </Band>
    <Band title={labels.experience} link={{ href: pageHref(locale, "experience"), label: labels.allExperience }}>
      <Experience copy={copy} locale={locale} />
    </Band>
    <Band title={labels.contact} link={{ href: pageHref(locale, "contact"), label: copy.nav.contact }}>
      <p className="lede">{copy.pages.contact.description}</p>
      <Contact copy={copy} />
    </Band>
  </>;
}

function PageHead({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <header className="page-head">{children}<h1>{title}</h1><p className="lede">{description}</p></header>;
}

export function SectionPage({ locale, page }: { locale: Locale; page: PageKey }) {
  const copy = site[locale];
  const labels = ui[locale];
  return <>
    <PageHead {...copy.pages[page]} />
    <div className="page-body">
      {page === "about" && <>
        <p className="lede about-intro">{copy.intro}</p>
        <Experience copy={copy} locale={locale} standalone />
      </>}
      {page === "research" && <div className="reading">{copy.themes.map((theme) => (
        <section key={theme.title}><h2>{theme.title}</h2><p>{theme.description}</p></section>
      ))}<ArrowLink href={pageHref(locale, "projects")}>{labels.allProjects}</ArrowLink></div>}
      {page === "publications" && <Papers papers={copy.publications} locale={locale} standalone />}
      {page === "projects" && <Projects projects={copy.projects} locale={locale} standalone />}
      {page === "experience" && <Experience copy={copy} locale={locale} standalone />}
      {page === "contact" && <Contact copy={copy} />}
    </div>
  </>;
}

export function ProjectDetail({ locale, project }: { locale: Locale; project: Project }) {
  const labels = ui[locale];
  const papers = site[locale].publications.filter((paper) => paper.projectSlug === project.slug);
  return <>
    <PageHead title={project.title} description={project.description}>
      <ArrowLink href={pageHref(locale, "projects")}>{labels.back}</ArrowLink>
    </PageHead>
    <div className="page-body project-detail">
      <div className="reading">{project.sections.map((section) => (
        <section key={section.title}><h2>{section.title}</h2><p>{section.body}</p></section>
      ))}</div>
      <aside className="detail-aside">
        {project.slug === "comotion" ? <MotionStudy locale={locale} /> : <figure><ProjectCover slug={project.slug} /></figure>}
      </aside>
    </div>
    {papers.length > 0 && <Band title={labels.related}><Papers papers={papers} locale={locale} related /></Band>}
  </>;
}
