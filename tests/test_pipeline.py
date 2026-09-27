"""Run: python -m pytest tests/ -q"""
import tempfile

import pandas as pd
from src.io import load_messages, load_places, assign_place
from src.keywords import Lexicon, match_keywords, normalize_ar


def _scored_demo():
    lex = Lexicon.load("data/lexicon.csv")
    places = load_places("data/places.csv")
    df = load_messages("data/demo/messages_demo.csv")
    scored = match_keywords(df, lex)
    return assign_place(scored, places)


def test_normalize_ar_elongation():
    assert "فلول" in normalize_ar("فلوووول")


def test_sabaya_fashion_is_not_a_hit():
    lex = Lexicon.load("data/lexicon.csv")
    df = pd.DataFrame([
        {"text": "تشكيلة جديدة وصلت للمحل #sabaya_fashion", "message_id": "x1"},
        {"text": "sabaya lingerie new collection out now", "message_id": "x2"},
    ])
    scored = match_keywords(df, lex)
    assert not scored["is_hit"].any()


def test_conduct_alone_is_not_a_hit_without_target():
    lex = Lexicon.load("data/lexicon.csv")
    df = pd.DataFrame([{"text": "لازم نطرد كل شي غلط بالسياسة", "message_id": "x3"}])
    scored = match_keywords(df, lex)
    assert scored.iloc[0]["score"] == 0


def test_slur_alone_is_a_hit():
    lex = Lexicon.load("data/lexicon.csv")
    df = pd.DataFrame([{"text": "لازم يدفعوا التمن هالفلول", "message_id": "x4"}])
    scored = match_keywords(df, lex)
    assert scored.iloc[0]["is_hit"]


def test_demo_dataset_has_sweida_spike():
    scored = _scored_demo()
    daily = scored[scored.is_hit].groupby(["place_id", "date"]).size()
    spike_day = daily.get(("sweida", "2025-07-16"), 0)
    baseline_days = scored[(scored.place_id == "sweida") & (scored.is_hit) & (scored.date < "2025-07-01")]
    baseline = baseline_days.groupby("date").size().mean() if len(baseline_days) else 0
    assert spike_day >= 10 * max(baseline, 1)


def test_demo_dataset_has_homs_slow_burn_not_single_jump():
    scored = _scored_demo()
    h = scored[(scored.place_id == "homs") & (scored.is_hit) & (scored.date.between("2025-05-01", "2025-06-15"))]
    h = h.copy()
    h["date"] = pd.to_datetime(h["date"])
    weekly = h.groupby(h["date"].dt.isocalendar().week).size()
    assert len(weekly) >= 5  # spread across several weeks, not one day
    assert weekly.max() < weekly.sum() * 0.5  # no single week is >50% of the rise


def test_comment_inherits_place_from_parent_post():
    df = pd.DataFrame([
        {"message_id": "p1", "message_type": "post", "parent_post_id": "",
         "text": "عادي", "date": "2025-01-01", "datetime": "2025-01-01T10:00:00",
         "post_location_name": "Sweida", "post_lat": "", "post_lon": ""},
        {"message_id": "p1:c1", "message_type": "comment", "parent_post_id": "p1",
         "text": "عادي", "date": "2025-01-01", "datetime": "2025-01-01T10:05:00",
         "post_location_name": "", "post_lat": "", "post_lon": ""},
    ])
    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
        df.to_csv(f.name, index=False)
        loaded = load_messages(f.name)
    places = load_places("data/places.csv")
    placed = assign_place(loaded, places)
    comment_row = placed[placed.message_id == "p1:c1"].iloc[0]
    assert comment_row["place_id"] == "sweida"
    assert comment_row["location_source"] == "post_tag"
