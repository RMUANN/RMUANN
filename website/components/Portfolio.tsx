import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import MotionStudy from "@/components/MotionStudy";
import ProjectCover from "@/components/ProjectCover";
import { site } from "@/content/site";
import { ui } from "@/content/ui";
import { publicPath } from "@/lib/origin";
import { isResearchProject, pageHref, type Locale, type PageKey } from "@/lib/routes";

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

function Papers({ papers, related = false }: { papers: Publication[]; related?: boolean }) {
  return <ul className="paper-list">{papers.map((paper) => (
    <li className={paper.image && !related ? "paper-with-image" : undefined} key={paper.title}>
      <p className="paper-meta">
        <span>
          {paper.rank}{paper.role && <> {paper.role}</>}
          {paper.status && <> <span className="paper-status">{paper.status}</span></>}
        </span>
        <span className="paper-venue">
          {paper.venue}{paper.year && <>{" "}<time dateTime={String(paper.year)}>{paper.year}</time></>}
        </span>
      </p>
      <div className="paper-copy">
        <h3 lang="en">{paper.title}</h3>
        {paper.authors && <p className="paper-authors" lang="en">{paper.authors.split(", ").map((name, i) =>
          <span key={name}>{i > 0 && ", "}{name === "Zeyuan Fan" ? <strong>{name}</strong> : name}</span>
        )}</p>}
        {paper.description && <p>{paper.description}</p>}
      </div>
      {paper.image && !related && <figure className="paper-figure">
        <Image src={paper.image.src.startsWith("/") ? publicPath(paper.image.src) : paper.image.src}
          width={paper.image.width} height={paper.image.height} alt={paper.image.alt} unoptimized />
      </figure>}
    </li>
  ))}</ul>;
}

function Experience({ copy, locale, standalone = false }: { copy: Copy; locale: Locale; standalone?: boolean }) {
  const label = ui[locale];
  const Heading = standalone ? "h2" : "h3";
  const Subheading = standalone ? "h3" : "h4";
  return <section className="experience-list">
    <Heading>{label.engineering}</Heading>
    <ul className="timeline">{copy.engineering.map((entry) => (
      <li key={entry.title}><Subheading>{entry.title}</Subheading><p>{entry.description}</p></li>
    ))}</ul>
  </section>;
}

function Contact({ copy }: { copy: Copy }) {
  return <div className="hero-actions">{copy.contact.map((item) =>
    <a className="button primary" key={item.href} href={item.href}>{item.label} <span aria-hidden="true">↗</span></a>
  )}</div>;
}

export function Home({ locale }: { locale: Locale }) {
  const copy = site[locale];
  const labels = ui[locale];
  const engineering = copy.projects.filter(({ slug }) => !isResearchProject(slug));
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
          <Link className="button secondary" href={pageHref(locale, "contact")}>{copy.nav.contact}</Link>
        </div>
      </div>
      <MotionStudy locale={locale} />
    </section>
    <Band title={copy.nav.research} link={{ href: pageHref(locale, "research"), label: labels.allResearch }}>
      <Papers papers={copy.publications.slice(0, 3)} />
    </Band>
    <Band title={copy.nav.projects} link={{ href: pageHref(locale, "projects"), label: labels.allProjects }}>
      <Projects projects={engineering} locale={locale} />
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

export function SectionPage({ locale, page, preview = [] }: { locale: Locale; page: PageKey; preview?: Publication[] }) {
  const copy = site[locale];
  const labels = ui[locale];
  const research = page === "research" || page === "publications";
  return <>
    <PageHead {...copy.pages[research ? "research" : page]} />
    <div className="page-body">
      {page === "about" && <>
        <p className="lede about-intro">{copy.intro}</p>
        <Experience copy={copy} locale={locale} standalone />
      </>}
      {research && <div className="research-sections">
        <section aria-labelledby="directions">
          <h2 id="directions">{labels.directions}</h2>
          <div className="research-topics">{copy.themes.map((theme) => (
            <div key={theme.title}><h3>{theme.title}</h3><p>{theme.description}</p></div>
          ))}</div>
        </section>
        <section aria-labelledby="papers">
          <h2 id="papers">{labels.papers}</h2>
          <Papers papers={[...preview, ...copy.publications.filter((paper) => !preview.some((entry) => entry.title === paper.title))]} />
        </section>
      </div>}
      {page === "projects" && <Projects projects={copy.projects.filter(({ slug }) => !isResearchProject(slug))} locale={locale} standalone />}
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
      <ArrowLink href={pageHref(locale, papers.length ? "research" : "projects")}>{papers.length ? labels.allResearch : labels.allProjects}</ArrowLink>
    </PageHead>
    <div className="page-body project-detail">
      <div className="reading">{project.sections.map((section) => (
        <section key={section.title}><h2>{section.title}</h2><p>{section.body}</p></section>
      ))}</div>
      <aside className="detail-aside">
        {project.slug === "comotion" ? <MotionStudy locale={locale} /> : <figure><ProjectCover slug={project.slug} /></figure>}
      </aside>
    </div>
    {papers.length > 0 && <Band title={labels.related}><Papers papers={papers} related /></Band>}
  </>;
}
