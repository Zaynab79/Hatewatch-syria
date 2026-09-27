# HateWatch Syria

Early-warning system for a Handicap International community manager in Syria: **spikes** (sudden rise
of hate speech in a place) and **slow burns** (hate slowly building up in a place), detected from social
media data and confirmed local reports. No action recommendations — the manager decides.

Start with **[docs/CONTRACT.md](docs/CONTRACT.md)** for the exact data formats everyone codes against.

## What's built

| Part | Files | Proof |
|---|---|---|
| Data contract | `docs/CONTRACT.md`, `data/places.csv`, `data/examples/` | `python -m src.validate data/examples` → `OK` |
| Lexicon | `data/lexicon.csv` (HI lexicon + a teammate's screening sheet, merged) | see "Scoring model" below |
| Loader + scoring | `src/io.py`, `src/keywords.py` | `pytest tests/` → all pass |
| Demo dataset | `data/demo/messages_demo.csv` (1,678 synthetic Instagram messages) | see "What the demo dataset proves" below |
| Detection → `alerts.json` | `src/detect.py` | 3/3 expected alerts fire, correctly linked to events |
| News → candidate events | `src/news_monitor.py`, `data/sources.csv` | real Haritan headline → correct candidate event (tested offline) |
| Manager dashboard | `dashboard/` | alerts, map, per-term timeline, EN/AR + RTL toggle — see `dashboard/README.md` |
| Field reporting app | `field-app/` (mobile-first, EN/AR) | NGO field staff report events, uploads, keywords and links; feeds the dashboard's **Staff reporting** panel — see `field-app/README.md` |

**One real data point already confirmed:** on 2026-09-25, Phoenix's own «للفلول» count jumped from
~0 to ~19–20 — the same day as real protests in Haritan (Aleppo countryside) demanding the expulsion
of "shabiha". That event is now `events.csv` row `e3`, with the real article as `source_url`.

## How it works

```
Phoenix export (Instagram) ─► clean ─► score each message ─► find place ─► count per place/day ─► detect ─► alerts.json ─► dashboard
                                 ▲                    ▲                                              ▲
                           lexicon.csv            places.csv                                    events.csv
                       (community-edited)  (city/district gazetteer)                     (manager-confirmed)

News RSS feeds ─► event word + place name found together ─► events_candidates.csv ─► manager reviews ─► events.csv

Field app (NGO staff reports) ─► localStorage ─► dashboard "Staff reporting" panel ─► manager reviews
```

## Scoring model (short version — full version in docs/CONTRACT.md §2)

A single word is only a clue, never a verdict (this is the teammate's screening-sheet idea, scaled up):

- **`slur`** terms score on their own (e.g. سبايا, شبيحة — they already name a target + an attack in one word).
- **`conduct`** terms (فلول, طرد, اذبح…) only score if a **`target`** term is *also* in the same message.
  This is what makes "فلول" alone, or a "Sabaya fashion shop" post, score **0**.
- **`cue`** terms (ندين, نستنكر, condemn…) subtract points — condemning hate isn't hate.
- `exclude` phrases on a term cancel that specific match (fashion/lingerie shop names for سبايا).
- final `score >= 3` → `is_hit`; `score >= 7` → `severity: high`. Both thresholds are one constant to edit
  in `src/keywords.py`.

## What the demo dataset proves

Running `python -m src.detect --messages data/demo/messages_demo.csv --events data/demo/events_demo.csv`
on the synthetic dataset (seed=42, Jan–Aug 2025) produces exactly 3 alerts, all correct:

```
[red] spike     jableh  2025-03-07..2025-03-08  ratio=45.0x  linked to: coastal violence (03-06)
[red] spike     sweida  2025-07-15..2025-07-16  ratio=59.0x  linked to: Sweida clashes (07-14)
[red] slow_burn homs    2025-04-27..2025-06-15  ratio=21.5x  no single week >60% of the rise
```

- Both spikes are correctly matched to their real-type triggering event and bumped to `red`.
- The slow burn is found by a **rolling** 6–8-week check (not just looking at the dataset's last
  weeks) and correctly told apart from a spike (no single week dominates).
- Posts from "Sabaya fashion" / "sabaya lingerie" accounts: **score 0**, correctly not flagged.
- 5 unlocated hateful messages (no place tag/mention) are correctly counted in `unlocated_hits`,
  not silently dropped or wrongly placed.

## News → candidate events

`src/news_monitor.py` requires BOTH an event word (مجزرة، تفجير، اشتباك، احتجاج، طرد…) and a place
name in the same headline before it creates a candidate — tested offline with the real Haritan
headline (`tests/test_news_monitor.py`), which correctly becomes a candidate event, while headlines
with only a place or only an event word correctly produce nothing. Live RSS fetching is implemented
in `fetch_rss_items`; it requires outbound internet access to reach the news sites, which isn't
available in every environment this was developed in, but works from a normal machine. `data/sources.csv`
currently lists Enab Baladi and North Press Agency as a starting point — production use should defer to
whichever sources the community says it trusts most.

## Dashboard + field app: how they connect

`field-app/` is where NGO field staff report events, hateful content, coded keywords and links —
see `field-app/README.md`. It's a front-end demo with no backend yet (the planned one is documented
in `field-app/API.md`/`field-app/SCHEMA.md`), and it saves each report to the browser's `localStorage`.

The dashboard's **Staff reporting** panel reads those reports straight out of that same
`localStorage` key — no server in between. The one requirement is that both apps be served from
the same origin (same host+port), since `localStorage` is scoped per-origin, not per-folder; see
"Run it" in `dashboard/README.md` for the one-server command that makes that true.

## Quickstart

```bash
cd hatewatch
pip install --break-system-packages pandas pytest   # if not already installed

# 1. check every data file matches the contract
python -m src.validate data/examples

# 2. (re)generate the synthetic demo dataset (deterministic, seed=42)
python -m src.demo_data

# 3. run the test suite (scoring, detection, event-matching, demo-data sanity checks)
python -m pytest tests/ -q

# 4. run the full pipeline and produce alerts.json
python -m src.detect --messages data/demo/messages_demo.csv --events data/demo/events_demo.csv \
    --out data/demo/alerts.json

# 5. check news sources for candidate events (needs outbound internet access)
python -m src.news_monitor --out data/events_candidates.csv
```

## Project layout

```
docs/
  CONTRACT.md             the data contract — READ THIS FIRST before touching any file below
  reference/
    phoenix_export_schema_tabulated_messages.py   every column Phoenix's export CAN contain
data/
  places.csv              Syria gazetteer: 14 governorates + districts incl. 'haritan' (real 2026-09-25 event)
  lexicon.csv             keyword list: target / conduct / slur / cue terms, editable by the community manager
  sources.csv             news sources for the news-monitor step (RSS for now)
  examples/               tiny (3-5 row) example of each file format, checked by src/validate.py
                            events.csv here includes e3 — a REAL confirmed event, not synthetic
  demo/                   synthetic demo dataset (src/demo_data.py) + its generated alerts.json
  events_candidates.csv   auto-detected candidate events awaiting manager review (src/news_monitor.py output)
  raw/                    first real Phoenix export we were given (as a PDF) + Phoenix's own export schema
  reference/               source documents: HI's lexicon (.docx) and the teammate's screening sheet
src/
  io.py                   load messages.csv, assign each message a place (post tag → text mention)
  keywords.py             Arabic normalisation + the combination-scoring model
  demo_data.py            generates data/demo/*.csv
  detect.py               spike + slow-burn detection, event-linking → alerts.json (the CLI entry point)
  news_monitor.py         news sources → candidate events (event word + place both required)
  validate.py             checks data files against docs/CONTRACT.md
tests/
  test_pipeline.py        scoring rules, false-positive guard, spike + slow-burn shape in demo data
  test_detect.py          alerts.json correctness: right alerts, right levels, right event links
  test_news_monitor.py    the real Haritan headline → correct candidate event; benign headlines → nothing
dashboard/                 manager dashboard (EN/AR) — see dashboard/README.md
field-app/                mobile-first field reporting app (EN/AR) — see field-app/README.md
```

## Known limitations

- **Instagram only, for now.** Telegram and WhatsApp columns are reserved in the data contract
  (`docs/CONTRACT.md` §1) but not yet populated — see "Research directions" below.
- **City/district level, not village/neighbourhood.** Deliberate: per-village message volume is too
  low to detect a genuine spike reliably, and finer granularity raises re-identification risk for
  small communities.
- **For private groups, only message counts are ever stored, never message text** — a deliberate
  privacy line, not an oversight.
- **News sources are a starting point** (2 outlets), not a vetted community list yet.
- **The field app has no backend yet** — see "Dashboard + field app" above.

## Research directions

Ideas we'd pursue next, not yet built:

- **Better geolocation via Phoenix's cross-platform data.** Instagram posts rarely carry a usable
  location; Facebook pages more often do. Since Phoenix already gathers both platforms, one direction
  is to automatically match an Instagram account to a Facebook page/account it's linked to (many
  organisations and public accounts cross-post or list one), and use that Facebook page's declared
  location to backfill coordinates for Instagram content that has none today.
- **Locating a post by its audience, not just its author.** A post can be published from outside
  Syria (a diaspora account, for instance) while still being squarely about one Syrian town.
  Phoenix's schema already separates post authors from comment authors
  (`docs/reference/phoenix_export_schema_tabulated_messages.py`); cross-referencing where a post's
  *commenters* are from — even when the poster itself is abroad — could estimate a post's effective
  place of relevance instead of relying on the author's own location alone.
- **Telegram:** a small set of public groups, each tagged with a place, feeding hourly message
  counts into the same scoring pipeline (columns already reserved in `messages.csv`).
- **WhatsApp:** a list of groups tagged by place and type, with daily counts (manual or automated);
  a sudden traffic jump right after a confirmed event raises its own alert.
- **Community term-approval workflow:** a lightweight review queue so new coded terms submitted by
  field staff, or typed into the dashboard's "Add a word" box, need a manager's sign-off before they
  start counting toward scores.
- **Coordinated-campaign detection:** flag many accounts posting near-identical text within minutes
  of each other — a stronger signal than any single message's score.
- **Wider news coverage:** scale `news_monitor.py` past the 1–2 RSS sources used for this demo as the
  community identifies more outlets it trusts.

The Phoenix repo stays untouched in `../phoenix`.
