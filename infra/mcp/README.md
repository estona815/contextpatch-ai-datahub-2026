# MCP boundary

Replay Mode loads `capabilities-replay.json` and replays six recorded read-tool results. It does not open an MCP connection and exposes no mutation capability.

Full Mode is an optional, unvalidated integration path. It must perform a live tool-list handshake against the official DataHub MCP server before each session, show the returned tools in the UI, and keep mutations disabled unless both `TOOLS_IS_MUTATION_ENABLED=true` and a matching human approval receipt are present. Never infer a mutation tool from this replay snapshot.

The version represented by the recorded snapshot is `mcp-server-datahub` 0.6.0. This is provenance, not proof that a live 0.6.0 server ran on this machine.
