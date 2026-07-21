# Security policy

## Reporting

This project has no public security contact yet. Before publication, replace this paragraph with a private reporting channel in the public repository security policy. Do not include sensitive vulnerability details in a public issue.

## Demo boundary

ContextPatch AI is a hackathon prototype for synthetic data. It is not approved for production, personal data, financial execution, or unattended mutation. Replay Mode requires no secret and performs no external request.

## Controls

- generated paths and commands are allowlisted;
- descriptive metadata is treated as untrusted and scanned for injection patterns;
- generated content is scanned for credential-like text;
- automated patch writes go to a newly created ignored sandbox;
- validation must pass before approval is offered;
- local write-back requires a matching patch-ID approval receipt;
- recorded MCP capabilities expose no mutation tools.

Do not commit `.env` files, access tokens, database credentials, private keys, or production samples. Do not expose DataHub Quickstart publicly or retain default credentials. See `docs/10-security-threat-model.md` for abuse cases and residual risks.
