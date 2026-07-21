from __future__ import annotations

import hashlib
import re
from difflib import SequenceMatcher
from typing import Dict, Iterable, List, Sequence, Set

from .models import SchemaChange, SchemaFieldSnapshot


def _tokens(value: str) -> Set[str]:
    stop = {"a", "an", "and", "as", "for", "from", "in", "of", "or", "the", "to"}
    return {
        token
        for token in re.findall(r"[a-z0-9]+", value.lower().replace("pct", "percentage"))
        if token not in stop
    }


def _semantic_similarity(old: SchemaFieldSnapshot, new: SchemaFieldSnapshot) -> float:
    old_terms = _tokens(" ".join(old.glossary_terms + [old.description]))
    new_terms = _tokens(" ".join(new.glossary_terms + [new.description]))
    union = old_terms | new_terms
    overlap = len(old_terms & new_terms) / len(union) if union else 0.0
    glossary_exact = bool(set(old.glossary_terms) & set(new.glossary_terms))
    return round(min(1.0, overlap + (0.35 if glossary_exact else 0.0)), 3)


def _range(field: SchemaFieldSnapshot) -> Sequence[float]:
    numeric = [float(value) for value in field.sample_values if isinstance(value, (int, float))]
    if field.observed_range:
        numeric.extend([field.observed_range["min"], field.observed_range["max"]])
    return numeric


def analyze_schema_changes(
    old_fields: Iterable[SchemaFieldSnapshot],
    new_fields: Iterable[SchemaFieldSnapshot],
) -> List[SchemaChange]:
    old_by_name = {field.field_path: field for field in old_fields}
    new_by_name = {field.field_path: field for field in new_fields}
    removed = [field for name, field in old_by_name.items() if name not in new_by_name]
    added = [field for name, field in new_by_name.items() if name not in old_by_name]
    changes: List[SchemaChange] = []

    for old in removed:
        candidates = []
        for new in added:
            name_score = SequenceMatcher(None, old.field_path, new.field_path).ratio()
            semantic_score = _semantic_similarity(old, new)
            candidates.append((semantic_score * 0.8 + name_score * 0.2, name_score, semantic_score, new))
        if not candidates:
            continue
        combined, name_score, semantic_score, new = max(candidates, key=lambda item: item[0])
        if combined < 0.35:
            continue

        old_values = _range(old)
        new_values = _range(new)
        old_fraction = bool(old_values) and max(old_values) <= 1.0
        new_has_percentage = bool(new_values) and max(new_values) > 1.0
        unit_change = old_fraction and new_has_percentage
        evidence = [
            f"Shared semantic terms: {', '.join(sorted(set(old.glossary_terms) & set(new.glossary_terms))) or 'description overlap'}.",
            f"Both fields occupy the provider-to-staging schema position for {old.field_path}.",
            f"Native types are {old.native_type} → {new.native_type}.",
        ]
        if unit_change:
            evidence.append(
                f"Observed ranges differ: {min(old_values):g}–{max(old_values):g} vs "
                f"{min(new_values):g}–{max(new_values):g}; mixed fraction/percentage normalization is required."
            )
        else:
            evidence.append("Observed values and descriptions support a rename without a proven unit change.")

        digest = hashlib.sha256(f"{old.field_path}:{new.field_path}".encode()).hexdigest()[:12]
        changes.append(
            SchemaChange(
                change_id=f"sch-{digest}",
                old_field=old.field_path,
                new_field=new.field_path,
                change_type="unitChange" if unit_change else "rename",
                name_similarity=round(name_score, 3),
                semantic_similarity=semantic_score,
                type_compatibility="compatible" if old.native_type == new.native_type else "review",
                unit_compatibility="requires-normalization" if unit_change else "compatible",
                evidence=evidence,
                assumptions=["Provider documentation is incomplete.", "Canonical downstream field names remain stable."],
                confidence=round(min(0.98, 0.55 + combined * 0.4), 3),
                requires_human_confirmation=unit_change or combined < 0.75,
            )
        )
    return sorted(changes, key=lambda change: change.old_field)

