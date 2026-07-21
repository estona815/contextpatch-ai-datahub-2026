#!/usr/bin/env python3
"""Build a deterministic submission manifest while preserving explicit URL placeholders."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
FILES = [
    "README.md",
    "LICENSE",
    "AI_DISCLOSURE.md",
    "DATAHUB_USAGE.md",
    "examples/reports/replay-outcome.json",
    "examples/reports/dbt-sandbox-validation.json",
    "examples/reports/evaluation-results.json",
    "examples/reports/context-ablation.json",
    "examples/reports/dependency-license-inventory.json",
    "examples/patches/proposed.patch",
    "artifacts/screenshots/01-overview.png",
]


def digest(relative: str) -> str:
    return hashlib.sha256((ROOT / relative).read_bytes()).hexdigest()


manifest = {
    "projectName": "ContextPatch AI",
    "version": "0.1.0",
    "gitCommit": "UNCOMMITTED_USER_ACTION_REQUIRED",
    "buildDate": "2026-07-21",
    "repositoryUrl": "USER_ACTION_REQUIRED",
    "demoUrl": "USER_ACTION_REQUIRED",
    "videoUrl": "USER_ACTION_REQUIRED",
    "license": "Apache-2.0",
    "challengeCategory": "Build with DataHub: The Agent Hackathon 2026",
    "dataHubVersion": "1.6.0 target; not run in Replay build",
    "mcpServerVersion": "0.6.0 represented by recorded snapshot; not connected live",
    "mode": "recorded-datahub-context-replay",
    "generatedArtifacts": FILES[4:],
    "testResults": {
        "python": "17 tests passed on 2026-07-21",
        "frontend": "3 tests passed; lint/typecheck/build passed on 2026-07-21",
        "dbt": "16 passed, 0 warned, 0 errored",
        "evaluation": "25/25 deterministic routing and safety cases passed",
        "browser": "desktop guided flow and 390px responsive layout passed; 9 screenshots captured",
        "audits": "pnpm audit, pip check, high-confidence secret scan, and dependency license inventory passed locally",
    },
    "knownLimitations": [
        "No live DataHub ingestion, MCP connection, or mutation was validated.",
        "No external AI model is called; MockProvider is deterministic and template-bound.",
        "Public repository, demo, and video URLs are not set.",
    ],
    "checksums": {relative: digest(relative) for relative in FILES},
}

output = ROOT / "submission" / "submission-manifest.json"
output.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print(output)
