# DOCENTY — Brief to Acceptance implementation

Implemented 2026-09-29 as an independent work sample grounded in DOCENTY's public PO role and VibeOps data/permission model.

## Actual behavior

- Editable problem, user, desired outcome, metric, inclusion/exclusion scope, data fields and requested/allowed permissions.
- Nine deterministic checks: problem completeness; measurable target; scope; approved resource; allowed permissions; complete normal/error/permission scenarios; requirement-to-case traceability.
- Traceability requires a complete Given/When/Then case. An empty expected outcome does not count as coverage. Unknown/duplicate requirement IDs are reported.
- Two synthetic brief presets: a blocked example with unapproved write access and a missing error outcome, and a review-ready example.
- Input equality uses the exact serialized brief. Changed inputs mark the prior run stale and disable current-result JSON export and review actions. Edits also clear prior approval.
- Explicit reviewer entry records a local review decision tied to the exact input and run. This is not server-side authorization or verified identity.
- Markdown export includes the current brief and appropriate current/stale status; JSON export includes current input, nine check details, sample/algorithm versions, limitations and any current review record.
- Only the editable brief persists in browser localStorage, with nested-shape validation and a storage failure notice. Runs/approvals do not persist.

## Useful 60-second demonstration

1. Start with “권한·검수 보완이 필요한 브리프.”
2. Select the permission failure to inspect `read:issues, write:issues` versus `read:issues`.
3. Change requested permissions to `read:issues`.
4. Open “요구사항·검수” and fill the missing AC2 expected result, explaining that it restores R2 coverage.
5. Run nine checks, enter a reviewer, record review completion and export the evidence.
6. Change any target or source field to show immediate stale-result protection.

## Verification

`node --test tests/docenty.test.mjs`

7 substantive tests pass: all-ready nine-check scenario, missing error outcome and coverage, excess permission, stale result/approval/export, duplicate/dangling IDs, numeric metric validation, saved-state validation. Combined DOCENTY/VIBERS tests: 20 passed, 0 failed including VIBERS's later 10,000-row amplification and 128-column boundary regressions.

TypeScript found no module errors; first full project typecheck was blocked only by shared `utils.ts` using `replaceAll` with an ES2020 library target. Root owns that integration fix and browser QA.

## Sources

- https://career.docenty.ai
- https://www.rocketpunch.com/jobs/159343?list=true
- https://vibeops.docenty.ai

These sources establish company context. They do not establish that the company requested this app or that this tool replicates its internal implementation.

## Limits

Rule-based structure/consistency checks; no LLM runtime, target outcome measurement, external access control, real internal data or production SSO. No claim that the applicant has shipped DOCENTY's product. The local change marker is for identification, not cryptographic proof. Pure engine lives independently of React in `src/modules/docenty/engine.ts`.
