# DataHub usage disclosure

## Current validated mode

The running demo is **Recorded DataHub Context Replay**. It reads committed synthetic snapshots and makes no live DataHub or MCP request. This distinction is visible in the header, trace, exported JSON, reports, and documentation.

| Item | Replay status | Full Mode target |
| --- | --- | --- |
| DataHub version | no server ran; snapshot represents OSS-era metadata | OSS Quickstart v1.6.0 |
| Ingestion | none live | PostgreSQL + dbt manifest/catalog/run results |
| Entities | recorded datasets, jobs, dashboard, export | verify in DataHub UI |
| Lineage | recorded graph, eight downstream assets, bounded to five hops | live `get_lineage` + path verification |
| Ownership | three recorded teams | ingested and re-read |
| Tags/glossary | recorded synthetic metadata | ingested and verified |
| MCP server | no live server; capability snapshot represents 0.6.0 | official server 0.6.0 |
| Read tools | six recorded calls | discover, then use `search`, `get_entities`, `list_schema_fields`, `get_lineage`, `get_lineage_paths_between`, `get_dataset_queries` |
| Mutation tools | none exposed | discover; enable only after approval |
| Write-back | local JSON replay only | approved mutation plus read-after-write |

## Why DataHub changes the result

The executed ablation found both schema mappings from schema context, but found 0/8 downstream assets without lineage. Full recorded context found 8/8 assets, three owners, and the complete 8/8-file patch plan, which then passed the isolated dbt build. DataHub-style context is therefore the source of blast radius and ownership evidence, not a decorative catalog lookup.

## Screenshots and proof

Replay screenshots belong under `artifacts/screenshots`. They are evidence of the replay workbench only. No screenshot may be labeled as a live DataHub UI or live MCP response. Full Mode screenshots remain a required submission task.

## Installation notes

DataHub Skills 1.4.1 were installed project-locally under `.agents/skills` using the official skills installer. An initial helper attempt installed five skills and failed when a shared-reference path was absent; the official `pnpm dlx skills add datahub-project/datahub-skills -a codex -y` path then installed all eleven published skills. The package still references shared files that are not part of each skill folder, so local work avoids claiming those missing references were used.
