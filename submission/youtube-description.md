# ContextPatch AI — Keyless DataHub Context Replay

ContextPatch AI is a metadata-aware schema migration and data incident repair workbench. It uses recorded DataHub-shaped schema, lineage, ownership, glossary, and query context to map upstream field changes, reveal downstream impact, generate a constrained dbt patch, validate financial semantics, and require human approval before local replay write-back.

Live demo: https://estona815.github.io/contextpatch-ai-datahub-2026/

Source code: https://github.com/estona815/contextpatch-ai-datahub-2026

Validated results:

- 17 Python tests and 3 frontend tests passed
- 16/16 dbt/DuckDB sandbox tasks passed
- 25/25 deterministic routing and safety cases passed
- Zero API keys, external AI calls, or Docker requirements in Replay Mode

Truth boundary: this video demonstrates Recorded DataHub Context Replay. It does not claim a live DataHub server, live MCP session, or live metadata mutation.

Built for Build with DataHub: The Agent Hackathon 2026.
