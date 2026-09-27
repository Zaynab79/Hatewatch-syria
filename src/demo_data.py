"""Generate a SYNTHETIC demo dataset in messages.csv format (docs/CONTRACT.md).

Scenario (anchored to real event types, dates approximate/illustrative for the demo):
  - Sweida: baseline low-level noise from 2025-01-15, then a sharp SPIKE 2025-07-15/16,
    right after clashes (events.csv e1, 2025-07-14).
  - Homs: a SLOW BURN — hateful share creeping up over ~6 weeks in May-June, no single jump.
  - Jableh (coastal): a second spike 2025-03-07/08 after coastal violence (events.csv e2, 2025-03-06).
  - Plenty of benign noise, incl. "Sabaya fashion" shop posts (false-positive test).

Run: python -m src.demo_data  (writes data/demo/messages_demo.csv, data/demo/events_demo.csv)
"""
import csv
import random
from datetime import datetime, timedelta

random.seed(42)

HATE_SWEIDA = [
    "طردهم من البلد كلهم ولا رحمة #السويداء",
    "الدروز خونة يجب طردهم من سوريا",
    "اقتلوهم كلهم ما دام دروز، لا رحمة",
    "لازم نطرد كل الفلول من السويداء",
]
HATE_HOMS = [
    "الفلول لازم يدفعوا التمن في حمص",
    "علويين حمص كلهم شبيحة ما بيستاهلوا يعيشوا هون",
    "طرد النصيرية من حمص واجب",
    "سبايا حمص لازم يدفعوا التمن",
]
HATE_JABLEH = [
    "اذبحوا كل نصيرية جبلة",
    "الساحل كله فلول لازم تصفية",
    "شبيحة الساحل خلص وقتهم",
]
COUNTER_SPEECH = [
    "ندين هذا الخطاب، هذا تحريض وما بيمثلنا",
    "نستنكر بشدة أي كلام عنصري ضد أي طائفة",
    "condemn this hate speech, it does not represent us",
]
BENIGN = [
    "تشكيلة جديدة وصلت للمحل #sabaya_fashion",
    "الجو حلو اليوم بالساحل",
    "مين عندو خبر عن الطريق الدولي؟",
    "صباح الخير من دمشق",
    "أفضل مطعم فول بالمدينة، جربوه",
    "موعد المباراة الليلة الساعة 9",
    "sabaya lingerie new collection out now",
    "الأسعار ارتفعت كتير هالشهر",
]

PLACES = {
    "sweida": (32.7094, 36.5697, "Sweida"),
    "homs": (34.7324, 36.7137, "Homs"),
    "jableh": (35.3608, 35.9264, "Jableh"),
    None: (None, None, None),
}

AUTHOR_POOL = [f"user_{i:04d}" for i in range(1, 400)]


def _row(mid, mtype, parent, dt, author, text, place, like=None, comments=None):
    lat, lon, tag = PLACES[place]
    return {
        "message_id": mid, "message_type": mtype, "parent_post_id": parent or "",
        "platform": "instagram", "datetime": dt.isoformat(), "date": dt.date().isoformat(),
        "author_id": author, "author_name": author, "text": text,
        "like_count": like if like is not None else random.randint(0, 50),
        "comment_count": comments if comments is not None else "",
        "post_location_name": tag or "", "post_lat": lat if lat else "", "post_lon": lon if lon else "",
    }


def generate():
    rows = []
    mid_counter = 0
    start = datetime(2025, 1, 15)
    end = datetime(2025, 8, 10)
    day = start

    while day <= end:
        # background noise every day, every place
        for _ in range(random.randint(3, 6)):
            mid_counter += 1
            place = random.choice([None, None, "sweida", "homs", "jableh"])
            text = random.choice(BENIGN)
            author = random.choice(AUTHOR_POOL)
            t = day + timedelta(hours=random.randint(6, 22), minutes=random.randint(0, 59))
            rows.append(_row(f"m{mid_counter}", "post", None, t, author, text, place))
            if random.random() < 0.3:
                mid_counter += 1
                t2 = t + timedelta(minutes=random.randint(1, 90))
                rows.append(_row(f"m{mid_counter}", "comment", f"m{mid_counter-1}", t2,
                                  random.choice(AUTHOR_POOL), random.choice(BENIGN + COUNTER_SPEECH), place))

        # low background hate rate everywhere (keeps baseline > 0)
        if random.random() < 0.15:
            mid_counter += 1
            place = random.choice(["sweida", "homs", "jableh"])
            pool = {"sweida": HATE_SWEIDA, "homs": HATE_HOMS, "jableh": HATE_JABLEH}[place]
            t = day + timedelta(hours=random.randint(6, 22))
            rows.append(_row(f"m{mid_counter}", "post", None, t, random.choice(AUTHOR_POOL),
                              random.choice(pool), place))

        # some hateful posts carry no location tag and no place name in the text (realistic:
        # not every post is geotagged) -> these are real hits, but land in "unlocated"
        if random.random() < 0.05:
            mid_counter += 1
            pool = HATE_SWEIDA + HATE_HOMS + HATE_JABLEH
            text = random.choice(pool).split("#")[0].strip()  # drop the place hashtag
            for place_word in ("السويداء", "حمص", "جبلة", "الساحل"):
                text = text.replace(place_word, "").strip()
            t = day + timedelta(hours=random.randint(6, 22))
            rows.append(_row(f"m{mid_counter}", "post", None, t, random.choice(AUTHOR_POOL), text, None))

        # --- SLOW BURN in Homs: a steady baseline from Apr 1, then a gentle rise
        # May 1 - Jun 15 (~1.7x from first week to last, not a jump). The flat Apr
        # baseline matters: detect.py's trailing window compares its first vs. last
        # third, so a near-zero "before" period would inflate the ratio into a false
        # spike-like reading even though the rise itself is gradual. ---
        if datetime(2025, 4, 1) <= day <= datetime(2025, 6, 15):
            weeks_since_may = max(0, (day - datetime(2025, 5, 1)).days // 7)
            daily_rate = 1.0 + weeks_since_may * 0.15  # per-day rate, so weekly totals rise gradually
            n_hate = int(daily_rate) + (1 if random.random() < daily_rate % 1 else 0)
            for _ in range(n_hate):
                mid_counter += 1
                t = day + timedelta(hours=random.randint(6, 22))
                rows.append(_row(f"m{mid_counter}", "post", None, t, random.choice(AUTHOR_POOL),
                                  random.choice(HATE_HOMS), "homs"))

        # --- SPIKE in Jableh: coastal violence, 2025-03-07 to 03-08 ---
        if day.date().isoformat() in ("2025-03-07", "2025-03-08"):
            for _ in range(45):
                mid_counter += 1
                t = day + timedelta(hours=random.randint(0, 23), minutes=random.randint(0, 59))
                rows.append(_row(f"m{mid_counter}", "post", None, t, random.choice(AUTHOR_POOL),
                                  random.choice(HATE_JABLEH), "jableh"))

        # --- SPIKE in Sweida: clashes, 2025-07-15 to 07-16 ---
        if day.date().isoformat() in ("2025-07-15", "2025-07-16"):
            for _ in range(60):
                mid_counter += 1
                t = day + timedelta(hours=random.randint(0, 23), minutes=random.randint(0, 59))
                author = random.choice(AUTHOR_POOL)
                rows.append(_row(f"m{mid_counter}", "post", None, t, author,
                                  random.choice(HATE_SWEIDA), "sweida"))
                if random.random() < 0.4:
                    mid_counter += 1
                    t2 = t + timedelta(minutes=random.randint(1, 30))
                    rows.append(_row(f"m{mid_counter}", "comment", f"m{mid_counter-1}", t2,
                                      random.choice(AUTHOR_POOL), random.choice(HATE_SWEIDA + COUNTER_SPEECH),
                                      "sweida"))

        day += timedelta(days=1)

    return rows


EVENTS = [
    {"event_id": "e1", "date": "2025-07-14", "place_id": "sweida", "type": "clashes",
     "title_ar": "اشتباكات في محافظة السويداء", "title_en": "Clashes in Sweida governorate",
     "source_url": "https://example.org/news1", "confirmed": "true"},
    {"event_id": "e2", "date": "2025-03-06", "place_id": "jableh", "type": "killing",
     "title_ar": "أحداث عنف على الساحل السوري", "title_en": "Violence on the Syrian coast",
     "source_url": "https://example.org/news2", "confirmed": "true"},
]


def main():
    rows = generate()
    fields = ["message_id", "message_type", "parent_post_id", "platform", "datetime", "date",
              "author_id", "author_name", "text", "like_count", "comment_count",
              "post_location_name", "post_lat", "post_lon"]
    with open("data/demo/messages_demo.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)

    with open("data/demo/events_demo.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(EVENTS[0].keys()))
        w.writeheader()
        w.writerows(EVENTS)

    print(f"wrote {len(rows)} messages to data/demo/messages_demo.csv")
    print(f"wrote {len(EVENTS)} events to data/demo/events_demo.csv")


if __name__ == "__main__":
    main()
