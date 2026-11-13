import { readFile, stat } from "node:fs/promises";
import assert from "node:assert/strict";

const pages = ["", "about/", "research/", "projects/", "publications/", "experience/", "contact/"];
const details = ["comotion", "sandtouch", "agent-intent-routing", "go-backend-services"];
const routes = pages.concat(details.map((slug) => "projects/" + slug + "/"));
const locales = ["en", "zh"];
const basePath = process.env.SITE_BASE_PATH || "";
const preview = process.env.RESEARCH_PREVIEW === "1";
const primary = ["", "research/", "projects/", "about/"];
const aliases = new Map([["contact/", "contact"], ["experience/", "background"]]);
const privacy = /百胜|顺丰|Yum\s+China|SF\s+(?:Express|Holding)|城市治理|空间研判|短链|urban governance|spatial assessment|short[- ]link|租户|2026[-./]0[369]|2026年[369]月/i;

async function html(path) {
  return readFile(new URL("../out/" + path + "index.html", import.meta.url), "utf8");
}

const entry = await html("");
assert.match(entry, /Zeyuan Fan/);
const known = new Set(["/", ...locales.flatMap((locale) => routes.map((route) => "/" + locale + "/" + route))].map((route) => basePath + route));
const figures = ["comotion", "comotion-demo", "sandtouch", "tracemotion"];

for (const locale of locales) {
  const other = locale === "en" ? "zh" : "en";
  for (const route of routes) {
    const page = await html(locale + "/" + route);
    const prefix = basePath + "/" + locale + "/";
    const canonicalRoute = aliases.has(route) ? "about/" : route === "publications/" ? "research/" : route;
    const main = page.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? "";
    assert.match(page, locale === "en" ? /<html lang="en">/ : /<html lang="zh-Hans">/);
    const canonical = page.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    assert.ok(canonical?.endsWith(prefix + canonicalRoute), "wrong canonical on " + locale + "/" + route);
    const counterpart = aliases.has(route) ? "about/#" + aliases.get(route) : route;
    assert.ok(page.match(/<a\b[^>]*class="language"[^>]*>/)?.[0].includes('href="' + basePath + "/" + other + "/" + counterpart + '"'));
    if (!aliases.has(route)) {
      assert.ok(page.includes('href="' + basePath + '/' + other + '/' + route + '"'), "missing language counterpart for " + locale + "/" + route);
    } else {
      assert.ok(page.match(/<meta\b[^>]*http-equiv="refresh"[^>]*>/)?.[0].includes(prefix + "about/#" + aliases.get(route)), "missing compatibility redirect for " + locale + "/" + route);
    }
    assert.match(page, /<h1[^>]*>[^<]/);
    for (const [, href, hash] of page.matchAll(/<a\b[^>]*\bhref="(\/[^"#?]*)(#[^"]*)?"/g)) {
      const figure = figures.some((name) => href === basePath + "/papers/" + name + ".webp");
      assert.ok(known.has(href) || figure, "unknown internal route " + href);
      if (hash && known.has(href) && href !== basePath + "/") {
        const target = await html(href.slice(basePath.length + 1));
        assert.ok(target.includes('id="' + hash.slice(1) + '"'), "missing anchor " + href + hash);
      }
    }
    assert.doesNotMatch(page, /private-references|\/data\/|@163\.com/i);
    assert.doesNotMatch(page, privacy);
    if (!preview) assert.doesNotMatch(page, /research-preview\.json|data:image\/webp;base64,/i);
    if (!aliases.has(route)) {
      const nav = page.match(/<header class="site-header">[\s\S]*?<nav\b[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? "";
      assert.deepEqual([...nav.matchAll(/href="([^"]+)"/g)].map(([, href]) => href), primary.map((path) => prefix + path));
      const active = route === "publications/" || /projects\/(?:comotion|sandtouch)\//.test(route) ? "research/" : route.startsWith("projects/") ? "projects/" : route;
      const activeLink = [...nav.matchAll(/<a\b[^>]*aria-current="(?:page|location)"[^>]*>/g)];
      assert.equal(activeLink.length, 1, "one active nav item on " + route);
      assert.ok(activeLink[0][0].includes('href="' + prefix + active + '"'));
      const footer = page.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/)?.[1] ?? "";
      for (const path of primary) assert.ok(footer.includes('href="' + prefix + path + '"'));
    }
    if (route === "") {
      const hero = main.match(/<section class="hero editorial-hero">([\s\S]*?)<\/section>/)?.[1] ?? "";
      assert.doesNotMatch(hero, /motion-panel|<canvas|<input/);
      const carousel = hero.match(/<div class="research-carousel"[\s\S]*?<\/div><ul class="engineering-tags"/)?.[0] ?? "";
      const slides = [...carousel.matchAll(/<img\b[^>]*src="[^"]*\/papers\/([^"]+)\.webp"/g)].map(([, name]) => name);
      assert.deepEqual(slides, ["comotion", "comotion-demo", "tracemotion", "sandtouch"]);
      assert.doesNotMatch(carousel, /<figcaption/);
      for (const path of primary.slice(1)) assert.ok(hero.includes('href="' + prefix + path + '"'));
      assert.ok(main.includes(prefix + "about/#contact"));
    }
    if (route === "about/") {
      for (const id of ["education", "background", "contact"]) assert.ok(main.includes('id="' + id + '"'));
      assert.ok(main.includes('href="https://github.com/RMUANN"'));
    }
    if (route === "projects/") {
      const directions = [...main.matchAll(/<h2\b[^>]*>([^<]+)<\/h2>/g)].map(([, title]) => title);
      assert.deepEqual(directions, locale === "en"
        ? ["Agent Development", "Frontend &amp; Backend Development"]
        : ["智能体开发", "前端与后端开发"]);
      assert.doesNotMatch(main, /<(?:img|svg|time)\b|timeline/i);
      const cases = [...main.matchAll(/<a\b[^>]*class="case-study"[^>]*href="([^"]+)"/g)].map(([, href]) => href);
      assert.deepEqual(cases, details.slice(2).map((slug) => prefix + "projects/" + slug + "/"));
      assert.match(main, /HTML<\/li>.*?CSS<\/li>.*?JavaScript<\/li>/s);
      assert.equal([...main.matchAll(/class="engineering-familiarity"/g)].length, 3);
    }
    if (details.slice(2).some((slug) => route === "projects/" + slug + "/")) {
      assert.ok(main.includes('href="' + prefix + 'projects/"'));
      assert.ok(main.includes('class="engineering-tags"'));
      if (route.includes("go-backend-services")) assert.match(main, /HTML[\s\S]*CSS[\s\S]*JavaScript/);
    }
    if (details.slice(0, 2).some((slug) => route === "projects/" + slug + "/")) {
      const slug = route.split("/")[1];
      assert.ok(main.includes('href="' + prefix + "research/#" + slug + '"'));
    }
    if (route === "projects/comotion/") {
      assert.match(main, /<video\b[^>]*\bcontrols\b/);
      assert.ok(main.includes('src="' + basePath + '/videos/comotion-final.mp4"'));
      assert.doesNotMatch(main, /motion-panel|motion-canvas/);
    }
    if (route === "") assert.ok(!main.includes('href="' + prefix + 'projects/sandtouch/"'));
    if (route === "research/" || route === "publications/") {
      assert.ok(page.indexOf('id="directions"') >= 0 && page.indexOf('id="directions"') < page.indexOf('id="papers"'));
      const firstPaper = (page.match(/id="papers"[\s\S]*?<li\b[^>]*>([\s\S]*?)<\/li>/)?.[1] ?? "").replaceAll("<!-- -->", "");
      assert.match(firstPaper, /<h3 lang="en">TraceMotion:/);
      assert.match(firstPaper, /CCF A[\s\S]*?CHI <time dateTime="2027">2027<\/time>/);
      assert.match(firstPaper, locale === "zh" ? /第一作者[\s\S]*?大修中🙏🙏🙏/ : /First author[\s\S]*?Major Revision 🙏🙏🙏/);
      assert.equal([...page.matchAll(/<h3 lang="en">TraceMotion:/g)].length, 1);
      assert.match(firstPaper, locale === "zh" ? /用手写笔辅助改写动作提示词，并细调生成动作的对应片段。/ : /Stylus input helps users rewrite a motion prompt and refine the corresponding part of the generated motion\./);
      const traceMotionImage = preview ? "data:image/webp;base64," : basePath + "/papers/tracemotion.webp";
      assert.ok(firstPaper.includes('src="' + traceMotionImage));
      assert.doesNotMatch(firstPaper, /href="https:\/\/doi\.org|href="[^"]*\/projects\//);
      assert.ok(main.includes('href="' + prefix + 'projects/comotion/"'));
      assert.ok(!main.includes('href="' + prefix + 'projects/sandtouch/"'));
      assert.ok(!main.includes('href="https://doi.org/10.3390/math12101434"'));
      for (const doi of ["10.1145/3706598.3714275", "10.1109/JIOT.2025.3553561"]) {
        assert.ok(main.includes('href="https://doi.org/' + doi + '"'));
      }
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
  assert.equal([...sitemap.matchAll(/<loc>/g)].length, (primary.length + details.length) * locales.length);
  assert.doesNotMatch(sitemap, /\/(?:publications|experience|contact)\//);
}
assert.ok((await readFile(out("social-card.png"))).length > 0);
const videoSize = (await stat(out("videos/comotion-final.mp4"))).size;
assert.ok(videoSize > 0 && videoSize < 100 * 1024 ** 2);
console.log("Verified " + (routes.length * locales.length + 1) + " exported pages, localized links, and metadata assets.");
