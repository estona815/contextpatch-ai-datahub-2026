# Product brief

## One sentence

ContextPatch AI turns a data-schema incident plus DataHub context into an evidence-linked, bounded dbt patch plan that must pass deterministic validation and human approval before any write-back.

## User and job

The primary user is a data engineer or analytics engineer responding to an upstream provider change. Their job is to identify renamed or semantically changed fields, find downstream consumers, preserve financial meaning, generate reviewable code, and communicate the resolution without granting an autonomous agent production access.

## Keyless demo outcome

The default guided replay loads recorded DataHub-shaped schema, lineage, entity, owner, and query snapshots for a synthetic royalty pipeline. It maps two changed fields, exposes an eight-asset blast radius, generates an eight-file patch plan, shows evidence and diffs, validates payout reconciliation in DuckDB, and keeps write-back local. No account, API key, external API, Docker, or live DataHub is used.

## Differentiator

The product is not a generic SQL generator. Its useful unit is a traceable migration decision: metadata evidence → impacted asset → patch file → validation check → approval receipt → write-back preview.
