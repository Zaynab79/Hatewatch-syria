"""Check that data files follow docs/CONTRACT.md. Run: python -m src.validate [dir]"""
import sys
import json
import pandas as pd

REQUIRED = {
    "messages.csv": ["message_id", "message_type", "parent_post_id", "platform", "datetime", "date",
                      "author_id", "author_name", "text", "post_location_name", "post_lat", "post_lon"],
    "lexicon.csv": ["term_id", "term", "variants", "family", "target_group", "category", "points",
                     "exclude", "status", "source"],
    "places.csv": ["place_id", "name_ar", "name_en", "aliases", "level", "governorate_id", "lat", "lon"],
    "events.csv": ["event_id", "date", "place_id", "type", "title_ar", "title_en", "source_url", "confirmed"],
}
ALERTS_JSON_KEYS = ["generated_at", "range", "places", "alerts", "timeline", "events", "unlocated_hits"]


def check_csv(path: str, cols: list[str]) -> list[str]:
    errors = []
    try:
        df = pd.read_csv(path, dtype=str)
    except Exception as e:
        return [f"{path}: could not read file ({e})"]
    missing = [c for c in cols if c not in df.columns]
    if missing:
        errors.append(f"{path}: missing columns {missing}")
    if len(df) == 0:
        errors.append(f"{path}: no rows")
    return errors


def check_alerts_json(path: str) -> list[str]:
    errors = []
    try:
        d = json.load(open(path, encoding="utf-8"))
    except Exception as e:
        return [f"{path}: could not read/parse ({e})"]
    missing = [k for k in ALERTS_JSON_KEYS if k not in d]
    if missing:
        errors.append(f"{path}: missing keys {missing}")
    for a in d.get("alerts", []):
        for k in ("alert_id", "type", "level", "place_id", "sentence_ar", "sentence_en"):
            if k not in a:
                errors.append(f"{path}: an alert is missing '{k}'")
                break
    return errors


def main(base_dir: str):
    import os
    all_errors = []
    for fname, cols in REQUIRED.items():
        # lexicon.csv and places.csv are real project files living in data/,
        # not per-format examples in data/examples/
        path = f"{base_dir}/{fname}" if fname in ("messages.csv", "events.csv") \
            else f"{base_dir}/../{fname}" if base_dir.endswith("examples") else f"{base_dir}/{fname}"
        if not os.path.exists(path) and os.path.exists(f"{base_dir}/{fname}"):
            path = f"{base_dir}/{fname}"
        all_errors += check_csv(path, cols)
    alerts_path = f"{base_dir}/alerts_example.json"
    if os.path.exists(alerts_path):
        all_errors += check_alerts_json(alerts_path)

    if all_errors:
        print("FAILED:")
        for e in all_errors:
            print(" -", e)
        sys.exit(1)
    else:
        print("OK: all files match docs/CONTRACT.md")


if __name__ == "__main__":
    base = sys.argv[1] if len(sys.argv) > 1 else "data/examples"
    main(base)
