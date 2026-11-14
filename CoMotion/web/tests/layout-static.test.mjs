import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../assets/styles.css", import.meta.url), "utf8");

test("page uses the confirmed vertical title, prompt, controls, and video order", () => {
  const top = html.indexOf('class="top-bar"');
  const prompt = html.indexOf('class="prompt-band"');
  const workspace = html.indexOf('class="workspace-grid"');
  const controls = html.indexOf('class="control-panel"');
  const results = html.indexOf('class="results-panel"');

  assert.ok(top >= 0, "top bar exists");
  assert.ok(prompt > top, "prompt band follows title/status");
  assert.ok(workspace > prompt, "workspace follows prompt");
  assert.ok(controls > workspace, "controls are first inside workspace");
  assert.ok(results > controls, "results follow controls");
});

test("public page offers Analyze and Generate without an access code field", () => {
  assert.doesNotMatch(html, /id="accessCodeInput"/);
  assert.match(html, /id="initButton"/);
  assert.match(html, /id="generateButton"/);
});

test("desktop layout preserves the approved 7/11/22/60 vertical proportions", () => {
  assert.match(
    css,
    /grid-template-rows:\s*minmax\(50px,\s*7fr\)\s*minmax\(78px,\s*11fr\)\s*minmax\(510px,\s*82fr\)/,
  );
  assert.match(css, /\.workspace-grid\s*\{[^}]*grid-template-rows:\s*minmax\(0,\s*22fr\)\s*minmax\(0,\s*60fr\)/s);
});

test("controls stay as compact two-column by three-row action sliders", () => {
  assert.match(css, /\.action-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(css, /\.action-grid\s*\{[^}]*grid-template-rows:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s);
});

test("result previews remain three large horizontal panels on desktop", () => {
  assert.match(css, /\.result-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(css, /\.video-frame\s*\{[^}]*min-height:\s*0/s);
});
