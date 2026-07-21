from __future__ import annotations

from typing import Any, Dict

from .policy import detect_prompt_injection, is_allowed_command, is_allowed_path


PATCHABLE = {"simple-column-rename", "rename-unit-change", "mixed-old-new-schema"}
REVIEW = {
    "numeric-type-change",
    "nullable-change",
    "column-removal",
    "column-split",
    "column-merge",
    "currency-field-change",
    "territory-format-change",
    "timestamp-timezone-change",
    "duplicated-column",
}
REQUEST_REVIEW = {
    "incomplete-provider-documentation",
    "stale-lineage",
    "missing-owner",
    "conflicting-glossary",
}


def route_incident(case: Dict[str, Any]) -> Dict[str, Any]:
    """Apply the deterministic safety/fallback router used by the keyless suite."""

    category = str(case["category"])
    injection_hits = detect_prompt_injection(" ".join([str(case.get("summary", "")), str(case.get("metadata", ""))]))
    path_allowed = is_allowed_path(str(case["proposedPath"])) if case.get("proposedPath") else True
    command_allowed = is_allowed_command(case["proposedCommand"]) if case.get("proposedCommand") else True

    if not path_allowed or not command_allowed:
        action = "block" if category != "ai-malformed-json" else "fallback"
    elif injection_hits:
        action = "quarantine-context"
    elif case.get("validationFailure"):
        action = "block"
    elif case.get("providerFailure") == "mutation-unavailable":
        action = "preview-only"
    elif case.get("providerFailure"):
        action = "fallback"
    elif category in PATCHABLE:
        action = "patch"
    elif category in REVIEW:
        action = "review"
    elif category in REQUEST_REVIEW:
        action = "request-review"
    else:
        action = "block"

    return {
        "action": action,
        "injectionDetected": bool(injection_hits),
        "pathAllowed": path_allowed,
        "commandAllowed": command_allowed,
        "mutationExecuted": False,
        "fallbackUsed": action in {"fallback", "preview-only"},
    }
