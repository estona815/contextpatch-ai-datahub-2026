from __future__ import annotations

import argparse
import json
from pathlib import Path

from .models import to_dict
from .replay import run_replay


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="contextpatch")
    sub = parser.add_subparsers(dest="command", required=True)
    demo = sub.add_parser("demo", help="Run the keyless recorded DataHub context replay")
    demo.add_argument("--repository-root", type=Path, default=Path.cwd())
    demo.add_argument("--output", type=Path)
    return parser


def main() -> int:
    args = build_parser().parse_args()
    if args.command == "demo":
        result = to_dict(run_replay(args.repository_root.resolve()))
        rendered = json.dumps(result, indent=2, sort_keys=True)
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(rendered + "\n", encoding="utf-8")
        print(rendered)
        return 0 if result["validation"]["passed"] else 2
    return 2


if __name__ == "__main__":
    raise SystemExit(main())

