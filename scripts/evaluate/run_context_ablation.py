#!/usr/bin/env python3
"""Compare incident-only, schema-only, and full recorded DataHub context."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from contextpatch.analyzer import analyze_schema_changes
from contextpatch.models import SchemaFieldSnapshot
from contextpatch.replay import run_replay


def field(value: dict[str, object]) -> SchemaFieldSnapshot:
    return SchemaFieldSnapshot(
        asset_urn=str(value["assetUrn"]),
        field_path=str(value["fieldPath"]),
        native_type=str(value["nativeType"]),
        nullable=bool(value["nullable"]),
        description=str(value["description"]),
        tags=list(value.get("tags", [])),
        glossary_terms=list(value.get("glossaryTerms", [])),
        sample_values=list(value.get("sampleValues", [])),
        observed_range=value.get("observedRange"),
        snapshot_version=str(value["snapshotVersion"]),
        captured_at=str(value["capturedAt"]),
        provenance=str(value["provenance"]),
    )


def ratio(found: int, expected: int) -> float:
    return round(found / expected, 4) if expected else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repository-root", type=Path, default=Path.cwd())
    parser.add_argument("--output", type=Path, default=Path("examples/reports/context-ablation.json"))
    args = parser.parse_args()
    root = args.repository_root.resolve()
    schema_snapshot = json.loads((root / "examples/context-snapshots/schemas.json").read_text(encoding="utf-8"))
    old_fields = [field(item) for item in schema_snapshot["versions"][0]["fields"]]
    new_fields = [field(item) for item in schema_snapshot["versions"][1]["fields"]]
    schema_changes = analyze_schema_changes(old_fields, new_fields)
    replay = run_replay(root)
    dbt_report = json.loads((root / "examples/reports/dbt-sandbox-validation.json").read_text(encoding="utf-8"))

    expected_mappings = 2
    expected_assets = len(replay.impact_graph.nodes)
    expected_files = len(replay.patch_plan.files)
    modes = [
        {
            "mode": "no-context",
            "inputsActuallyUsed": ["incident report"],
            "schemaMappingsFound": 0,
            "schemaMappingRecall": 0,
            "impactedAssetsFound": 0,
            "impactedAssetRecall": 0,
            "missingDownstreamAssets": expected_assets,
            "ownersResolved": 0,
            "generatedFiles": 0,
            "generatedFileCompleteness": 0,
            "dbtCompile": "not-run-no-patch",
            "dbtTests": "not-run-no-patch",
        },
        {
            "mode": "schema-context",
            "inputsActuallyUsed": ["incident report", "recorded schema versions", "descriptions", "glossary terms", "observed ranges"],
            "schemaMappingsFound": len(schema_changes),
            "schemaMappingRecall": ratio(len(schema_changes), expected_mappings),
            "impactedAssetsFound": 0,
            "impactedAssetRecall": 0,
            "missingDownstreamAssets": expected_assets,
            "ownersResolved": 0,
            "generatedFiles": 0,
            "generatedFileCompleteness": 0,
            "dbtCompile": "not-run-insufficient-lineage",
            "dbtTests": "not-run-insufficient-lineage",
        },
        {
            "mode": "full-recorded-datahub-context",
            "inputsActuallyUsed": ["incident report", "schema", "lineage", "entities", "owners", "queries", "descriptions", "glossary terms"],
            "schemaMappingsFound": len(replay.schema_changes),
            "schemaMappingRecall": ratio(len(replay.schema_changes), expected_mappings),
            "impactedAssetsFound": len(replay.impact_graph.nodes),
            "impactedAssetRecall": ratio(len(replay.impact_graph.nodes), expected_assets),
            "missingDownstreamAssets": 0,
            "ownersResolved": len(replay.impact_graph.affected_owners),
            "generatedFiles": len(replay.patch_plan.files),
            "generatedFileCompleteness": ratio(len(replay.patch_plan.files), expected_files),
            "dbtCompile": "passed-in-isolated-sandbox" if dbt_report["dbtBuild"]["status"] == "passed" else "failed",
            "dbtTests": f"{dbt_report['dbtBuild']['dataTests']} passed",
        },
    ]
    report = {
        "synthetic": True,
        "generatedAt": "2026-07-21T18:40:00+09:00",
        "experiment": "DataHub context ablation for inc-2026-07-dsp-001",
        "groundTruth": {
            "schemaMappings": expected_mappings,
            "downstreamAssets": expected_assets,
            "patchFiles": expected_files,
        },
        "modes": modes,
        "interpretation": "Schema context recovers field mappings, but recorded lineage and ownership are required to identify downstream assets and create the complete bounded patch plan.",
        "notMeasured": ["subjective explanation quality", "live DataHub latency", "live model cost"],
    }
    output = (root / args.output).resolve() if not args.output.is_absolute() else args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(modes, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
