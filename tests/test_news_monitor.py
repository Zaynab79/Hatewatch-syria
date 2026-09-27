import pandas as pd
from src.news_monitor import extract_candidate_events


def _places():
    return pd.read_csv("data/places.csv", dtype=str)


def test_real_haritan_headline_becomes_a_candidate_event():
    items = [{
        "title": 'احتجاجات لـ"طرد الشبيحة" في حريتان بريف حلب',
        "summary": "احتجاجات في مدينة حريتان بريف حلب الشمالي طالبت بطرد عناصر من النظام السابق",
        "link": "https://www.enabbaladi.net/826597",
        "published": "2026-09-25",
    }]
    candidates = extract_candidate_events(items, _places())
    assert len(candidates) == 1
    c = candidates[0]
    assert c["place_id"] == "haritan"
    assert c["type"] == "other"  # protest/expulsion demand
    assert c["confirmed"] == "false"


def test_benign_headline_produces_no_candidate():
    items = [{
        "title": "افتتاح سوق جديد في دمشق",
        "summary": "افتتح اليوم سوق تجاري جديد وسط حضور كبير",
        "link": "https://example.org/x",
        "published": "2026-09-20",
    }]
    assert extract_candidate_events(items, _places()) == []


def test_place_without_event_word_produces_no_candidate():
    items = [{"title": "طقس معتدل في حمص اليوم", "summary": "", "link": "", "published": "2026-01-01"}]
    assert extract_candidate_events(items, _places()) == []
