"""Arabic-aware keyword normalisation and message scoring.

Scoring model (see docs/CONTRACT.md #2):
  - `slur` terms count on their own (they already name a target + an attack in one word).
  - `conduct` terms only count if a `target` term is ALSO present in the same message.
  - `cue` (counter-speech) terms subtract points.
  - `exclude` phrases on a term cancel that term's match.
  - score = sum of points, floored at 0. is_hit = score >= REVIEW_THRESHOLD.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

import pandas as pd

REVIEW_THRESHOLD = 3
PRIORITY_THRESHOLD = 7

# Arabic diacritics (tashkeel) + tatweel, to strip.
_TASHKEEL = re.compile(r"[ؐ-ًؚ-ٟۖ-ۜ۟-۪ۨ-ۭـ]")

_PREFIXES = ["وال", "فال", "بال", "كال", "لل", "وا", "فا", "با", "كا", "ال", "و", "ف", "ب", "ل"]


def normalize_ar(text: str) -> str:
    """Normalise Arabic (and pass through Latin lowercase) for robust substring matching.

    - strips tashkeel/tatweel
    - unifies alef forms (أإآ -> ا), ya (ى -> ي), ta-marbuta (ة -> ه)
    - collapses repeated letters (فلوووول -> فلول) so elongation-spam still matches
    - lowercases Latin text
    """
    if not isinstance(text, str) or not text:
        return ""
    t = unicodedata.normalize("NFKC", text)
    t = _TASHKEEL.sub("", t)
    t = re.sub("[إأآا]", "ا", t)
    t = re.sub("ى", "ي", t)
    t = re.sub("ة", "ه", t)
    # collapse 3+ repeated Arabic/Latin letters down to 1 (تكرار الأحرف: فلوووول -> فلول)
    t = re.sub(r"(.)\1{2,}", r"\1", t)
    t = t.lower()
    return t


def _strip_prefix(word: str) -> str:
    """Strip one leading Arabic clitic (و/ف/ب/ل/ال...) so للفلول matches فلول."""
    for p in sorted(_PREFIXES, key=len, reverse=True):
        if word.startswith(p) and len(word) - len(p) >= 3:
            return word[len(p):]
    return word


def _variants(row) -> list[str]:
    out = [row["term"]]
    if isinstance(row.get("variants"), str) and row["variants"]:
        out += row["variants"].split("|")
    return [normalize_ar(v) for v in out if v]


def _contains_term(norm_text: str, variants: list[str]) -> bool:
    for v in variants:
        if not v:
            continue
        if v in norm_text:
            return True
        # also try matching against the text with each word's prefix stripped,
        # so للفلول (lil-fulul) matches فلول even as one attached token
        for word in norm_text.split():
            if _strip_prefix(word) == v or v in _strip_prefix(word):
                return True
    return False


def _excluded(norm_text: str, exclude_field) -> bool:
    if not isinstance(exclude_field, str) or not exclude_field:
        return False
    for phrase in exclude_field.split("|"):
        phrase = normalize_ar(phrase)
        if phrase and phrase in norm_text:
            return True
    return False


@dataclass
class Lexicon:
    df: pd.DataFrame  # raw lexicon.csv, only approved rows kept for scoring

    @classmethod
    def load(cls, path: str) -> "Lexicon":
        df = pd.read_csv(path, dtype=str).fillna("")
        df["points"] = df["points"].astype(float)
        return cls(df=df[df["status"] == "approved"].reset_index(drop=True))


def match_keywords(df: pd.DataFrame, lexicon: Lexicon, text_col: str = "text") -> pd.DataFrame:
    """Score every message. Adds: norm_text, matched_terms, matched_families,
    has_target, score, is_hit, severity."""
    out = df.copy()
    norm_texts = out[text_col].fillna("").map(normalize_ar)
    out["norm_text"] = norm_texts

    lex = lexicon.df
    term_variants = {row["term_id"]: _variants(row) for _, row in lex.iterrows()}

    matched_terms_col = []
    scores = []
    has_target_col = []
    matched_families_col = []

    for norm_text in norm_texts:
        matched_target = False
        matched_conduct = []  # (term, points)
        matched_slur = []
        cue_points = 0.0
        matched_terms = []

        for _, row in lex.iterrows():
            variants = term_variants[row["term_id"]]
            if not _contains_term(norm_text, variants):
                continue
            if _excluded(norm_text, row["exclude"]):
                continue
            matched_terms.append(row["term"])
            fam = row["family"]
            if fam == "target":
                matched_target = True
            elif fam == "slur":
                matched_slur.append((row["term"], row["points"]))
            elif fam == "conduct":
                matched_conduct.append((row["term"], row["points"]))
            elif fam == "cue":
                cue_points += row["points"]  # already negative in lexicon.csv

        score = sum(p for _, p in matched_slur)
        if matched_target and matched_conduct:
            score += sum(p for _, p in matched_conduct) + 2  # combination bonus
        score += cue_points  # negative
        score = max(0.0, score)

        matched_terms_col.append(matched_terms)
        scores.append(score)
        has_target_col.append(matched_target)
        fams = []
        if matched_slur:
            fams.append("slur")
        if matched_target and matched_conduct:
            fams.append("conduct")
        if cue_points < 0:
            fams.append("cue")
        matched_families_col.append(fams)

    out["matched_terms"] = matched_terms_col
    out["matched_families"] = matched_families_col
    out["has_target"] = has_target_col
    out["score"] = scores
    out["is_hit"] = out["score"] >= REVIEW_THRESHOLD
    out["severity"] = out["score"].map(
        lambda s: "high" if s >= PRIORITY_THRESHOLD else ("medium" if s >= REVIEW_THRESHOLD else "none")
    )
    return out
