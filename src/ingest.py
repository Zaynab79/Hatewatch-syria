"""Accumulate weekly message exports into one growing history file (messages.csv format).

Spike detection needs the trailing 14 days and slow-burn detection needs a trailing 6-8
WEEKS of history (src/detect.py). If scraping runs weekly and each run only hands detect.py
that week's fresh export, neither window ever has enough history and slow burns (which need
6+ weeks by definition) are never detected. Whatever gets passed to `detect.py --messages`
must be the full accumulated history, not a single week's snapshot — this merges a new export
into a running history file, deduping by message_id (a message re-exported in a later scrape
is kept once, latest copy wins).

Run: python -m src.ingest --history data/messages_history.csv --new data/incoming/week_37.csv
"""
import argparse
import os

import pandas as pd


def accumulate(history_path: str, new_path: str) -> pd.DataFrame:
    new_df = pd.read_csv(new_path, dtype=str)
    if os.path.exists(history_path):
        history_df = pd.read_csv(history_path, dtype=str)
        combined = pd.concat([history_df, new_df], ignore_index=True)
    else:
        combined = new_df
    combined = combined.drop_duplicates(subset="message_id", keep="last")
    combined = combined.sort_values("datetime").reset_index(drop=True)
    return combined


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--history", required=True, help="the running accumulated messages.csv")
    ap.add_argument("--new", required=True, help="this week's fresh export to merge in")
    args = ap.parse_args()

    combined = accumulate(args.history, args.new)
    combined.to_csv(args.history, index=False)
    print(f"wrote {args.history}: {len(combined)} messages total")


if __name__ == "__main__":
    main()
