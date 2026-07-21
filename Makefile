.PHONY: demo build test evaluate export-examples

demo:
	pnpm dev

build:
	pnpm build

test:
	.venv/bin/python -m unittest discover -s services/agent/tests -v
	pnpm typecheck
	pnpm lint
	pnpm test

evaluate:
	.venv/bin/python scripts/evaluate/run_incident_suite.py --repository-root .
	.venv/bin/python scripts/evaluate/run_context_ablation.py --repository-root .

export-examples:
	.venv/bin/python scripts/demo/export_examples.py --repository-root .
