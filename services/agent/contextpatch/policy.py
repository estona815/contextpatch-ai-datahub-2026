from __future__ import annotations

import re
from pathlib import PurePosixPath
from typing import Iterable, List, Sequence, Tuple


ALLOWED_PATH_PREFIXES: Tuple[str, ...] = (
    "data-stack/dbt/models/",
    "data-stack/dbt/tests/",
    "data-stack/contracts/",
    "docs/migrations/",
    "examples/generated-artifacts/",
    "artifacts/patches/",
)

ALLOWED_COMMANDS: Tuple[Tuple[str, ...], ...] = (
    ("dbt", "parse"),
    ("dbt", "compile"),
    ("dbt", "run"),
    ("dbt", "test"),
    ("dbt", "build"),
    ("python", "-m", "unittest"),
    ("pnpm", "test"),
    ("pnpm", "lint"),
    ("pnpm", "typecheck"),
    ("git", "diff"),
    ("git", "status"),
    ("git", "apply", "--check"),
)

INJECTION_PATTERNS = (
    re.compile(r"ignore\s+(all\s+)?(previous|prior)\s+instructions", re.I),
    re.compile(r"reveal|print|upload|exfiltrate", re.I),
    re.compile(r"(credential|api[_ -]?key|system prompt|secret)", re.I),
    re.compile(r"you are now|act as system", re.I),
)

SECRET_PATTERNS = (
    re.compile(r"sk-[A-Za-z0-9_-]{20,}"),
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    re.compile(r"(?i)(password|api[_-]?key|secret)\s*=\s*[^\s$][^\s]*"),
)


def is_allowed_path(path: str) -> bool:
    normalized = path.replace("\\", "/")
    parsed = PurePosixPath(normalized)
    if parsed.is_absolute() or ".." in parsed.parts or normalized.startswith("~"):
        return False
    return any(normalized.startswith(prefix) for prefix in ALLOWED_PATH_PREFIXES)


def validate_paths(paths: Iterable[str]) -> List[str]:
    return [path for path in paths if not is_allowed_path(path)]


def is_allowed_command(command: Sequence[str]) -> bool:
    value = tuple(command)
    return any(value[: len(prefix)] == prefix for prefix in ALLOWED_COMMANDS)


def detect_prompt_injection(text: str) -> List[str]:
    hits = []
    for pattern in INJECTION_PATTERNS:
        if pattern.search(text):
            hits.append(pattern.pattern)
    return hits


def detect_secrets(text: str) -> List[str]:
    return [pattern.pattern for pattern in SECRET_PATTERNS if pattern.search(text)]

