# Testing strategy

## Layers

- Python unit tests: analyzer, lineage cycles, policies, capability snapshot, sandbox executor, write-back approval, live-provider fail-closed, replay validation, and JSON Schema contracts.
- React tests: initial evidence state, diff/validation interaction, approval transition, and accessible control labels.
- dbt integration: generated patch applied to a fresh ignored sandbox, followed by seed/build and direct DuckDB totals.
- Evaluation: 25 synthetic routing/safety/fallback incidents and a three-mode context ablation.
- Browser E2E: guided stages, diff, validation, approval/write-back, export, responsive layout, and screenshots.

## Required commands

```bash
.venv/bin/python -m unittest discover -s services/agent/tests -v
pnpm typecheck
pnpm lint
pnpm test
pnpm build
.venv/bin/python scripts/evaluate/run_incident_suite.py --repository-root .
.venv/bin/python scripts/evaluate/run_context_ablation.py --repository-root .
```

The dbt command is intentionally run only in a freshly materialized sandbox. The primary browser flow was exercised at 1536×1024, including trace, validation, approval, and local write-back, and the responsive view was checked at 390×844 with no document-level horizontal overflow. Nine screenshots are under `artifacts/screenshots`. `pnpm audit`, `pip check`, a reproducible credential-pattern scan, and a JavaScript/Python license inventory passed locally. Dedicated backend lint/typecheck, full automated Playwright coverage, and video remain checklist items until their tools are added and run.
