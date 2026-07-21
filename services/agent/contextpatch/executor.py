from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Dict

from .models import PatchPlan
from .policy import validate_paths


class PatchPolicyError(ValueError):
    pass


def materialize_sandbox(plan: PatchPlan, sandbox_root: Path) -> Dict[str, str]:
    rejected = validate_paths(file.path for file in plan.files)
    if rejected:
        raise PatchPolicyError(f"PatchPlan contains prohibited paths: {', '.join(rejected)}")
    results: Dict[str, str] = {}
    for patch_file in plan.files:
        destination = sandbox_root / patch_file.path
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(patch_file.proposed_content, encoding="utf-8")
        results[patch_file.path] = hashlib.sha256(patch_file.proposed_content.encode()).hexdigest()
    return results

