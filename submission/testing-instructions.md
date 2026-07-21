# Testing instructions for judges

## Fast path: keyless Replay Mode

Requirements: Node.js 20+ and pnpm 11.x.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:4173`. Expected default incident: “July DSP payouts dropped sharply after a schema change.” Click lineage nodes, expand trace evidence, switch Diff/Validation, choose files, then approve or request revision. Export downloads the replay JSON. No credential or network request is required.

## Full local validation companion

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -e 'services/agent[dev]'
.venv/bin/python -m unittest discover -s services/agent/tests -v
pnpm typecheck && pnpm lint && pnpm test && pnpm build
.venv/bin/python scripts/evaluate/run_incident_suite.py --repository-root .
.venv/bin/python scripts/evaluate/run_context_ablation.py --repository-root .
```

For dbt, run `scripts/demo/materialize_replay.py`, change into the printed dbt project directory, and invoke the repository `.venv/bin/dbt` with `--profiles-dir .`. Expected build: 3 seeds, 4 models, 9 data tests, 16 total passes, no warning/error/skip.

## DataHub credentials

None are used by Replay Mode. Optional Full Mode setup is under `infra/datahub` and is **not live-validated** in this submission package. Do not interpret the recorded trace as a live MCP connection.

## Troubleshooting

- Blank/old UI: verify port 4173, reload, and check `pnpm build`.
- Python import error: install the quoted `services/agent[dev]` extra into `.venv`.
- Existing sandbox error: the materializer refuses overwrites; omit `--output` to create a timestamped directory.
- Docker/DataHub absent: expected for Replay Mode; the demo remains fully navigable.
