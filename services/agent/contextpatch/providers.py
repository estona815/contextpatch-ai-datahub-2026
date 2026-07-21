from __future__ import annotations

import difflib
import hashlib
from pathlib import Path
from typing import Dict, List, Protocol

from .models import ImpactGraph, PatchFile, PatchPlan, SchemaChange


class Provider(Protocol):
    def generate_patch_plan(
        self, incident: Dict[str, object], changes: List[SchemaChange], impact: ImpactGraph, repository_root: Path
    ) -> PatchPlan:
        ...


class LiveProviderDisabled(RuntimeError):
    pass


class OpenAIProvider:
    """Explicit boundary for a future opt-in live provider.

    The keyless build deliberately performs no network request. Selecting this
    provider fails closed instead of silently falling back and mislabeling a run.
    """

    def generate_patch_plan(self, *args: object, **kwargs: object) -> PatchPlan:
        raise LiveProviderDisabled("Live AI is disabled in this keyless, external-API-free build. Use MockProvider.")


class MockProvider:
    name = "contextpatch-deterministic-mock-v1"

    def _file(self, repository_root: Path, path: str, purpose: str, assets: List[str], evidence: List[str]) -> PatchFile:
        target = repository_root / path
        proposed = target.read_text(encoding="utf-8") if target.exists() else ""
        original = ""
        operation = "create"
        if target.exists():
            original = proposed
            operation = "modify"
        generated_path = repository_root / "examples" / "generated-artifacts" / Path(path).name
        if generated_path.exists():
            proposed = generated_path.read_text(encoding="utf-8")
        original_hash = hashlib.sha256(original.encode()).hexdigest() if original else "NEW"
        diff = "".join(
            difflib.unified_diff(
                original.splitlines(keepends=True),
                proposed.splitlines(keepends=True),
                fromfile=f"a/{path}",
                tofile=f"b/{path}",
            )
        )
        language = "yaml" if path.endswith((".yml", ".yaml")) else "sql" if path.endswith(".sql") else "markdown"
        return PatchFile(
            path=path,
            operation=operation,
            language=language,
            purpose=purpose,
            related_assets=assets,
            evidence_references=evidence,
            original_hash=original_hash,
            proposed_content=proposed,
            diff=diff,
            validation_commands=["dbt parse", "dbt compile", "dbt test"],
        )

    def generate_patch_plan(
        self, incident: Dict[str, object], changes: List[SchemaChange], impact: ImpactGraph, repository_root: Path
    ) -> PatchPlan:
        evidence = [item for change in changes for item in [change.change_id]]
        assets = [node.urn for node in impact.nodes]
        file_specs = [
            ("data-stack/dbt/models/staging/stg_dsp_streams.sql", "Normalize old/new provider schemas into stable canonical fields."),
            ("data-stack/dbt/models/intermediate/int_royalty_calculation.sql", "Preserve royalty calculation semantics over canonical fields."),
            ("data-stack/dbt/models/schema.yml", "Document fields and enforce schema/range tests."),
            ("data-stack/dbt/tests/assert_royalty_total_reconciles.sql", "Reject unexplained payout-total drift."),
            ("data-stack/dbt/tests/assert_rights_split_range.sql", "Reject canonical artist-share values outside zero through one."),
            ("data-stack/dbt/tests/assert_settlement_period_unique.sql", "Enforce the settlement identifier and reporting-period business key."),
            ("data-stack/contracts/dsp_settlement_contract.yml", "Version the provider migration contract and deprecations."),
            ("docs/migrations/2026-07-dsp-schema-change.md", "Provide migration, rollback, and unresolved-assumption guidance."),
        ]
        files = [self._file(repository_root, path, purpose, assets, evidence) for path, purpose in file_specs]
        return PatchPlan(
            patch_id="patch-inc-2026-07-dsp-001",
            incident_id=str(incident["incidentId"]),
            summary="Add a backward-compatible DSP settlement schema adapter and payout reconciliation checks.",
            strategy="Backward-compatible migration with explicit mixed-unit normalization and invalid-row quarantine.",
            assumptions=[
                "rights_split_pct values above 1 are percentages and values from 0 through 1 are fractions.",
                "payable_revenue is semantically equivalent to the former net_amount after provider fees.",
                "Canonical downstream names artist_share and net_amount remain stable during migration.",
            ],
            files=files,
            commands=["dbt parse", "dbt compile", "dbt test"],
            validation_plan=[
                "Validate PatchPlan and path policy.",
                "Compile SQL and run old, new, and mixed fixtures.",
                "Reconcile payable and artist payout totals with 0.01 currency tolerance.",
                "Scan generated text for secrets and prohibited patterns.",
            ],
            rollback_plan=[
                "Revert the approved local patch file.",
                "Restore the previous contract version.",
                "Keep the provider feed quarantined until the old schema or a corrected mapping is available.",
            ],
            write_back_plan={
                "requiresApproval": True,
                "operations": ["save_document", "update_description", "add_tags"],
                "status": "preview-only",
            },
            unresolved_questions=["Confirm the provider's intended unit for values exactly equal to 1."],
            risk_level="medium",
            confidence=0.91,
            requires_approval=True,
        )
