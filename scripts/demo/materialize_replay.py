#!/usr/bin/env python3
"""Create an isolated, non-destructive dbt sandbox from the replay PatchPlan."""

from __future__ import annotations

import argparse
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

from contextpatch.executor import materialize_sandbox
from contextpatch.replay import run_replay


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repository-root", type=Path, default=Path.cwd())
    parser.add_argument("--output", type=Path)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repository_root = args.repository_root.resolve()
    if args.output:
        sandbox_root = args.output.resolve()
    else:
        run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        sandbox_root = repository_root / "artifacts" / "runtime" / f"replay-{run_id}"

    if sandbox_root.exists():
        raise SystemExit(f"Refusing to overwrite existing sandbox: {sandbox_root}")

    sandbox_root.mkdir(parents=True)
    shutil.copytree(repository_root / "data-stack", sandbox_root / "data-stack")
    (sandbox_root / "data-stack" / "local").mkdir()

    outcome = run_replay(repository_root)
    hashes = materialize_sandbox(outcome.patch_plan, sandbox_root)
    manifest = {
        "mode": "replay",
        "synthetic": True,
        "source": "recorded DataHub context",
        "incidentId": str(outcome.incident["incidentId"]),
        "patchId": outcome.patch_plan.patch_id,
        "sandboxRoot": str(sandbox_root),
        "dbtProjectDir": str(sandbox_root / "data-stack" / "dbt"),
        "materializedHashes": hashes,
    }
    manifest_path = sandbox_root / "replay-sandbox-manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
