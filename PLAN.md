# HateWatch Syria: plan

**Goal:** an early-warning dashboard for a Handicap International community manager in Syria.
It says two things, per place and over time:
- ⚡ **Sudden spike**: a hate term (or hate overall) jumps in a place, often right after an event.
- 🔥 **Slow burn**: hate slowly builds up in a place over weeks.

It gives no action recommendations; the manager knows what to do.

**Rule:** we build one step at a time, and each step ends with something we can look at.

---

## How it works

```
SOURCES                                 PROCESSING                                   OUTPUT
Phoenix CSV (Facebook, Instagram…) ─┐
Telegram groups/channels ───────────┼─► clean ─► score each message ─► find place ─► count per place/day ─► detect ─► alerts.json ─► dashboard
WhatsApp (group counts / exports) ──┘                 ▲                    ▲                                  ▲
                                                 lexicon.csv          place list +                       events.csv
                                                 (manager edits)      teammate's IG                          ▲
                                                                      location column                        │
News websites (RSS) / Telegram news channels / news pages ─► event words + place names ─► candidate events ─┘
(sources chosen by the community)                                                          (manager confirms)
```

## Scoring (the teammate's screening sheet, scaled up)

A single word is only a clue. A message scores points from **combinations**:
- **Target** words say who is attacked (Alawites, Kurds, Druze, Shia, Christians, Turks, Bedouins, Arabs, women…).
- **Conduct** words say what is said: a political label (فلول), an insult, captivity (سبايا), violence (اذبح، تصفية) or expulsion (ارحلوا).
- **Counter-speech** words (ندين، نستنكر، condemn) lower the score.
- **Exclude** phrases remove false positives, such as the "Sabaya" fashion and lingerie shops.
- A score of 3 or more means "review" and 7 or more means "priority". Both thresholds are editable.

Spikes and slow burns count scored messages, not raw keyword hits. The HI lexicon and the teammate's sheet merge into one `lexicon.csv`.

---

## Scope: what we build tonight vs. what we pitch

### Tier 1: MUST (the demo). About 7h with 2 devs working in parallel.
One loop working end to end: **messages → score → place → spike/slow burn → map + timeline + alerts.**

| # | Step | Output to check | Who | Time | Status |
|---|---|---|---|---|---|
| 1 | Data contract: formats for lexicon, messages, sources, events and alerts.json | `docs/CONTRACT.md` | Dev A | 20 min | ✅ done |
| 2 | Lexicon v1: HI lexicon plus the teammate's sheet, with Arabic, Latin and Arabizi spellings | `data/lexicon.csv` | politics people, Dev A reviews | 1 h (parallel) | ✅ done |
| 3 | Loader and scoring: read Phoenix CSV (messy), normalise Arabic (للفلول → فلول), combination scoring, find the place from the location column, profile or place names in text | scored sample | Dev A | 1.5 h | ✅ done |
| 4 | Small demo dataset: the real Phoenix sample plus about 2 months of synthetic data around 2–3 real past events (one spike, one slow burn) | `data/demo/` | Dev A | 30 min | ✅ done |
| 5 | Detection: spike (vs the last 14 days), slow burn (6–8 week rise with no single jump), link each alert to an event from 0–3 days before | `alerts.json` | Dev A | 1 h | ✅ done |
| 6 | Events: news sources (RSS) → candidate events → manager confirms into events.csv | `data/events_candidates.csv` | Dev A | 1.5 h | ✅ built (live fetch untested — network blocked in this sandbox, works from a normal machine) |
| 7 | Dashboard: Arabic first with an English toggle, a Syria map with red, orange and yellow markers, an alert list with one plain sentence each, and a timeline with events marked | `dashboard/` | Dev B | 3 h | ✅ done |

### How a confirmed event steers the system (design for steps 5–6)

An event does two DIFFERENT jobs. Keep them separate — one changes what we collect, the other changes
how alarming an alert looks. Neither one silently inflates a raw count: the manager has to be able to
trust that "62 hits" means 62 real hits.

**1. Focus scraping (what we collect) → `watchlist.json`**
When an event in `events.csv` is confirmed for a place, generate a short-lived watchlist entry:
`{place_id, extra_search_terms (place aliases + generic incident hashtags), active_until = event_date + 7 days}`.
This is fed into whatever pulls Instagram data (Phoenix's search config, or a scraping tool) so it searches
that place's hashtags/tags more often for the following week — more coverage exactly where and when it
matters, instead of spreading the same scraping budget evenly over all of Syria all the time.

**2. Raise alert severity, not the count (how alarming it looks) → in `detect.py`**
Counts stay raw and untouched. What an event changes is the **alert's level**: a spike that falls within
0–3 days after a confirmed event in the same place gets bumped one level (e.g. orange → red) and gets
`linked_event_id` set, so the dashboard sentence reads "...right after the clashes in Sweida" instead of
just "...8 times more than usual". This is the `link_events()` function already listed under step 5.

We deliberately do NOT multiply message scores by event-proximity — that would make "62" not really mean
62, which breaks trust and is hard to defend to HI or in the pitch. Raw counts + a severity bump + a named
reason is more honest and just as effective on the dashboard.

### Tier 2: SHOULD (live extras if Tier 1 is done). About 3–4h.

| # | Step | Who | Time |
|---|---|---|---|
| 8 | Telegram: a spare account joins 3–5 public groups, each tagged with a place. It records hourly message counts and feeds messages into the same scoring. | Dev A | 3 h |
| 9 | WhatsApp: a list of groups tagged with a place and type (neighbourhood, sports club, family), plus a manual daily count form. A sudden traffic jump after an event raises a 💬 alert. | Dev B | 2 h |
| 10 | Term form: the community manager adds new coded terms, which stay pending until approved | Dev B | 1 h |

### Tier 3: PITCH ONLY (roadmap slide)
- Bot and campaign detection: many accounts posting the same text within minutes
- Location from commenters: a post made abroad, with most commenters from one Syrian town
- WhatsApp exports and an Android notification counter (counts only)
- Pushing the lexicon into Phoenix through its keyword CSV import, and WhatsApp/Telegram data through its Manual Upload
- Automatic event detection across many news sources

---

## Open issues (to solve now)
- **Phoenix export:** re-export with all columns: `post_datetime`, `post_author_location` and the comment rows.
- **Lexicon:** the HI terms are mostly written in Latin letters and need their Arabic spellings.
- **News sources:** the community names the sources it trusts most; the demo uses 1–2.
- **Telegram:** a spare SIM number (Tier 2).
- **Legal (P5):** for private groups we store counts only, never message text.

## Free tools
- Leaflet + OpenStreetMap (map)
- Chart.js (timeline)
- pandas and scipy (statistics)
- feedparser (news RSS)
- Telethon (Telegram)
- GeoNames (Syrian place names)
