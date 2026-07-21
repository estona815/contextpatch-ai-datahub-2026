from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
text = (ROOT / "SKILL.md").read_text(encoding="utf-8")

assert text.startswith("---\nname: datahub-schema-migration-impact\n")
assert "user-invocable: true" in text
assert "## Approval boundary" in text
assert "Never call `add_tags`" in text
assert (ROOT / "examples" / "incident.md").exists()
assert (ROOT / "examples" / "sample-output.md").exists()

print("datahub-schema-migration-impact structure: PASS")
