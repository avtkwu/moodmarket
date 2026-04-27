const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const storeKey = "moodmarket.store.v2";
const oldReflectionKey = "moodmarket.reflections";

const routes = ["mirror", "library", "patterns", "protocols"];
const app = {
  route: "mirror",
  editingId: null,
  libraryFilter: "all",
  librarySearch: ""
};

const defaultDraft = {
  itemName: "Limited-edition running shoes",
  price: 185,
  category: "clothing",
  url: "",
  channel: "social_feed",
  window: "now",
  context: ["scrolling", "boredom", "reward", "comparison", "scarcity"],
  stress: 38,
  boredom: 72,
  envy: 64,
  excitement: 81,
  certainty: 44,
  budgetFit: 36,
  text: {
    problem: "Motivation and a sense of freshness at the gym.",
    tomorrow: "I would feel more put together, but I do not need them for training this week.",
    visibility: "I might want them less if nobody saw them.",
    alternative: "Use the shoes I already have, plan three runs, and revisit after that."
  }
};

const defaultSettings = {
  monthlyLimit: 450,
  coolingHours: 24,
  maxBuyRisk: 55,
  reviewPrice: 150,
  values: "calm, autonomy, financial slack, fewer better things",
  noFeedBuy: true,
  requireAlternative: true,
  oneInOneOut: true,
  coolHighRisk: true
};

const signalCopy = {
  need: {
    title: "Need Signal",
    text: "Concrete utility, replacement pressure, and tomorrow-use clarity.",
    color: "#4dd6c6"
  },
  emotion: {
    title: "Emotional Heat",
    text: "Stress, boredom, reward seeking, and charged excitement.",
    color: "#ef6a52"
  },
  identity: {
    title: "Identity Echo",
    text: "The wish to be seen as a certain version of yourself.",
    color: "#a783a8"
  },
  pressure: {
    title: "External Pressure",
    text: "Feed exposure, scarcity, urgency, and social comparison.",
    color: "#e1b647"
  },
  budget: {
    title: "Budget Friction",
    text: "Price pressure against your discretionary protocol.",
    color: "#8ea4a0"
  },
  grounding: {
    title: "Grounding",
    text: "How much desire remains after visibility and urgency are removed.",
    color: "#94a66d"
  }
};

const labels = {
  social_feed: "Social feed",
  marketplace_search: "Search",
  sale_page: "Sale page",
  influencer_email: "Influencer/email",
  friend_recommendation: "Friend",
  physical_store: "Store",
  clothing: "Clothing",
  tech: "Tech",
  home: "Home",
  beauty: "Beauty",
  travel: "Travel",
  wellness: "Wellness",
  other: "Other",
  scrolling: "Scrolling",
  stress: "Stress",
  boredom: "Boredom",
  reward: "Reward",
  comparison: "Comparison",
  identity: "Identity",
  scarcity: "Scarcity",
  replacement: "Replacement",
  watching: "Watching",
  cooling: "Cooling",
  passed: "Passed",
  bought: "Bought"
};

let store = loadStore();

const form = $("#mirror-form");
const settingsForm = $("#settings-form");

function loadStore() {
  const fallback = {
    version: 2,
    records: migrateOldRecords(),
    settings: { ...defaultSettings },
    draft: structuredClone(defaultDraft)
  };

  try {
    const saved = JSON.parse(localStorage.getItem(storeKey) || "null");
    if (!saved) return fallback;
    return {
      version: 2,
      records: Array.isArray(saved.records) ? saved.records : [],
      settings: { ...defaultSettings, ...(saved.settings || {}) },
      draft: normalizeDraft(saved.draft || defaultDraft)
    };
  } catch {
    return fallback;
  }
}

function migrateOldRecords() {
  try {
    const old = JSON.parse(localStorage.getItem(oldReflectionKey) || "[]");
    if (!Array.isArray(old)) return [];
    return old.slice(0, 6).map((entry) => ({
      id: entry.id || makeId(),
      status: "watching",
      createdAt: entry.createdAt || new Date().toISOString(),
      updatedAt: entry.createdAt || new Date().toISOString(),
      cooldownUntil: null,
      draft: {
        ...structuredClone(defaultDraft),
        itemName: entry.itemName || "Imported object",
        price: Number(entry.price || 0)
      },
      analysis: {
        risk: Number(entry.risk || 0),
        confidence: 50,
        scores: {},
        verdict: {
          title: entry.verdict || "Imported reflection",
          label: entry.move || "Review",
          detail: "Imported from an earlier MoodMarket session.",
          move: entry.move || "Review",
          copy: "Open this record and run the current mirror."
        },
        dominant: "pressure",
        guardrails: []
      }
    }));
  } catch {
    return [];
  }
}

function persist() {
  localStorage.setItem(storeKey, JSON.stringify(store));
}

function normalizeDraft(draft) {
  const merged = {
    ...structuredClone(defaultDraft),
    ...(draft || {}),
    text: {
      ...defaultDraft.text,
      ...((draft && draft.text) || {})
    }
  };

  merged.price = Number(merged.price || 0);
  merged.context = Array.isArray(merged.context) ? merged.context : [];
  ["stress", "boredom", "envy", "excitement", "certainty", "budgetFit"].forEach((key) => {
    merged[key] = clamp(Number(merged[key] || 0));
  });
  return merged;
}

function makeId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `mm-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function formatMoney(value) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return entities[char];
  });
}

function setRoute(route, push = true) {
  app.route = routes.includes(route) ? route : "mirror";
  $$(".route-view").forEach((view) => {
    view.hidden = view.dataset.route !== app.route;
  });
  $$("[data-route-link]").forEach((link) => {
    const active = link.dataset.routeLink === app.route;
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  if (push && location.hash.replace("#", "") !== app.route) {
    location.hash = app.route;
  }
  renderAll();
}

function fillForm(draft) {
  const state = normalizeDraft(draft);
  Object.entries({
    itemName: state.itemName,
    price: state.price,
    category: state.category,
    url: state.url,
    channel: state.channel,
    window: state.window,
    stress: state.stress,
    boredom: state.boredom,
    envy: state.envy,
    excitement: state.excitement,
    certainty: state.certainty,
    budgetFit: state.budgetFit,
    problem: state.text.problem,
    tomorrow: state.text.tomorrow,
    visibility: state.text.visibility,
    alternative: state.text.alternative
  }).forEach(([name, value]) => {
    const field = form.elements[name];
    if (field) field.value = value;
  });

  $$('input[name="context"]', form).forEach((input) => {
    input.checked = state.context.includes(input.value);
  });
  updateRangeOutputs();
}

function readDraft() {
  const data = new FormData(form);
  return normalizeDraft({
    itemName: String(data.get("itemName") || "").trim() || "Untitled object",
    price: Number(data.get("price") || 0),
    category: String(data.get("category") || "other"),
    url: String(data.get("url") || "").trim(),
    channel: String(data.get("channel") || "marketplace_search"),
    window: String(data.get("window") || "later"),
    context: $$('input[name="context"]:checked', form).map((input) => input.value),
    stress: Number(data.get("stress") || 0),
    boredom: Number(data.get("boredom") || 0),
    envy: Number(data.get("envy") || 0),
    excitement: Number(data.get("excitement") || 0),
    certainty: Number(data.get("certainty") || 0),
    budgetFit: Number(data.get("budgetFit") || 0),
    text: {
      problem: String(data.get("problem") || ""),
      tomorrow: String(data.get("tomorrow") || ""),
      visibility: String(data.get("visibility") || ""),
      alternative: String(data.get("alternative") || "")
    }
  });
}

function containsAny(value, words) {
  const haystack = String(value || "").toLowerCase();
  return words.some((word) => haystack.includes(word));
}

function contextScore(context, weights) {
  return context.reduce((score, key) => score + (weights[key] || 0), 0);
}

function analyze(draft) {
  const state = normalizeDraft(draft);
  const settings = store.settings;
  const allText = `${state.text.problem} ${state.text.tomorrow} ${state.text.visibility} ${state.text.alternative}`;
  const compressedLength = allText.replace(/\s/g, "").length;
  const textDepth = clamp((compressedLength / 360) * 100);
  const concreteNeed = containsAny(allText, [
    "replace",
    "broken",
    "work",
    "daily",
    "health",
    "training",
    "repair",
    "essential",
    "need",
    "use",
    "specific"
  ]);
  const admitsVisibility = containsAny(allText, [
    "notice",
    "noticed",
    "seen",
    "posted",
    "impress",
    "status",
    "people",
    "compliment"
  ]);
  const admitsDelay = containsAny(allText, ["not need", "less", "later", "wait", "week", "maybe", "revisit"]);
  const hasAlternative = state.text.alternative.trim().length > 18;
  const priceRatio = settings.monthlyLimit > 0 ? state.price / settings.monthlyLimit : 0;

  const channelPressure = {
    social_feed: 26,
    influencer_email: 22,
    sale_page: 23,
    friend_recommendation: 15,
    physical_store: 9,
    marketplace_search: 5
  }[state.channel] || 8;

  const windowPressure = {
    now: 24,
    today: 15,
    week: 7,
    later: 0
  }[state.window] || 0;

  const emotion = clamp(
    state.stress * 0.21 +
      state.boredom * 0.22 +
      state.envy * 0.2 +
      state.excitement * 0.24 +
      (100 - state.certainty) * 0.16 +
      contextScore(state.context, { stress: 14, boredom: 14, reward: 16, comparison: 8 })
  );

  const pressure = clamp(
    channelPressure +
      windowPressure +
      contextScore(state.context, { scrolling: 18, scarcity: 21, comparison: 16, identity: 7 }) +
      (state.price > settings.reviewPrice ? 8 : 0)
  );

  const identity = clamp(
    state.envy * 0.38 +
      state.excitement * 0.16 +
      contextScore(state.context, { comparison: 23, identity: 28, scrolling: 7 }) +
      (state.category === "clothing" || state.category === "beauty" ? 8 : 0) +
      (admitsVisibility ? 18 : 0)
  );

  const need = clamp(
    18 +
      state.certainty * 0.34 +
      state.budgetFit * 0.12 +
      (concreteNeed ? 24 : 0) +
      (hasAlternative ? 8 : 0) +
      contextScore(state.context, { replacement: 26 }) +
      textDepth * 0.12 -
      (admitsDelay ? 9 : 0) -
      contextScore(state.context, { scarcity: 7, comparison: 5 })
  );

  const budget = clamp(
    priceRatio * 82 +
      (100 - state.budgetFit) * 0.48 +
      (state.price > settings.reviewPrice ? 12 : 0) -
      state.certainty * 0.08
  );

  const grounding = clamp(
    20 +
      textDepth * 0.28 +
      state.certainty * 0.25 +
      state.budgetFit * 0.13 +
      (hasAlternative ? 12 : 0) +
      (admitsDelay ? 6 : 0) -
      (admitsVisibility ? 19 : 0) -
      (state.window === "now" ? 9 : 0) -
      (state.context.includes("scrolling") ? 6 : 0)
  );

  const baseRisk = clamp(
    emotion * 0.27 +
      pressure * 0.23 +
      identity * 0.19 +
      budget * 0.15 +
      (100 - need) * 0.1 +
      (100 - grounding) * 0.08
  );

  const guardrails = evaluateGuardrails(state, { need, emotion, identity, pressure, budget, grounding }, baseRisk);
  const guardrailLoad = guardrails.reduce((total, item) => total + item.weight, 0);
  const risk = clamp(baseRisk + guardrailLoad);
  const confidence = clamp(44 + textDepth * 0.18 + state.context.length * 3.2 + Math.abs(state.certainty - 50) * 0.16);
  const scores = { need, emotion, identity, pressure, budget, grounding };
  const dominant = findDominantSignal(scores);

  return {
    scores,
    risk,
    confidence,
    dominant,
    guardrails,
    verdict: createVerdict(state, scores, risk, guardrails)
  };
}

function evaluateGuardrails(state, scores, risk) {
  const settings = store.settings;
  const hits = [];

  if (settings.noFeedBuy && ["social_feed", "influencer_email"].includes(state.channel)) {
    hits.push({
      title: "Feed-origin stop",
      detail: "Move the decision out of the discovery channel before buying.",
      severity: "high",
      weight: 7
    });
  }

  if (settings.requireAlternative && state.text.alternative.trim().length < 18) {
    hits.push({
      title: "No clean alternative",
      detail: "Write one non-purchase substitute before deciding.",
      severity: "medium",
      weight: 5
    });
  }

  if (settings.oneInOneOut && ["clothing", "tech", "home", "beauty"].includes(state.category) && !state.context.includes("replacement")) {
    hits.push({
      title: "Repeat category",
      detail: "Choose what leaves your life if this object enters it.",
      severity: "medium",
      weight: 4
    });
  }

  if (state.price >= settings.reviewPrice && settings.reviewPrice > 0) {
    hits.push({
      title: "High-price review",
      detail: `${formatMoney(state.price)} is above your review threshold.`,
      severity: "medium",
      weight: 5
    });
  }

  if (risk > settings.maxBuyRisk) {
    hits.push({
      title: "Risk ceiling exceeded",
      detail: `Current risk is above your maximum buy risk of ${settings.maxBuyRisk}.`,
      severity: "high",
      weight: 8
    });
  }

  if (settings.coolHighRisk && (scores.emotion > 74 || scores.pressure > 72)) {
    hits.push({
      title: "Auto-cool trigger",
      detail: "High heat or external pressure activates a cooldown protocol.",
      severity: "high",
      weight: 6
    });
  }

  return hits;
}

function findDominantSignal(scores) {
  return Object.entries(scores)
    .sort((a, b) => {
      const adjustedA = ["need", "grounding"].includes(a[0]) ? 100 - a[1] : a[1];
      const adjustedB = ["need", "grounding"].includes(b[0]) ? 100 - b[1] : b[1];
      return adjustedB - adjustedA;
    })[0][0];
}

function createVerdict(state, scores, risk, guardrails) {
  const hardStop = guardrails.some((item) => item.severity === "high");

  if (scores.need > 74 && risk < 44 && scores.grounding > 62) {
    return {
      title: "Aligned purchase",
      label: "The want has a practical center.",
      detail: "Utility, certainty, and grounding are stronger than pressure.",
      move: "Buy by protocol",
      copy: "Keep the price boundary and make the purchase outside the discovery channel."
    };
  }

  if (hardStop) {
    return {
      title: "Guardrail stop",
      label: "Do not buy from this state.",
      detail: "One or more personal protocols are active against the purchase.",
      move: "Start cooldown",
      copy: `Wait ${store.settings.coolingHours} hours, then revisit from the library.`
    };
  }

  if (scores.pressure > 72) {
    return {
      title: "Algorithm pressure",
      label: "The channel is louder than the need.",
      detail: "Urgency, scarcity, or feed exposure is doing meaningful work.",
      move: "Leave the channel",
      copy: "Save the link, close the source, and return through direct search."
    };
  }

  if (scores.identity > 70) {
    return {
      title: "Identity echo",
      label: "Separate the object from the audience.",
      detail: "The purchase is attached to being seen as a specific kind of person.",
      move: "Make it invisible",
      copy: "Imagine owning it with no compliments, photos, or status signal."
    };
  }

  if (scores.emotion > 72) {
    return {
      title: "Regulation buy",
      label: "Treat the feeling before the cart.",
      detail: "The object is carrying reward-seeking, boredom, or stress relief.",
      move: "Replace the relief",
      copy: "Do one regulating action and run the mirror again."
    };
  }

  if (scores.budget > 64) {
    return {
      title: "Budget friction",
      label: "The purchase taxes future slack.",
      detail: "Price pressure is high relative to the protocol you set.",
      move: "Downshift",
      copy: "Find a lower-cost path or wait until the next discretionary window."
    };
  }

  return {
    title: "Mixed signal",
    label: "The want is real, but noisy.",
    detail: "There is attraction here, plus enough heat to ask for cleaner evidence.",
    move: "Gather evidence",
    copy: "Define one condition that would make the purchase unquestionably useful."
  };
}

function renderMirror() {
  const draft = readDraft();
  store.draft = draft;
  persist();
  const analysis = analyze(draft);

  updateRangeOutputs();
  $("#readout-title").textContent = analysis.verdict.title;
  $("#confidence-value").textContent = analysis.confidence;
  $("#risk-score").textContent = analysis.risk;
  $("#verdict-label").textContent = analysis.verdict.label;
  $("#verdict-detail").textContent = analysis.verdict.detail;
  $("#next-move-title").textContent = analysis.verdict.move;
  $("#next-move-copy").textContent = analysis.verdict.copy;
  $("#result-code").textContent = `MM-${String(analysis.risk).padStart(3, "0")}-${analysis.dominant.slice(0, 3).toUpperCase()}`;

  const gaugeColor = analysis.risk > 72 ? "#ef6a52" : analysis.risk > 50 ? "#e1b647" : "#4dd6c6";
  $("#gauge").style.setProperty("--score", analysis.risk);
  $("#gauge").style.setProperty("--gauge-color", gaugeColor);

  $("#summary-risk").textContent = `Risk ${analysis.risk}`;
  $("#summary-action").textContent = analysis.verdict.move;
  $("#summary-budget").textContent = analysis.scores.budget > 64 ? "Budget friction" : "Budget viable";

  renderMetrics(analysis.scores);
  renderGuardrails(analysis.guardrails);
  return { draft, analysis };
}

function renderMetrics(scores) {
  $("#metric-list").innerHTML = Object.entries(scores)
    .map(([key, value]) => {
      const config = signalCopy[key];
      return `
        <div class="metric-row">
          <span>${config.title}</span>
          <span class="meter"><i style="--value: ${value}%; --bar-color: ${config.color}"></i></span>
          <strong>${value}</strong>
        </div>
      `;
    })
    .join("");
}

function renderGuardrails(guardrails) {
  $("#guardrail-summary").textContent = guardrails.length ? `${guardrails.length} active` : "No hard stops";
  $("#guardrail-list").innerHTML = guardrails.length
    ? guardrails
        .map(
          (item) => `
            <div class="guardrail-item">
              <b>${escapeHtml(item.title)}</b>
              <span>${escapeHtml(item.detail)}</span>
            </div>
          `
        )
        .join("")
    : `
        <div class="guardrail-item">
          <b>Protocol clear</b>
          <span>The current dossier does not trip a hard rule.</span>
        </div>
      `;
}

function updateRangeOutputs() {
  $$('input[type="range"]', form).forEach((range) => {
    const output = range.closest(".slider-row").querySelector("output");
    output.value = range.value;
    output.textContent = range.value;
  });
}

function saveRecord(status = "watching") {
  const { draft, analysis } = renderMirror();
  const now = new Date();
  const cooldownUntil = status === "cooling" ? new Date(now.getTime() + store.settings.coolingHours * 3600000).toISOString() : null;
  const existingIndex = app.editingId ? store.records.findIndex((record) => record.id === app.editingId) : -1;
  const record = {
    id: existingIndex >= 0 ? store.records[existingIndex].id : makeId(),
    status,
    createdAt: existingIndex >= 0 ? store.records[existingIndex].createdAt : now.toISOString(),
    updatedAt: now.toISOString(),
    cooldownUntil,
    draft,
    analysis
  };

  if (existingIndex >= 0) store.records[existingIndex] = record;
  else store.records.unshift(record);

  app.editingId = record.id;
  persist();
  renderAll();
  showToast(status === "cooling" ? "Cooldown started." : status === "passed" ? "Marked as passed." : "Reflection saved.");
}

function newDossier() {
  app.editingId = null;
  store.draft = structuredClone(defaultDraft);
  fillForm(store.draft);
  persist();
  renderAll();
  showToast("New dossier ready.");
}

function loadRecord(id) {
  const record = store.records.find((item) => item.id === id);
  if (!record) return;
  app.editingId = id;
  store.draft = normalizeDraft(record.draft);
  fillForm(store.draft);
  persist();
  setRoute("mirror");
  showToast("Record loaded.");
}

function updateRecordStatus(id, status) {
  const record = store.records.find((item) => item.id === id);
  if (!record) return;
  record.status = status;
  record.updatedAt = new Date().toISOString();
  record.cooldownUntil = status === "cooling" ? new Date(Date.now() + store.settings.coolingHours * 3600000).toISOString() : null;
  persist();
  renderAll();
  showToast(`Status set to ${labels[status]}.`);
}

function deleteRecord(id) {
  store.records = store.records.filter((item) => item.id !== id);
  if (app.editingId === id) app.editingId = null;
  persist();
  renderAll();
  showToast("Record deleted.");
}

function renderLibrary() {
  renderLibraryStats();
  const query = app.librarySearch.trim().toLowerCase();
  const filtered = store.records
    .filter((record) => {
      if (app.libraryFilter === "high" && record.analysis.risk < 70) return false;
      if (!["all", "high"].includes(app.libraryFilter) && record.status !== app.libraryFilter) return false;
      if (!query) return true;
      const text = `${record.draft.itemName} ${record.analysis.verdict.title} ${record.draft.category} ${record.draft.channel}`.toLowerCase();
      return text.includes(query);
    })
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  $("#record-list").innerHTML = filtered.length
    ? filtered.map(renderRecordCard).join("")
    : `<div class="empty-state">No records match this view. Run the mirror or change the filter.</div>`;
}

function renderLibraryStats() {
  const records = store.records;
  const activeCooling = records.filter((record) => record.status === "cooling" && !isCooldownDone(record)).length;
  const avoided = sum(records.filter((record) => record.status === "passed").map((record) => record.draft.price));
  const bought = sum(records.filter((record) => record.status === "bought").map((record) => record.draft.price));
  const avgRisk = records.length ? Math.round(sum(records.map((record) => record.analysis.risk)) / records.length) : 0;

  $("#library-stats").innerHTML = [
    statCard("Records", records.length, "saved decisions"),
    statCard("Average risk", avgRisk, "across library"),
    statCard("Active cooldowns", activeCooling, "waiting period"),
    statCard("Avoided spend", formatMoney(avoided), `${formatMoney(bought)} bought`)
  ].join("");
}

function renderRecordCard(record) {
  const cooldown = record.status === "cooling" && record.cooldownUntil ? cooldownText(record) : null;
  const source = `${labels[record.draft.category] || record.draft.category} - ${labels[record.draft.channel] || record.draft.channel}`;
  return `
    <article class="record-card" data-record-id="${record.id}">
      <div class="record-main">
        <div class="record-kicker">
          <span class="record-status" data-status="${record.status}">${labels[record.status] || record.status}</span>
          <span class="signal-pill">${source}</span>
          <span class="signal-pill">${formatMoney(record.draft.price)}</span>
          ${cooldown ? `<span class="signal-pill">${escapeHtml(cooldown)}</span>` : ""}
        </div>
        <h3>${escapeHtml(record.draft.itemName)}</h3>
        <p>${escapeHtml(record.analysis.verdict.title)}: ${escapeHtml(record.analysis.verdict.detail)}</p>
        <p>${escapeHtml(record.analysis.verdict.move)} - ${escapeHtml(record.analysis.verdict.copy)}</p>
      </div>
      <div class="record-actions">
        <span class="risk-token">${record.analysis.risk}</span>
        <button class="mini-button" type="button" data-action="load" data-id="${record.id}">Open</button>
        <button class="mini-button" type="button" data-action="cooling" data-id="${record.id}">Cool</button>
        <button class="mini-button" type="button" data-action="passed" data-id="${record.id}">Pass</button>
        <button class="mini-button" type="button" data-action="bought" data-id="${record.id}">Bought</button>
        <button class="mini-button" type="button" data-action="delete" data-id="${record.id}">Delete</button>
      </div>
    </article>
  `;
}

function isCooldownDone(record) {
  return record.cooldownUntil ? new Date(record.cooldownUntil).getTime() <= Date.now() : false;
}

function cooldownText(record) {
  if (!record.cooldownUntil) return "";
  const ms = new Date(record.cooldownUntil).getTime() - Date.now();
  if (ms <= 0) return "Cooldown done";
  const hours = Math.ceil(ms / 3600000);
  return `${hours}h left`;
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function statCard(label, value, note) {
  return `
    <div class="stat-card">
      <small>${escapeHtml(label)}</small>
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(note)}</span>
    </div>
  `;
}

function renderPatterns() {
  const records = store.records;
  $("#pattern-count").textContent = `${records.length} ${records.length === 1 ? "record" : "records"}`;

  if (!records.length) {
    $("#pattern-dominant").textContent = "No pattern yet";
    $("#pattern-stats").innerHTML = [
      statCard("Dominant trigger", "None", "save a record"),
      statCard("High-risk rate", "0%", "risk 70+"),
      statCard("Passed spend", formatMoney(0), "decisions avoided"),
      statCard("Bought spend", formatMoney(0), "marked bought")
    ].join("");
    $("#trigger-chart").innerHTML = `<div class="empty-state">No trigger data yet.</div>`;
    $("#signal-chart").innerHTML = `<div class="empty-state">No signal data yet.</div>`;
    $("#pattern-brief").innerHTML = `<p>Save decisions to build a personal pattern map.</p>`;
    return;
  }

  const triggerCounts = countValues(records.flatMap((record) => record.draft.context));
  const dominantTrigger = topEntry(triggerCounts);
  const highRiskRate = Math.round((records.filter((record) => record.analysis.risk >= 70).length / records.length) * 100);
  const passedSpend = sum(records.filter((record) => record.status === "passed").map((record) => record.draft.price));
  const boughtSpend = sum(records.filter((record) => record.status === "bought").map((record) => record.draft.price));
  const dominantSignalCounts = countValues(records.map((record) => record.analysis.dominant));
  const dominantSignal = topEntry(dominantSignalCounts);

  $("#pattern-dominant").textContent = dominantTrigger ? `${labels[dominantTrigger[0]] || dominantTrigger[0]} leads` : "Pattern forming";
  $("#pattern-stats").innerHTML = [
    statCard("Dominant trigger", dominantTrigger ? labels[dominantTrigger[0]] || dominantTrigger[0] : "None", "most frequent context"),
    statCard("High-risk rate", `${highRiskRate}%`, "risk 70+"),
    statCard("Passed spend", formatMoney(passedSpend), "decisions avoided"),
    statCard("Bought spend", formatMoney(boughtSpend), "marked bought")
  ].join("");

  renderBarChart("#trigger-chart", triggerCounts, labels, "#e1b647");
  renderBarChart("#signal-chart", averageSignals(records), signalCopy, "#4dd6c6");
  renderPatternBrief(records, dominantTrigger, dominantSignal, highRiskRate, passedSpend);
}

function renderBarChart(selector, data, labelMap, color) {
  const entries = Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const max = Math.max(1, ...entries.map((entry) => entry[1]));

  $(selector).innerHTML = entries.length
    ? entries
        .map(([key, value]) => {
          const label = typeof labelMap[key] === "object" ? labelMap[key].title : labelMap[key] || key;
          const width = clamp((value / max) * 100);
          return `
            <div class="bar-row">
              <span>${escapeHtml(label)}</span>
              <span class="light-meter"><i style="--value: ${width}%; --bar-color: ${color}"></i></span>
              <strong>${value}</strong>
            </div>
          `;
        })
        .join("")
    : `<div class="empty-state">No data yet.</div>`;
}

function renderPatternBrief(records, dominantTrigger, dominantSignal, highRiskRate, passedSpend) {
  const latest = records[0];
  const leadTrigger = dominantTrigger ? labels[dominantTrigger[0]] || dominantTrigger[0] : "No trigger";
  const leadSignal = dominantSignal ? signalCopy[dominantSignal[0]].title : "No signal";
  const review = highRiskRate >= 50 ? "Most saved decisions are arriving hot." : "Your saved decisions are mixed rather than uniformly heated.";
  const spend = passedSpend > 0 ? `You have already interrupted ${formatMoney(passedSpend)} of spend by passing on objects.` : "Passed decisions will convert into avoided-spend evidence here.";

  $("#pattern-brief").innerHTML = `
    <p>${escapeHtml(review)} ${escapeHtml(leadTrigger)} is the most common context, and ${escapeHtml(leadSignal)} is the strongest recurring readout.</p>
    <p>${escapeHtml(spend)}</p>
    <p>Latest object: ${escapeHtml(latest.draft.itemName)} at ${formatMoney(latest.draft.price)}, marked ${escapeHtml(labels[latest.status] || latest.status)} on ${escapeHtml(formatDate(latest.updatedAt))}.</p>
  `;
}

function averageSignals(records) {
  const totals = {};
  Object.keys(signalCopy).forEach((key) => {
    totals[key] = Math.round(sum(records.map((record) => record.analysis.scores[key] || 0)) / records.length);
  });
  return totals;
}

function countValues(values) {
  return values.reduce((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function topEntry(counts) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || null;
}

function fillSettingsForm() {
  const settings = store.settings;
  Object.entries(settings).forEach(([key, value]) => {
    const field = settingsForm.elements[key];
    if (!field) return;
    if (field.type === "checkbox") field.checked = Boolean(value);
    else field.value = value;
  });
}

function readSettings() {
  const data = new FormData(settingsForm);
  return {
    monthlyLimit: Number(data.get("monthlyLimit") || 0),
    coolingHours: Math.max(1, Number(data.get("coolingHours") || 24)),
    maxBuyRisk: clamp(Number(data.get("maxBuyRisk") || 55), 1, 100),
    reviewPrice: Number(data.get("reviewPrice") || 0),
    values: String(data.get("values") || ""),
    noFeedBuy: Boolean(data.get("noFeedBuy")),
    requireAlternative: Boolean(data.get("requireAlternative")),
    oneInOneOut: Boolean(data.get("oneInOneOut")),
    coolHighRisk: Boolean(data.get("coolHighRisk"))
  };
}

function saveSettings() {
  store.settings = readSettings();
  persist();
  renderAll();
  showToast("Protocols saved.");
}

function renderRulesPreview() {
  const settings = store.settings;
  const rules = [
    ["Risk ceiling", `Do not buy when risk is above ${settings.maxBuyRisk}.`],
    ["Cooldown", `High-risk decisions wait ${settings.coolingHours} hours.`],
    ["Price review", `Anything at or above ${formatMoney(settings.reviewPrice)} gets reviewed.`],
    ["Budget", `Monthly discretionary limit is ${formatMoney(settings.monthlyLimit)}.`]
  ];

  if (settings.noFeedBuy) rules.push(["Feed purchase", "Social-feed and influencer discoveries move to direct search first."]);
  if (settings.requireAlternative) rules.push(["Alternative", "A non-purchase substitute must be named."]);
  if (settings.oneInOneOut) rules.push(["Repeat category", "Repeat categories need a one-in, one-out decision."]);
  if (settings.values.trim()) rules.push(["Values", settings.values.trim()]);

  $("#rules-preview").innerHTML = rules
    .map(
      ([title, detail]) => `
        <div class="rule-item">
          <b>${escapeHtml(title)}</b>
          <span>${escapeHtml(detail)}</span>
        </div>
      `
    )
    .join("");
}

function exportData() {
  const payload = JSON.stringify(store, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `moodmarket-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Export prepared.");
}

function importData(file) {
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const imported = JSON.parse(String(reader.result || "{}"));
      store = {
        version: 2,
        records: Array.isArray(imported.records) ? imported.records : [],
        settings: { ...defaultSettings, ...(imported.settings || {}) },
        draft: normalizeDraft(imported.draft || defaultDraft)
      };
      app.editingId = null;
      fillForm(store.draft);
      fillSettingsForm();
      persist();
      renderAll();
      showToast("Import complete.");
    } catch {
      showToast("Import failed. The file was not valid MoodMarket JSON.");
    }
  });
  reader.readAsText(file);
}

async function copyReadout() {
  const { draft, analysis } = renderMirror();
  const text = [
    `MoodMarket readout: ${draft.itemName}`,
    `Risk: ${analysis.risk}/100`,
    `Verdict: ${analysis.verdict.title}`,
    `Detail: ${analysis.verdict.detail}`,
    `Next move: ${analysis.verdict.move} - ${analysis.verdict.copy}`
  ].join("\n");

  try {
    await navigator.clipboard.writeText(text);
    showToast("Readout copied.");
  } catch {
    showToast(text);
  }
}

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2700);
}

function renderAll() {
  renderMirror();
  renderLibrary();
  renderPatterns();
  renderRulesPreview();
}

form.addEventListener("input", () => {
  app.editingId = null;
  renderMirror();
});

form.addEventListener("change", () => {
  app.editingId = null;
  renderMirror();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  renderMirror();
  showToast("Mirror updated.");
});

$("#save-button").addEventListener("click", () => saveRecord("watching"));
$("#cooldown-button").addEventListener("click", () => saveRecord("cooling"));
$("#pass-button").addEventListener("click", () => saveRecord("passed"));
$("#new-button").addEventListener("click", newDossier);
$("#copy-button").addEventListener("click", copyReadout);

$("#library-search").addEventListener("input", (event) => {
  app.librarySearch = event.target.value;
  renderLibrary();
});

$("#library-filter").addEventListener("change", (event) => {
  app.libraryFilter = event.target.value;
  renderLibrary();
});

$("#record-list").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === "load") loadRecord(id);
  if (["cooling", "passed", "bought"].includes(action)) updateRecordStatus(id, action);
  if (action === "delete") deleteRecord(id);
});

settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveSettings();
});

settingsForm.addEventListener("input", () => {
  store.settings = readSettings();
  renderRulesPreview();
  renderMirror();
});

$("#export-button").addEventListener("click", exportData);
$("#import-button").addEventListener("click", () => $("#import-file").click());
$("#import-file").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) importData(file);
  event.target.value = "";
});

window.addEventListener("hashchange", () => {
  setRoute(location.hash.replace("#", ""), false);
});

fillForm(store.draft);
fillSettingsForm();
setRoute(location.hash.replace("#", "") || "mirror", false);
