"""Step 6: turn news items (RSS / a Telegram channel / anything with a title+date+link)
into CANDIDATE events, using event words + the places gazetteer. Never touches
data/events.csv, which is manager-owned: candidates go to data/events_candidates.csv,
confirmed=false, until the manager promotes one (copies/edits it into events.csv,
confirmed=true) — that's "the simple form" for tonight; a one-click UI button is
dashboard work (step 7).
"""
from __future__ import annotations

import csv
from datetime import datetime

import pandas as pd

from src.keywords import normalize_ar

# word -> event type. Order matters: first match wins, most specific/severe first.
EVENT_WORDS = [
    ("مجزرة", "massacre"),
    ("مجزره", "massacre"),
    ("تفجير", "bombing"),
    ("قصف", "bombing"),
    ("اغتيال", "killing"),
    ("قتل", "killing"),
    ("اشتباك", "clashes"),
    ("اعتقال", "arrest"),
    ("احتجاج", "other"),   # protests
    ("مظاهرة", "other"),
    ("طرد", "other"),      # expulsion demands, e.g. "طرد الشبيحة"
]


def _find_event_type(norm_text: str) -> str | None:
    for word, etype in EVENT_WORDS:
        if normalize_ar(word) in norm_text:
            return etype
    return None


def _find_place(norm_text: str, places: pd.DataFrame) -> str | None:
    best = None
    best_len = 0
    for _, row in places.iterrows():
        names = [row["name_ar"], row["name_en"]] + (row["aliases"].split("|") if row["aliases"] else [])
        for n in names:
            n_norm = normalize_ar(n)
            if n_norm and n_norm in norm_text and len(n_norm) > best_len:
                best, best_len = row["place_id"], len(n_norm)
    return best


def extract_candidate_events(items: list[dict], places: pd.DataFrame, start_id: int = 1) -> list[dict]:
    """items: [{title, summary, link, published (YYYY-MM-DD), source_id}]"""
    out = []
    for i, item in enumerate(items, start=start_id):
        text = f"{item.get('title', '')} {item.get('summary', '')}"
        norm_text = normalize_ar(text)
        etype = _find_event_type(norm_text)
        place_id = _find_place(norm_text, places)
        if not etype or not place_id:
            continue  # need both a place AND an event word to be worth a manager's click
        out.append({
            "event_id": f"c{i}",
            "date": item.get("published") or datetime.utcnow().date().isoformat(),
            "place_id": place_id,
            "type": etype,
            "title_ar": item.get("title", ""),
            "title_en": item.get("title_en", "(auto-detected — needs a human translation/check)"),
            "source_url": item.get("link", ""),
            "confirmed": "false",
        })
    return out


def fetch_rss_items(url: str, source_id: str) -> list[dict]:
    """Best-effort live fetch. Returns [] (with a printed note) if the network/feed
    isn't reachable from wherever this runs — the extraction logic itself is tested
    offline in tests/test_news_monitor.py, independent of network access."""
    try:
        import feedparser
        feed = feedparser.parse(url)
        if not feed.entries:
            reason = getattr(feed, "bozo_exception", "no entries (network blocked, or feed URL needs checking)")
            print(f"  (0 entries from {url}: {reason})")
        items = []
        for entry in feed.entries[:30]:
            published = None
            if getattr(entry, "published_parsed", None):
                published = datetime(*entry.published_parsed[:6]).date().isoformat()
            items.append({
                "title": entry.get("title", ""),
                "summary": entry.get("summary", ""),
                "link": entry.get("link", ""),
                "published": published,
                "source_id": source_id,
            })
        return items
    except Exception as e:
        print(f"  (could not fetch {url}: {e})")
        return []


def save_candidates(events: list[dict], path: str = "data/events_candidates.csv"):
    fields = ["event_id", "date", "place_id", "type", "title_ar", "title_en", "source_url", "confirmed"]
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(events)


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--sources", default="data/sources.csv")
    ap.add_argument("--places", default="data/places.csv")
    ap.add_argument("--out", default="data/events_candidates.csv")
    args = ap.parse_args()

    sources = pd.read_csv(args.sources, dtype=str)
    places = pd.read_csv(args.places, dtype=str)

    all_items = []
    for _, s in sources.iterrows():
        if s["type"] != "rss":
            continue
        print(f"fetching {s['name']} ({s['url_or_handle']})...")
        all_items += fetch_rss_items(s["url_or_handle"], s["source_id"])

    candidates = extract_candidate_events(all_items, places)
    save_candidates(candidates, args.out)
    print(f"{len(all_items)} items fetched -> {len(candidates)} candidate events -> {args.out}")
    print("Manager reviews these and copies confirmed ones into data/events.csv with confirmed=true.")


if __name__ == "__main__":
    main()
