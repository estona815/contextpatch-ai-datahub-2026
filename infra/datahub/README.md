# Optional DataHub Full Mode

The shipped demo does not require Docker, credentials, or a DataHub instance. This directory is a reviewed setup recipe for a future Full Mode; it was not executed on the keyless build machine because Docker is unavailable.

Pinned integration targets:

- DataHub OSS Quickstart: `v1.6.0`
- Official DataHub MCP server: `0.6.0`
- `datahub-agent-context`: `1.6.0.15` (documented fallback only; not installed in Replay Mode)

## Setup outline

1. Install the current official DataHub CLI prerequisites.
2. Start the local-only Quickstart with `datahub docker quickstart --version v1.6.0`.
3. Create a PostgreSQL demo database and replace every `${...}` placeholder in the recipes through environment variables.
4. Run the PostgreSQL recipe, build dbt artifacts, then run the dbt recipe.
5. Verify schemas, lineage, owners, tags, glossary terms, tests, and query context in the DataHub UI.
6. Start the official MCP server 0.6.0, perform live capability discovery, and initially leave mutations disabled.
7. Enable mutation tooling only for an isolated demo and only after the approval boundary is tested.

Do not expose Quickstart to the public internet or rely on default credentials. Full Mode remains **not live-validated** until each verification above is recorded with logs and screenshots.
