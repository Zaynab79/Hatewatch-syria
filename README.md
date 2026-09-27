# HateWatch Syria

Early-warning dashboard for a Handicap International community manager in Syria: **spikes** (sudden rise
of hate speech in a place) and **slow burns** (hate slowly building up in a place), from Instagram data.
No action recommendations — the manager decides.

Start with **[PLAN.md](PLAN.md)** for the build plan (steps, owners, timing) and
**[docs/CONTRACT.md](docs/CONTRACT.md)** for the exact data formats everyone codes against.

## Status: all 7 Tier 1 steps done and tested

| # | Step | Files | Proof |
|---|---|---|---|
| 1 | Data contract | `docs/CONTRACT.md`, `data/places.csv`, `data/examples/` | `python -m src.validate data/examples` → `OK` |
| 2 | Lexicon | `data/lexicon.csv` (HI lexicon + teammate's screening sheet, merged) | see "Scoring model" below |
| 3 | Loader + scoring | `src/io.py`, `src/keywords.py` | `pytest tests/` → all pass |
| 4 | Demo dataset | `data/demo/messages_demo.csv` (1,678 synthetic Instagram messages) | see "What the demo proves" below |
| 5 | Detection → `alerts.json` | `src/detect.py` | 3/3 expected alerts fire, correctly linked to events |
| 6 | News → candidate events | `src/news_monitor.py`, `data/sources.csv` | real Haritan headline → correct candidate event (tested offline) |
| 7 | Dashboard | `dashboard/` (`index.html`, `styles.css`, `app.js`) | served locally, all assets `200`, alerts/map/detail-chart/EN-AR-RTL toggle verified against real generated data — see `dashboard/README.md` |

**One real data point already confirmed:** on 2026-09-25, Phoenix's own «للفلول» count jumped from
~0 to ~19–20 — the same day as real protests in Haritan (Aleppo countryside) demanding the expulsion
of "shabiha". That event is now `events.csv` row `e3`, with the real article as `source_url`.

Tier 1 (the demo) is complete. See PLAN.md for Tier 2/3 (live Telegram/WhatsApp, term-approval form, roadmap).

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

# 5. check news sources for candidate events (needs real network — blocked in some sandboxes)
python -m src.news_monitor --out data/events_candidates.csv
```

## Project layout

```
PLAN.md                  build plan: steps, owners, timing, open issues
docs/
  CONTRACT.md             the data contract — READ THIS FIRST before touching any file below
  reference/
    phoenix_export_schema_tabulated_messages.py   every column Phoenix's export CAN contain
data/
  places.csv              Syria gazetteer: 14 governorates + districts incl. 'haritan' (real 2026-09-25 event)
  lexicon.csv             keyword list: target / conduct / slur / cue terms, editable by the community manager
  sources.csv             news sources for step 6 (RSS for now)
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

## Step 6: news → candidate events

`src/news_monitor.py` requires BOTH an event word (مجزرة، تفجير، اشتباك، احتجاج، طرد…) and a place
name in the same headline before it creates a candidate — tested offline with the real Haritan
headline (`tests/test_news_monitor.py`), which correctly becomes a candidate event, while headlines
with only a place or only an event word correctly produce nothing. Live RSS fetching is implemented
in `fetch_rss_items` but untested end-to-end here — this sandbox's network proxy blocks the news
sites (403); it should work from a normal machine. `data/sources.csv` currently lists Enab Baladi
and North Press Agency — verify/replace with whatever the community says they actually trust.

The Phoenix repo stays untouched in `../phoenix`.
