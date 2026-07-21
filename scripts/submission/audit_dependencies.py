#!/usr/bin/env python3
"""Create a path-free dependency license inventory for the validated environment."""

from __future__ import annotations

import argparse
import importlib.metadata
import json
import shutil
import subprocess
from pathlib import Path


def python_license(distribution: importlib.metadata.Distribution) -> str:
    metadata = distribution.metadata
    declared = metadata.get("License-Expression") or metadata.get("License") or ""
    if declared.strip():
        return declared.strip()
    classifiers = [
        value.removeprefix("License :: ")
        for value in metadata.get_all("Classifier") or []
        if value.startswith("License :: ")
    ]
    return ", ".join(classifiers) or "UNKNOWN"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repository-root", type=Path, default=Path.cwd())
    args = parser.parse_args()
    root = args.repository_root.resolve()

    pnpm = shutil.which("pnpm")
    if pnpm is None:
        raise SystemExit("pnpm is required to audit JavaScript licenses")
    completed = subprocess.run(
        [pnpm, "licenses", "list", "--json"],
        cwd=root,
        check=True,
        capture_output=True,
        text=True,
    )
    grouped_javascript = json.loads(completed.stdout)
    javascript = sorted(
        {
            (package["name"], version, license_name)
            for license_name, packages in grouped_javascript.items()
            for package in packages
            for version in package["versions"]
        }
    )

    python = sorted(
        {
            (
                distribution.metadata.get("Name") or "unknown",
                distribution.version,
                python_license(distribution),
            )
            for distribution in importlib.metadata.distributions()
        }
    )
    report = {
        "mode": "local-validated-environment",
        "generatedAt": "2026-07-21",
        "javascript": {
            "packageVersionRecords": len(javascript),
            "licenseFamilies": sorted(grouped_javascript),
            "packages": [
                {"name": name, "version": version, "license": license_name}
                for name, version, license_name in javascript
            ],
        },
        "python": {
            "distributionRecords": len(python),
            "unknownLicenseMetadata": [
                {"name": name, "version": version}
                for name, version, license_name in python
                if license_name == "UNKNOWN"
            ],
            "packages": [
                {"name": name, "version": version, "license": license_name}
                for name, version, license_name in python
            ],
        },
        "note": "Metadata inventory only; counsel or a release owner must review compatibility before redistribution.",
    }
    output = root / "examples" / "reports" / "dependency-license-inventory.json"
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
