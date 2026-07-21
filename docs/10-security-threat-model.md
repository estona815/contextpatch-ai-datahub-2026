# Replay Mode threat model

## Scope and assumptions

This model covers the current public static Replay candidate plus the local Python/dbt validation companion. It assumes synthetic committed data, no login, no secrets, no external API, no Docker, no live DataHub/MCP, and a single local operator. Full Mode adds materially different network, identity, and production-data risks and is not security-approved by this document.

## Assets and trust boundaries

Protected assets are the developer filesystem outside the repository, source files before approval, approval integrity, generated patch integrity, browser users, and the honesty of replay/live provenance. Boundaries are: untrusted metadata → analyzer; generated text → policy; plan → sandbox; validation → approval; approval → local write-back; static browser bundle → downloaded export.

## Primary abuse cases

| Priority | Threat | Attack path | Existing control | Residual risk / next action |
| --- | --- | --- | --- | --- |
| P0 | Path traversal writes outside sandbox | malicious plan uses `../` or absolute path | pure-path validation and prefix allowlist; executor tests | symbolic-link defense is not implemented; keep sandbox freshly created and add resolved-path checks before Full Mode |
| P0 | Approval bypass | UI or caller submits mutation without matching receipt | Python gate requires `approved=true` and exact patch ID; replay MCP mutations empty | frontend state is demonstrative, not an authorization service; Full Mode needs server-side signed/session-bound approval |
| P0 | Metadata prompt injection | dataset description tells agent to reveal secrets or change policy | metadata treated as data, regex detection, two adversarial cases quarantined, no live model | regex is not comprehensive; future live provider needs instruction/data separation and output-policy revalidation |
| P0 | Command injection | generated command requests shell/curl | tokenized command allowlist; no shell executor in agent | prefix matching allows extra dbt args; Full Mode should parse exact permitted flags |
| P1 | Secret leakage in generated artifacts | fixture or model includes credential-like string | generated-content secret scan; `.env` ignored; no secret required | scanners are pattern-based; run a dedicated repository scanner before publication |
| P1 | Replay presented as live | screenshots imply MCP/DataHub proof | persistent Replay badge, trace fallback flag, provenance files, limitations | marketing copy can still be edited incorrectly; submission checklist must re-audit claims |
| P1 | Malicious exported file | browser download contains injected HTML/script | export is JSON text produced from committed fixture | browser-only export is not cryptographically signed; publish checksums in manifest |
| P2 | Denial of service from huge lineage | cyclic/wide snapshot expands indefinitely | visited set and explicit five-hop bound | no node-count cap yet; add a maximum node/edge budget in Full Mode |
| P2 | Dependency compromise | install-time package scripts or compromised registry artifact | pinned direct versions and lockfile | transitive Python packages are not locked in a committed lockfile; add `uv.lock`/hash review |

## Security invariants

- Replay Mode performs zero network requests and exposes zero mutation tools.
- Metadata text never changes the path, command, capability, disclosure, or approval policy.
- Patch files are written only below a newly created sandbox during automated validation.
- A failed validation or mismatched approval produces no write-back record.
- No production use or public Quickstart exposure is supported.

## Verification evidence

Unit tests cover traversal, command policy, secret detection, prompt injection, read-only capabilities, sandbox writes, and approval. The 25-case suite recorded one unsafe path and one prohibited command, both intercepted; two injection attempts succeeded zero times; approval bypass count was zero. These results are limited to the included cases, not a proof of absence.
