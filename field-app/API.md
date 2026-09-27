# API for the manager dashboard

> **Status: planned, not built.** The field app is currently a browser-only demo with no server.
> This is the REST API a backend should expose so the manager dashboard can read and review field
> reports. Tables and field names are in [`SCHEMA.md`](SCHEMA.md).

## Basics

- **Base URL:** `/api/v1`
- **Format:** JSON in, JSON out. Timestamps are ISO 8601 in UTC; dates are `YYYY-MM-DD`.
- **Auth:** every request sends `Authorization: Bearer <access token>` (a Supabase Auth JWT).
  The server reads the user's `role` from `profiles`, never from the request.
- **Roles:** `field_staff`, `manager`, `admin`. `admin` can do everything a `manager` can.
- **No sensitive data in URLs.** Filters that include places, dates or search text go in a
  **POST body**, so they don't end up in server logs or browser history. URLs only ever contain
  opaque ids.
- **Pagination:** list endpoints return `next_cursor`. Send it back as `cursor` to get the next page,
  until `next_cursor` is `null`.
- **Errors:** every error has the same shape:

```json
{ "error": { "code": "forbidden", "message": "Managers only." } }
```

| HTTP | `code` | when |
|---|---|---|
| 400 | `invalid_request` | a field is missing or has a bad value (the message says which) |
| 401 | `unauthenticated` | no token, or it has expired |
| 403 | `forbidden` | the role isn't allowed to do this |
| 404 | `not_found` | the id doesn't exist, **or** you aren't allowed to see it |
| 409 | `conflict` | a submission with this `id` already exists (safe to ignore on retry) |

## Endpoints at a glance

| Method | URL | Role | Purpose |
|---|---|---|---|
| GET | `/places` | any | The list of places |
| POST | `/submissions/query` | manager | Filtered list of field reports |
| GET | `/submissions/{id}` | manager (field_staff: own only) | One report with all its details |
| PATCH | `/submissions/{id}` | manager | Review: status, level, note, confirm, approve |
| POST | `/media/{id}/signed-url` | manager (field_staff: own only) | Short-lived link to view a file |
| POST | `/stats/aggregate` | manager | Counts by place and time, for maps and charts |
| GET | `/watchlist` | manager | Watchlisted accounts and channels |
| PATCH | `/watchlist/{id}` | manager | Change an account's watchlist status |
| GET | `/exports/events.csv` | manager | Confirmed events in `events.csv` format |
| GET | `/exports/lexicon.csv` | manager | Approved keywords in `lexicon.csv` format |
| GET | `/exports/sources.csv` | manager | Approved links in `sources.csv` format |
| GET | `/audit-log` | admin | Who changed what |

The field app uses two more (see [the end of this page](#field-app-endpoints-for-context)).

---

## GET `/places`

The place list, the same as `data/places.csv`. Use it to show place names and draw the map.

**Role:** any logged-in user.

**Response `200`:**
```json
{
  "places": [
    { "place_id": "latakia", "name_en": "Latakia", "name_ar": "اللاذقية", "level": "governorate",
      "governorate_id": "latakia", "lat": 35.5317, "lon": 35.7915 },
    { "place_id": "jableh", "name_en": "Jableh", "name_ar": "جبلة", "level": "district",
      "governorate_id": "latakia", "lat": 35.3608, "lon": 35.9264 }
  ]
}
```

---

## POST `/submissions/query`

A filtered, newest-first list of field reports. This is the dashboard's main feed.

**Role:** manager.

**Request body** (every field is optional):

| field | type | meaning |
|---|---|---|
| `kinds` | array of `event` \| `upload` \| `keyword` \| `source` | which kinds of report |
| `place_ids` | array of `place_id` | exact places |
| `governorate_ids` | array of `place_id` | a governorate **and all its districts** |
| `from`, `to` | date | by `created_at`, inclusive |
| `status` | array of `draft` \| `submitted` \| `reviewed` | default: `submitted` and `reviewed` |
| `level` | array of `yellow` \| `orange` \| `red` \| `none` | `none` = not set yet |
| `event_types` | array | only applies to `event` rows |
| `categories` | array | only applies to `upload`, `keyword` and `source` rows |
| `limit` | integer, 1–100 | default 50 |
| `cursor` | string | from the previous page's `next_cursor` |

```json
{
  "kinds": ["event", "upload"],
  "governorate_ids": ["latakia"],
  "from": "2026-09-21",
  "to": "2026-09-27",
  "status": ["submitted"],
  "limit": 20
}
```

**Response `200`:** one summary per report. `summary` is a short line the dashboard can show as-is.
```json
{
  "items": [
    {
      "id": "0b6f1c1e-6a51-4c52-9d0e-2b7f7f1f2a10",
      "kind": "event",
      "status": "submitted",
      "place_id": "jableh",
      "level": null,
      "created_at": "2026-09-27T09:12:00Z",
      "created_by": { "id": "5f0c…", "full_name": "Field worker 1" },
      "summary": "Clashes between groups: armed clashes near the main roundabout",
      "media_count": 2
    },
    {
      "id": "7d2a9b40-3c1e-4f7a-8e55-0c9a1b2d3e4f",
      "kind": "upload",
      "status": "submitted",
      "place_id": "baniyas",
      "level": null,
      "created_at": "2026-09-26T08:05:00Z",
      "created_by": { "id": "9a1d…", "full_name": "Field worker 2" },
      "summary": "Telegram · Coast News 24 · expulsion",
      "media_count": 1
    }
  ],
  "next_cursor": "eyJjcmVhdGVkX2F0IjoiMjAyNi0wOS0yNlQwODowNTowMFoifQ"
}
```

---

## GET `/submissions/{id}`

One report with every field, its files and its review state.

**Role:** manager. A field worker gets their own reports only; anyone else's gives `404`.

**Response `200`, event:**
```json
{
  "id": "0b6f1c1e-6a51-4c52-9d0e-2b7f7f1f2a10",
  "kind": "event",
  "status": "submitted",
  "place_id": "jableh",
  "level": null,
  "created_at": "2026-09-27T09:12:00Z",
  "updated_at": "2026-09-27T09:12:00Z",
  "created_by": { "id": "5f0c…", "full_name": "Field worker 1" },
  "reviewed_by": null,
  "reviewed_at": null,
  "manager_note": null,
  "fields": {
    "type": "clashes",
    "type_other": "",
    "description": "Armed clashes near the main roundabout, about 30 people involved.",
    "is_ongoing": true,
    "occurred_at": "2026-09-27T08:40:00Z",
    "neighbourhood": "Main roundabout",
    "location_shared": false,
    "lat": null,
    "lon": null,
    "confirmed": false,
    "title_en": null,
    "title_ar": null,
    "source_url": null
  },
  "media": [
    { "id": "c3e1…", "type": "image", "mime": "image/jpeg", "size_kb": 412 },
    { "id": "d9f2…", "type": "video", "mime": "video/mp4", "size_kb": 8120 }
  ]
}
```

**`fields` for the other kinds:**
```json
// kind = "upload"
{ "platform": "telegram", "account_name": "Coast News 24", "handle": "@coastnews24",
  "message_text": "…", "category": "expulsion", "note": "", "add_to_watchlist": true,
  "monitored_account_id": "a41b…" }

// kind = "keyword"
{ "term": "فلولي", "variants": "fululi", "language": "ar", "category": "political_label",
  "meaning": "Spelling of «فلول» used in Homs comments", "approval": "pending",
  "term_id": null, "family": null, "target_group": null, "points": null }

// kind = "source"
{ "url_or_handle": "https://t.me/example_channel", "name": "Example channel", "type": "telegram",
  "category": "violence", "notes": "", "add_to_watchlist": true, "approval": "pending",
  "monitored_account_id": null }
```

---

## PATCH `/submissions/{id}`

A manager reviews a report. Send only the fields you're changing.

**Role:** manager.

| field | applies to | meaning |
|---|---|---|
| `status` | all | usually `reviewed` |
| `level` | all | `yellow` \| `orange` \| `red` \| `null` |
| `manager_note` | all | only managers see it |
| `confirmed` | event | `true` puts it into `/exports/events.csv` |
| `title_en`, `title_ar`, `source_url` | event | needed for `events.csv` when confirming |
| `approval` | keyword, source | `approved` \| `rejected` |
| `family`, `target_group`, `points`, `term_id` | keyword | needed for `lexicon.csv` when approving |

```json
{
  "status": "reviewed",
  "level": "orange",
  "confirmed": true,
  "title_en": "Clashes near the main roundabout in Jableh",
  "title_ar": "اشتباكات قرب الدوار الرئيسي في جبلة"
}
```

**Response `200`:** the whole updated report, the same shape as `GET /submissions/{id}`. The server
also sets `reviewed_by`, `reviewed_at` and `updated_at`, and writes a row to `audit_log`.

---

## POST `/media/{id}/signed-url`

A short-lived link to view or download one file. Files are in a private bucket and have no
permanent URL.

**Role:** manager. A field worker only gets links to their own files.

**Request body:** none.

**Response `200`:**
```json
{ "url": "https://…/storage/v1/object/sign/field-uploads/…?token=…", "expires_at": "2026-09-27T09:17:00Z" }
```
The link lasts `SIGNED_URL_TTL_SECONDS` (default 300). Don't store it; ask for a new one each time.

---

## POST `/stats/aggregate`

Counts of reports grouped by place and time period, for hotspot maps and trend charts.

**Role:** manager.

| field | type | meaning |
|---|---|---|
| `group_by` | `place` \| `governorate` | required |
| `interval` | `day` \| `week` \| `month` | required; weeks start on Monday |
| `from`, `to` | date | required |
| `kinds`, `status`, `level`, `event_types`, `categories` | arrays | same filters as `/submissions/query` |

```json
{ "group_by": "place", "interval": "week", "from": "2026-09-01", "to": "2026-09-27", "kinds": ["event", "upload"] }
```

**Response `200`:** one row per place and period that has at least one report. Periods with no
reports are left out, so fill them with zeros when drawing a chart.
```json
{
  "rows": [
    { "place_id": "baniyas", "period_start": "2026-09-21", "total": 7,
      "by_kind": { "event": 2, "upload": 5 }, "by_level": { "red": 0, "orange": 1, "yellow": 3, "none": 3 } },
    { "place_id": "jableh", "period_start": "2026-09-21", "total": 3,
      "by_kind": { "event": 1, "upload": 2 }, "by_level": { "red": 1, "orange": 0, "yellow": 0, "none": 2 } }
  ]
}
```

---

## GET `/watchlist`

Accounts and channels that field staff have reported or asked to watch.

**Role:** manager.

**Query parameters:** `watchlist_status` = `suggested` \| `watching` \| `archived` (optional),
`cursor` (optional). These are not sensitive, so they can go in the URL.

**Response `200`:**
```json
{
  "items": [
    { "id": "a41b…", "platform": "telegram", "account_name": "Coast News 24", "handle": "@coastnews24",
      "url": "https://t.me/coastnews24", "place_id": "baniyas", "watchlist_status": "suggested",
      "first_seen_at": "2026-09-26T08:05:00Z", "report_count": 4, "last_reported_at": "2026-09-27T07:30:00Z" }
  ],
  "next_cursor": null
}
```

## PATCH `/watchlist/{id}`

**Role:** manager.

**Request body:**
```json
{ "watchlist_status": "watching", "place_id": "baniyas" }
```
**Response `200`:** the updated item, the same shape as one entry above.

---

## GET `/exports/events.csv`, `/exports/lexicon.csv`, `/exports/sources.csv`

These produce the files the hatewatch pipeline already reads, so reviewed field reports feed
straight into detection and the dashboard. The columns are exactly as in hatewatch `docs/CONTRACT.md`.

**Role:** manager. **Response:** `text/csv; charset=utf-8`.

| export | includes | columns |
|---|---|---|
| `events.csv` | event reports with `confirmed = true` | `event_id,date,place_id,type,title_ar,title_en,source_url,confirmed` |
| `lexicon.csv` | keyword suggestions with `approval = approved` | `term_id,term,variants,family,target_group,category,points,exclude,status,source` (`source` = `field_staff`) |
| `sources.csv` | link suggestions with `approval = approved` | `source_id,name,type,url_or_handle,notes,status` (`status` = `active`) |

```csv
event_id,date,place_id,type,title_ar,title_en,source_url,confirmed
f_0b6f1c1e,2026-09-27,jableh,clashes,اشتباكات قرب الدوار الرئيسي في جبلة,Clashes near the main roundabout in Jableh,,true
```

---

## GET `/audit-log`

**Role:** admin.

**Query parameters:** `record_id` (optional), `cursor` (optional).

**Response `200`:**
```json
{
  "items": [
    { "id": 1042, "actor": { "id": "77ab…", "full_name": "Manager A" }, "action": "update",
      "table_name": "submissions", "record_id": "0b6f1c1e-6a51-4c52-9d0e-2b7f7f1f2a10",
      "changes": { "status": ["submitted", "reviewed"], "level": [null, "orange"] },
      "created_at": "2026-09-27T10:02:00Z" }
  ],
  "next_cursor": null
}
```

---

## Field app endpoints (for context)

The dashboard doesn't call these, but they're how data gets in.

| Method | URL | Role | Purpose |
|---|---|---|---|
| POST | `/uploads` | field_staff | Upload one file (multipart, field `file`, max `MAX_UPLOAD_MB`). Returns `{ "media_id": "…" }`. Images are re-encoded to strip EXIF/GPS. |
| POST | `/submissions` | field_staff | Send one report: the record the demo already builds (see SCHEMA.md), with `fields.media` replaced by `media_ids`. Because `id` is made on the phone, sending the same report twice returns `409`, which the app treats as success. |
