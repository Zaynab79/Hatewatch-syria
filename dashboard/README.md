# Dashboard (step 7)

Plain HTML/CSS/JS, no build step, no backend. Reads `alerts.json` only (see docs/CONTRACT.md §5).

## Run it

```bash
cd dashboard
python -m http.server 8080
# open http://localhost:8080
```

Opening `index.html` directly via `file://` will NOT work (browsers block `fetch()` of local
files) — you'll see a friendly "couldn't load data" message telling you to run the command above.

To refresh the data shown:
```bash
python -m src.detect --messages data/demo/messages_demo.csv --events data/demo/events_demo.csv
# overwrites dashboard/alerts.json
```

## What's in it

- **Alert list** (left): one plain sentence per alert ("Sudden rise of hate speech in Jableh — 45
  times more than usual"), color-coded red/orange/yellow, sorted worst first.
- **Map** (right): Leaflet + OpenStreetMap, one marker per place with signal, sized by last-7-day
  hits, colored by that place's worst level. Click a marker → opens its top alert.
- **Click any alert → detail panel**: full sentence, "increased by Xx / appeared N times", a
  Chart.js timeline (daily count + a dashed "usual" baseline + a marker on the linked event's date
  if there is one), and a few real example messages (collapsed by default).
- **Add a word / Add a source** (bottom): the manager can type in new coded terms or
  websites/channels to watch. These are **not** written straight into `lexicon.csv`/`sources.csv` —
  they're kept as a pending list (browser storage) with a "Download list" button that exports two
  CSVs for a teammate to review and merge. No silent auto-detection bypass.
- **Language toggle** (top right): switches every label and every alert sentence to real Arabic
  and flips the whole layout to RTL (`<html dir="rtl">`) — not just translated strings, the CSS
  uses logical properties throughout (`margin-inline`, `border-inline-start`, etc.) so nothing is
  mirror-flipped by hand.
- No action recommendations anywhere, per the project's core rule — see the footer note.

## Verified in this sandbox
- `node --check app.js` → no syntax errors.
- `python -m src.detect ...` → generates `alerts.json` with the expected 3 alerts.
- Served via `python -m http.server` and fetched `index.html` / `app.js` / `styles.css` /
  `alerts.json` with `curl` → all `200`.
- Every field `app.js` reads (`place_id`, `hits_7d`, `sentence_ar`/`sentence_en`, `top_terms`,
  `linked_event_id`, `title_ar`/`title_en`, timeline rows with `term: "*"`, etc.) checked against
  the real generated `alerts.json` — all match.
- Full in-browser visual check (does the map actually render, does the chart look right) still
  needs a real browser — do that once this is synced to your machine.
