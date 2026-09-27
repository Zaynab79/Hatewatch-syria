/* Early Warning — field app logic (DEMO).
 *
 * What this file does:
 *   1. Translates the page (English / Arabic, with right-to-left layout for Arabic).
 *   2. Switches between screens: home, report, screenshot, keyword, link, done.
 *   3. Runs the 6-step "Report an event" form.
 *   4. Keeps each submission in THIS BROWSER ONLY (localStorage). Nothing is sent to a server,
 *      and photos never leave the phone.
 *
 * Field names match the hatewatch data contract (docs/CONTRACT.md) so a real backend can be added later.
 * The language choice uses the same storage key as the manager dashboard ("hatewatch_lang").
 */

// ======================================================================= text in both languages
const STRINGS = {
  en: {
    dir: "ltr",
    eyebrow: "Syria · Field reporting",
    title: "Early Warning",
    lang_toggle: "العربية",
    home_title: "What are you reporting?",
    home_sub: "A manager reviews everything you send before anyone acts.",
    nav_report: "Report an event",
    nav_report_sub: "Violence or a threat you saw or heard about",
    nav_screenshot: "Upload file",
    nav_screenshot_sub: "Screenshots, photos, videos or documents",
    nav_keyword: "Add keyword",
    nav_keyword_sub: "A word or coded term people are using",
    nav_link: "Add link",
    nav_link_sub: "A news article, channel or group",
    demo_title: "Demo only",
    demo_text: "Nothing you enter is sent anywhere.",
    back_home: "Home",
    back: "Back",
    next: "Next",
    send: "Send",
    send_report: "Send report",
    // report an event
    report_title: "Report an event",
    step_of: (n, total) => `Step ${n} of ${total}`,
    step1_q: "What happened?",
    step1_hint: "Who was involved? How many people? Is it still happening?",
    step1_ongoing: "It is still happening",
    step2_q: "What kind of event?",
    step2_other: "What kind of event was it?",
    step3_q: "When did it happen?",
    step3_hint: "We filled in \"now\". Change it if it happened earlier.",
    step4_q: "Where?",
    step4_neigh: "Neighbourhood or landmark",
    step4_loc: "Share my exact location (optional)",
    step4_loc_hint: "Only if you choose to. If you leave this off, we only keep the place and neighbourhood you typed.",
    step5_q: "Add photos (optional)",
    add_photos: "Add photos",
    // upload screenshot, photo or video
    shot_title: "Upload file",
    shot_choose: "Choose files",
    shot_choose_sub: "Screenshots, photos, videos, audio or documents",
    video_note: "Videos and large files can take a long time on a slow connection.",
    remove: "Remove",
    f_platform: "Where did it come from?",
    f_account: "Account, channel or group name",
    f_handle: "Handle (@name), if you can see it",
    f_message: "What does the message say?",
    f_shows: "What does it show?",
    f_category: "What kind of hate speech?",
    f_place: "Which place is it about?",
    f_note: "Short note (optional)",
    f_watchlist: "Add this account to the watchlist",
    // keyword
    kw_title: "Add a keyword",
    f_term: "Word or phrase",
    f_variants: "Other spellings (optional)",
    f_language: "Language",
    f_meaning: "What does it mean? Who is it aimed at?",
    f_where_used: "Where is it used?",
    kw_note: "A manager checks every new word before it is used.",
    // link
    link_title: "Add a link",
    f_url: "Paste the link",
    f_link_name: "Name of the site, channel or group (optional)",
    f_watchlist_channel: "Add this channel to the watchlist",
    detected: (name) => `Detected: ${name}`,
    // done + footer
    done_title: "Thank you",
    done_text: "Your report was sent. A manager will review it.",
    done_home: "Back to home",
    footer_note: "You report what you see. The manager decides what to do.",
    // errors and labels
    choose_place: "Choose a place…",
    whole_governorate: (name) => `${name} (whole governorate)`,
    err_description: "Please write what happened.",
    err_type_other: "Please write what kind of event it was.",
    err_place: "Please choose a place.",
    err_media: "Please add at least one file.",
    err_term: "Please type the word or phrase.",
    err_url: "Please paste a link.",
  },
  ar: {
    dir: "rtl",
    eyebrow: "سوريا · تقارير ميدانية",
    title: "الإنذار المبكر",
    lang_toggle: "English",
    home_title: "عمّ تريد الإبلاغ؟",
    home_sub: "يراجع مدير كل ما ترسله قبل اتخاذ أي إجراء.",
    nav_report: "أبلغ عن حدث",
    nav_report_sub: "عنف أو تهديد رأيته أو سمعت عنه",
    nav_screenshot: "رفع ملف",
    nav_screenshot_sub: "لقطات شاشة أو صور أو فيديو أو مستندات",
    nav_keyword: "إضافة كلمة",
    nav_keyword_sub: "كلمة أو رمز يستخدمه الناس",
    nav_link: "إضافة رابط",
    nav_link_sub: "مقال إخباري أو قناة أو مجموعة",
    demo_title: "نسخة تجريبية",
    demo_text: "لا يُرسل أي شيء تدخله إلى أي مكان.",
    back_home: "الرئيسية",
    back: "رجوع",
    next: "التالي",
    send: "إرسال",
    send_report: "إرسال البلاغ",
    report_title: "الإبلاغ عن حدث",
    step_of: (n, total) => `الخطوة ${n} من ${total}`,
    step1_q: "ماذا حدث؟",
    step1_hint: "من كان متورطاً؟ كم عدد الأشخاص؟ هل ما زال مستمراً؟",
    step1_ongoing: "ما زال مستمراً",
    step2_q: "ما نوع الحدث؟",
    step2_other: "ما نوع الحدث؟ اكتبه هنا",
    step3_q: "متى حدث؟",
    step3_hint: "وضعنا الوقت الحالي. غيّره إذا حدث في وقت سابق.",
    step4_q: "أين؟",
    step4_neigh: "الحي أو معلم قريب",
    step4_loc: "مشاركة موقعي الدقيق (اختياري)",
    step4_loc_hint: "فقط إذا اخترت ذلك. إذا تركته، نحتفظ فقط بالمكان والحي الذي كتبته.",
    step5_q: "أضف صوراً (اختياري)",
    add_photos: "إضافة صور",
    shot_title: "رفع ملف",
    shot_choose: "اختيار ملفات",
    shot_choose_sub: "لقطات شاشة أو صور أو فيديو أو صوت أو مستندات",
    video_note: "قد يستغرق إرسال الفيديو والملفات الكبيرة وقتاً طويلاً إذا كان الاتصال ضعيفاً.",
    remove: "إزالة",
    f_platform: "من أين جاء؟",
    f_account: "اسم الحساب أو القناة أو المجموعة",
    f_handle: "المعرّف (@الاسم) إن كان ظاهراً",
    f_message: "ماذا تقول الرسالة؟",
    f_shows: "ماذا يظهر فيه؟",
    f_category: "ما نوع خطاب الكراهية؟",
    f_place: "عن أي مكان يتحدث؟",
    f_note: "ملاحظة قصيرة (اختياري)",
    f_watchlist: "إضافة هذا الحساب إلى قائمة المراقبة",
    kw_title: "إضافة كلمة",
    f_term: "الكلمة أو العبارة",
    f_variants: "طرق كتابة أخرى (اختياري)",
    f_language: "اللغة",
    f_meaning: "ماذا تعني؟ ومن تستهدف؟",
    f_where_used: "أين تُستخدم؟",
    kw_note: "يراجع مدير كل كلمة جديدة قبل استخدامها.",
    link_title: "إضافة رابط",
    f_url: "الصق الرابط",
    f_link_name: "اسم الموقع أو القناة أو المجموعة (اختياري)",
    f_watchlist_channel: "إضافة هذه القناة إلى قائمة المراقبة",
    detected: (name) => `تم التعرّف: ${name}`,
    done_title: "شكراً لك",
    done_text: "تم إرسال بلاغك. سيراجعه أحد المدراء.",
    done_home: "العودة إلى الرئيسية",
    footer_note: "أنت تبلّغ عمّا تراه. والمدير يقرّر ما يجب فعله.",
    choose_place: "اختر مكاناً…",
    whole_governorate: (name) => `${name} (كامل المحافظة)`,
    err_description: "يرجى كتابة ما حدث.",
    err_type_other: "يرجى كتابة نوع الحدث.",
    err_place: "يرجى اختيار مكان.",
    err_media: "يرجى إضافة ملف واحد على الأقل.",
    err_term: "يرجى كتابة الكلمة أو العبارة.",
    err_url: "يرجى لصق رابط.",
  },
};

// The fixed lists from data.js, by name, so the HTML can say data-options="PLATFORMS".
const LISTS = { EVENT_TYPES, LEVELS, CATEGORIES, PLATFORMS, KEYWORD_LANGS };

const REPORT_STEPS = 5;
const KEY_LANG = "hatewatch_lang";                        // shared with the dashboard
const KEY_SUBMISSIONS = "hatewatch_field_submissions";

// ======================================================================= small helpers
// Browser storage can be blocked (private mode), so every read/write is wrapped.
function storageGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
function storageSet(key, value) { try { localStorage.setItem(key, value); } catch { /* demo: ignore */ } }

let LANG = storageGet(KEY_LANG) === "ar" ? "ar" : "en";
function t() { return STRINGS[LANG]; }

/** Label of a list item ({en, ar}) in the current language. */
function labelOf(item) { return item ? item[LANG] : ""; }
function findIn(listName, id) { return LISTS[listName].find(x => x.id === id); }

function placeName(placeId) {
  const p = PLACES.find(x => x.place_id === placeId);
  return p ? (LANG === "ar" ? p.name_ar : p.name_en) : "";
}

/** "now" in the format a datetime-local input expects: 2026-09-27T14:05 */
function nowForInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function makeId() {
  return (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
}

// ======================================================================= saving (browser only, demo)
/** Keeps a copy of what was sent in this browser. Shown nowhere yet; it records the field names a real backend would get. */
function saveSubmission(kind, placeId, level, fields) {
  const record = {
    id: makeId(),
    kind,                      // event | upload | keyword | source
    status: "submitted",       // draft | submitted | reviewed
    place_id: placeId,
    level: level || null,      // yellow | orange | red; set later by the system / a manager, not by field staff
    created_at: new Date().toISOString(),
    created_by: "demo_field_staff",
    fields,
  };
  let saved = [];
  try { saved = JSON.parse(storageGet(KEY_SUBMISSIONS)) || []; } catch { /* start fresh */ }
  storageSet(KEY_SUBMISSIONS, JSON.stringify([record, ...saved]));
}

// ======================================================================= building the dropdowns and choice lists
/** Every place dropdown: governorates as groups, with their districts inside. */
function buildPlaceSelects() {
  document.querySelectorAll(".place-select").forEach(select => {
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
  });
}

/** Dropdowns with data-options="LISTNAME" get one option per list item. */
function buildListSelects() {
  document.querySelectorAll("select[data-options]").forEach(select => {
    const listName = select.dataset.options;
    select.innerHTML = "";
    for (const item of LISTS[listName]) {
      const opt = new Option("", item.id);
      opt.dataset.labelOf = `${listName}:${item.id}`;
      select.appendChild(opt);
    }
  });
}

/** One tappable row in a choice list (a radio button). dotClass adds an optional coloured dot. */
function makeOption(groupName, listName, item, dotClass) {
  const label = document.createElement("label");
  label.className = "option";
  const input = document.createElement("input");
  input.type = "radio";
  input.name = groupName;
  input.value = item.id;
  const box = document.createElement("span");
  box.className = "option-box";
  if (dotClass) {
    const dot = document.createElement("span");
    dot.className = `dot ${dotClass}`;
    box.appendChild(dot);
  }
  const text = document.createElement("span");
  text.dataset.labelOf = `${listName}:${item.id}`;
  box.appendChild(text);
  label.append(input, box);
  return label;
}

function buildChoiceLists() {
  const typeList = document.getElementById("event-type-list");
  EVENT_TYPES.forEach(item => typeList.appendChild(makeOption("type", "EVENT_TYPES", item)));
}

// ======================================================================= language
/** Put every piece of text on the page into the current language. Safe to call any time. */
function applyLanguage() {
  const s = t();
  const root = document.getElementById("html-root");
  root.dir = s.dir;
  root.lang = LANG;
  document.title = `${s.title} — ${s.eyebrow}`;
  document.getElementById("lang-toggle").textContent = s.lang_toggle;

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const value = s[el.dataset.i18n];
    if (typeof value === "string") el.textContent = value;
  });
  document.querySelectorAll("[data-label-of]").forEach(el => {
    const [listName, id] = el.dataset.labelOf.split(":");
    el.textContent = labelOf(findIn(listName, id));
  });
  document.querySelectorAll("[data-i18n-fn='choose_place']").forEach(o => { o.textContent = s.choose_place; });
  document.querySelectorAll("optgroup[data-place-id]").forEach(g => { g.label = placeName(g.dataset.placeId); });
  document.querySelectorAll("option[data-place-whole]").forEach(o => { o.textContent = s.whole_governorate(placeName(o.dataset.placeWhole)); });
  document.querySelectorAll("option[data-place-id]").forEach(o => { o.textContent = placeName(o.dataset.placeId); });

  showStep(currentStep);
  updateLinkDetected();
}

// ======================================================================= screens
const VIEWS = ["home", "report", "screenshot", "keyword", "link", "done"];

/** Show one screen. The screen name goes in the address (#report) so the phone's Back button works. */
function showView(name) {
  if (!VIEWS.includes(name)) name = "home";
  document.querySelectorAll(".view").forEach(v => { v.hidden = v.dataset.view !== name; });
  window.scrollTo(0, 0);
}

function go(name) {
  if (location.hash === "#" + name) showView(name);
  else location.hash = name;
}

function showError(form, message) {
  const el = form.querySelector(".form-error");
  el.textContent = message;
  el.hidden = !message;
}

// ======================================================================= report an event: the 6 steps
let currentStep = 1;
const reportForm = document.getElementById("report-form");

function showStep(n) {
  currentStep = n;
  reportForm.querySelectorAll(".step").forEach(el => { el.hidden = Number(el.dataset.step) !== n; });
  document.getElementById("step-label").textContent = t().step_of(n, REPORT_STEPS);
  document.getElementById("step-bar").style.width = `${(n / REPORT_STEPS) * 100}%`;
  document.getElementById("step-back").hidden = n === 1;
  document.getElementById("step-next").hidden = n === REPORT_STEPS;
  document.getElementById("step-submit").hidden = n !== REPORT_STEPS;
  showError(reportForm, "");
}

/** Only these must be filled in: what happened (step 1), the "Other" box if Other is picked (step 2), and the place (step 4). */
function checkStep(n) {
  if (n === 1 && !reportForm.description.value.trim()) return t().err_description;
  if (n === 2 && reportForm.type.value === "other" && !reportForm.type_other.value.trim()) return t().err_type_other;
  if (n === 4 && !reportForm.place_id.value) return t().err_place;
  return "";
}

/** Show the "What kind of event was it?" box only when "Other" is picked. */
function updateTypeOther() {
  const isOther = reportForm.type.value === "other";
  document.getElementById("type-other-wrap").hidden = !isOther;
  if (isOther) reportForm.type_other.focus();
}

function resetReportForm() {
  reportForm.reset();
  reportForm.datetime.value = nowForInput();
  clearMedia("ev-photos");
  document.getElementById("type-other-wrap").hidden = true;
  showStep(1);
}

// ======================================================================= add link: guess the platform from the address
function detectPlatform(url) {
  let host;
  try { host = new URL(url.trim()).hostname.replace(/^www\./, "").toLowerCase(); } catch { return null; }
  if (/(^|\.)(t\.me|telegram\.me|telegram\.org)$/.test(host)) return "telegram";
  if (/(^|\.)(wa\.me|whatsapp\.com)$/.test(host)) return "whatsapp";
  if (/(^|\.)(facebook\.com|fb\.com|fb\.me)$/.test(host)) return "facebook";
  if (/(^|\.)(x\.com|twitter\.com)$/.test(host)) return "x";
  if (/(^|\.)tiktok\.com$/.test(host)) return "tiktok";
  if (/(^|\.)instagram\.com$/.test(host)) return "instagram";
  return "news";
}

function updateLinkDetected() {
  const form = document.getElementById("link-form");
  const platform = detectPlatform(form.url_or_handle.value);
  const badge = document.getElementById("link-detected");
  badge.hidden = !platform;
  if (platform) badge.textContent = t().detected(labelOf(findIn("PLATFORMS", platform)));
  // The watchlist is for channels and accounts, not news articles.
  form.add_to_watchlist.closest("label").hidden = !platform || platform === "news";
}

// ======================================================================= files: previews (never uploaded)
// What has been added so far, per preview box: { "shot-media": [{ file, url, kind: "image" | "video" | "file" }], ... }
const MEDIA = {};
const LARGE_FILE_MB = 10;   // files bigger than this get the "slow connection" note

/** image and video files get a real preview; everything else (PDF, audio, documents…) gets a file tile. */
function mediaKind(file) {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "file";
}

/** Short label for a file tile, from its name: "report.pdf" → "PDF". */
function fileExtension(name) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).slice(0, 4).toUpperCase() : "";
}

function formatDuration(seconds) {
  if (!isFinite(seconds)) return "";
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Redraw one preview box: a picture, a video preview or a file tile for each file, each with a remove button. */
function renderMedia(boxId) {
  const box = document.getElementById(boxId);
  const items = MEDIA[boxId] || [];
  box.innerHTML = "";

  items.forEach((item, index) => {
    const thumb = document.createElement("div");
    thumb.className = "thumb";
    thumb.title = item.file.name;

    if (item.kind === "video") {
      const video = document.createElement("video");
      video.src = item.url + "#t=0.1";   // "#t=0.1" makes phones show the first frame instead of black
      video.muted = true;
      video.playsInline = true;
      video.preload = "metadata";
      const badge = document.createElement("span");
      badge.className = "thumb-badge";
      badge.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" class="icon"><use href="#i-video"/></svg>';
      const length = document.createElement("span");
      badge.appendChild(length);
      video.addEventListener("loadedmetadata", () => { length.textContent = formatDuration(video.duration); });
      thumb.append(video, badge);
    } else if (item.kind === "file") {
      const tile = document.createElement("div");
      tile.className = "thumb-file";
      tile.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" class="icon icon-lg"><use href="#i-file"/></svg>';
      const ext = document.createElement("span");
      ext.textContent = fileExtension(item.file.name);
      tile.appendChild(ext);
      thumb.appendChild(tile);
    } else {
      const img = document.createElement("img");
      img.src = item.url;
      img.alt = "";
      thumb.appendChild(img);
    }

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "thumb-remove";
    remove.textContent = "✕";
    remove.setAttribute("aria-label", t().remove);
    remove.addEventListener("click", () => {
      URL.revokeObjectURL(item.url);
      MEDIA[boxId].splice(index, 1);
      renderMedia(boxId);
    });
    thumb.appendChild(remove);
    box.appendChild(thumb);
  });

  // On the upload screen, warn gently once a video or a large file is added.
  if (boxId === "shot-media") {
    document.getElementById("video-note").hidden =
      !items.some(i => i.kind === "video" || i.file.size > LARGE_FILE_MB * 1024 * 1024);
  }
}

function clearMedia(boxId) {
  (MEDIA[boxId] || []).forEach(item => URL.revokeObjectURL(item.url));
  MEDIA[boxId] = [];
  renderMedia(boxId);
}

/** What gets saved about the files: their type and size only (the files themselves stay on the phone). */
function mediaSummary(boxId) {
  return (MEDIA[boxId] || []).map(item => ({
    type: item.kind,                          // image | video | file
    mime: item.file.type || "unknown",        // e.g. "application/pdf", "audio/ogg"
    size_kb: Math.round(item.file.size / 1024),
  }));
}

function wireMediaInputs() {
  document.querySelectorAll("input[type=file][data-preview]").forEach(input => {
    input.addEventListener("change", () => {
      const boxId = input.dataset.preview;
      MEDIA[boxId] = MEDIA[boxId] || [];
      for (const file of input.files) {
        MEDIA[boxId].push({ file, url: URL.createObjectURL(file), kind: mediaKind(file) });
      }
      input.value = "";            // so the same file can be picked again after removing it
      renderMedia(boxId);
    });
  });
}

// ======================================================================= upload: "I took it myself" changes the form
/** Content the worker recorded themselves has no account or handle, and "message" becomes "what does it show". */
function updateOwnRecording() {
  const form = document.getElementById("screenshot-form");
  const own = form.platform.value === "own_recording";
  form.querySelectorAll(".online-only").forEach(el => { el.hidden = own; });
  const label = document.getElementById("shot-text-label");
  label.dataset.i18n = own ? "f_shows" : "f_message";
  label.textContent = t()[label.dataset.i18n];
}

// ======================================================================= wiring everything up
function wireEvents() {
  // any element with data-go="screen" opens that screen
  document.addEventListener("click", e => {
    const target = e.target.closest("[data-go]");
    if (target) { e.preventDefault(); go(target.dataset.go); }
  });
  window.addEventListener("hashchange", () => showView(location.hash.slice(1)));

  document.getElementById("lang-toggle").addEventListener("click", () => {
    LANG = LANG === "en" ? "ar" : "en";
    storageSet(KEY_LANG, LANG);
    applyLanguage();
  });

  // ---- report an event
  document.getElementById("step-next").addEventListener("click", () => {
    const err = checkStep(currentStep);
    if (err) return showError(reportForm, err);
    showStep(currentStep + 1);
  });
  document.getElementById("step-back").addEventListener("click", () => showStep(currentStep - 1));
  document.getElementById("event-type-list").addEventListener("change", updateTypeOther);
  reportForm.addEventListener("submit", e => {
    e.preventDefault();
    const f = reportForm;
    const when = f.datetime.value || nowForInput();
    // Field names follow events.csv (CONTRACT §4), plus the extra things a field report has.
    saveSubmission("event", f.place_id.value, null, {
      type: f.type.value || "other",
      type_other: f.type.value === "other" ? f.type_other.value.trim() : "",
      description: f.description.value.trim(),
      is_ongoing: f.is_ongoing.checked,
      datetime: when,
      date: when.slice(0, 10),
      neighbourhood: f.neighbourhood.value.trim(),
      location_shared: f.share_location.checked,
      media: mediaSummary("ev-photos"),
      confirmed: false,          // a manager confirms events, never the app
    });
    resetReportForm();
    go("done");
  });

  // ---- upload screenshot, photo or video (no severity here: the system and the manager decide that)
  const shotForm = document.getElementById("screenshot-form");
  shotForm.platform.addEventListener("change", updateOwnRecording);
  shotForm.addEventListener("submit", e => {
    e.preventDefault();
    if (!(MEDIA["shot-media"] || []).length) return showError(shotForm, t().err_media);
    if (!shotForm.place_id.value) return showError(shotForm, t().err_place);
    const own = shotForm.platform.value === "own_recording";
    saveSubmission("upload", shotForm.place_id.value, null, {
      platform: shotForm.platform.value,
      account_name: own ? "" : shotForm.account_name.value.trim(),
      handle: own ? "" : shotForm.handle.value.trim(),
      message_text: shotForm.message_text.value.trim(),
      category: shotForm.category.value,
      note: shotForm.note.value.trim(),
      add_to_watchlist: !own && shotForm.add_to_watchlist.checked,
      media: mediaSummary("shot-media"),   // e.g. [{ type: "file", mime: "application/pdf", size_kb: 240 }]
    });
    shotForm.reset();
    clearMedia("shot-media");
    updateOwnRecording();
    showError(shotForm, "");
    go("done");
  });

  // ---- add keyword (fields follow lexicon.csv, CONTRACT §2)
  const kwForm = document.getElementById("keyword-form");
  kwForm.addEventListener("submit", e => {
    e.preventDefault();
    if (!kwForm.term.value.trim()) return showError(kwForm, t().err_term);
    if (!kwForm.place_id.value) return showError(kwForm, t().err_place);
    saveSubmission("keyword", kwForm.place_id.value, null, {
      term: kwForm.term.value.trim(),
      variants: kwForm.variants.value.trim(),
      language: kwForm.language.value,
      meaning: kwForm.meaning.value.trim(),
      category: kwForm.category.value,
      status: "pending",         // every new word waits for a manager
      source: "field_staff",
    });
    kwForm.reset();
    showError(kwForm, "");
    go("done");
  });

  // ---- add link (fields follow sources.csv, CONTRACT §4b)
  const linkForm = document.getElementById("link-form");
  linkForm.url_or_handle.addEventListener("input", updateLinkDetected);
  linkForm.addEventListener("submit", e => {
    e.preventDefault();
    const url = linkForm.url_or_handle.value.trim();
    if (!url) return showError(linkForm, t().err_url);
    if (!linkForm.place_id.value) return showError(linkForm, t().err_place);
    saveSubmission("source", linkForm.place_id.value, null, {
      url_or_handle: url,
      name: linkForm.name.value.trim(),
      type: detectPlatform(url) || "other",
      category: linkForm.category.value,
      notes: linkForm.notes.value.trim(),
      add_to_watchlist: linkForm.add_to_watchlist.checked,
      status: "pending",
    });
    linkForm.reset();
    showError(linkForm, "");
    updateLinkDetected();
    go("done");
  });

  wireMediaInputs();
}

// ======================================================================= start
function boot() {
  buildPlaceSelects();
  buildListSelects();
  buildChoiceLists();
  wireEvents();
  resetReportForm();
  applyLanguage();
  showView(location.hash.slice(1));
}

boot();
