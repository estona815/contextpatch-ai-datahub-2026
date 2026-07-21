# ContextPatch AI

## Tagline

Data context in. Production-ready patch out. Knowledge ready to write back.

## Inspiration

Schema incidents are dangerous when a rename hides a semantic or unit change. A fix can compile and still corrupt a payout, while the engineer must manually search catalogs, lineage, queries, owners, tests, and contracts before touching production.

## What it does

ContextPatch AI turns a structured incident and DataHub context into an evidence-linked repair workflow. It maps changed fields, calculates a bounded downstream blast radius, proposes a constrained multi-file dbt patch, validates old/new/mixed fixtures and payout reconciliation, and requires human approval before preparing metadata write-back.

The default public-demo candidate is a completely keyless Recorded DataHub Context Replay. It runs without an account, API key, external AI API, Docker, or network and is clearly labeled as replay throughout the interface.

## How we built it

The frontend is a React/Vite evidence workbench. A Python agent core implements deterministic schema semantics, cycle-safe lineage traversal, structured contracts, path/command/secret policies, a sandbox executor, fixture reconciliation, approval gating, and local replay write-back. dbt Core and DuckDB execute the generated migration in an isolated sandbox. Draft 2020-12 JSON Schema and shared TypeScript contracts keep artifacts reviewable.

## How DataHub is used

Replay Mode uses recorded DataHub-shaped results for search, entities, schema fields, lineage, paths, owners, and dataset queries. Every result has provenance and evidence IDs. An executed ablation showed that schema context recovered both field mappings but 0/8 downstream assets; full recorded context recovered 8/8 assets, three owners, and the complete 8/8-file patch plan.

The optional Full Mode targets DataHub OSS v1.6.0 and the official MCP server 0.6.0. This integration is documented but not claimed as live-validated in the current Docker-free build.

## MCP and write-back

The trace represents six read-tool shapes: `search`, `get_entities`, `list_schema_fields`, `get_lineage`, `get_lineage_paths_between`, and `get_dataset_queries`. Replay capabilities expose no mutation. The UI previews `save_document`, `update_description`, and `add_tags`; after approval, the validated build records them only in a local replay JSON store. No live DataHub mutation is claimed.

## Why AI/agent orchestration is required

The valuable task is not text-to-SQL. It is a multi-step decision that joins uncertain field semantics, graph context, business ownership, multiple repository files, validation evidence, and an approval boundary. The shipped deterministic provider makes that agent contract repeatable and free; a live provider boundary is intentionally disabled until credentials and separate evaluation are available.

## Challenges

We had to preserve semantic correctness across mixed fraction/percentage units, separate recorded evidence from live claims, make approval meaningful without a backend authorization system, and validate generated dbt files without Docker or mutating the repository.

## Accomplishments

- Keyless, account-free guided replay with a purpose-built forensic UI
- Eight-asset impact graph and eight-file migration plan
- Real dbt/DuckDB sandbox: 3 seeds, 4 models, 9 tests, 16/16 tasks passed
- 25/25 deterministic incident routing/safety cases passed
- Zero successful prompt-injection attempts in two included attacks; zero approval bypasses
- Measured DataHub context ablation and judge-readable artifacts

## What we learned

Schema metadata explains *what changed*; lineage, ownership, and usage explain *what must be repaired*. Separating the validation and approval boundaries is also more important than making an agent appear autonomous.

## What is next

Validate the optional Full Mode end to end with real DataHub ingestion, MCP capability discovery, approved mutation, and read-after-write verification; evaluate a structured live model against the same fixtures; add server-side approval integrity; publish the replay; and propose the prepared DataHub Skill upstream after explicit review.

## Built with

React, Vite, TypeScript, Python, dbt Core 1.12.0, dbt-duckdb 1.10.1, DuckDB 1.5.4, JSON Schema, recorded DataHub context, and Apache-2.0 licensed source.

## Links

- Repository: `USER_ACTION_REQUIRED`
- Replay demo: `USER_ACTION_REQUIRED`
- Video: `USER_ACTION_REQUIRED`

## Testing

Follow `submission/testing-instructions.md`. Replay Mode requires no credentials. All live DataHub/Full Mode gaps are disclosed in `docs/20-known-limitations.md`.

## Open-source contribution and AI disclosure

An unsubmitted `datahub-schema-migration-impact` Skill proposal is under `contrib/datahub-skill`. Codex assisted with research, design, implementation, synthetic fixtures, documentation, and validation. Runtime Replay Mode makes zero external AI calls; see `AI_DISCLOSURE.md`.
