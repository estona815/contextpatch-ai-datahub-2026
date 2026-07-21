from __future__ import annotations

import csv
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

from .models import PatchPlan, ValidationCheck, ValidationResult
from .policy import detect_secrets, is_allowed_command, validate_paths


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _decimal(value: str) -> Decimal:
    return Decimal(value or "0")


def _read_rows(path: Path) -> List[Dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def _normalize(row: Dict[str, str]) -> Tuple[Decimal, Decimal, bool]:
    raw_share = row.get("rights_split_pct") or row.get("artist_share") or ""
    if not raw_share:
        return Decimal("0"), Decimal("0"), False
    share = _decimal(raw_share)
    if row.get("rights_split_pct") and share > 1:
        share = share / Decimal("100")
    payable = _decimal(row.get("payable_revenue") or row.get("net_amount") or "0")
    valid = Decimal("0") <= share <= Decimal("1") and payable >= 0 and bool(row.get("currency"))
    return share, payable, valid


def _fixture_result(path: Path) -> Dict[str, object]:
    rows = _read_rows(path)
    normalized = [_normalize(row) for row in rows]
    valid_rows = [item for item in normalized if item[2]]
    payable_total = sum((item[1] for item in valid_rows), Decimal("0"))
    artist_total = sum((item[0] * item[1] for item in valid_rows), Decimal("0"))
    return {
        "rows": len(rows),
        "validRows": len(valid_rows),
        "quarantinedRows": len(rows) - len(valid_rows),
        "payableTotal": str(payable_total.quantize(Decimal("0.01"))),
        "artistPayoutTotal": str(artist_total.quantize(Decimal("0.01"))),
    }


def validate_patch_plan(plan: PatchPlan, repository_root: Path, recorded_at: Optional[str] = None) -> ValidationResult:
    started = recorded_at or _now()
    checks: List[ValidationCheck] = []
    rejected_paths = validate_paths(file.path for file in plan.files)
    checks.append(ValidationCheck("Path policy", not rejected_paths, "All generated paths are allowlisted." if not rejected_paths else str(rejected_paths)))

    command_failures = [command for command in plan.commands if not is_allowed_command(command.split())]
    checks.append(ValidationCheck("Command policy", not command_failures, "Only deterministic dbt commands are requested." if not command_failures else str(command_failures)))

    missing_content = [file.path for file in plan.files if not file.proposed_content.strip()]
    checks.append(ValidationCheck("Patch content", not missing_content, "Every planned file has content." if not missing_content else str(missing_content)))

    sql_failures = []
    for patch_file in plan.files:
        if patch_file.language == "sql":
            lowered = patch_file.proposed_content.lower()
            if "select" not in lowered or "from" not in lowered or lowered.count("{{") != lowered.count("}}"):
                sql_failures.append(patch_file.path)
    checks.append(ValidationCheck("SQL parse", not sql_failures, "SQL shape and template delimiters are balanced." if not sql_failures else str(sql_failures)))

    secret_failures = {
        file.path: detect_secrets(file.proposed_content)
        for file in plan.files
        if detect_secrets(file.proposed_content)
    }
    checks.append(ValidationCheck("Secret scan", not secret_failures, "No credential-like generated text detected." if not secret_failures else str(secret_failures)))

    fixture_dir = repository_root / "data-stack" / "seeds"
    fixture_files = {
        "Old fixture": fixture_dir / "raw_dsp_settlements_v1.csv",
        "New fixture": fixture_dir / "raw_dsp_settlements_v2.csv",
        "Mixed fixture": fixture_dir / "raw_dsp_settlements_mixed.csv",
    }
    comparison: Dict[str, object] = {}
    for name, path in fixture_files.items():
        if path.exists():
            result = _fixture_result(path)
            comparison[name] = result
            passed = result["validRows"] > 0
            checks.append(ValidationCheck(name, passed, f"{result['validRows']} valid rows; {result['quarantinedRows']} quarantined."))
        else:
            checks.append(ValidationCheck(name, False, f"Missing fixture: {path.name}"))

    old = comparison.get("Old fixture", {})
    new = comparison.get("New fixture", {})
    reconciliation_passed = bool(old and new) and old.get("payableTotal") == new.get("payableTotal")
    checks.append(
        ValidationCheck(
            "Payout reconciliation",
            reconciliation_passed,
            (
                f"Old/new payable totals match at {old.get('payableTotal')}."
                if reconciliation_passed
                else f"Old/new totals differ: {old.get('payableTotal')} vs {new.get('payableTotal')}."
            ),
        )
    )

    passed = all(check.passed for check in checks)
    failed = [check.name for check in checks if not check.passed]
    completed = recorded_at or _now()
    return ValidationResult(
        validation_id=f"validation-{plan.patch_id}",
        patch_id=plan.patch_id,
        checks=checks,
        passed=passed,
        failed_checks=failed,
        warnings=["Recorded replay validation; dbt CLI checks are reported separately."],
        data_comparison=comparison,
        started_at=started,
        completed_at=completed,
        logs=[f"{check.name}: {'PASS' if check.passed else 'FAIL'} — {check.detail}" for check in checks],
        repair_attempted=False,
        final_status="passed" if passed else "blocked",
    )
