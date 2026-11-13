import { strict as assert } from "node:assert";
import { test } from "node:test";
import { locales, site } from "../content/site.ts";
import { pageKeys } from "../lib/routes.ts";

test("every localized project has an equivalent page and substantive sections", () => {
  const englishSlugs = site.en.projects.map(({ slug }) => slug);
  assert.equal(new Set(englishSlugs).size, englishSlugs.length);
  assert.ok(englishSlugs.includes("comotion") && englishSlugs.includes("sandtouch"));
  assert.deepEqual(site.zh.projects.map(({ slug }) => slug), englishSlugs);
  for (const locale of locales) {
    for (const page of pageKeys) {
      assert.ok(site[locale].pages[page].description.trim());
      assert.ok(site[locale].nav[page].trim());
    }
    for (const project of site[locale].projects) assert.ok(project.sections.length >= 3);
  }
});

test("publication entries link to public projects and the verified SandTouch DOI", () => {
  for (const locale of locales) {
    const { projects, publications } = site[locale];
    assert.equal(publications.length, 5);
    for (const publication of publications) {
      if (publication.projectSlug) assert.ok(projects.some(({ slug }) => slug === publication.projectSlug));
      else assert.match(publication.href ?? "", /^https:\/\/doi\.org\//);
      if (publication.projectSlug === "comotion") assert.equal(publication.href, undefined);
      if (publication.projectSlug === "sandtouch") assert.equal(publication.href, "https://doi.org/10.1145/3706598.3714275");
    }
  }
});
