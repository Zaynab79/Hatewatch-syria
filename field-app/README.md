# Early Warning: field app

A mobile-first web app that NGO **field staff in Syria** use to report what they see: violent events
on the ground, hateful content online (screenshots, photos, videos, documents), new coded keywords, and
links to channels or news. A manager reviews every report. The data feeds the **manager dashboard**
(`../dashboard/`, in this same repo), which looks for places where violence may be building so
prevention work can be planned.

Lives here as `field-app/`, next to `dashboard/`. Its **Staff reporting** side panel reads this
app's submissions straight out of `localStorage` — see
["Connecting to the dashboard"](#connecting-to-the-dashboard) below for the one thing that has to
be true for that to work.

It works in **English and Arabic** (Arabic switches the whole layout to right-to-left) and uses the
same places, field names and visual style as the dashboard.

## Current status: front-end demo, no backend

| Part | State |
|---|---|
| Screens, forms, English/Arabic, phone layout | ✅ Done (`index.html`, `app.js`, `styles.css`) |
| Saving reports | ⚠️ **In this browser only** (`localStorage`). Nothing is sent to a server. |
| Uploaded files | ⚠️ Previewed only. They never leave the phone. |
| Login and roles | ❌ Not built. Every report is saved as `created_by: "demo_field_staff"`. |
| Backend, database, API | ❌ Not built. The design is in [`API.md`](API.md) and [`SCHEMA.md`](SCHEMA.md). |
| Offline sync, PWA install | ❌ Not built |
| Environment variables | None are read yet. When a backend is built, real values go in a git-ignored `.env.local`; see the note at the end of this file. |

## Run it locally

There's nothing to install: no dependencies, build step or server.

**Run it together with the dashboard (so reports show up in "Staff reporting"):** serve the
whole `hatewatch` repo from one server, from the repo root, not from inside `field-app/` — see
["Connecting to the dashboard"](#connecting-to-the-dashboard).

```bash
cd hatewatch
python3 -m http.server 8080
```

Then open `http://localhost:8080/field-app/` (and `http://localhost:8080/dashboard/` in another
tab for the manager side).

**On its own, with no dashboard:** open `field-app/index.html` directly in a browser, or serve
just this folder (`cd field-app && python3 -m http.server 8081`). Reports still save to
`localStorage` either way; they just won't be visible to a dashboard running on a different port.

**On a phone** (same Wi-Fi as the computer running the server above): open
`http://<computer's-IP>:8080/field-app/` on the phone. On a Mac, `ipconfig getifaddr en0` shows
the IP.

Fonts load from Google Fonts. Without internet the app still works, using the system fonts.

## Connecting to the dashboard

The manager dashboard (`../dashboard/`) has a **Staff reporting** side panel that reads this
app's submissions straight out of `localStorage` (key `hatewatch_field_submissions`) — no backend,
no network call, no build step.

The one thing that has to be true: **both apps must be served from the same origin**
(same scheme + host + port). `localStorage` is scoped per-origin, not per-folder, so
`http://localhost:8080/field-app/` and `http://localhost:8080/dashboard/` share it, but
`http://localhost:8080/...` and `http://localhost:8081/...` do NOT, even on the same machine.
That's why the run command above serves the whole repo from one server at the repo root instead
of running a separate `http.server` inside each folder.

## Demo data

There is **no database to seed**.

- **Built-in lists:** places, event types, levels, categories, platforms and languages are in
  [`data.js`](data.js). The places are the same 21 as the dashboard's `data/places.csv`. Edit the lists
  there, then refresh the page.
- **Reports:** use the app to create some. Each one is stored in the browser under the
  `localStorage` key `hatewatch_field_submissions`. To see them, open the browser console (F12) and run:

  ```js
  JSON.parse(localStorage.getItem("hatewatch_field_submissions"))
  ```

  To clear them: `localStorage.removeItem("hatewatch_field_submissions")`.
- **Language:** stored under `hatewatch_lang` (`en` or `ar`). The dashboard uses the same key.

When a backend is built, seeding means loading `places.csv` into the `places` table and creating
one test user per role (see [`SCHEMA.md`](SCHEMA.md)).

## What the screens do

| Screen | What it does |
|---|---|
| Home | A large **Report an event** button, then Upload file, Add keyword and Add link |
| Report an event | 5 steps: what happened, type (a list; "Other" opens a box to type it), when (starts at "now"), where (place + neighbourhood; sharing the exact location is optional and off by default), and optional photos. Field staff don't set severity. |
| Upload file | One button that takes any file type, with a preview and ✕ for each file. A note about slow connections appears for videos and files over 10 MB. Then: where it came from, account, message, type of hate speech and place. "Not online: I took it myself" hides the account fields. At least one file is required. |
| Add keyword | Word, other spellings, language, meaning, category and place. Saved as pending until a manager approves it. |
| Add link | Paste a link and the platform is detected (Telegram, WhatsApp, Facebook, X, TikTok, Instagram or news). Then place, category and optionally the watchlist. |

## Folder structure

```
field-app/
├── index.html        all screens: home, report (5 steps), upload, keyword, link, done
├── styles.css        the look: colours and fonts at the top (same style as the dashboard)
├── app.js            English + Arabic text, moving between screens, the forms, saving
├── data.js           fixed lists: places, event types, levels, categories, platforms, languages
├── API.md            planned REST API for the manager dashboard (not built yet)
├── SCHEMA.md         planned Postgres schema, relationships and access rules (not built yet)
└── README.md
```

(next to it: `../dashboard/`, the manager dashboard, and `../docs/CONTRACT.md`, the shared data
contract both apps are written against)

## Backend integration notes

- **Start with** [`API.md`](API.md) and [`SCHEMA.md`](SCHEMA.md). Every field name in them is what
  `app.js` already produces; see `saveSubmission()` and the four submit handlers at the bottom of
  `app.js`. The dashboard's **Staff reporting** panel (`../dashboard/app.js`) already reads this
  shape straight out of `localStorage` — see "Connecting to the dashboard" above.
- **The saved record shape** is `{ id, kind, status, place_id, level, created_at, created_by, fields }`.
  `kind` is one of `event`, `upload`, `keyword`, `source`. The dashboard additionally sets `starred`
  (boolean) and can set `status` to `closed`, on top of this app's own `draft` \| `submitted` \|
  `reviewed` — both are dashboard-only triage state, this app never reads or writes them.
- **Names match hatewatch** `../docs/CONTRACT.md`:

  | Field app | hatewatch |
  |---|---|
  | `place_id` and the place list | `places.csv` |
  | event `type` (clashes, killing, massacre, bombing, arrest, other) | `events.csv` `type` |
  | `level`: yellow / orange / red (Watch / Warning / Urgent) | alert `level` |
  | keyword `category`, `status: pending` | `lexicon.csv` |
  | link `url_or_handle`, `type`, `status: pending` | `sources.csv` |
  | `hatewatch_lang` | the dashboard's language toggle |

  The planned `/exports/*.csv` endpoints output `events.csv`, `lexicon.csv` and `sources.csv` in
  exactly the format the hatewatch pipeline reads.
- **Rules to keep:**
  - Field staff never set severity (`level`).
  - Events need a manager to confirm them (`confirmed: false` by default).
  - Exact GPS is stored only if the worker chose to share it.
  - Files go in a private bucket and are served through signed URLs.
  - Nothing sensitive goes in a URL.
- **Secrets:** none exist yet. When the backend is added, real values go in `.env.local`, which is
  git-ignored. Only placeholders go in `.env.example`.
