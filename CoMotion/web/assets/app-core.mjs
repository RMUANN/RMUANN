const MAX_ACTIONS = 6;
const MIN_COUNT = 0;
const MAX_COUNT = 5;

export function normalizeActions(actions) {
  if (!Array.isArray(actions)) return [];

  return actions
    .filter((action) => action && typeof action.name === "string" && action.name.trim())
    .slice(0, MAX_ACTIONS)
    .map((action) => {
      const score = Number(action.score);
      return {
        name: action.name.trim(),
        score: Number.isFinite(score) ? score : null,
      };
    });
}

export function clampActionValue(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return MIN_COUNT;
  return Math.min(MAX_COUNT, Math.max(MIN_COUNT, Math.round(number)));
}

export function buildGenerationPayload(actions, values) {
  const action_counts = {};

  for (const action of normalizeActions(actions)) {
    action_counts[action.name] = clampActionValue(values?.[action.name] ?? 0);
  }

  return { action_counts };
}

export function resultSlotForJobKind(kind) {
  return kind === "init" || kind === "session" || kind === "baseline" ? "baseline" : "current";
}

export function isTerminalJobStatus(status) {
  return ["succeeded", "success", "completed", "complete", "failed", "error", "cancelled"].includes(
    String(status || "").toLowerCase(),
  );
}

export function isSuccessfulJobStatus(status) {
  return ["succeeded", "success", "completed", "complete"].includes(String(status || "").toLowerCase());
}

export function isFailedJobStatus(status) {
  return ["failed", "error", "cancelled"].includes(String(status || "").toLowerCase());
}

export function resolveMediaUrl(url, base = globalThis.location?.href) {
  if (!url) return "";
  if (!base) return url;
  return new URL(url, base).href;
}

export function formatScore(score) {
  return Number.isFinite(score) ? score.toFixed(2) : "--";
}

export function statusLabel(job) {
  const status = String(job?.status || "queued").toLowerCase();
  const queuePosition = Number(job?.queue_position);

  if (status === "queued" || status === "pending") {
    return Number.isFinite(queuePosition) && queuePosition > 0
      ? `Queued #${queuePosition}`
      : "Queued";
  }

  if (status === "running" || status === "processing") return "Running";
  if (isSuccessfulJobStatus(status)) return "Ready";
  if (isFailedJobStatus(status)) return "Error";
  return status ? status[0].toUpperCase() + status.slice(1) : "Queued";
}
