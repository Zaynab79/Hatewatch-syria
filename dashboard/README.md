# Manager dashboard

Plain HTML/CSS/JS, no build step, no backend. Reads `alerts.json` only (see docs/CONTRACT.md §5).

## Run it

**On its own:**
```bash
cd dashboard
python -m http.server 8080
# open http://localhost:8080
```

**Together with the field app** (`../field-app/`), so the **Staff reporting** panel below can see
its submissions — serve the whole repo from one server at the repo root instead, and open each
app under its own path:
```bash
cd hatewatch
python -m http.server 8080
# open http://localhost:8080/dashboard/  and  http://localhost:8080/field-app/
```
This matters because `localStorage` (see "Staff reporting" below) is shared per **origin**
(scheme+host+port), not per folder — `http://localhost:8080/dashboard/` and
`http://localhost:8080/field-app/` share it, but two separate `http.server` processes on
different ports would not, even on the same machine.

Opening `index.html` directly via `file://` will NOT work (browsers block `fetch()` of local
files) — you'll see a friendly "couldn't load data" message telling you to run the command above.

To refresh the data shown:
```bash
python -m src.detect --messages data/demo/messages_demo.csv --events data/demo/events_demo.csv
# overwrites dashboard/alerts.json
```

## What's in it

- **Alert list** (left): one plain sentence per alert ("Sudden rise of hate speech in Jableh — 45
  times more than usual"), plus a compact `+45×` badge next to the place name for an at-a-glance
  read without parsing the sentence. Color-coded red/orange/yellow, sorted worst first.
- **Map** (right): Leaflet + OpenStreetMap, one marker per place with signal, sized by last-7-day
  hits, colored by that place's worst level. Click a marker → opens its top alert.
- **Click any alert → detail panel**: full sentence, "increased by Xx / appeared N times", and a
  Chart.js timeline — the top few words actually driving the alert (e.g. "طرد" vs "شرموطة") each
  plotted as their own colored curve (`alert.term_timeline`, docs/CONTRACT.md §5), plus a dashed
  "usual" baseline, a thin gray total (off by default, toggle it on via the legend), and a marker
  on the linked event's date if there is one.
- **Add a word** (bottom): typed straight into the visible keyword list below, no review gate —
  tagged *(new)* as a reminder it isn't in `lexicon.csv` yet. **Show current keyword list** shows
  every `approved` lexicon term next to your own; removing an approved one only flags it (this is a
  static page with no write access to `lexicon.csv` — the manager, who IS the reviewer here, still
  edits that file directly) — removing your own just-typed word deletes it outright, it was never
  written anywhere.
- **Add a source** / **Report something that happened** (bottom): websites/channels to watch, or an
  event type + place + description + date for something reported locally (not from a website). The
  event type list and the place dropdown (governorate, with its districts nested) are the exact same
  `EVENT_TYPES` / `PLACES` lists the field app's "Report an event" screen uses (`data.js`, shared with
  `../field-app/data.js`), so a manual entry here and a field report there produce the same shape and can
  both be copied straight into `events.csv`. Neither writes straight into
  `sources.csv`/`events_candidates.csv`/`events.csv` — kept as a visible pending list (browser
  storage) the manager can act on directly; no silent auto-detection bypass, but also no CSV
  hand-off-to-someone-else step, since there's no one else in this loop.
- **Language toggle** (top right): switches every label and every alert sentence to real Arabic
  and flips the whole layout to RTL (`<html dir="rtl">`) — not just translated strings, the CSS
  uses logical properties throughout (`margin-inline`, `border-inline-start`, etc.) so nothing is
  mirror-flipped by hand.
- Every `.panel` (alerts, map, community-input) caps at 70vh and scrolls independently instead of
  growing the page.
- No action recommendations anywhere, per the project's core rule — see the footer note.
- **Staff reporting** (top right, slide-over): what field staff send in through `../field-app/`
  (see that folder's README for the same-origin requirement). Reads straight out of
  `localStorage` (key `hatewatch_field_submissions`) — no backend, no network call. Organized
  into three groups, **Keyword** / **Event · threat** / **Other** (uploads and links share the
  "Other" group), badge shows how many are still open. Click a report to read every field it
  carries (labeled with the same `EVENT_TYPES`/`CATEGORIES`/`PLATFORMS`/`KEYWORD_LANGS` lists as
  the form that collected it, from `data.js`), then **☆ Star** (flags it, sorts it to the top),
  **Close**/**Reopen** (hides it from the default view without deleting it — toggle "Show closed
  reports" to see closed ones again), or **🗑 Delete** (asks to confirm; permanent). Updates live
  if a field report comes in from another tab while this panel is open.
