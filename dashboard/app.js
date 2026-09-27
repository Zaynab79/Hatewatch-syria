/* HateWatch Syria — dashboard logic.
 * Reads ONLY ./alerts.json (docs/CONTRACT.md #5). No action recommendations are shown —
 * this dashboard reports what is happening, the manager decides what to do.
 *
 * Language: English is the default (build night is in English), but every alert already
 * carries a real Arabic sentence (sentence_ar / title_ar) from src/detect.py, so the toggle
 * below is a REAL, working Arabic mode, not a placeholder. The layout uses CSS logical
 * properties (see styles.css) so <html dir="rtl"> mirrors the whole page automatically.
 */

const LEVEL_ORDER = ["red", "orange", "yellow"];
const LEVEL_CLASS = { red: "level-red", orange: "level-orange", yellow: "level-yellow" };
const LEVEL_DOT = { red: "#d7263d", orange: "#e07a1f", yellow: "#d9a400" };
const TYPE_ICON = { spike: "⚡", slow_burn: "🔥" };

const STRINGS = {
  en: {
    dir: "ltr",
    title: "HateWatch Syria",
    subtitle: "Early-warning dashboard",
    alerts_heading: "Alerts",
    map_heading: "Map",
    legend_urgent: "Urgent", legend_warning: "Warning", legend_watch: "Watch",
    level_word: { red: "Urgent", orange: "Warning", yellow: "Watch" },
    type_word: { spike: "Sudden Rise", slow_burn: "Slowly Getting Worse" },
    no_alerts: "No unusual activity right now.",
    close: "Close",
    linked_event: (title, date) => `This happened right after: ${title} (${date}).`,
    stat_spike: (term, count, ds, de, ratio) =>
      `«${term}» appeared ${count} times between ${ds} and ${de} — ${ratio}× more than usual.`,
    stat_slowburn: (term, count, ds, de, ratio) =>
      `«${term}» appeared ${count} times between ${ds} and ${de} — now ${ratio}× more than when it started.`,
    add_keyword_heading: "Add a new word or phrase",
    keyword_placeholder: "Type a word people are using...",
    add: "Add",
    add_keyword_note: "These are reviewed by the team before they're added to the system.",
    add_source_heading: "Add a website or channel to watch",
    source_placeholder: "Paste a link or channel name...",
    download: "Download list",
    no_action_note: "This dashboard does not tell you what to do — you decide.",
    last_updated: "Last updated",
    lang_toggle: "العربية",
    show_examples: "Show example messages",
    hide_examples: "Hide example messages",
    load_error: "Could not load the data file (alerts.json). If you opened this file directly " +
      "in the browser, start a small local server instead: open a terminal in the 'dashboard' " +
      "folder and run: python -m http.server 8080 — then open http://localhost:8080",
    baseline_label: "Usual level",
    daily_label: "Daily count",
    event_label: "Event",
  },
  ar: {
    dir: "rtl",
    title: "نظام الإنذار المبكر - سوريا",
    subtitle: "لوحة الإنذار المبكر",
    alerts_heading: "التنبيهات",
    map_heading: "الخريطة",
    legend_urgent: "عاجل", legend_warning: "تحذير", legend_watch: "مراقبة",
    level_word: { red: "عاجل", orange: "تحذير", yellow: "مراقبة" },
    type_word: { spike: "ارتفاع مفاجئ", slow_burn: "تصاعد بطيء" },
    no_alerts: "لا يوجد نشاط غير معتاد حالياً.",
    close: "إغلاق",
    linked_event: (title, date) => `حدث هذا بعد: ${title} (${date}).`,
    stat_spike: (term, count, ds, de, ratio) =>
      `ظهرت «${term}» ${count} مرة بين ${ds} و ${de} — بمعدل ${ratio} أضعاف المعتاد.`,
    stat_slowburn: (term, count, ds, de, ratio) =>
      `ظهرت «${term}» ${count} مرة بين ${ds} و ${de} — الآن أعلى بـ ${ratio} مرة عن بدايتها.`,
    add_keyword_heading: "أضف كلمة أو عبارة جديدة",
    keyword_placeholder: "اكتب كلمة يستخدمها الناس...",
    add: "إضافة",
    add_keyword_note: "يراجع الفريق هذه الكلمات قبل إضافتها إلى النظام.",
    add_source_heading: "أضف موقعاً أو قناة للمراقبة",
    source_placeholder: "الصق رابطاً أو اسم قناة...",
    download: "تحميل القائمة",
    no_action_note: "هذه اللوحة لا تخبرك بما يجب فعله — القرار لك.",
    last_updated: "آخر تحديث",
    lang_toggle: "English",
    show_examples: "عرض أمثلة الرسائل",
    hide_examples: "إخفاء أمثلة الرسائل",
    load_error: "تعذّر تحميل ملف البيانات (alerts.json). إذا فتحت هذا الملف مباشرة في " +
      "المتصفح، شغّل خادماً محلياً بدلاً من ذلك: افتح الطرفية داخل مجلد 'dashboard' واكتب: " +
      "python -m http.server 8080 — ثم افتح http://localhost:8080",
    baseline_label: "المستوى المعتاد",
    daily_label: "العدد اليومي",
    event_label: "الحدث",
  },
};

let LANG = localStorage.getItem("hatewatch_lang") || "en";
let DATA = null;
let CHART = null;

function t() { return STRINGS[LANG]; }

// ---------------------------------------------------------------- data loading
async function loadData() {
  const res = await fetch("./alerts.json");
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

// ---------------------------------------------------------------- rendering: chrome / language
function applyLanguageChrome() {
  const s = t();
  document.getElementById("html-root").dir = s.dir;
  document.getElementById("html-root").lang = LANG;
  document.getElementById("app-title").textContent = s.title;
  document.getElementById("app-subtitle").textContent = s.subtitle;
  document.getElementById("alerts-heading").textContent = s.alerts_heading;
  document.getElementById("map-heading").textContent = s.map_heading;
  document.getElementById("legend-urgent").textContent = s.legend_urgent;
  document.getElementById("legend-warning").textContent = s.legend_warning;
  document.getElementById("legend-watch").textContent = s.legend_watch;
  document.getElementById("no-alerts").textContent = s.no_alerts;
  document.getElementById("lang-toggle").textContent = s.lang_toggle;
  document.getElementById("close-label").textContent = s.close;
  document.getElementById("add-keyword-heading").textContent = s.add_keyword_heading;
  document.getElementById("keyword-input").placeholder = s.keyword_placeholder;
  document.getElementById("keyword-submit").textContent = s.add;
  document.getElementById("add-keyword-note").textContent = s.add_keyword_note;
  document.getElementById("add-source-heading").textContent = s.add_source_heading;
  document.getElementById("source-input").placeholder = s.source_placeholder;
  document.getElementById("source-submit").textContent = s.add;
  document.getElementById("download-pending").textContent = s.download;
  document.getElementById("no-action-note").textContent = s.no_action_note;
  const exBtn = document.getElementById("toggle-examples");
  exBtn.textContent = exBtn.dataset.open === "1" ? s.hide_examples : s.show_examples;
}

function renderLastUpdated() {
  if (!DATA) return;
  const d = new Date(DATA.generated_at);
  document.getElementById("last-updated").textContent =
    `${t().last_updated}: ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

// ---------------------------------------------------------------- alerts list
function renderAlertsList() {
  const list = document.getElementById("alerts-list");
  const empty = document.getElementById("no-alerts");
  list.innerHTML = "";

  const alerts = [...DATA.alerts].sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level));
  if (alerts.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  const placesById = Object.fromEntries(DATA.places.map(p => [p.place_id, p]));
  for (const alert of alerts) {
    const place = placesById[alert.place_id];
    const placeName = place ? (LANG === "ar" ? place.name_ar : place.name_en) : alert.place_id;
    const card = document.createElement("div");
    card.className = "alert-card";
    card.style.borderInlineStartColor = LEVEL_DOT[alert.level];
    card.innerHTML = `
      <span class="icon">${TYPE_ICON[alert.type] || "•"}</span>
      <div class="body">
        <div class="place-name">${placeName}</div>
        <div class="sentence">${LANG === "ar" ? alert.sentence_ar : alert.sentence_en}</div>
        <span class="level-tag ${LEVEL_CLASS[alert.level]}">${t().level_word[alert.level]}</span>
      </div>`;
    card.addEventListener("click", () => openDetail(alert));
    list.appendChild(card);
  }
}

// ---------------------------------------------------------------- map
let MAP = null;
function renderMap() {
  if (!MAP) {
    MAP = L.map("map").setView([35.0, 38.0], 6.4);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(MAP);
  }
  // clear old markers
  MAP.eachLayer(layer => { if (layer instanceof L.CircleMarker) MAP.removeLayer(layer); });

  const alertsByPlace = {};
  for (const a of DATA.alerts) {
    if (!alertsByPlace[a.place_id]) alertsByPlace[a.place_id] = [];
    alertsByPlace[a.place_id].push(a);
  }

  for (const place of DATA.places) {
    const radius = 10 + Math.min(20, Math.sqrt(place.hits_7d || 1));
    const marker = L.circleMarker([place.lat, place.lon], {
      radius,
      color: LEVEL_DOT[place.level] || "#888",
      fillColor: LEVEL_DOT[place.level] || "#888",
      fillOpacity: 0.55,
      weight: 2,
    }).addTo(MAP);
    const name = LANG === "ar" ? place.name_ar : place.name_en;
    marker.bindTooltip(name);
    marker.on("click", () => {
      const placeAlerts = (alertsByPlace[place.place_id] || [])
        .sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level));
      if (placeAlerts.length) openDetail(placeAlerts[0]);
    });
  }
}

// ---------------------------------------------------------------- detail panel + chart
function zeroFillDaily(rows, startISO, endISO) {
  const byDate = Object.fromEntries(rows.map(r => [r.date, r.count]));
  const out = [];
  let d = new Date(startISO);
  const end = new Date(endISO);
  while (d <= end) {
    const iso = d.toISOString().slice(0, 10);
    out.push({ date: iso, count: byDate[iso] || 0 });
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function addDays(iso, days) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function clamp(iso, min, max) {
  if (iso < min) return min;
  if (iso > max) return max;
  return iso;
}

function openDetail(alert) {
  const s = t();
  const placesById = Object.fromEntries(DATA.places.map(p => [p.place_id, p]));
  const place = placesById[alert.place_id];
  const placeName = place ? (LANG === "ar" ? place.name_ar : place.name_en) : alert.place_id;

  document.getElementById("detail-title").textContent =
    `${TYPE_ICON[alert.type] || ""} ${placeName} — ${s.type_word[alert.type] || alert.type}`;

  const badge = document.getElementById("detail-level-badge");
  badge.textContent = s.level_word[alert.level];
  badge.className = "badge " + LEVEL_CLASS[alert.level];

  document.getElementById("detail-sentence").textContent =
    LANG === "ar" ? alert.sentence_ar : alert.sentence_en;

  const statFn = alert.type === "slow_burn" ? s.stat_slowburn : s.stat_spike;
  document.getElementById("detail-stat").textContent =
    statFn(alert.term, alert.count, alert.date_start, alert.date_end, alert.ratio);

  const eventEl = document.getElementById("detail-event");
  let eventDate = null;
  if (alert.linked_event_id) {
    const ev = DATA.events.find(e => e.event_id === alert.linked_event_id);
    if (ev) {
      eventDate = ev.date;
      eventEl.hidden = false;
      eventEl.textContent = s.linked_event(LANG === "ar" ? ev.title_ar : ev.title_en, ev.date);
    }
  } else {
    eventEl.hidden = true;
  }

  // examples toggle: reset to hidden each time a new alert is opened
  const exBtn = document.getElementById("toggle-examples");
  const exList = document.getElementById("detail-examples");
  exBtn.dataset.open = "0";
  exBtn.textContent = s.show_examples;
  exList.hidden = true;
  exList.innerHTML = (alert.evidence?.sample_texts || [])
    .map(txt => `<li>${txt.replace(/</g, "&lt;")}</li>`).join("");

  renderChart(alert, eventDate);

  document.getElementById("overlay").hidden = false;
  document.getElementById("detail-panel").hidden = false;
}

function closeDetail() {
  document.getElementById("overlay").hidden = true;
  document.getElementById("detail-panel").hidden = true;
}

function renderChart(alert, eventDate) {
  const rangeStart = DATA.range.start, rangeEnd = DATA.range.end;
  const windowStart = clamp(addDays(alert.date_start, -14), rangeStart, rangeEnd);
  const windowEnd = clamp(addDays(alert.date_end, 7), rangeStart, rangeEnd);

  const rows = DATA.timeline.filter(r => r.place_id === alert.place_id && r.term === "*"
    && r.date >= windowStart && r.date <= windowEnd);
  const daily = zeroFillDaily(rows, windowStart, windowEnd);
  const labels = daily.map(r => r.date);
  const counts = daily.map(r => r.count);
  const baseline = labels.map(() => alert.baseline);

  const datasets = [
    { label: t().daily_label, data: counts, borderColor: "#2b6cb0", backgroundColor: "#2b6cb0",
      tension: 0.15, pointRadius: 2 },
    { label: t().baseline_label, data: baseline, borderColor: "#9aa5b1", borderDash: [6, 4],
      pointRadius: 0, borderWidth: 1.5 },
  ];

  if (eventDate && labels.includes(eventDate)) {
    const idx = labels.indexOf(eventDate);
    const marker = labels.map((_, i) => (i === idx ? Math.max(...counts, 1) : null));
    datasets.push({
      label: t().event_label, data: marker, showLine: false,
      pointStyle: "triangle", pointRadius: 9, backgroundColor: "#d7263d", borderColor: "#d7263d",
    });
  }

  if (CHART) CHART.destroy();
  const ctx = document.getElementById("detail-chart").getContext("2d");
  CHART = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      scales: { x: { ticks: { maxTicksLimit: 8 } }, y: { beginAtZero: true } },
      plugins: { legend: { position: "bottom" } },
    },
  });
}

// ---------------------------------------------------------------- community input (pending lists)
const KEY_KEYWORDS = "hatewatch_pending_keywords";
const KEY_SOURCES = "hatewatch_pending_sources";

function getPending(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
}
function setPending(key, arr) { localStorage.setItem(key, JSON.stringify(arr)); }

function renderChips(key, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  getPending(key).forEach((item, i) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.innerHTML = `<span>${item.value.replace(/</g, "&lt;")}</span><button aria-label="remove">✕</button>`;
    chip.querySelector("button").addEventListener("click", () => {
      const arr = getPending(key); arr.splice(i, 1); setPending(key, arr); renderChips(key, containerId);
    });
    container.appendChild(chip);
  });
}

function toCsv(rows, headers) {
  const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
}

function download(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ---------------------------------------------------------------- wiring
function wireEvents() {
  document.getElementById("lang-toggle").addEventListener("click", () => {
    LANG = LANG === "en" ? "ar" : "en";
    localStorage.setItem("hatewatch_lang", LANG);
    applyLanguageChrome();
    renderLastUpdated();
    renderAlertsList();
    renderMap();
  });

  document.getElementById("detail-close").addEventListener("click", closeDetail);
  document.getElementById("overlay").addEventListener("click", closeDetail);

  document.getElementById("toggle-examples").addEventListener("click", (e) => {
    const list = document.getElementById("detail-examples");
    const open = e.target.dataset.open === "1";
    e.target.dataset.open = open ? "0" : "1";
    e.target.textContent = open ? t().show_examples : t().hide_examples;
    list.hidden = open;
  });

  document.getElementById("keyword-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("keyword-input");
    const value = input.value.trim();
    if (!value) return;
    const arr = getPending(KEY_KEYWORDS);
    arr.push({ value, added_at: new Date().toISOString() });
    setPending(KEY_KEYWORDS, arr);
    input.value = "";
    renderChips(KEY_KEYWORDS, "keyword-pending");
  });

  document.getElementById("source-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("source-input");
    const value = input.value.trim();
    if (!value) return;
    const arr = getPending(KEY_SOURCES);
    arr.push({ value, added_at: new Date().toISOString() });
    setPending(KEY_SOURCES, arr);
    input.value = "";
    renderChips(KEY_SOURCES, "source-pending");
  });

  document.getElementById("download-pending").addEventListener("click", () => {
    const kw = getPending(KEY_KEYWORDS);
    const src = getPending(KEY_SOURCES);
    if (kw.length) {
      download("pending_keywords.csv", toCsv(
        kw.map(k => ({ term: k.value, status: "pending", source: "manager_added", added_at: k.added_at })),
        ["term", "status", "source", "added_at"]
      ));
    }
    if (src.length) {
      download("pending_sources.csv", toCsv(
        src.map(s => ({ name: s.value, url_or_handle: s.value, status: "pending", added_at: s.added_at })),
        ["name", "url_or_handle", "status", "added_at"]
      ));
    }
  });
}

// ---------------------------------------------------------------- boot
async function boot() {
  applyLanguageChrome();
  renderChips(KEY_KEYWORDS, "keyword-pending");
  renderChips(KEY_SOURCES, "source-pending");
  wireEvents();
  try {
    DATA = await loadData();
  } catch (err) {
    document.querySelector(".main-grid").innerHTML =
      `<p style="padding:20px;color:#d7263d;">${t().load_error}</p>`;
    console.error(err);
    return;
  }
  renderLastUpdated();
  renderAlertsList();
  renderMap();
}

boot();
