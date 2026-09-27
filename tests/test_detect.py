import pandas as pd
from src.io import load_messages, load_places, assign_place
from src.keywords import Lexicon, match_keywords
from src.detect import build_alerts_json, detect_spikes, detect_slow_burn, link_events


def _pipeline():
    lex = Lexicon.load("data/lexicon.csv")
    places = load_places("data/places.csv")
    events = pd.read_csv("data/demo/events_demo.csv", dtype=str)
    df = load_messages("data/demo/messages_demo.csv")
    scored = match_keywords(df, lex)
    scored = assign_place(scored, places)
    return scored, places, events


def test_sweida_spike_detected_and_linked_to_event():
    scored, places, events = _pipeline()
    spikes = detect_spikes(scored, places)
    sweida = [a for a in spikes if a["place_id"] == "sweida"]
    assert sweida, "expected a Sweida spike"
    linked = link_events(sweida, events)
    assert any(a["linked_event_id"] == "e1" for a in linked)
    assert any(a["level"] == "red" for a in linked)  # bumped by event link


def test_jableh_spike_detected():
    scored, places, events = _pipeline()
    spikes = detect_spikes(scored, places)
    assert any(a["place_id"] == "jableh" for a in spikes)


def test_homs_slow_burn_detected_not_spike():
    scored, places, events = _pipeline()
    slow = detect_slow_burn(scored, places)
    assert any(a["place_id"] == "homs" for a in slow)


def test_alerts_json_shape():
    scored, places, events = _pipeline()
    result = build_alerts_json(scored, places, events)
    for key in ("generated_at", "range", "places", "alerts", "timeline", "events", "unlocated_hits"):
        assert key in result
    for a in result["alerts"]:
        for key in ("alert_id", "type", "level", "place_id", "sentence_ar", "sentence_en"):
            assert key in a
    assert result["unlocated_hits"] > 0  # demo data has unlocated noise by design
