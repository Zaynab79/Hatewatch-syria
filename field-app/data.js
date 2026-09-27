/* HateWatch Syria — field app: fixed lists and demo data.
 *
 * Everything here uses the SAME names as the manager dashboard's data contract
 * (docs/CONTRACT.md in the hatewatch repo), so field reports can later be merged
 * straight into places.csv / events.csv / lexicon.csv / sources.csv.
 *
 * To change a list (add a place, rename a category), edit it here. No build step needed.
 */

// Copied from data/places.csv. level = governorate | district; districts point to their governorate.
const PLACES = [
  { place_id: "damascus",    name_ar: "دمشق",          name_en: "Damascus",     level: "governorate", governorate_id: "damascus",    lat: 33.5138, lon: 36.2765 },
  { place_id: "rif_dimashq", name_ar: "ريف دمشق",       name_en: "Rif Dimashq",  level: "governorate", governorate_id: "rif_dimashq", lat: 33.5,    lon: 36.3 },
  { place_id: "aleppo",      name_ar: "حلب",           name_en: "Aleppo",       level: "governorate", governorate_id: "aleppo",      lat: 36.2021, lon: 37.1343 },
  { place_id: "homs",        name_ar: "حمص",           name_en: "Homs",         level: "governorate", governorate_id: "homs",        lat: 34.7324, lon: 36.7137 },
  { place_id: "hama",        name_ar: "حماة",          name_en: "Hama",         level: "governorate", governorate_id: "hama",        lat: 35.1318, lon: 36.7578 },
  { place_id: "latakia",     name_ar: "اللاذقية",       name_en: "Latakia",      level: "governorate", governorate_id: "latakia",     lat: 35.5317, lon: 35.7915 },
  { place_id: "tartus",      name_ar: "طرطوس",         name_en: "Tartus",       level: "governorate", governorate_id: "tartus",      lat: 34.8886, lon: 35.8869 },
  { place_id: "idlib",       name_ar: "إدلب",          name_en: "Idlib",        level: "governorate", governorate_id: "idlib",       lat: 35.9306, lon: 36.6339 },
  { place_id: "daraa",       name_ar: "درعا",          name_en: "Daraa",        level: "governorate", governorate_id: "daraa",       lat: 32.6189, lon: 36.1021 },
  { place_id: "sweida",      name_ar: "السويداء",       name_en: "Sweida",       level: "governorate", governorate_id: "sweida",      lat: 32.7094, lon: 36.5697 },
  { place_id: "quneitra",    name_ar: "القنيطرة",       name_en: "Quneitra",     level: "governorate", governorate_id: "quneitra",    lat: 33.1263, lon: 35.8244 },
  { place_id: "deir_ez_zor", name_ar: "دير الزور",      name_en: "Deir ez-Zor",  level: "governorate", governorate_id: "deir_ez_zor", lat: 35.3359, lon: 40.1408 },
  { place_id: "raqqa",       name_ar: "الرقة",         name_en: "Raqqa",        level: "governorate", governorate_id: "raqqa",       lat: 35.95,   lon: 39.01 },
  { place_id: "hasakah",     name_ar: "الحسكة",        name_en: "Hasakah",      level: "governorate", governorate_id: "hasakah",     lat: 36.5024, lon: 40.7477 },
  { place_id: "jableh",      name_ar: "جبلة",          name_en: "Jableh",       level: "district",    governorate_id: "latakia",     lat: 35.3608, lon: 35.9264 },
  { place_id: "baniyas",     name_ar: "بانياس",        name_en: "Baniyas",      level: "district",    governorate_id: "tartus",      lat: 35.1804, lon: 35.9438 },
  { place_id: "qardaha",     name_ar: "القرداحة",       name_en: "Qardaha",      level: "district",    governorate_id: "latakia",     lat: 35.4167, lon: 36.0833 },
  { place_id: "sahnaya",     name_ar: "صحنايا",        name_en: "Sahnaya",      level: "district",    governorate_id: "rif_dimashq", lat: 33.4167, lon: 36.2167 },
  { place_id: "sweida_city", name_ar: "مدينة السويداء", name_en: "Sweida city",  level: "district",    governorate_id: "sweida",      lat: 32.7094, lon: 36.5697 },
  { place_id: "qamishli",    name_ar: "القامشلي",       name_en: "Qamishli",     level: "district",    governorate_id: "hasakah",     lat: 37.0522, lon: 41.228 },
  { place_id: "haritan",     name_ar: "حريتان",        name_en: "Haritan",      level: "district",    governorate_id: "aleppo",      lat: 36.3167, lon: 37.1333 },
];

// events.csv `type` values (CONTRACT §4). Choosing "other" shows a box to type what it was.
const EVENT_TYPES = [
  { id: "clashes",  en: "Clashes between groups", ar: "اشتباكات بين مجموعات" },
  { id: "killing",  en: "Killing",                ar: "قتل" },
  { id: "massacre", en: "Massacre",               ar: "مجزرة" },
  { id: "bombing",  en: "Bombing or shelling",    ar: "تفجير أو قصف" },
  { id: "arrest",   en: "Arrest",                 ar: "اعتقال" },
  { id: "other",    en: "Other",                  ar: "أخرى" },
];

// Alert levels, same colours and words as the dashboard (yellow < orange < red).
const LEVELS = [
  { id: "yellow", en: "Watch",   ar: "مراقبة" },
  { id: "orange", en: "Warning", ar: "تحذير" },
  { id: "red",    en: "Urgent",  ar: "عاجل" },
];

// lexicon.csv `category` values (CONTRACT §2).
const CATEGORIES = [
  { id: "political_label",   en: "Political label",          ar: "تسمية سياسية" },
  { id: "insult",            en: "Insult",                   ar: "إهانة" },
  { id: "captivity",         en: "Captivity / taking women", ar: "سبي" },
  { id: "violence",          en: "Call for violence",        ar: "دعوة للعنف" },
  { id: "expulsion",         en: "Call to expel people",     ar: "دعوة للطرد أو التهجير" },
  { id: "dehumanizing_slur", en: "Dehumanizing word",        ar: "كلمة مهينة تجرّد من الإنسانية" },
  { id: "counter_speech",    en: "Speaking against hate",    ar: "خطاب مضاد للكراهية" },
];

// messages.csv `platform` values. Only instagram is used by the pipeline today; the rest are reserved.
// The upload screen's "Where did it come from?" list uses all of these.
const PLATFORMS = [
  { id: "instagram", en: "Instagram", ar: "إنستغرام" },
  { id: "telegram",  en: "Telegram",  ar: "تلغرام" },
  { id: "whatsapp",  en: "WhatsApp",  ar: "واتساب" },
  { id: "facebook",  en: "Facebook",  ar: "فيسبوك" },
  { id: "x",         en: "X (Twitter)", ar: "إكس (تويتر)" },
  { id: "tiktok",    en: "TikTok",    ar: "تيك توك" },
  { id: "news",      en: "News website", ar: "موقع إخباري" },
  { id: "other",     en: "Other",     ar: "أخرى" },
  // Not from the internet: a photo or video the field worker took themselves. Hides the account fields.
  { id: "own_recording", en: "Not online: I took it myself", ar: "ليس من الإنترنت: صوّرته بنفسي" },
];

// Languages a keyword can be written in.
const KEYWORD_LANGS = [
  { id: "ar",       en: "Arabic",                  ar: "العربية" },
  { id: "arabizi",  en: "Arabizi (Arabic in Latin letters)", ar: "عربيزي (عربي بحروف لاتينية)" },
  { id: "en",       en: "English",                 ar: "الإنجليزية" },
  { id: "ku",       en: "Kurdish",                 ar: "الكردية" },
];
