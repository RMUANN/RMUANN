import { strict as assert } from "node:assert";
import { test } from "node:test";
import { alternateLocale, canonicalPage, isPageKey, legacyAboutHref, navigationHref, navigationKeys, navigationPage, pageHref } from "../lib/routes.ts";

test("the language switch can preserve a project detail", () => {
  assert.equal(pageHref(alternateLocale("en"), "projects", "comotion"), "/zh/projects/comotion/");
  assert.equal(pageHref(alternateLocale("zh"), "projects", "sandtouch"), "/en/projects/sandtouch/");
});

test("primary navigation shows four localized destinations", () => {
  assert.deepEqual(navigationKeys, ["home", "research", "projects", "about"]);
  assert.deepEqual(navigationKeys.map((key) => navigationHref("en", key)), ["/en/", "/en/research/", "/en/projects/", "/en/about/"]);
  assert.deepEqual(navigationKeys.map((key) => navigationHref("zh", key)), ["/zh/", "/zh/research/", "/zh/projects/", "/zh/about/"]);
});

test("project details activate their parent navigation section", () => {
  assert.equal(navigationPage(), "home");
  assert.equal(navigationPage("research"), "research");
  assert.equal(navigationPage("projects", "comotion"), "research");
  assert.equal(navigationPage("projects", "sandtouch"), "research");
  assert.equal(navigationPage("projects", "agent-intent-routing"), "projects");
  assert.equal(navigationPage("projects", "go-backend-services"), "projects");
  assert.equal(navigationPage("about"), "about");
});

test("legacy routes resolve to localized About anchors with a shared canonical page", () => {
  assert.equal(isPageKey("experience"), true);
  assert.equal(isPageKey("contact"), true);
  assert.equal(isPageKey("missing"), false);
  assert.equal(legacyAboutHref("en", "contact"), "/en/about/#contact");
  assert.equal(legacyAboutHref("zh", "contact"), "/zh/about/#contact");
  assert.equal(legacyAboutHref("en", "experience"), "/en/about/#background");
  assert.equal(legacyAboutHref("zh", "experience"), "/zh/about/#background");
  assert.equal(legacyAboutHref("en", "about"), undefined);
  assert.equal(canonicalPage("contact"), "about");
  assert.equal(canonicalPage("experience"), "about");
  assert.equal(canonicalPage("publications"), "research");
});
