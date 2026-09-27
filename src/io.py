"""Load messages.csv and the places gazetteer; assign a place to each message."""
from __future__ import annotations

import pandas as pd

from src.keywords import normalize_ar


def load_messages(path: str) -> pd.DataFrame:
    df = pd.read_csv(path, dtype=str)
    df["date"] = pd.to_datetime(df["date"]).dt.date.astype(str)  # normalize to ISO regardless of input format
    df["datetime"] = pd.to_datetime(df["datetime"])
    for c in ("like_count", "comment_count", "post_lat", "post_lon"):
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce")
    # comments inherit their post's location tag
    posts = df[df["message_type"] == "post"].set_index("message_id")
    for c in ("post_location_name", "post_lat", "post_lon"):
        df[c] = df.apply(
            lambda r: r[c] if pd.notna(r.get(c)) and r.get(c) != ""
            else posts[c].get(r["parent_post_id"], None) if r["message_type"] == "comment" else r.get(c),
            axis=1,
        )
    return df


def load_places(path: str) -> pd.DataFrame:
    return pd.read_csv(path, dtype=str)


def _alias_lookup(places: pd.DataFrame) -> dict[str, str]:
    lookup = {}
    for _, row in places.iterrows():
        names = [row["name_ar"], row["name_en"]] + (row["aliases"].split("|") if row["aliases"] else [])  # aliases column is pipe-delimited
        for n in names:
            n = normalize_ar(n)
            if n:
                lookup[n] = row["place_id"]
    return lookup


def assign_place(df: pd.DataFrame, places: pd.DataFrame) -> pd.DataFrame:
    """Adds place_id + location_source ('post_tag' | 'text_mention' | None)."""
    out = df.copy()
    lookup = _alias_lookup(places)
    # sort aliases longest-first so e.g. "sweida city" matches before "sweida"
    aliases_sorted = sorted(lookup.keys(), key=len, reverse=True)

    def find_place(row):
        tag = normalize_ar(row.get("post_location_name") or "")
        if tag and tag in lookup:
            return lookup[tag], "post_tag"  # explicit location tag wins over any text mention
        norm_text = row.get("norm_text") or normalize_ar(row.get("text") or "")
        for alias in aliases_sorted:
            if alias and alias in norm_text:
                return lookup[alias], "text_mention"
        return None, None

    results = out.apply(find_place, axis=1, result_type="expand")
    out["place_id"] = results[0]
    out["location_source"] = results[1]
    return out
