import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const pages = ["", "about/", "research/", "projects/", "publications/", "experience/", "contact/"];
const details = ["comotion", "sandtouch", "agent-intent-routing", "go-backend-services"];
const routes = pages.concat(details.map((slug) => "projects/" + slug + "/"));
const locales = ["en", "zh"];
const basePath = process.env.SITE_BASE_PATH || "";

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
  }
}

const out = (path) => new URL("../out/" + path, import.meta.url);
assert.match(await readFile(out("robots.txt"), "utf8"), /User-Agent: \*/i);
const sitemap = await readFile(out("sitemap.xml"), "utf8");
if (sitemap.includes("<loc>")) {
  assert.equal([...sitemap.matchAll(/<loc>/g)].length, routes.length * locales.length);
}
assert.ok((await readFile(out("social-card.png"))).length > 0);
console.log("Verified " + (routes.length * locales.length + 1) + " exported pages, localized links, and metadata assets.");
