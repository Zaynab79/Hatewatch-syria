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
// distinct from LEVEL_DOT's red/orange/yellow so per-term chart lines never look like severity
const TERM_COLORS = ["#2b6cb0", "#6b46c1", "#0d9488", "#b45309"];

// compact "+45×" style badge instead of spelling the ratio out in a full sentence
function formatRatio(ratio) {
  const n = ratio >= 10 ? Math.round(ratio) : Math.round(ratio * 10) / 10;
  return `+${n}×`;
}

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
    add_keyword_note: "Added to the list below right away.",
    add_source_heading: "Add a website or channel to watch",
    source_placeholder: "Paste a link or channel name...",
    show_keyword_list: "Show current keyword list",
    hide_keyword_list: "Hide current keyword list",
    no_keywords: "No keywords yet.",
    remove_word: "Remove",
    undo_remove_word: "Undo",
    new_word_tag: "new",
    add_event_heading: "Report something that happened",
    add_event_note: "Not from a website? Report something reported to you locally.",
    event_type_placeholder: "What kind of event?",
    event_type_other_placeholder: "What kind of event was it...",
    event_desc_placeholder: "What happened...",
    event_neighbourhood_placeholder: "Neighbourhood or landmark (optional)",
    choose_place: "Choose a place…",
    whole_governorate: (name) => `${name} (whole governorate)`,
    no_action_note: "This dashboard does not tell you what to do — you decide.",
    last_updated: "Last updated",
    lang_toggle: "العربية",
    load_error: "Could not load the data file (alerts.json). If you opened this file directly " +
      "in the browser, start a small local server instead: open a terminal in the 'dashboard' " +
      "folder and run: python -m http.server 8080 — then open http://localhost:8080",
    baseline_label: "Usual level",
    daily_label: "Daily count",
    event_label: "Event",
    staff: {
      toggle: "Staff reporting",
      heading: "Staff reporting",
      empty: "No reports yet.",
      cat_keyword: "Keyword",
      cat_event: "Event / threat",
      cat_other: "Other",
      back: "Back",
      star: "Star",
      unstar: "Unstar",
      close: "Close",
      reopen: "Reopen",
      delete: "Delete",
      confirm_delete: "Delete this report? This can't be undone.",
      show_closed: "Show closed reports",
      place: "Place",
      reported_at: "Reported",
      reported_by: "Reported by",
      field_worker: "Field worker",
      ongoing: "Still happening",
      neighbourhood: "Neighbourhood / landmark",
      location_shared: "Exact location shared",
      media_count: "Files attached",
      f_type: "Event type",
      f_description: "What happened",
      f_platform: "Platform",
      f_account: "Account / channel",
      f_handle: "Handle",
      f_message: "Message text",
      f_category: "Category",
      f_note: "Note",
      f_watchlist: "Requested for watchlist",
      f_term: "Term",
      f_variants: "Other spellings",
      f_language: "Language",
      f_meaning: "Meaning",
      f_approval: "Approval status",
      f_url: "Link",
      f_name: "Name",
      f_notes: "Notes",
      yes: "Yes",
      no: "No",
    },
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
    add_keyword_note: "تُضاف إلى القائمة أدناه فوراً.",
    add_source_heading: "أضف موقعاً أو قناة للمراقبة",
    source_placeholder: "الصق رابطاً أو اسم قناة...",
    show_keyword_list: "عرض قائمة الكلمات الحالية",
    hide_keyword_list: "إخفاء قائمة الكلمات الحالية",
    no_keywords: "لا توجد كلمات بعد.",
    remove_word: "إزالة",
    undo_remove_word: "تراجع",
    new_word_tag: "جديد",
    add_event_heading: "أبلغ عن حدث",
    add_event_note: "ليس من موقع؟ أبلغ عن شيء وصلك محلياً.",
    event_type_placeholder: "ما نوع الحدث؟",
    event_type_other_placeholder: "ما نوع الحدث؟ اكتبه هنا",
    event_desc_placeholder: "ماذا حدث...",
    event_neighbourhood_placeholder: "الحي أو معلم قريب (اختياري)",
    choose_place: "اختر مكاناً…",
    whole_governorate: (name) => `${name} (كامل المحافظة)`,
    no_action_note: "هذه اللوحة لا تخبرك بما يجب فعله — القرار لك.",
    last_updated: "آخر تحديث",
    lang_toggle: "English",
    load_error: "تعذّر تحميل ملف البيانات (alerts.json). إذا فتحت هذا الملف مباشرة في " +
      "المتصفح، شغّل خادماً محلياً بدلاً من ذلك: افتح الطرفية داخل مجلد 'dashboard' واكتب: " +
      "python -m http.server 8080 — ثم افتح http://localhost:8080",
    baseline_label: "المستوى المعتاد",
    daily_label: "العدد اليومي",
    event_label: "الحدث",
    staff: {
      toggle: "بلاغات الفريق",
      heading: "بلاغات الفريق",
      empty: "لا توجد بلاغات بعد.",
      cat_keyword: "كلمة",
      cat_event: "حدث / تهديد",
      cat_other: "أخرى",
      back: "رجوع",
      star: "تمييز",
      unstar: "إلغاء التمييز",
      close: "إغلاق",
      reopen: "إعادة فتح",
      delete: "حذف",
      confirm_delete: "حذف هذا البلاغ؟ لا يمكن التراجع عن ذلك.",
      show_closed: "عرض البلاغات المغلقة",
      place: "المكان",
      reported_at: "تاريخ البلاغ",
      reported_by: "أبلغ عنه",
      field_worker: "عامل ميداني",
      ongoing: "ما زال مستمراً",
      neighbourhood: "الحي / معلم قريب",
      location_shared: "تمت مشاركة الموقع الدقيق",
      media_count: "عدد الملفات المرفقة",
      f_type: "نوع الحدث",
      f_description: "ماذا حدث",
      f_platform: "المنصة",
      f_account: "الحساب / القناة",
      f_handle: "المعرّف",
      f_message: "نص الرسالة",
      f_category: "التصنيف",
      f_note: "ملاحظة",
      f_watchlist: "طُلبت إضافته لقائمة المراقبة",
      f_term: "الكلمة",
      f_variants: "طرق كتابة أخرى",
      f_language: "اللغة",
      f_meaning: "المعنى",
      f_approval: "حالة الموافقة",
      f_url: "الرابط",
      f_name: "الاسم",
      f_notes: "ملاحظات",
      yes: "نعم",
      no: "لا",
    },
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
  document.getElementById("add-event-heading").textContent = s.add_event_heading;
  document.getElementById("add-event-note").textContent = s.add_event_note;
  document.getElementById("event-type-other-input").placeholder = s.event_type_other_placeholder;
  document.getElementById("event-desc-input").placeholder = s.event_desc_placeholder;
  document.getElementById("event-neighbourhood-input").placeholder = s.event_neighbourhood_placeholder;
  document.getElementById("event-submit").textContent = s.add;
  document.getElementById("no-action-note").textContent = s.no_action_note;
  const kwBtn = document.getElementById("toggle-keyword-list");
  kwBtn.textContent = kwBtn.dataset.open === "1" ? s.hide_keyword_list : s.show_keyword_list;
  renderKeywordList();
  labelEventTypeSelect();
  labelEventPlaceSelect();
  renderEventChips();
  document.getElementById("staff-toggle-label").textContent = s.staff.toggle;
  document.getElementById("staff-heading").textContent = s.staff.heading;
  document.getElementById("staff-close-label").textContent = s.close;
  if (!document.getElementById("staff-panel").hidden) renderStaffPanel();
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
        <div class="place-name">${placeName} <span class="ratio-badge">${formatRatio(alert.ratio)}</span></div>
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
  closeStaffPanel(); // only one slide-over at a time
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

  // per-term curves are the primary view here ("طرد" vs "شرموطة" etc., see docs/CONTRACT.md §5);
  // the aggregate total is kept as a thin reference line, off by default (toggle it back on via
  // the legend) so it doesn't visually compete with the colored per-term lines.
  const termSeries = alert.term_timeline || {};
  const termDatasets = Object.keys(termSeries).map((term, i) => {
    const byDate = Object.fromEntries(termSeries[term].map(r => [r.date, r.count]));
    const color = TERM_COLORS[i % TERM_COLORS.length];
    return {
      label: term, data: labels.map(d => byDate[d] || 0),
      borderColor: color, backgroundColor: color, tension: 0.15, pointRadius: 2, borderWidth: 2,
    };
  });

  const datasets = [
    { label: t().daily_label, data: counts, borderColor: "#c3c9d1", backgroundColor: "#c3c9d1",
      tension: 0.15, pointRadius: 0, borderWidth: 1, hidden: termDatasets.length > 0 },
    ...termDatasets,
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
const KEY_EVENTS = "hatewatch_pending_events";
const KEY_REMOVALS = "hatewatch_pending_removals";

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

function renderEventChips() {
  const container = document.getElementById("event-pending");
  container.innerHTML = "";
  const esc = s => String(s).replace(/</g, "&lt;");
  getPending(KEY_EVENTS).forEach((item, i) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    const typeItem = EVENT_TYPES.find(x => x.id === item.type);
    const typeLabel = item.type === "other"
      ? item.type_other
      : (typeItem ? (LANG === "ar" ? typeItem.ar : typeItem.en) : item.type);
    const placeLabel = gazetteerPlaceName(item.place_id) + (item.neighbourhood ? ` — ${item.neighbourhood}` : "");
    chip.innerHTML = `<span>${esc(placeLabel)} · ${esc(typeLabel)}: ${esc(item.description)} (${esc(item.date)})</span>` +
      `<button aria-label="remove">✕</button>`;
    chip.querySelector("button").addEventListener("click", () => {
      const arr = getPending(KEY_EVENTS); arr.splice(i, 1); setPending(KEY_EVENTS, arr); renderEventChips();
    });
    container.appendChild(chip);
  });
}

// Combined view: approved lexicon terms (docs/CONTRACT.md #5's optional "terms" field) plus
// words the manager has typed in below — added here immediately, no review gate. Removing an
// approved term just flags it (this static page has no write access to lexicon.csv itself — the
// manager still has to edit that file directly, this only marks intent); removing a just-typed
// word deletes your own draft outright, since it was never written anywhere yet either.
function renderKeywordList() {
  const container = document.getElementById("keyword-list");
  container.innerHTML = "";
  const esc = s => String(s).replace(/</g, "&lt;");
  const approved = (DATA && DATA.terms) || [];
  const removedIds = new Set(getPending(KEY_REMOVALS).map(r => r.term_id));
  const added = getPending(KEY_KEYWORDS);

  if (approved.length === 0 && added.length === 0) {
    container.innerHTML = `<span class="hint">${t().no_keywords}</span>`;
    return;
  }

  approved.forEach(term => {
    const marked = removedIds.has(term.term_id);
    const chip = document.createElement("span");
    chip.className = "chip term-chip" + (marked ? " marked-for-removal" : "");
    chip.innerHTML = `<span>${esc(term.term)}</span>`;
    const btn = document.createElement("button");
    btn.setAttribute("aria-label", marked ? t().undo_remove_word : t().remove_word);
    btn.textContent = marked ? "↺" : "✕";
    btn.addEventListener("click", () => {
      let arr = getPending(KEY_REMOVALS);
      arr = marked
        ? arr.filter(r => r.term_id !== term.term_id)
        : [...arr, { term_id: term.term_id, term: term.term, added_at: new Date().toISOString() }];
      setPending(KEY_REMOVALS, arr);
      renderKeywordList();
    });
    chip.appendChild(btn);
    container.appendChild(chip);
  });

  added.forEach((item, i) => {
    const chip = document.createElement("span");
    chip.className = "chip term-chip term-chip-new";
    chip.innerHTML = `<span>${esc(item.value)} <em>(${t().new_word_tag})</em></span>`;
    const btn = document.createElement("button");
    btn.setAttribute("aria-label", t().remove_word);
    btn.textContent = "✕";
    btn.addEventListener("click", () => {
      const arr = getPending(KEY_KEYWORDS);
      arr.splice(i, 1);
      setPending(KEY_KEYWORDS, arr);
      renderKeywordList();
    });
    chip.appendChild(btn);
    container.appendChild(chip);
  });
}

// Same PLACES / EVENT_TYPES lists as the field app (data.js, shared list with ../field-app/data.js) —
// built once at boot, then just relabeled on language toggle so the manager's current selection
// survives switching languages (mirrors ../field-app/app.js's buildPlaceSelects/applyLanguage).
function gazetteerPlaceName(placeId) {
  const p = PLACES.find(x => x.place_id === placeId);
  return p ? (LANG === "ar" ? p.name_ar : p.name_en) : placeId;
}

function buildEventPlaceSelect() {
  const select = document.getElementById("event-place-select");
  select.innerHTML = "";
  const blank = new Option("", "");
  blank.dataset.i18nFn = "choose_place";
  select.appendChild(blank);

  for (const gov of PLACES.filter(p => p.level === "governorate")) {
    const group = document.createElement("optgroup");
    group.dataset.placeId = gov.place_id;
    const whole = new Option("", gov.place_id);
    whole.dataset.placeWhole = gov.place_id;
    group.appendChild(whole);
    for (const d of PLACES.filter(p => p.level === "district" && p.governorate_id === gov.place_id)) {
      const opt = new Option("", d.place_id);
      opt.dataset.placeId = d.place_id;
      group.appendChild(opt);
    }
    select.appendChild(group);
  }
}

function labelEventPlaceSelect() {
  const s = t();
  document.querySelectorAll("#event-place-select option[data-i18n-fn='choose_place']").forEach(o => { o.textContent = s.choose_place; });
  document.querySelectorAll("#event-place-select optgroup[data-place-id]").forEach(g => { g.label = gazetteerPlaceName(g.dataset.placeId); });
  document.querySelectorAll("#event-place-select option[data-place-whole]").forEach(o => { o.textContent = s.whole_governorate(gazetteerPlaceName(o.dataset.placeWhole)); });
  document.querySelectorAll("#event-place-select option[data-place-id]").forEach(o => { o.textContent = gazetteerPlaceName(o.dataset.placeId); });
}

function buildEventTypeSelect() {
  const select = document.getElementById("event-type-select");
  select.innerHTML = "";
  const blank = new Option("", "");
  blank.dataset.i18nFn = "event_type_placeholder";
  select.appendChild(blank);
  for (const item of EVENT_TYPES) {
    const opt = new Option("", item.id);
    opt.dataset.eventTypeId = item.id;
    select.appendChild(opt);
  }
}

function labelEventTypeSelect() {
  const s = t();
  document.querySelectorAll("#event-type-select option[data-i18n-fn='event_type_placeholder']").forEach(o => { o.textContent = s.event_type_placeholder; });
  document.querySelectorAll("#event-type-select option[data-event-type-id]").forEach(o => {
    const item = EVENT_TYPES.find(x => x.id === o.dataset.eventTypeId);
    o.textContent = item ? (LANG === "ar" ? item.ar : item.en) : o.dataset.eventTypeId;
  });
}

// ---------------------------------------------------------------- staff reporting (field-app submissions)
// Reads/writes the exact record shape ../field-app/app.js's saveSubmission() writes to
// localStorage (see ../field-app/SCHEMA.md's "submissions" table) — shared only when both apps
// are served from the same origin (see this folder's README.md). The field app itself never reads
// this key back, so adding `starred` here and repurposing `status: "closed"` as a dashboard-only
// triage state is additive: it can't break anything the field app does.
const KEY_FIELD_SUBMISSIONS = "hatewatch_field_submissions";
const escHtml = s => String(s ?? "").replace(/</g, "&lt;");

function getSubmissions() {
  try { return JSON.parse(localStorage.getItem(KEY_FIELD_SUBMISSIONS)) || []; } catch { return []; }
}
function setSubmissions(arr) {
  try { localStorage.setItem(KEY_FIELD_SUBMISSIONS, JSON.stringify(arr)); } catch { /* private mode etc. */ }
}
function updateSubmission(id, patch) {
  const arr = getSubmissions();
  const idx = arr.findIndex(x => x.id === id);
  if (idx === -1) return;
  Object.assign(arr[idx], patch);
  setSubmissions(arr);
}

// keyword -> its own group; event -> "event/threat"; upload + source (screenshots/files, links) -> "other"
function submissionCategory(kind) {
  if (kind === "keyword") return "keyword";
  if (kind === "event") return "event";
  return "other";
}

function listLabel(list, id) {
  const item = list.find(x => x.id === id);
  return item ? (LANG === "ar" ? item.ar : item.en) : (id || "");
}

function submissionSummary(item) {
  const f = item.fields || {};
  if (item.kind === "event") {
    const typeLabel = f.type === "other" ? f.type_other : listLabel(EVENT_TYPES, f.type);
    return `${typeLabel} — ${f.description || ""}`;
  }
  if (item.kind === "upload") {
    return `${listLabel(PLATFORMS, f.platform)} · ${listLabel(CATEGORIES, f.category)}${f.message_text ? " — " + f.message_text : ""}`;
  }
  if (item.kind === "keyword") {
    return `«${f.term || ""}»${f.meaning ? " — " + f.meaning : ""}`;
  }
  return f.name || f.url_or_handle || ""; // source
}

let STAFF_SHOW_CLOSED = false;
let STAFF_SELECTED_ID = null;

function openStaffPanel() {
  closeDetail(); // only one slide-over at a time
  STAFF_SELECTED_ID = null;
  document.getElementById("staff-overlay").hidden = false;
  document.getElementById("staff-panel").hidden = false;
  renderStaffPanel();
}
function closeStaffPanel() {
  document.getElementById("staff-overlay").hidden = true;
  document.getElementById("staff-panel").hidden = true;
}

function renderStaffPanel() {
  if (STAFF_SELECTED_ID) renderStaffDetail(STAFF_SELECTED_ID);
  else renderStaffList();
  updateStaffBadge();
}

function updateStaffBadge() {
  const openCount = getSubmissions().filter(x => x.status !== "closed").length;
  const badge = document.getElementById("staff-badge");
  badge.textContent = openCount > 99 ? "99+" : String(openCount);
  badge.hidden = openCount === 0;
}

function renderStaffList() {
  const s = t().staff;
  const body = document.getElementById("staff-body");
  body.innerHTML = "";

  const toggle = document.createElement("label");
  toggle.className = "staff-toggle-closed";
  toggle.innerHTML = `<input type="checkbox" id="staff-show-closed" ${STAFF_SHOW_CLOSED ? "checked" : ""} /> <span>${s.show_closed}</span>`;
  body.appendChild(toggle);
  toggle.querySelector("input").addEventListener("change", (e) => {
    STAFF_SHOW_CLOSED = e.target.checked;
    renderStaffList();
  });

  const all = getSubmissions();
  const visible = all
    .filter(x => STAFF_SHOW_CLOSED || x.status !== "closed")
    .sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0) || new Date(b.created_at) - new Date(a.created_at));

  const groups = [
    { key: "keyword", label: s.cat_keyword },
    { key: "event", label: s.cat_event },
    { key: "other", label: s.cat_other },
  ];

  for (const group of groups) {
    const items = visible.filter(x => submissionCategory(x.kind) === group.key);
    const section = document.createElement("div");
    section.className = "staff-group";
    const title = document.createElement("h4");
    title.className = "staff-group-title";
    title.innerHTML = `${escHtml(group.label)} <span class="staff-count">${items.length}</span>`;
    section.appendChild(title);

    if (items.length === 0) {
      const none = document.createElement("p");
      none.className = "hint";
      none.textContent = s.empty;
      section.appendChild(none);
    } else {
      const list = document.createElement("div");
      list.className = "staff-item-list";
      items.forEach(item => {
        const row = document.createElement("button");
        row.type = "button";
        row.className = "staff-item" + (item.status === "closed" ? " staff-item-closed" : "");
        row.innerHTML = `
          <span class="staff-item-star">${item.starred ? "★" : ""}</span>
          <span class="staff-item-body">
            <span class="staff-item-place">${escHtml(gazetteerPlaceName(item.place_id))}</span>
            <span class="staff-item-summary">${escHtml(submissionSummary(item))}</span>
          </span>
          <span class="staff-item-date">${escHtml((item.created_at || "").slice(0, 10))}</span>`;
        row.addEventListener("click", () => { STAFF_SELECTED_ID = item.id; renderStaffPanel(); });
        list.appendChild(row);
      });
      section.appendChild(list);
    }
    body.appendChild(section);
  }

  if (all.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = s.empty;
    body.appendChild(empty);
  }
}

function staffFieldRow(label, value) {
  if (value === undefined || value === null || value === "") return "";
  return `<div class="staff-field"><span class="staff-field-label">${escHtml(label)}</span>` +
    `<span class="staff-field-value">${escHtml(value)}</span></div>`;
}

function renderStaffDetail(id) {
  const s = t().staff;
  const body = document.getElementById("staff-body");
  body.innerHTML = "";

  const item = getSubmissions().find(x => x.id === id);
  if (!item) { STAFF_SELECTED_ID = null; renderStaffList(); return; }
  const f = item.fields || {};

  const back = document.createElement("button");
  back.type = "button";
  back.className = "btn btn-ghost btn-small staff-back";
  back.textContent = "← " + s.back;
  back.addEventListener("click", () => { STAFF_SELECTED_ID = null; renderStaffPanel(); });
  body.appendChild(back);

  let rows = "";
  rows += staffFieldRow(s.place, gazetteerPlaceName(item.place_id));
  rows += staffFieldRow(s.reported_at, item.created_at ? new Date(item.created_at).toLocaleString() : "");
  rows += staffFieldRow(s.reported_by, item.created_by === "demo_field_staff" ? s.field_worker : item.created_by);

  if (item.kind === "event") {
    rows += staffFieldRow(s.f_type, f.type === "other" ? f.type_other : listLabel(EVENT_TYPES, f.type));
    rows += staffFieldRow(s.f_description, f.description);
    rows += staffFieldRow(s.ongoing, f.is_ongoing ? s.yes : s.no);
    rows += staffFieldRow(s.neighbourhood, f.neighbourhood);
    rows += staffFieldRow(s.location_shared, f.location_shared ? s.yes : s.no);
    rows += staffFieldRow(s.media_count, (f.media || []).length || "");
  } else if (item.kind === "upload") {
    rows += staffFieldRow(s.f_platform, listLabel(PLATFORMS, f.platform));
    rows += staffFieldRow(s.f_account, f.account_name);
    rows += staffFieldRow(s.f_handle, f.handle);
    rows += staffFieldRow(s.f_message, f.message_text);
    rows += staffFieldRow(s.f_category, listLabel(CATEGORIES, f.category));
    rows += staffFieldRow(s.f_note, f.note);
    rows += staffFieldRow(s.f_watchlist, f.add_to_watchlist ? s.yes : s.no);
    rows += staffFieldRow(s.media_count, (f.media || []).length || "");
  } else if (item.kind === "keyword") {
    rows += staffFieldRow(s.f_term, f.term);
    rows += staffFieldRow(s.f_variants, f.variants);
    rows += staffFieldRow(s.f_language, listLabel(KEYWORD_LANGS, f.language));
    rows += staffFieldRow(s.f_meaning, f.meaning);
    rows += staffFieldRow(s.f_category, listLabel(CATEGORIES, f.category));
    rows += staffFieldRow(s.f_approval, f.status);
  } else { // source
    rows += staffFieldRow(s.f_url, f.url_or_handle);
    rows += staffFieldRow(s.f_name, f.name);
    rows += staffFieldRow(s.f_platform, listLabel(PLATFORMS, f.type));
    rows += staffFieldRow(s.f_category, listLabel(CATEGORIES, f.category));
    rows += staffFieldRow(s.f_notes, f.notes);
    rows += staffFieldRow(s.f_watchlist, f.add_to_watchlist ? s.yes : s.no);
    rows += staffFieldRow(s.f_approval, f.approval);
  }

  const detail = document.createElement("div");
  detail.className = "staff-detail";
  detail.innerHTML = rows;
  body.appendChild(detail);

  const actions = document.createElement("div");
  actions.className = "staff-actions";
  actions.innerHTML = `
    <button type="button" class="btn btn-secondary${item.starred ? " btn-active" : ""}" id="staff-star-btn">
      ${item.starred ? "★ " + escHtml(s.unstar) : "☆ " + escHtml(s.star)}</button>
    <button type="button" class="btn btn-secondary" id="staff-close-btn">
      ${item.status === "closed" ? escHtml(s.reopen) : escHtml(s.close)}</button>
    <button type="button" class="btn btn-secondary" id="staff-delete-btn">🗑 ${escHtml(s.delete)}</button>`;
  body.appendChild(actions);

  document.getElementById("staff-star-btn").addEventListener("click", () => {
    updateSubmission(id, { starred: !item.starred });
    renderStaffDetail(id);
    updateStaffBadge();
  });
  document.getElementById("staff-close-btn").addEventListener("click", () => {
    updateSubmission(id, { status: item.status === "closed" ? "submitted" : "closed" });
    renderStaffDetail(id);
    updateStaffBadge();
  });
  document.getElementById("staff-delete-btn").addEventListener("click", () => {
    if (!confirm(s.confirm_delete)) return;
    setSubmissions(getSubmissions().filter(x => x.id !== id));
    STAFF_SELECTED_ID = null;
    renderStaffPanel();
  });
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

  document.getElementById("staff-toggle").addEventListener("click", openStaffPanel);
  document.getElementById("staff-panel-close").addEventListener("click", closeStaffPanel);
  document.getElementById("staff-overlay").addEventListener("click", closeStaffPanel);

  // field-app submissions live in the SAME localStorage (shared origin, see README.md) — a
  // 'storage' event only fires in OTHER tabs/windows of that origin, which is exactly the case
  // where a field worker's tab just wrote a new submission while a manager has this one open.
  window.addEventListener("storage", (e) => {
    if (e.key === KEY_FIELD_SUBMISSIONS) {
      updateStaffBadge();
      if (!document.getElementById("staff-panel").hidden) renderStaffPanel();
    }
  });

  document.getElementById("event-type-select").addEventListener("change", (e) => {
    const isOther = e.target.value === "other";
    const otherInput = document.getElementById("event-type-other-input");
    otherInput.hidden = !isOther;
    if (isOther) otherInput.focus();
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
    // no review gate: show it in the list immediately
    const listBtn = document.getElementById("toggle-keyword-list");
    listBtn.dataset.open = "1";
    listBtn.textContent = t().hide_keyword_list;
    document.getElementById("keyword-list").hidden = false;
    renderKeywordList();
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

  document.getElementById("event-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const typeSelect = document.getElementById("event-type-select");
    const typeOtherInput = document.getElementById("event-type-other-input");
    const descInput = document.getElementById("event-desc-input");
    const dateInput = document.getElementById("event-date-input");
    const placeSelect = document.getElementById("event-place-select");
    const neighInput = document.getElementById("event-neighbourhood-input");
    const type = typeSelect.value;
    const typeOther = type === "other" ? typeOtherInput.value.trim() : "";
    const description = descInput.value.trim();
    const date = dateInput.value;
    const placeId = placeSelect.value;
    if (!type || (type === "other" && !typeOther) || !description || !date || !placeId) return;
    // Same shape as events.csv (docs/CONTRACT.md #4), so a manager can copy these straight in.
    const arr = getPending(KEY_EVENTS);
    arr.push({
      place_id: placeId,
      type, type_other: typeOther,
      description, date,
      neighbourhood: neighInput.value.trim(),
      added_at: new Date().toISOString(),
    });
    setPending(KEY_EVENTS, arr);
    typeSelect.value = "";
    typeOtherInput.value = "";
    typeOtherInput.hidden = true;
    descInput.value = "";
    dateInput.value = "";
    placeSelect.value = "";
    neighInput.value = "";
    renderEventChips();
  });

  document.getElementById("toggle-keyword-list").addEventListener("click", (e) => {
    const list = document.getElementById("keyword-list");
    const open = e.target.dataset.open === "1";
    e.target.dataset.open = open ? "0" : "1";
    e.target.textContent = open ? t().show_keyword_list : t().hide_keyword_list;
    list.hidden = open;
  });

}

// ---------------------------------------------------------------- boot
async function boot() {
  buildEventTypeSelect();
  buildEventPlaceSelect();
  applyLanguageChrome();
  renderChips(KEY_SOURCES, "source-pending");
  updateStaffBadge();
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
  renderKeywordList();
}

boot();
