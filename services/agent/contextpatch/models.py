from __future__ import annotations

from dataclasses import dataclass, field, fields, is_dataclass
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class SchemaFieldSnapshot:
    asset_urn: str
    field_path: str
    native_type: str
    nullable: bool
    description: str
    tags: List[str]
    glossary_terms: List[str]
    sample_values: List[Any]
    observed_range: Optional[Dict[str, float]]
    snapshot_version: str
    captured_at: str
    provenance: str


@dataclass(frozen=True)
class SchemaChange:
    change_id: str
    old_field: str
    new_field: str
    change_type: str
    name_similarity: float
    semantic_similarity: float
    type_compatibility: str
    unit_compatibility: str
    evidence: List[str]
    assumptions: List[str]
    confidence: float
    requires_human_confirmation: bool


@dataclass(frozen=True)
class ImpactedAsset:
    urn: str
    display_name: str
    asset_type: str
    impact_level: str
    impact_reason: str
    impacted_fields: List[str]
    lineage_distance: int
    owner: str
    business_criticality: str
    evidence_references: List[str]
    recommended_action: str


@dataclass(frozen=True)
class ImpactGraph:
    nodes: List[ImpactedAsset]
    edges: List[Dict[str, Any]]
    critical_paths: List[List[str]]
    affected_owners: List[str]
    affected_domains: List[str]
    blast_radius: Dict[str, int]
    unresolved_assets: List[str]
    evidence_coverage: float


@dataclass(frozen=True)
class PatchFile:
    path: str
    operation: str
    language: str
    purpose: str
    related_assets: List[str]
    evidence_references: List[str]
    original_hash: str
    proposed_content: str
    diff: str
    validation_commands: List[str]


@dataclass(frozen=True)
class PatchPlan:
    patch_id: str
    incident_id: str
    summary: str
    strategy: str
    assumptions: List[str]
    files: List[PatchFile]
    commands: List[str]
    validation_plan: List[str]
    rollback_plan: List[str]
    write_back_plan: Dict[str, Any]
    unresolved_questions: List[str]
    risk_level: str
    confidence: float
    requires_approval: bool = True


@dataclass(frozen=True)
class ValidationCheck:
    name: str
    passed: bool
    detail: str


@dataclass(frozen=True)
class ValidationResult:
    validation_id: str
    patch_id: str
    checks: List[ValidationCheck]
    passed: bool
    failed_checks: List[str]
    warnings: List[str]
    data_comparison: Dict[str, Any]
    started_at: str
    completed_at: str
    logs: List[str]
    repair_attempted: bool
    final_status: str


@dataclass(frozen=True)
class AgentTraceEvent:
    trace_id: str
    timestamp: str
    stage: str
    tool: str
    request_summary: str
    response_summary: str
    evidence_ids: List[str]
    decision: str
    result: str
    duration_ms: int
    error: Optional[str] = None
    fallback_used: bool = False


@dataclass(frozen=True)
class ReplayOutcome:
    mode: str
    incident: Dict[str, Any]
    schema_changes: List[SchemaChange]
    impact_graph: ImpactGraph
    patch_plan: PatchPlan
    validation: ValidationResult
    trace: List[AgentTraceEvent]
    write_back_preview: Dict[str, Any]
    warnings: List[str] = field(default_factory=list)


def _camel(name: str) -> str:
    head, *tail = name.split("_")
    return head + "".join(part.capitalize() for part in tail)


def to_dict(value: Any) -> Any:
    if is_dataclass(value):
        return {_camel(item.name): to_dict(getattr(value, item.name)) for item in fields(value)}
    if isinstance(value, list):
        return [to_dict(item) for item in value]
    if isinstance(value, dict):
        return {key: to_dict(item) for key, item in value.items()}
    return value
