import { strict as assert } from "node:assert";
import { test } from "node:test";
import { locales, site } from "../content/site.ts";
import { engineeringDirections } from "../content/engineering.ts";
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
  const ids = ["trace-motion", "comotion", "comotion-demo", "sandtouch", "vcaptouch", "attribute-reduction"];
  for (const locale of locales) {
    const { projects, publications } = site[locale];
    assert.deepEqual(publications.map(({ id }) => id), ids);
    const [traceMotion, comotion, demo, sandtouch, vcapTouch, attributeReduction] = publications;
    assert.equal(traceMotion.year, 2027);
    assert.equal(traceMotion.href, undefined);
    assert.equal(traceMotion.projectSlug, undefined);
    for (const paper of [comotion, demo, sandtouch]) {
      assert.ok(projects.some(({ slug }) => slug === paper.projectSlug));
    }
    assert.equal(sandtouch.hideProjectLink, true);
    assert.equal(sandtouch.href, "https://doi.org/10.1145/3706598.3714275");
    assert.equal(vcapTouch.href, "https://doi.org/10.1109/JIOT.2025.3553561");
    assert.equal(attributeReduction.href, undefined);
  }
});

test("each engineering direction links to a localized case study with technology tags", () => {
  assert.deepEqual(engineeringDirections.map(({ projectSlug }) => projectSlug), ["agent-intent-routing", "go-backend-services"]);
  for (const locale of locales) {
    for (const direction of engineeringDirections) {
      const project = site[locale].projects.find(({ slug }) => slug === direction.projectSlug);
      assert.ok(project);
      assert.ok(project.technologies && project.technologies.length >= 3 && project.technologies.length <= 5);
      assert.equal(project.href, undefined);
    }
    const web = site[locale].projects.find(({ slug }) => slug === "go-backend-services");
    assert.match(web?.sections.map(({ body }) => body).join(" ") ?? "", /HTML.*CSS.*JavaScript/);
  }
});
