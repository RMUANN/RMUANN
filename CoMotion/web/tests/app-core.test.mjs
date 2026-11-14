import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGenerationPayload,
  clampActionValue,
  normalizeActions,
  resolveMediaUrl,
  resultSlotForJobKind,
} from "../assets/app-core.mjs";

test("normalizeActions keeps the first six named actions and numeric scores", () => {
  const actions = normalizeActions([
    { name: "walk", score: 0.91 },
    { name: "turn", score: "0.52" },
    { name: "bad" },
    { score: 0.2 },
    { name: "jump", score: 0.4 },
    { name: "run", score: 0.3 },
    { name: "kick", score: 0.2 },
    { name: "wave", score: 0.1 },
    { name: "skip", score: 0.05 },
  ]);

  assert.deepEqual(actions, [
    { name: "walk", score: 0.91 },
    { name: "turn", score: 0.52 },
    { name: "bad", score: null },
    { name: "jump", score: 0.4 },
    { name: "run", score: 0.3 },
    { name: "kick", score: 0.2 },
  ]);
});

test("clampActionValue returns a whole-number slider value between zero and five", () => {
  assert.equal(clampActionValue("-2"), 0);
  assert.equal(clampActionValue("2.8"), 3);
  assert.equal(clampActionValue(7), 5);
  assert.equal(clampActionValue("not a number"), 0);
});

test("buildGenerationPayload includes every visible action with clamped counts", () => {
  const payload = buildGenerationPayload(
    [
      { name: "walk" },
      { name: "turn" },
      { name: "jump" },
    ],
    { walk: 2, turn: "6", jump: "" },
  );

  assert.deepEqual(payload, {
    action_counts: {
      walk: 2,
      turn: 5,
      jump: 0,
    },
  });
});

test("resultSlotForJobKind maps API job kinds to the intended preview panel", () => {
  assert.equal(resultSlotForJobKind("init"), "baseline");
  assert.equal(resultSlotForJobKind("generation"), "current");
  assert.equal(resultSlotForJobKind("anything-else"), "current");
});

test("resolveMediaUrl keeps absolute URLs and resolves same-origin media paths", () => {
  assert.equal(resolveMediaUrl("https://cdn.example/a.mp4"), "https://cdn.example/a.mp4");
  assert.equal(resolveMediaUrl("/media/a.mp4", "https://comotion.rmuann.win/app/"), "https://comotion.rmuann.win/media/a.mp4");
});
