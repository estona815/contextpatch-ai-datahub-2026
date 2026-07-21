#!/usr/bin/env python3
"""Scan publication-source text for high-confidence credential patterns."""

from __future__ import annotations

import argparse
import re
from pathlib import Path


SKIP_PARTS = {".git", ".venv", "node_modules", "dist", "artifacts", "target", "logs"}
TEXT_SUFFIXES = {
    ".csv", ".env", ".example", ".js", ".json", ".jsx", ".md", ".mjs",
    ".py", ".sql", ".toml", ".ts", ".tsx", ".txt", ".yaml", ".yml",
}
PATTERNS = {
    "private-key": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "openai-key": re.compile(r"\bsk-[A-Za-z0-9_-]{20,}\b"),
    "github-token": re.compile(r"\bgh[pousr]_[A-Za-z0-9]{30,}\b"),
    "aws-access-key": re.compile(r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b"),
    "jwt": re.compile(r"\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b"),
}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repository-root", type=Path, default=Path.cwd())
    args = parser.parse_args()
    root = args.repository_root.resolve()
    findings: list[tuple[str, Path, int]] = []

    for path in root.rglob("*"):
        if not path.is_file() or any(part in SKIP_PARTS for part in path.relative_to(root).parts):
            continue
        if path.suffix.lower() not in TEXT_SUFFIXES and path.name not in {"Dockerfile", "Makefile"}:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for line_number, line in enumerate(text.splitlines(), start=1):
            for label, pattern in PATTERNS.items():
                if pattern.search(line):
                    findings.append((label, path.relative_to(root), line_number))

    if findings:
        for label, path, line_number in findings:
            print(f"{label}: {path}:{line_number}")
        return 1
    print("Secret scan: PASS (no high-confidence credential pattern found)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
