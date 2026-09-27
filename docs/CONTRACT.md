# HateWatch Syria — data contract (v1, Instagram-only, city/district level)

Everyone codes against this. If you need to change a column, edit this file first and say so in the group chat.

Working scope tonight: **Instagram only**, location at **city / district level** (not village/neighbourhood — that's a roadmap item, see PLAN.md). Telegram/WhatsApp columns are reserved but not filled tonight.

---

## 1. `messages.csv` — one row per post OR comment

This is what the Instagram scrape gets converted into. Posts and comments share one table so scoring and place-finding work the same way on both.

| column | type | meaning |
|---|---|---|
| `message_id` | string | unique id (post id, or `post_id:comment_id`) |
| `message_type` | `post` \| `comment` | |
| `parent_post_id` | string | for a comment, the post it's under; empty for a post |
| `platform` | string | `instagram` for now |
| `datetime` | ISO datetime | when it was posted |
| `date` | `YYYY-MM-DD` | derived, for daily counts |
| `author_id` | string | |
| `author_name` | string | |
| `text` | string | may be empty if we're only allowed to keep counts (private source) |
| `like_count` | int, nullable | |
| `comment_count` | int, nullable | posts only |
| `post_location_name` | string, nullable | the place tag the poster put on the POST (comments inherit this) |
| `post_lat` / `post_lon` | float, nullable | coordinates of the tag, if the scrape gives them |

Location is **never** about where the author/account is from — Instagram doesn't give that. It's about where the *post* is tagged, which is what lets us say "this place has a rise of online hate."

## 2. `lexicon.csv` — the keyword list, editable by the community manager

Scaled up from the teammate's screening sheet (`data/reference/teammate_screening_sheet_EPFL_tracking_posts.txt`) and the HI lexicon (`data/reference/HI_lexicon_hate_speech.docx`).

| column | meaning |
|---|---|
| `term_id` | short id, e.g. `t_fulul` |
| `term` | canonical form, Arabic where possible |
| `variants` | other spellings incl. Latin/Arabizi, `\|`-separated |
| `family` | `target` \| `conduct` \| `slur` \| `cue` (see scoring below) |
| `target_group` | who is targeted (for `target`/`slur` rows): Alawite, Kurd, Druze, Shia, Christian, Sunni-Arab, Turkmen, Bedouin, women, Syrian(generic)… |
| `category` | `political_label` \| `insult` \| `captivity` \| `violence` \| `expulsion` \| `dehumanizing_slur` \| `counter_speech` |
| `points` | integer used in scoring (see below) |
| `exclude` | phrases that cancel a match, `\|`-separated (e.g. `fashion\|lingerie\|store\|كتشن\|ستايل`) |
| `status` | `approved` \| `pending` — new terms added by the manager start `pending` |
| `source` | `HI_lexicon` \| `teammate_sheet` \| `manager_added` |

### Scoring a message

A single word is only a clue, not a verdict — this mirrors the teammate's sheet.

1. Normalize Arabic (strip diacritics/tatweel, unify alef/ya/ta-marbuta forms, collapse letter elongation: فلوووول → فلول). Strip common attached prefixes (و/ف/ب/ل/ال) before matching so `للفلول` matches `فلول`.
2. Match every term/variant as a substring; apply `exclude` — if any exclude phrase is present in the text, that term does NOT count.
3. `slur` terms count on their own (they already name a target and an attack in one word, e.g. سبايا used for Alawite women, بويجي for Kurds): **+points** each.
4. `conduct` terms (political label, insult, captivity, violence, expulsion) only count if the message ALSO has a `target` term: if both present, **+points** for the conduct term **+2 combination bonus**. A conduct term with no target present scores 0 (this is what fixes "فلول" alone, or "Sabaya fashion shop", scoring nothing).
5. `cue` terms (condemning/quoting: ندين، نستنكر، نرفض، تحذير، condemn, denounce) **subtract points** — someone denouncing hate isn't hate.
6. Final `score` = sum, floored at 0. `is_hit` = `score >= 3` (editable `REVIEW_THRESHOLD`). `severity` = `high` if `score >= 7` (editable `PRIORITY_THRESHOLD`), else `medium` if hit, else `none`.

Worked example: "طرد كل الفلول من حمص" (drive out all the fulul from Homs) → `فلول` (conduct/political_label, target=implicit but "الفلول" itself names a group so treated as slur-like — see lexicon note) + `طرد` (conduct/expulsion, +3) + combination bonus → score ≥ 5 → hit.

## 3. `places.csv` — city/district gazetteer (Syria)

| column | meaning |
|---|---|
| `place_id` | slug, e.g. `homs`, `jableh` |
| `name_ar` / `name_en` | |
| `aliases` | other spellings, `\|`-separated (Latin transliterations, with/without ال) |
| `level` | `governorate` \| `district` |
| `governorate_id` | parent governorate's `place_id` (self, if this row is a governorate) |
| `lat` / `lon` | centroid, for the map |

A message's `place_id` = best alias match against `post_location_name`; if no tag, try a place name mentioned in `text`. No match → counted in the Syria-wide total only, not shown on the map (`unlocated`).

Village/neighbourhood level is NOT in scope tonight (see PLAN.md open issues) — too little data per village to detect a real spike, and it's a privacy risk. District-level only.

## 4. `events.csv`

| column | meaning |
|---|---|
| `event_id` | |
| `date` | |
| `place_id` | |
| `type` | `massacre` \| `bombing` \| `killing` \| `clashes` \| `arrest` \| `other` |
| `title_ar` / `title_en` | one factual line |
| `source_url` | |
| `confirmed` | `true`/`false` — manager-confirmed vs. auto-detected candidate |

`events.csv` is manager-owned — nothing writes to it automatically. Auto-detected events go to
`data/events_candidates.csv` (same columns, always `confirmed=false`); the manager reviews and
copies the ones they trust into `events.csv` with `confirmed=true`. Only `confirmed=true` rows in
`events.csv` are used for event-linking (step 5 §5a).

## 4b. `sources.csv` — news sources the community picked, for step 6

| column | meaning |
|---|---|
| `source_id` | |
| `name` | |
| `type` | `rss` (Tier 1 tonight) \| `telegram_channel` \| `instagram_account` (Tier 2/3) |
| `url_or_handle` | |
| `notes` | |
| `status` | `pending` (not yet verified live) \| `active` |

`src/news_monitor.py` reads `sources.csv`, fetches each `rss` source, and scans titles/summaries for
an event word (مجزرة، تفجير، اغتيال، قصف، اشتباك، احتجاج، طرد…) **and** a place from `places.csv` —
both are required, so a headline naming a place with no incident, or an incident with no place, is
NOT turned into a candidate. Matches go to `events_candidates.csv`, never `events.csv`.

## 5. `alerts.json` — the ONLY file the dashboard reads

```json
{
  "generated_at": "2026-09-27T02:00:00Z",
  "range": {"start": "2025-01-15", "end": "2025-08-10"},
  "places": [
    {"place_id": "homs", "name_ar": "حمص", "name_en": "Homs", "lat": 34.73, "lon": 36.72,
     "level": "red", "hits_7d": 212, "hits_prev_7d": 60, "top_terms": ["فلول", "نصيرية"]}
  ],
  "alerts": [
    {"alert_id": "a1", "type": "spike", "level": "red", "place_id": "homs", "term": "فلول",
     "date_start": "2025-07-15", "date_end": "2025-07-16", "count": 180, "baseline": 22.0, "ratio": 8.2,
     "linked_event_id": "e3",
     "sentence_ar": "ارتفاع مفاجئ في استخدام «فلول» في حمص — 8 أضعاف المعتاد.",
     "sentence_en": "Sudden rise of «فلول» in Homs — 8 times more than usual.",
     "evidence": {"message_ids": ["..."], "sample_texts": ["..."]}}
  ],
  "timeline": [{"date": "2025-07-15", "place_id": "homs", "term": "*", "count": 180}],
  "events": [{"event_id": "e3", "date": "2025-07-14", "place_id": "homs", "type": "clashes", "title_en": "..."}],
  "unlocated_hits": 340
}
```

- `type`: `spike` (sudden jump vs. the last 14 days) or `slow_burn` (steady rise over 6–8 weeks, no single jump).
- `level`: `yellow` < `orange` < `red`. A `spike` within 0–3 days after a `confirmed=true` event in
  the same place gets `linked_event_id` set and its level bumped one step (§5a below).
- `sentence_ar`/`sentence_en`: ONE plain sentence, no jargon, no action recommendation.

**§5a implemented in `src/detect.py`** (step 5, done):
- `detect_spikes`: daily hits vs. the median of the trailing 14 days (needs ≥7 prior days of
  history before it will flag anything). Consecutive flagged days merge into one alert.
- `detect_slow_burn`: a **rolling** check over trailing 6–8-week windows (not just the dataset's
  final weeks) — at every week, asks "has the trailing window been a steady, non-spiky rise?"
  Rejects a window where growth is monotonic (Spearman ρ>0, p<0.1) AND no single week is more
  than 60% of the window's total activity (that's what tells a slow burn apart from a spike that
  merely got merged into weekly buckets).
- `link_events`: only bumps **spike** severity (a slow burn near an event still gets tagged but
  isn't bumped — the point of a slow burn is that it ISN'T driven by one incident).
- **Documented deviation from the spec above:** detection runs on the *aggregate* daily/weekly
  hit count per place (`term: "*"`), not per individual term — this avoids near-duplicate alerts
  for every synonym of the same slur. `timeline[]` currently only emits `"*"` rows for the same
  reason; per-term breakdown still exists per-alert (`top_terms`, dropped from the final JSON but
  used to write `term` + the sentence + `evidence`).

## Files in this repo right now

```
data/lexicon.csv           — step 2
data/places.csv            — step 1 (seed: 14 governorates + a handful of districts; includes 'haritan',
                              added for the real 2026-09-25 event, see events.csv/e3)
data/sources.csv           — step 6, community-picked news sources (RSS for now)
data/examples/*.csv        — 3-5 example rows per format above, for everyone to check against
                              (events.csv/e3 is a REAL confirmed event, not synthetic)
data/demo/*.csv, alerts.json — step 4/5, synthetic demo data + its generated alerts
data/events_candidates.csv — step 6 output, auto-detected candidates awaiting manager review
src/io.py                  — step 3, Instagram CSV -> messages.csv
src/keywords.py            — step 3, normalize + score
src/detect.py              — step 5, scored messages -> alerts.json (spike/slow-burn/event-linking)
src/news_monitor.py        — step 6, news sources -> events_candidates.csv
```
