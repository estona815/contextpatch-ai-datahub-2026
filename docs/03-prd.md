# Product requirements

## P0 user journey

1. Open the public Replay Mode without credentials.
2. Inspect the synthetic incident and recorded-context label.
3. Review schema mapping evidence and bounded downstream lineage.
4. Inspect every generated file and unified diff.
5. Review policy, fixture, reconciliation, and dbt validation.
6. Approve, reject, or request revision.
7. After approval, record only a local replay write-back and export the evidence bundle.

## Functional requirements

- Deterministic schema comparison using names, descriptions, glossary terms, types, samples, and observed ranges.
- Bounded lineage traversal with cycle protection, hop distances, owners, criticality, evidence IDs, and unresolved assets.
- Structured `PatchPlan` with allowlisted paths and commands.
- Old/new/mixed fixture comparison and currency-tolerance reconciliation.
- Human approval receipt matched to patch ID.
- Explicit Replay, Mock, and optional Full Mode labels; no silent mode fallback.
- Judge-readable artifacts even when the app is not run.

## Non-functional requirements

- No secrets in the repository or browser bundle.
- No source-tree mutation before approval; automated validation uses an ignored sandbox.
- No external request in Replay Mode.
- Keyboard-accessible controls, responsive layout, production build, and deterministic fixtures.
- Every live/unvalidated capability must be labeled honestly.

## Out of scope for the keyless build

Live DataHub ingestion, live MCP handshakes, external AI inference, public deployment, production write-back, authentication, background jobs, and multi-tenant isolation are documented but not claimed.
