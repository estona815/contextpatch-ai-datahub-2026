# Hackathon Requirements and Verification Log

Checked on **2026-07-21 17:49 KST**. This file separates official facts from internal decisions and unresolved items. Public sources may change; re-check them immediately before submission.

## VERIFIED

- The submission period is open on the check date. It runs from **2026-07-06 09:00 EDT** through **2026-08-10 17:00 EDT**, which is **2026-08-11 06:00 KST**. Source: [official rules](https://datahub.devpost.com/rules) and [official schedule](https://datahub.devpost.com/details/dates).
- A submission must be a working application using open-source DataHub plus at least one of the MCP Server, Agent Context Kit, DataHub Skills, or Analytics Agent. Source: [official rules](https://datahub.devpost.com/rules).
- The project must have been newly created during the submission period. Standard frameworks, libraries, starter templates, and AI coding assistants are allowed; other incorporated pre-existing work must be disclosed. Source: [official rules](https://datahub.devpost.com/rules).
- Judges need an accessible project URL and a public source repository containing the functional source, assets, and instructions. The repository must use Apache License 2.0 and expose the license in the repository About area. Source: [official rules](https://datahub.devpost.com/rules).
- The demo video must be public on YouTube, Vimeo, or Youku, show the functioning product, and be under three minutes. Judges need not watch beyond three minutes. Source: [official rules](https://datahub.devpost.com/rules).
- English submission materials are required, or English translations must be provided. Generated output examples are recommended. Source: [official rules](https://datahub.devpost.com/rules).
- The latest stable open-source DataHub release observed is **v1.6.0**. The official Quickstart supports pinning it with `datahub docker quickstart --version v1.6.0`; Quickstart is for local development, not production. Sources: [DataHub releases](https://github.com/datahub-project/datahub/releases) and [Quickstart](https://docs.datahub.com/docs/quickstart/).
- The latest official DataHub MCP Server release observed is **v0.6.0**. Its core read tools include `search`, `get_entities`, `list_schema_fields`, `get_lineage`, `get_lineage_paths_between`, and `get_dataset_queries`. Mutation tools are disabled by default and require `TOOLS_IS_MUTATION_ENABLED=true`. Source: [official MCP repository](https://github.com/acryldata/mcp-server-datahub).
- The current DataHub Skills repository supports Codex and documents `npx skills add datahub-project/datahub-skills -a codex`. The latest release observed is **v1.4.1**. Source: [official DataHub Skills repository](https://github.com/datahub-project/datahub-skills).
- The current Agent Context package observed is **datahub-agent-context 1.6.0.15**, released 2026-07-16, with read and optional mutation tool bindings. Source: [PyPI project](https://pypi.org/project/datahub-agent-context/).

## NEEDS_CONFIRMATION

- Entrant age-of-majority and territorial eligibility.
- Devpost account registration and the final live form fields or terms.
- Whether any post-check rule amendment changes the requirements above.
- Public repository, hosted demo, and public video URLs.
- Trademark clearance. A web search found no identical `ContextPatch AI` product, but `contextPatch` appears as a general technical term in IETF material; this is not a legal trademark search.
- A real local DataHub + MCP ingestion and write-back run. The current machine has no Docker command, and the user chose a keyless/API-less Replay demo first.

## INTERNAL_DECISION

- Working name: **ContextPatch AI**.
- Primary category: **Metadata-Aware Code Generation & Development**; secondary story: **Agents That Do Real Work**.
- Safety deadline: **2026-08-10 23:00 KST**, seven hours before the official deadline.
- Default public/local demo mode: **Recorded DataHub Context Replay**. It requires no API key, external API, DataHub instance, or Docker and must never be presented as live metadata retrieval.
- Full Mode remains an optional integration path pinned to DataHub `v1.6.0` and MCP Server `v0.6.0` until re-verification.
- Synthetic music-royalty records only; no real artists, labels, DSP statements, or customer data.
- External submission, publication, push, account changes, and DataHub mutations remain human-gated.

## Local environment evidence

- Date/time: `2026-07-21 17:49:28 KST (+0900)`.
- Outer workspace Git state: branch `main`, no commits, many unrelated untracked contest folders. No destructive Git command is permitted.
- Docker CLI: unavailable.
- Node: supplied by the Codex bundled workspace runtime; pnpm is available.
- Python: system Python 3.9.6 and a bundled workspace Python are available.

