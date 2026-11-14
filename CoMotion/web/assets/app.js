import {
  buildGenerationPayload,
  clampActionValue,
  formatScore,
  isFailedJobStatus,
  isSuccessfulJobStatus,
  isTerminalJobStatus,
  normalizeActions,
  resolveMediaUrl,
  resultSlotForJobKind,
  statusLabel,
} from "./app-core.mjs";

const POLL_INTERVAL_MS = 1800;

const state = {
  sessionId: "",
  actions: [],
  actionValues: {},
  lastPrompt: "",
  inFlightJobs: new Map(),
  slots: {
    baseline: { title: "Baseline", mp4Url: "", npyUrl: "", status: "Waiting for prompt" },
    current: { title: "Current", mp4Url: "", npyUrl: "", status: "Waiting for tuning" },
    saved: { title: "Saved", mp4Url: "", npyUrl: "", status: "Nothing saved" },
  },
};

const dom = {
  prompt: document.querySelector("#promptInput"),
  initButton: document.querySelector("#initButton"),
  generateButton: document.querySelector("#generateButton"),
  retryButton: document.querySelector("#retryButton"),
  saveButton: document.querySelector("#saveButton"),
  statusText: document.querySelector("#statusText"),
  sessionText: document.querySelector("#sessionText"),
  actionGrid: document.querySelector("#actionGrid"),
  panels: {
    baseline: document.querySelector('[data-slot="baseline"]'),
    current: document.querySelector('[data-slot="current"]'),
    saved: document.querySelector('[data-slot="saved"]'),
  },
};

function setStatus(text, tone = "idle") {
  dom.statusText.textContent = text;
  dom.statusText.dataset.tone = tone;
}

function setBusy(isBusy) {
  dom.initButton.disabled = isBusy;
  dom.generateButton.disabled = isBusy || state.actions.length === 0;
  dom.retryButton.disabled = isBusy || !state.lastPrompt;
  dom.saveButton.disabled = !state.slots.current.mp4Url;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `${response.status} ${response.statusText}`);
  }

  return response.json();
}

function renderActions() {
  dom.actionGrid.replaceChildren();

  const actions = state.actions.length
    ? state.actions
    : Array.from({ length: 6 }, (_, index) => ({ name: "---", score: null, disabled: true, key: `empty-${index}` }));

  for (const action of actions) {
    const value = clampActionValue(state.actionValues[action.name] ?? 0);
    const slot = document.createElement("section");
    slot.className = "action-slot";
    slot.dataset.disabled = action.disabled ? "true" : "false";

    const header = document.createElement("div");
    header.className = "action-slot__header";

    const name = document.createElement("div");
    name.className = "action-slot__name";
    name.textContent = action.name;

    const score = document.createElement("div");
    score.className = "action-slot__score";
    score.textContent = action.disabled ? "--" : formatScore(action.score);

    const controls = document.createElement("div");
    controls.className = "action-slot__controls";

    const range = document.createElement("input");
    range.type = "range";
    range.min = "0";
    range.max = "5";
    range.step = "1";
    range.value = String(value);
    range.disabled = Boolean(action.disabled);
    range.setAttribute("aria-label", `${action.name} count`);

    const count = document.createElement("input");
    count.type = "number";
    count.min = "0";
    count.max = "5";
    count.step = "1";
    count.value = String(value);
    count.disabled = Boolean(action.disabled);
    count.setAttribute("aria-label", `${action.name} exact count`);

    const syncValue = (nextValue) => {
      const clamped = clampActionValue(nextValue);
      state.actionValues[action.name] = clamped;
      range.value = String(clamped);
      count.value = String(clamped);
    };

    range.addEventListener("input", () => syncValue(range.value));
    count.addEventListener("input", () => syncValue(count.value));
    count.addEventListener("blur", () => syncValue(count.value));

    header.append(name, score);
    controls.append(range, count);
    slot.append(header, controls);
    dom.actionGrid.append(slot);
  }
}

function updateVideo(panel, slot) {
  const video = panel.querySelector("video");
  const empty = panel.querySelector(".result-empty");
  const download = panel.querySelector(".download-link");
  const npy = panel.querySelector(".npy-link");

  if (slot.mp4Url) {
    video.src = slot.mp4Url;
    video.hidden = false;
    empty.hidden = true;
    download.href = slot.mp4Url;
    download.removeAttribute("aria-disabled");
  } else {
    video.removeAttribute("src");
    video.load();
    video.hidden = true;
    empty.hidden = false;
    download.removeAttribute("href");
    download.setAttribute("aria-disabled", "true");
  }

  if (slot.npyUrl) {
    npy.href = slot.npyUrl;
    npy.hidden = false;
  } else {
    npy.hidden = true;
    npy.removeAttribute("href");
  }
}

function renderResults() {
  for (const [key, slot] of Object.entries(state.slots)) {
    const panel = dom.panels[key];
    panel.querySelector(".result-card__status").textContent = slot.status;
    panel.dataset.state = slot.tone || "idle";
    updateVideo(panel, slot);
  }
  dom.saveButton.disabled = !state.slots.current.mp4Url;
}

function renderSession() {
  dom.sessionText.textContent = state.sessionId ? `Session ${state.sessionId}` : "No active session";
}

function applyJobToSlot(job) {
  const slotName = resultSlotForJobKind(job.kind);
  const slot = state.slots[slotName];
  slot.status = statusLabel(job);
  slot.tone = isFailedJobStatus(job.status) ? "error" : isSuccessfulJobStatus(job.status) ? "ready" : "busy";

  if (job.mp4_url) slot.mp4Url = resolveMediaUrl(job.mp4_url);
  if (job.npy_url) slot.npyUrl = resolveMediaUrl(job.npy_url);
  if (job.error) slot.status = `Error: ${job.error}`;

  if (Array.isArray(job.actions) && job.actions.length) {
    state.actions = normalizeActions(job.actions);
    state.actionValues = Object.fromEntries(state.actions.map((action) => [action.name, 0]));
    renderActions();
  }

  renderResults();
}

async function pollJob(jobId) {
  state.inFlightJobs.set(jobId, true);
  setBusy(true);

  try {
    while (state.inFlightJobs.has(jobId)) {
      const job = await requestJson(`/api/jobs/${encodeURIComponent(jobId)}`, { method: "GET" });
      applyJobToSlot(job);
      setStatus(`${statusLabel(job)}: ${job.kind || "job"} ${job.job_id || jobId}`, isFailedJobStatus(job.status) ? "error" : "busy");

      if (isTerminalJobStatus(job.status)) {
        state.inFlightJobs.delete(jobId);
        if (isSuccessfulJobStatus(job.status)) {
          setStatus(job.kind === "init" ? "Baseline ready. Tune the semantic actions." : "Current result ready.", "ready");
        } else {
          setStatus(job.error || "Generation failed. You can retry.", "error");
        }
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  } catch (error) {
    state.inFlightJobs.delete(jobId);
    const message = error instanceof Error ? error.message : String(error);
    setStatus(message, "error");
    const slot = state.slots.current;
    slot.status = `Error: ${message}`;
    slot.tone = "error";
    renderResults();
  } finally {
    setBusy(state.inFlightJobs.size > 0);
  }
}

async function initializeSession() {
  if (dom.initButton.disabled) return;
  const prompt = dom.prompt.value.trim();
  if (!prompt) {
    setStatus("Enter a prompt first.", "error");
    dom.prompt.focus();
    return;
  }

  state.lastPrompt = prompt;
  state.actions = [];
  state.actionValues = {};
  state.slots.baseline = { title: "Baseline", mp4Url: "", npyUrl: "", status: "Queued", tone: "busy" };
  state.slots.current = { title: "Current", mp4Url: "", npyUrl: "", status: "Waiting for tuning", tone: "idle" };
  renderActions();
  renderResults();
  setStatus("Submitting prompt...", "busy");
  setBusy(true);

  try {
    const data = await requestJson("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ prompt }),
    });
    state.sessionId = data.session_id;
    renderSession();
    await pollJob(data.job_id);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), "error");
    setBusy(false);
  }
}

async function generateCurrent() {
  if (!state.sessionId) {
    setStatus("Initialize a prompt before generating.", "error");
    return;
  }

  const payload = buildGenerationPayload(state.actions, state.actionValues);
  state.slots.current = { title: "Current", mp4Url: "", npyUrl: "", status: "Queued", tone: "busy" };
  renderResults();
  setStatus("Submitting tuned action counts...", "busy");
  setBusy(true);

  try {
    const data = await requestJson(`/api/sessions/${encodeURIComponent(state.sessionId)}/generations`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await pollJob(data.job_id);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), "error");
    setBusy(false);
  }
}

function saveCurrent() {
  if (!state.slots.current.mp4Url) return;
  state.slots.saved = {
    ...state.slots.current,
    title: "Saved",
    status: "Saved from Current",
    tone: "ready",
  };
  setStatus("Current result saved to the third panel.", "ready");
  renderResults();
}

dom.initButton.addEventListener("click", initializeSession);
dom.generateButton.addEventListener("click", generateCurrent);
dom.retryButton.addEventListener("click", () => {
  if (!state.lastPrompt) return;
  dom.prompt.value = state.lastPrompt;
  initializeSession();
});
dom.saveButton.addEventListener("click", saveCurrent);
dom.prompt.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") initializeSession();
});
renderActions();
renderResults();
renderSession();
setBusy(false);
