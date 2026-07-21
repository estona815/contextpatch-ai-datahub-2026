from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

from .models import PatchPlan, ValidationResult


class ApprovalRequired(PermissionError):
    pass


def preview_write_back(plan: PatchPlan, validation: ValidationResult, source_urn: str) -> Dict[str, Any]:
    return {
        "mode": "recorded-replay-preview",
        "requiresApproval": True,
        "approved": False,
        "affectedUrns": [source_urn],
        "operations": [
            {"tool": "save_document", "target": "Schema Migration Incident — DSP Settlement July 2026"},
            {"tool": "update_description", "target": source_urn, "mode": "append"},
            {"tool": "add_tags", "target": source_urn, "tags": ["Migration Resolved", "Synthetic Demo"]},
        ],
        "patchId": plan.patch_id,
        "validationStatus": validation.final_status,
        "executionResults": [],
        "note": "Replay preview only. No DataHub mutation is performed.",
    }


def apply_local_replay_write_back(preview: Dict[str, Any], approval: Dict[str, Any], store_path: Path) -> Dict[str, Any]:
    if not approval.get("approved") or approval.get("patchId") != preview.get("patchId"):
        raise ApprovalRequired("A matching explicit approval receipt is required.")
    result = dict(preview)
    result["approved"] = True
    result["mode"] = "local-replay-store"
    result["executionResults"] = [
        {"tool": operation["tool"], "status": "locally-recorded", "target": operation["target"]}
        for operation in preview["operations"]
    ]
    store_path.parent.mkdir(parents=True, exist_ok=True)
    store_path.write_text(json.dumps(result, indent=2, sort_keys=True), encoding="utf-8")
    return result

