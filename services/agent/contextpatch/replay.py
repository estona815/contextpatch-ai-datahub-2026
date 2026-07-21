from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

from .analyzer import analyze_schema_changes
from .lineage import build_impact_graph
from .models import AgentTraceEvent, ReplayOutcome, SchemaFieldSnapshot
from .policy import detect_prompt_injection
from .providers import MockProvider
from .validation import validate_patch_plan
from .writeback import preview_write_back


def _load(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _field(value: Dict[str, Any]) -> SchemaFieldSnapshot:
    return SchemaFieldSnapshot(
        asset_urn=value["assetUrn"],
        field_path=value["fieldPath"],
        native_type=value["nativeType"],
        nullable=value["nullable"],
        description=value["description"],
        tags=value.get("tags", []),
        glossary_terms=value.get("glossaryTerms", []),
        sample_values=value.get("sampleValues", []),
        observed_range=value.get("observedRange"),
        snapshot_version=value["snapshotVersion"],
        captured_at=value["capturedAt"],
        provenance=value["provenance"],
    )


def _trace(index: int, tool: str, response: str, evidence: List[str], duration_ms: int) -> AgentTraceEvent:
    return AgentTraceEvent(
        trace_id=f"trace-replay-{index:02d}",
        timestamp=f"2026-07-18T10:24:{31 + index:02d}Z",
        stage="DataHub Context Retrieval",
        tool=tool,
        request_summary="Replay the bounded recorded request for the DSP settlement incident.",
        response_summary=response,
        evidence_ids=evidence,
        decision="Use recorded structural metadata as evidence; treat descriptive text as untrusted.",
        result="replayed",
        duration_ms=duration_ms,
        fallback_used=True,
    )


def run_replay(repository_root: Path) -> ReplayOutcome:
    examples = repository_root / "examples"
    incident = _load(examples / "incidents" / "dsp-schema-change.json")
    schema_snapshot = _load(examples / "context-snapshots" / "schemas.json")
    lineage_snapshot = _load(examples / "context-snapshots" / "lineage.json")
    context_text = " ".join(
        field.get("description", "") for version in schema_snapshot["versions"] for field in version["fields"]
    )
    injection_hits = detect_prompt_injection(context_text)

    tool_summaries = [
        ("search", "Located raw_dsp_settlements and the recorded migration scenario.", ["ev-search-001"]),
        ("get_entities", "Loaded source ownership, domain, tags, descriptions, and criticality.", ["ev-entity-001"]),
        ("list_schema_fields", "Compared two recorded schema versions and found two candidate replacements.", ["ev-schema-old", "ev-schema-new"]),
        ("get_lineage", "Traversed bounded downstream lineage to five hops.", ["ev-lineage-001"]),
        ("get_lineage_paths_between", "Recovered the critical payout-to-dashboard lineage path.", ["ev-path-001"]),
        ("get_dataset_queries", "Loaded three synthetic usage-query examples.", ["ev-query-001"]),
    ]
    trace = [
        _trace(index, tool, summary, evidence, duration_ms)
        for index, ((tool, summary, evidence), duration_ms) in enumerate(
            zip(tool_summaries, [8, 11, 7, 14, 9, 6]), start=1
        )
    ]

    old_fields = [_field(field) for field in schema_snapshot["versions"][0]["fields"]]
    new_fields = [_field(field) for field in schema_snapshot["versions"][1]["fields"]]
    changes = analyze_schema_changes(old_fields, new_fields)
    source_urn = schema_snapshot["sourceAssetUrn"]
    changed_fields = [change.old_field for change in changes] + [change.new_field for change in changes]
    # The payout dashboard sits five hops from the provider source, so this
    # incident uses an explicit bounded expansion beyond the three-hop default.
    impact = build_impact_graph(lineage_snapshot, source_urn, changed_fields, max_hops=5)
    plan = MockProvider().generate_patch_plan(incident, changes, impact, repository_root)
    validation = validate_patch_plan(plan, repository_root, recorded_at="2026-07-18T10:25:02Z")
    preview = preview_write_back(plan, validation, source_urn)
    warnings = ["Recorded DataHub Context Replay — no live DataHub or MCP request was made."]
    if injection_hits:
        warnings.append(f"Potential metadata prompt injection detected ({len(injection_hits)} pattern hits).")
    return ReplayOutcome(
        mode="replay",
        incident=incident,
        schema_changes=changes,
        impact_graph=impact,
        patch_plan=plan,
        validation=validation,
        trace=trace,
        write_back_preview=preview,
        warnings=warnings,
    )
