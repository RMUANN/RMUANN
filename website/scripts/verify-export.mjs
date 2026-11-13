import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const pages = ["", "about/", "research/", "projects/", "publications/", "experience/", "contact/"];
const details = ["comotion", "sandtouch", "agent-intent-routing", "go-backend-services"];
const routes = pages.concat(details.map((slug) => "projects/" + slug + "/"));
const locales = ["en", "zh"];
const basePath = process.env.SITE_BASE_PATH || "";
const preview = process.env.RESEARCH_PREVIEW === "1";

async function html(path) {
  return readFile(new URL("../out/" + path + "index.html", import.meta.url), "utf8");
}

const entry = await html("");
assert.match(entry, /Zeyuan Fan/);
const known = new Set(["/", ...locales.flatMap((locale) => routes.map((route) => "/" + locale + "/" + route))].map((route) => basePath + route));

for (const locale of locales) {
  const other = locale === "en" ? "zh" : "en";
  for (const route of routes) {
    const page = await html(locale + "/" + route);
    assert.match(page, locale === "en" ? /<html lang="en">/ : /<html lang="zh-Hans">/);
    assert.ok(page.includes('href="' + basePath + '/' + other + '/' + route + '"'), "missing language counterpart for " + locale + "/" + route);
    assert.match(page, /<h1[^>]*>[^<]/);
    for (const [, href] of page.matchAll(/<a\b[^>]*\bhref="(\/[^"#?]*)"/g)) {
      assert.ok(known.has(href), "unknown internal route " + href);
    }
    assert.doesNotMatch(page, /private-references|\/data\/|@163\.com/i);
    if (!preview) assert.doesNotMatch(page, /research-preview\.json|data:image\/webp;base64,/i);
    if (route === "projects/") {
      const main = page.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? "";
      const directions = [...main.matchAll(/<h2\b[^>]*>([^<]+)<\/h2>/g)].map(([, title]) => title);
      assert.deepEqual(directions, locale === "en"
        ? ["Agent Development", "Frontend &amp; Backend Development"]
        : ["智能体开发", "前端与后端开发"]);
      assert.doesNotMatch(main, /<(?:img|svg|time)\b|project-card|timeline|agent-intent-routing|go-backend-services/i);
      assert.match(main, /HTML<\/li>.*?CSS<\/li>.*?JavaScript<\/li>/s);
      assert.equal([...main.matchAll(/class="engineering-familiarity"/g)].length, 3);
    }
    if (route === "research/" || route === "publications/") {
      assert.ok(page.indexOf('id="directions"') >= 0 && page.indexOf('id="directions"') < page.indexOf('id="papers"'));
      const firstPaper = (page.match(/id="papers"[\s\S]*?<li\b[^>]*>([\s\S]*?)<\/li>/)?.[1] ?? "").replaceAll("<!-- -->", "");
      assert.match(firstPaper, /<h3 lang="en">TraceMotion:/);
      assert.match(firstPaper, /CCF A[\s\S]*?CHI <time dateTime="2026">2026<\/time>/);
      assert.match(firstPaper, locale === "zh" ? /第一作者[\s\S]*?大修中🙏🙏🙏/ : /First author[\s\S]*?Major Revision 🙏🙏🙏/);
      assert.equal([...page.matchAll(/<h3 lang="en">TraceMotion:/g)].length, 1);
      assert.match(firstPaper, locale === "zh" ? /用手写笔辅助改写动作提示词，并细调生成动作的对应片段。/ : /Stylus input helps users rewrite a motion prompt and refine the corresponding part of the generated motion\./);
      const traceMotionImage = preview ? "data:image/webp;base64," : basePath + "/papers/tracemotion.webp";
      assert.ok(firstPaper.includes('src="' + traceMotionImage));
      for (const figure of ["comotion", "comotion-demo", "sandtouch"]) {
        assert.ok(page.includes('src="' + basePath + '/papers/' + figure + '.webp"'));
      }
    }
  }
}

const out = (path) => new URL("../out/" + path, import.meta.url);
assert.match(await readFile(out("robots.txt"), "utf8"), /User-Agent: \*/i);
const sitemap = await readFile(out("sitemap.xml"), "utf8");
if (sitemap.includes("<loc>")) {
  assert.equal([...sitemap.matchAll(/<loc>/g)].length, (routes.length - 1) * locales.length);
  assert.doesNotMatch(sitemap, /\/publications\//);
}
assert.ok((await readFile(out("social-card.png"))).length > 0);
console.log("Verified " + (routes.length * locales.length + 1) + " exported pages, localized links, and metadata assets.");
