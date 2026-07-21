# DataHub integration

## What is implemented now

Replay Mode consumes six recorded DataHub-shaped read results: search, entity metadata, schema fields, downstream lineage, path-between, and dataset queries. Every trace row has an evidence ID, a recorded timestamp, and `fallbackUsed: true`. The UI and reports say “Recorded DataHub Context Replay”; no live request is implied.

The context contributes information that the incident text alone cannot provide: semantic field descriptions, observed ranges, glossary alignment, eight downstream assets, three affected owners, critical paths, and usage-query examples. The measured ablation is in [15-context-ablation-report.md](15-context-ablation-report.md).

## Version targets

- DataHub OSS Quickstart `v1.6.0`
- Official DataHub MCP server `0.6.0`
- Optional Agent Context Kit package `datahub-agent-context==1.6.0.15`

These are reviewed targets. No live DataHub component was started on this machine because Docker is absent and the requested demo must be Docker-free.

## Optional Full Mode sequence

Use the version-pinned recipes under `infra/datahub`. Start DataHub locally, ingest PostgreSQL and actual dbt `manifest.json`, `catalog.json`, and `run_results.json`, verify sibling/URN alignment and lineage, then start MCP and perform runtime capability discovery. Read tools can run immediately; mutation tools require server enablement plus a patch-ID-matched approval receipt.

## Write-back design

The replay previews `save_document`, `update_description`, and `add_tags`. In the current build these operations are written only to a local JSON store after approval. Live mutation and read-after-write verification remain unvalidated Full Mode work.
