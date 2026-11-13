import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import ResearchCarousel from "@/components/ResearchCarousel";
import { engineeringDirections, engineeringHero, familiarity } from "@/content/engineering";
import { site } from "@/content/site";
import { ui } from "@/content/ui";
import { publicPath } from "@/lib/origin";
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

function Tags({ items, lang = "en" }: { items: readonly string[]; lang?: string }) {
  return <ul className="engineering-tags" lang={lang} role="list">
    {items.map((item) => <li key={item}>{item}</li>)}
  </ul>;
}

function PaperFigure({ paper, locale, caption }: { paper: Publication; locale: Locale; caption?: string }) {
  if (!paper.image) return null;
  const { src, width, height, alt } = paper.image;
  const imagePath = src.startsWith("/") ? publicPath(src) : src;
  const img = <Image src={imagePath} width={width} height={height} alt={alt} unoptimized />;
  return <figure className="paper-figure">
    {src.startsWith("/") ? <a href={imagePath} aria-label={ui[locale].enlargeFigure + " · " + alt}>{img}</a> : img}
    {caption && <figcaption>{caption}</figcaption>}
  </figure>;
}

function PaperLinks({ paper, locale, related }: { paper: Publication; locale: Locale; related?: boolean }) {
  const labels = ui[locale];
  const showProject = !related && paper.projectSlug && !paper.hideProjectLink;
  if (!paper.href && !showProject && !related) return null;
  return <div className="paper-links">
    {related && paper.id && <ArrowLink href={pageHref(locale, "research") + "#" + paper.id}>{labels.viewPublication}</ArrowLink>}
    {paper.href && <a className="text-link" href={paper.href}>
      {paper.href.startsWith("https://doi.org/") ? "DOI" : labels.readPaper} <span aria-hidden="true">↗</span>
    </a>}
    {showProject && <ArrowLink href={pageHref(locale, "projects", paper.projectSlug)}>{labels.viewProject}</ArrowLink>}
  </div>;
}

function Papers({ papers, locale, related = false }: { papers: Publication[]; locale: Locale; related?: boolean }) {
  return <ul className="paper-list">{papers.map((paper) => (
    <li className={paper.image && !related ? "paper-with-image" : undefined} key={paper.title} id={related ? undefined : paper.id}>
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
        <PaperLinks paper={paper} locale={locale} related={related} />
      </div>
      {!related && <PaperFigure paper={paper} locale={locale} />}
    </li>
  ))}</ul>;
}

function Contact({ copy }: { copy: Copy }) {
  return <div className="hero-actions">{copy.contact.map((item) =>
    <a className="button primary" key={item.href} href={item.href}>{item.label} <span aria-hidden="true">↗</span></a>
  )}</div>;
}

export function Home({ locale }: { locale: Locale }) {
  const copy = site[locale];
  const labels = ui[locale];
  const selected = ["comotion", "trace-motion", "sandtouch"].map((id) => copy.publications.find((paper) => paper.id === id)!);
  const slides = ["comotion", "comotion-demo", "trace-motion", "sandtouch"].flatMap((id) => {
    const image = copy.publications.find((paper) => paper.id === id)?.image;
    return image ? [{ ...image, src: publicPath(image.src) }] : [];
  });
  return <>
    <section className="hero editorial-hero">
      <div>
        <p className="eyebrow">{labels.affiliation}</p>
        <h1>{copy.name}</h1>
        <p className="subtitle">{copy.role}</p>
        <p className="lede">{copy.intro}</p>
        <Tags items={labels.interests} lang={locale === "zh" ? "zh-Hans" : "en"} />
        <div className="hero-actions">
          <Link className="button primary" href={pageHref(locale, "research")}>{labels.exploreResearch}</Link>
          <Link className="button secondary" href={pageHref(locale, "projects")}>{labels.exploreEngineering}</Link>
          <Link className="button secondary" href={pageHref(locale, "about")}>{labels.about}</Link>
        </div>
      </div>
      <div className="hero-research">
        <ResearchCarousel slides={slides} locale={locale} />
        <Tags items={["HCI", "Text-to-Motion", "LLM Agents", "RAG", "Python", "Go", "Human-AI Interaction"]} />
      </div>
    </section>
    <Band title={labels.selectedResearch} link={{ href: pageHref(locale, "research"), label: labels.allResearch }}>
      <div className="selected-research">{selected.map((paper, i) => (
        <article key={paper.id}>
          <PaperFigure paper={paper} locale={locale} />
          <p className="eyebrow">{labels.researchCategories[i]}</p>
          <h3 lang="en">{paper.title}</h3>
          <p>{paper.description}</p>
          <PaperLinks paper={paper} locale={locale} />
        </article>
      ))}</div>
    </Band>
    <Band title={labels.engineeringHighlights} link={{ href: pageHref(locale, "projects"), label: labels.allProjects }}>
      <div className="engineering-highlights">
        {engineeringDirections.map((direction) => <article key={direction.id}>
          <h3><Link href={pageHref(locale, "projects") + "#" + direction.id}>{direction.title[locale]}</Link></h3>
          <p>{direction.description[locale]}</p>
          <Tags items={direction.highlights} />
        </article>)}
      </div>
    </Band>
    <Band title={copy.nav.about} link={{ href: pageHref(locale, "about") + "#contact", label: labels.contact }}>
      <p className="lede">{copy.pages.about.description}</p>
    </Band>
  </>;
}

function PageHead({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <header className="page-head">{children}<h1>{title}</h1><p className="lede">{description}</p></header>;
}

function EngineeringPractice({ locale }: { locale: Locale }) {
  const copy = site[locale];
  const labels = ui[locale];
  return <>
    <header className="page-head engineering-head">
      <h1>{copy.pages.projects.title}</h1>
      <p className="subtitle">{engineeringHero.subtitle[locale]}</p>
      <p className="lede">{copy.pages.projects.description}</p>
    </header>
    <div className="page-body engineering-directions">
      {engineeringDirections.map(({ id, title, subtitle, description, groups, projectSlug }) => {
        const project = copy.projects.find(({ slug }) => slug === projectSlug)!;
        return <section className="engineering-direction" key={id} aria-labelledby={id}>
          <header className="engineering-direction-head">
            <h2 className="section-title" id={id}>{title[locale]}</h2>
            <p className="engineering-subtitle">{subtitle[locale]}</p>
          </header>
          <div className="engineering-groups">
            {groups.map((group) => (
              <div className="engineering-group" key={group.title.en}>
                <h3>{group.title[locale]}</h3>
                {group.description && <p>{group.description[locale]}</p>}
                <ul className="engineering-tags" lang="en" role="list">
                  {group.technologies.map((technology) => <li key={technology}>{technology}</li>)}
                  {group.familiarWith?.map((technology) => (
                    <li key={technology}>
                      {technology} <span className="engineering-familiarity" lang={locale === "zh" ? "zh-Hans" : "en"}>{familiarity[locale]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="engineering-summary">{description[locale]}</p>
          <div className="engineering-work">
            <h3>{labels.selectedWork}</h3>
            <Link className="case-study" href={pageHref(locale, "projects", project.slug)}>
              <p className="eyebrow">{project.category}</p>
              <h4>{project.title}</h4>
              <p>{project.description}</p>
              <Tags items={project.technologies ?? []} />
              <span className="text-link">{labels.caseStudy} <span aria-hidden="true">↗</span></span>
            </Link>
          </div>
        </section>;
      })}
    </div>
  </>;
}

function About({ locale }: { locale: Locale }) {
  const copy = site[locale];
  const labels = ui[locale];
  return <>
    <PageHead {...copy.pages.about} />
    <div className="page-body about-sections">
      <section aria-labelledby="about-me">
        <h2 id="about-me">{labels.about}</h2>
        <p className="subtitle">{copy.name} · {copy.role}</p>
        <p>{copy.intro}</p>
      </section>
      <section aria-labelledby="education">
        <h2 id="education">{labels.education}</h2>
        <p>{labels.affiliation}</p>
      </section>
      <section aria-labelledby="background">
        <h2 id="background">{labels.background}</h2>
        <div className="research-topics">
          <div><h3>{labels.interests[0]}</h3><p>{copy.pages.research.description}</p></div>
          {engineeringDirections.map((direction) => <div key={direction.id}>
            <h3>{direction.title[locale]}</h3><p>{direction.description[locale]}</p>
          </div>)}
        </div>
      </section>
      <section aria-labelledby="contact">
        <h2 id="contact">{labels.contact}</h2>
        <p>{copy.pages.contact.description}</p>
        <Contact copy={copy} />
      </section>
    </div>
  </>;
}

export function SectionPage({ locale, page, preview = [] }: { locale: Locale; page: PageKey; preview?: Publication[] }) {
  if (page === "projects") return <EngineeringPractice locale={locale} />;
  if (page === "about" || page === "contact" || page === "experience") return <About locale={locale} />;
  const copy = site[locale];
  const labels = ui[locale];
  const papers = copy.publications.map((paper) => {
    const draft = preview.find((entry) => entry.title === paper.title);
    return draft ? { ...paper, ...draft } : paper;
  });
  const extraPapers = preview.filter((draft) => !copy.publications.some((paper) => paper.title === draft.title));
  return <>
    <PageHead {...copy.pages.research} />
    <div className="page-body research-sections">
      <section aria-labelledby="directions">
        <h2 id="directions">{labels.directions}</h2>
        <div className="research-topics">{copy.themes.map((theme) => (
          <div key={theme.title}><h3>{theme.title}</h3><p>{theme.description}</p></div>
        ))}</div>
      </section>
      <section aria-labelledby="papers">
        <h2 id="papers">{labels.papers}</h2>
        <Papers papers={[...extraPapers, ...papers]} locale={locale} />
      </section>
    </div>
  </>;
}

export function ProjectDetail({ locale, project }: { locale: Locale; project: Project }) {
  const labels = ui[locale];
  const copy = site[locale];
  const papers = copy.publications.filter((paper) => paper.projectSlug === project.slug);
  const research = papers.length > 0;
  const relatedProjects = engineeringDirections
    .filter(({ projectSlug }) => projectSlug !== project.slug)
    .map(({ projectSlug }) => copy.projects.find(({ slug }) => slug === projectSlug)!);
  return <>
    <PageHead title={project.title} description={project.description}>
      <ArrowLink href={pageHref(locale, research ? "research" : "projects")}>{research ? labels.backToResearch : labels.backToEngineering}</ArrowLink>
    </PageHead>
    {project.slug === "comotion" && (
      <video className="project-video" controls playsInline preload="metadata" aria-label={labels.comotionVideo}>
        <source src={publicPath("/videos/comotion-final.mp4")} type="video/mp4" />
      </video>
    )}
    <div className="page-body project-detail">
      <div className="reading">{project.sections.map((section) => (
        <section key={section.title}><h2>{section.title}</h2><p>{section.body}</p></section>
      ))}</div>
      <aside className="detail-aside">
        {research ? <>
          <PaperFigure paper={papers[0]} locale={locale} caption={project.title} />
        </> : <>
          <section><h2>{labels.relatedTechnologies}</h2><Tags items={project.technologies ?? []} /></section>
          <section><h2>{labels.relatedProjects}</h2>
            {relatedProjects.map((related) => <ArrowLink key={related.slug} href={pageHref(locale, "projects", related.slug)}>{related.title}</ArrowLink>)}
          </section>
        </>}
      </aside>
    </div>
    {research && <Band title={labels.related}><Papers papers={papers} locale={locale} related /></Band>}
  </>;
}
