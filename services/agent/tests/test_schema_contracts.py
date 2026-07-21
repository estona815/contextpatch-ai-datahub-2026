from __future__ import annotations

import json
import unittest
from pathlib import Path

from jsonschema import Draft202012Validator


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]


class JsonSchemaTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        schema_path = REPOSITORY_ROOT / "packages" / "schemas" / "contextpatch.schema.json"
        cls.schema = json.loads(schema_path.read_text(encoding="utf-8"))

    def test_replay_fixture_matches_contract(self) -> None:
        fixture_path = REPOSITORY_ROOT / "packages" / "schemas" / "fixtures" / "valid-replay-outcome.json"
        fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
        Draft202012Validator(self.schema).validate(fixture)

    def test_unsafe_patch_fixture_is_rejected(self) -> None:
        fixture_path = REPOSITORY_ROOT / "packages" / "schemas" / "fixtures" / "invalid-patch-plan.json"
        fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
        patch_schema = {"$ref": "#/$defs/PatchPlan", "$defs": self.schema["$defs"]}
        errors = list(Draft202012Validator(patch_schema).iter_errors(fixture))
        self.assertTrue(errors)


if __name__ == "__main__":
    unittest.main()
