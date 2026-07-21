# Known limitations

- The default and only validated runtime is Recorded DataHub Context Replay. No DataHub server, ingestion, MCP connection, or DataHub mutation ran on this machine.
- `MockProvider` selects reviewed templates. It does not perform open-ended AI code generation, and `OpenAIProvider` deliberately fails closed.
- The static web app imports a fixture; it is not connected to the Python process and its approval state is not a security authority.
- Local replay write-back is a JSON record, not a DataHub write-back. Read-after-write verification is local only.
- The real dbt validation covers the default incident. The remaining 24 evaluation categories test routing/safety behavior, not unique compiled patches.
- Impact ground truth and context snapshots are synthetic and hand-reviewed; the evaluation is not a benchmark of production catalogs.
- Python direct dependencies are pinned and the validated environment has a transitive license metadata inventory, but a committed Python lockfile is absent.
- The primary desktop flow and 390 px responsive layout were exercised in a real browser and captured under `artifacts/screenshots`; automated Playwright video and cross-browser coverage are still absent.
- Public hosting, a public repository, a public video, final URLs, and Devpost submission are not completed.
- ContextPatch AI name search was informal and is not legal or trademark clearance.
