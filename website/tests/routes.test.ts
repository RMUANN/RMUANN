import { strict as assert } from "node:assert";
import { test } from "node:test";
import { pageHref, alternateLocale, isPageKey } from "../lib/routes.ts";

test("the language switch can preserve a project detail", () => {
  assert.equal(pageHref(alternateLocale("en"), "projects", "comotion"), "/zh/projects/comotion/");
  assert.equal(pageHref(alternateLocale("zh"), "projects", "sandtouch"), "/en/projects/sandtouch/");
});

test("navigation uses supported localized paths", () => {
  assert.equal(pageHref("en"), "/en/");
  assert.equal(pageHref("zh", "research"), "/zh/research/");
  assert.equal(isPageKey("contact"), true);
  assert.equal(isPageKey("missing"), false);
});
