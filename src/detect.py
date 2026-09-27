"""Step 5: turn scored+placed messages into alerts.json (docs/CONTRACT.md #5).

Simplification (documented deviation): spike/slow-burn detection runs on the AGGREGATE
daily hit count per place ("*" = all terms combined), not per individual term. Per-term
breakdowns still appear in each alert's `top_terms` / evidence, derived from the matched
terms inside the alert's own window. Running full per-term detection is a fast follow-up
(it mainly means repeating detect_spikes/detect_slow_burn once per term_id), but the
combined signal is what actually matters for "is this place getting worse" and it avoids
flooding the manager with near-duplicate alerts for every synonym of the same slur.
"""
from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
from scipy import stats

REVIEW_THRESHOLD = 3  # kept in sync with src/keywords.py

SPIKE_MIN_COUNT = 5
SPIKE_RATIO_YELLOW = 3
SPIKE_RATIO_ORANGE = 5
SPIKE_RATIO_RED = 8
BASELINE_WINDOW_DAYS = 14
MIN_BASELINE_HISTORY_DAYS = 7  # need at least this many prior days before we trust a baseline

SLOWBURN_WEEKS = 8
SLOWBURN_MIN_WEEKS = 6
SLOWBURN_MIN_BASELINE = 3  # first-third count floor; below this, last/first is noise, not a trend
SLOWBURN_MAX_GAP_WEEKS = 1  # bridge a single non-flagged week when merging a run of flagged weeks
SLOWBURN_RATIO_YELLOW = 1.5
SLOWBURN_RATIO_ORANGE = 2.0
SLOWBURN_RATIO_RED = 3.0

EVENT_LINK_WINDOW_DAYS = 3
LEVELS = ["yellow", "orange", "red"]


def _bump(level: str) -> str:
    i = LEVELS.index(level)
    return LEVELS[min(i + 1, len(LEVELS) - 1)]


def daily_counts(scored: pd.DataFrame) -> pd.DataFrame:
    """Per (place_id, date) count of hits, "*" aggregate. Places with no place_id are
    excluded here (they still count toward unlocated_hits, computed separately)."""
    hits = scored[scored["is_hit"] & scored["place_id"].notna()]
    counts = hits.groupby(["place_id", "date"]).size().rename("count").reset_index()
    return counts


def _full_date_index(counts: pd.DataFrame, place_id: str, start: str, end: str) -> pd.Series:
    """Daily count series for one place, zero-filled over [start, end]."""
    idx = pd.date_range(start, end, freq="D")
    sub = counts[counts.place_id == place_id].set_index("date")["count"]
    sub.index = pd.to_datetime(sub.index)
    return sub.reindex(idx, fill_value=0)


def _top_terms(scored: pd.DataFrame, place_id: str, date_start: str, date_end: str, n=3) -> list[str]:
    rows = scored[
        (scored.place_id == place_id) & scored.is_hit
        & (scored.date >= date_start) & (scored.date <= date_end)
    ]
    ctr = Counter(t for terms in rows["matched_terms"] for t in terms)
    return [t for t, _ in ctr.most_common(n)]


def _evidence(scored: pd.DataFrame, place_id: str, date_start: str, date_end: str, n=5) -> dict:
    rows = scored[
        (scored.place_id == place_id) & scored.is_hit
        & (scored.date >= date_start) & (scored.date <= date_end)
    ].sort_values("score", ascending=False)
    return {
        "message_ids": rows["message_id"].head(n).tolist(),
        "sample_texts": [t[:140] for t in rows["text"].head(3).tolist()],
    }


def detect_spikes(scored: pd.DataFrame, places: pd.DataFrame) -> list[dict]:
    counts = daily_counts(scored)
    alerts = []
    place_names = places.set_index("place_id")

    for place_id in counts.place_id.unique():
        start = scored.date.min()
        end = scored.date.max()
        series = _full_date_index(counts, place_id, start, end)

        flagged = []
        for i, day in enumerate(series.index):
            history = series.iloc[max(0, i - BASELINE_WINDOW_DAYS):i]
            if len(history) < MIN_BASELINE_HISTORY_DAYS:
                flagged.append(None)
                continue
            baseline = max(float(history.median()), 1.0)
            count = series.iloc[i]
            ratio = count / baseline
            if count >= SPIKE_MIN_COUNT and ratio >= SPIKE_RATIO_YELLOW:
                level = "red" if ratio >= SPIKE_RATIO_RED else "orange" if ratio >= SPIKE_RATIO_ORANGE else "yellow"
                flagged.append({"date": day, "count": int(count), "baseline": baseline, "ratio": ratio, "level": level})
            else:
                flagged.append(None)

        # merge consecutive flagged days into one alert
        i = 0
        while i < len(flagged):
            if flagged[i] is None:
                i += 1
                continue
            j = i
            while j + 1 < len(flagged) and flagged[j + 1] is not None:
                j += 1
            window = flagged[i:j + 1]
            date_start = window[0]["date"].date().isoformat()
            date_end = window[-1]["date"].date().isoformat()
            total_count = sum(w["count"] for w in window)
            avg_baseline = sum(w["baseline"] for w in window) / len(window)
            ratio = total_count / (avg_baseline * len(window))
            level = max((w["level"] for w in window), key=LEVELS.index)
            terms = _top_terms(scored, place_id, date_start, date_end)
            name_en = place_names.loc[place_id, "name_en"]
            name_ar = place_names.loc[place_id, "name_ar"]
            alerts.append({
                "alert_id": f"sp_{place_id}_{date_start}",
                "type": "spike",
                "level": level,
                "place_id": place_id,
                "term": terms[0] if terms else "*",
                "date_start": date_start,
                "date_end": date_end,
                "count": total_count,
                "baseline": round(avg_baseline, 1),
                "ratio": round(ratio, 1),
                "linked_event_id": None,
                "sentence_ar": f"ارتفاع مفاجئ في خطاب الكراهية في {name_ar} — {ratio:.0f} أضعاف المعتاد.",
                "sentence_en": f"Sudden rise of hate speech in {name_en} — {ratio:.0f} times more than usual.",
                "evidence": _evidence(scored, place_id, date_start, date_end),
                "top_terms": terms,
            })
            i = j + 1
    return alerts


def _slow_burn_window_check(y: np.ndarray) -> dict | None:
    """y: weekly counts, oldest-first. Returns level/ratio dict if this window looks like
    a slow burn (steady rise, no single week dominating), else None."""
    n = len(y)
    if n < SLOWBURN_MIN_WEEKS:
        return None
    k = max(1, n // 3)
    first, last = y[:k].sum(), y[-k:].sum()
    rise = last - first
    if rise <= 0 or first < SLOWBURN_MIN_BASELINE:
        return None  # baseline too thin (e.g. one stray hit) for last/first to mean anything
    if np.all(y == y[0]):
        return None  # flat/constant window: no trend to speak of
    x = np.arange(n)
    rho, p = stats.spearmanr(x, y)
    ratio = last / max(first, 1.0)
    if y.max() > 0.6 * y.sum():
        return None  # one week alone is most of the window's activity -> that's a spike, not a burn
    if not (rho > 0 and p < 0.1 and ratio >= SLOWBURN_RATIO_YELLOW):
        return None
    level = "red" if ratio >= SLOWBURN_RATIO_RED else "orange" if ratio >= SLOWBURN_RATIO_ORANGE else "yellow"
    return {"ratio": ratio, "level": level, "baseline": first / k}


def detect_slow_burn(scored: pd.DataFrame, places: pd.DataFrame) -> list[dict]:
    """Rolling check: at each week, look back over the trailing 6-8 weeks and ask
    'has this place been quietly getting worse?' — same idea as detect_spikes, but on
    weekly totals instead of daily ones. Consecutive flagged weeks merge into one alert."""
    counts = daily_counts(scored)
    alerts = []
    place_names = places.set_index("place_id")

    for place_id in counts.place_id.unique():
        start, end = scored.date.min(), scored.date.max()
        series = _full_date_index(counts, place_id, start, end)
        weekly = series.resample("W-SUN").sum()
        y_all = weekly.values.astype(float)

        flagged = [None] * len(weekly)
        for i in range(SLOWBURN_MIN_WEEKS - 1, len(weekly)):
            window = y_all[max(0, i - SLOWBURN_WEEKS + 1): i + 1]
            flagged[i] = _slow_burn_window_check(window)

        i = 0
        while i < len(flagged):
            if flagged[i] is None:
                i += 1
                continue
            j = i
            gap = 0
            # bridge single-week gaps: the trailing 6-8-week windows overlap heavily between
            # adjacent weeks, so one week dipping just under the ratio threshold by noise
            # (see e.g. the Homs demo data) is still the same rise, not a separate burn ending
            # and a new one starting — merging them avoids reporting near-duplicate alerts.
            while j + 1 < len(flagged):
                if flagged[j + 1] is not None:
                    j += 1
                    gap = 0
                elif gap < SLOWBURN_MAX_GAP_WEEKS:
                    j += 1
                    gap += 1
                else:
                    break
            while flagged[j] is None:  # don't end the alert on a bridged gap week
                j -= 1
            window_flags = [d for d in flagged[i:j + 1] if d is not None]
            best = max(window_flags, key=lambda d: LEVELS.index(d["level"]) if d["level"] in LEVELS else -1)
            n_weeks = j - i + 1
            date_start = weekly.index[max(0, i - SLOWBURN_WEEKS + 1)].date().isoformat()
            date_end = weekly.index[j].date().isoformat()
            terms = _top_terms(scored, place_id, date_start, date_end)
            name_en = place_names.loc[place_id, "name_en"]
            name_ar = place_names.loc[place_id, "name_ar"]
            alerts.append({
                "alert_id": f"sb_{place_id}_{date_start}",
                "type": "slow_burn",
                "level": best["level"],
                "place_id": place_id,
                "term": terms[0] if terms else "*",
                "date_start": date_start,
                "date_end": date_end,
                "count": int(sum(y_all[max(0, i - SLOWBURN_WEEKS + 1): j + 1])),
                "baseline": round(best["baseline"], 1),
                "ratio": round(best["ratio"], 1),
                "linked_event_id": None,
                "sentence_ar": f"تصاعد بطيء وثابت في خطاب الكراهية في {name_ar} على مدى عدة أسابيع.",
                "sentence_en": f"Hate speech has been slowly rising in {name_en} for several weeks in a row.",
                "evidence": _evidence(scored, place_id, date_start, date_end),
                "top_terms": terms,
            })
            i = j + 1
    return alerts


def link_events(alerts: list[dict], events: pd.DataFrame) -> list[dict]:
    confirmed = events[events["confirmed"].astype(str).str.lower() == "true"]
    for alert in alerts:
        candidates = confirmed[confirmed.place_id == alert["place_id"]]
        for _, ev in candidates.iterrows():
            ev_date = datetime.fromisoformat(ev["date"])
            alert_start = datetime.fromisoformat(alert["date_start"])
            window_end = ev_date + timedelta(days=EVENT_LINK_WINDOW_DAYS)
            if ev_date <= alert_start <= window_end:
                alert["linked_event_id"] = ev["event_id"]
                if alert["type"] == "spike":
                    alert["level"] = _bump(alert["level"])
                    alert["sentence_en"] += f" This came right after: {ev['title_en']}."
                    alert["sentence_ar"] += f" جاء ذلك بعد: {ev['title_ar']}."
                break
    return alerts


def place_summaries(scored: pd.DataFrame, places: pd.DataFrame, alerts: list[dict]) -> list[dict]:
    counts = daily_counts(scored)
    end = pd.to_datetime(scored.date.max())
    last7 = (end - timedelta(days=6)).date().isoformat()
    prev7_start = (end - timedelta(days=13)).date().isoformat()
    prev7_end = (end - timedelta(days=7)).date().isoformat()
    last14_start = (end - timedelta(days=13)).date().isoformat()

    out = []
    for _, p in places.iterrows():
        pid = p["place_id"]
        place_alerts = [a for a in alerts if a["place_id"] == pid]
        # level reflects the worst alert this place has ever had in the dataset (this is a
        # retrospective view over history, not a "right now" live feed — see PLAN.md).
        level = max((a["level"] for a in place_alerts), key=LEVELS.index, default="green")
        hits_7d = int(counts[(counts.place_id == pid) & (counts.date >= last7)]["count"].sum())
        hits_prev_7d = int(counts[(counts.place_id == pid) & (counts.date >= prev7_start) & (counts.date <= prev7_end)]["count"].sum())
        top_terms = _top_terms(scored, pid, last14_start, end.date().isoformat()) or \
            _top_terms(scored, pid, scored.date.min(), scored.date.max())
        if hits_7d == 0 and hits_prev_7d == 0 and not place_alerts:
            continue  # keep the dashboard uncluttered: no signal, don't list the place
        out.append({
            "place_id": pid, "name_ar": p["name_ar"], "name_en": p["name_en"],
            "lat": float(p["lat"]), "lon": float(p["lon"]),
            "level": level, "hits_7d": hits_7d, "hits_prev_7d": hits_prev_7d, "top_terms": top_terms,
        })
    return out


def build_timeline(scored: pd.DataFrame) -> list[dict]:
    counts = daily_counts(scored)
    return [
        {"date": r["date"], "place_id": r["place_id"], "term": "*", "count": int(r["count"])}
        for _, r in counts.iterrows()
    ]


def build_alerts_json(scored: pd.DataFrame, places: pd.DataFrame, events: pd.DataFrame) -> dict:
    spikes = detect_spikes(scored, places)
    slow_burns = detect_slow_burn(scored, places)
    alerts = link_events(spikes + slow_burns, events)
    for a in alerts:
        a.pop("top_terms", None)  # was only needed to build the sentence/evidence

    places_out = place_summaries(scored, places, alerts)
    timeline = build_timeline(scored)
    events_out = [
        {"event_id": r["event_id"], "date": r["date"], "place_id": r["place_id"],
         "type": r["type"], "title_ar": r["title_ar"], "title_en": r["title_en"]}
        for _, r in events.iterrows() if str(r["confirmed"]).lower() == "true"
    ]
    unlocated = int((scored["is_hit"] & scored["place_id"].isna()).sum())

    return {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "range": {"start": scored.date.min(), "end": scored.date.max()},
        "places": places_out,
        "alerts": sorted(alerts, key=lambda a: LEVELS.index(a["level"]), reverse=True),
        "timeline": timeline,
        "events": events_out,
        "unlocated_hits": unlocated,
    }


def main():
    import argparse
    from src.io import load_messages, load_places, assign_place
    from src.keywords import Lexicon, match_keywords

    ap = argparse.ArgumentParser()
    ap.add_argument("--messages", required=True)
    ap.add_argument("--lexicon", default="data/lexicon.csv")
    ap.add_argument("--places", default="data/places.csv")
    ap.add_argument("--events", default="data/examples/events.csv")
    ap.add_argument("--out", default="dashboard/alerts.json")
    args = ap.parse_args()

    lex = Lexicon.load(args.lexicon)
    places = load_places(args.places)
    events = pd.read_csv(args.events, dtype=str)
    df = load_messages(args.messages)
    scored = match_keywords(df, lex)
    scored = assign_place(scored, places)

    result = build_alerts_json(scored, places, events)

    import os
    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"wrote {args.out}: {len(result['alerts'])} alerts, {len(result['places'])} places with signal, "
          f"{result['unlocated_hits']} unlocated hits")
    for a in result["alerts"]:
        print(f"  [{a['level']:6}] {a['type']:9} {a['place_id']:10} {a['date_start']}..{a['date_end']} "
              f"count={a['count']:<4} ratio={a['ratio']:<5} event={a['linked_event_id']}")


if __name__ == "__main__":
    main()
