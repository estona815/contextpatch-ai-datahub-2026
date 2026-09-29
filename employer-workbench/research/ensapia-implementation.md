# ENSAPIA — AvatarOps Harness implementation

Implemented 2026-09-29 as an independent portfolio prototype using the public role brief in `../research/windly-ensapia.md`. This is not an ENSAPIA product, commissioned work, live integration or evaluation of internal data.

## Actual behavior

The module accepts editable, versioned synthetic JSON traces. `evaluateAvatarRun(unknown)` validates the complete runtime structure before evaluating nine deterministic rule groups. `evaluateTraceText(string)` turns malformed/empty JSON into explicit `invalid_trace` reports with zero passed checks, all rules unassessed and no measurements. Unsupported schemas, duplicate event IDs, nonfinite/negative timestamps, unknown fields, malformed event records, circular references and excessively deep objects are rejected.

Checks cover userId scope, supplied tool allowlist, exact operation/attempt call-result pairing, required successful evidence behind supported final outcomes, logical operation retry limits, elapsed-time order/budget, evidence IDs/version/age, idempotent side effects, and prior approval for the exact request content. Reads and previews do not require approval unless the supplied synthetic policy requests it. Nonapplicable approval/write checks are marked unassessed. A refusal containing no tool events has only outcome/time checks assessed, rather than a perfect tool-quality score.

The write evaluator distinguishes repeated proposed requests (warning, if deduplicated) from additional applied side effects (error). Independent writes with different operation IDs and keys remain independent. Reusing the same key with a changed payload fails. Missing explicit write application state fails. Prior application may be recognized across a deduplicated resend with a new operation ID and the same exact request/key.

`compareRuns(baseline, candidate)` requires a unique scenarioId + fixtureVersion + ruleSetVersion pair, matching variant labels and identical scenario policy marker. Duplicate keys, missing counterparts, invalid inputs or changed policies are excluded with explicit reasons. It reports paired count, fail-to-pass, pass-to-fail, exact changed rule IDs and synthetic duration deltas; no model accuracy or opaque weighted score is calculated.

## Six useful paired scenarios

1. Other-user inventory read followed by timeout and unsupported completion, compared with scoped successful read/preview.
2. Retry exhaustion followed by a false completion claim, compared with an accurate unavailable response. Correctly reporting a failure is a passing scenario outcome.
3. Ticket creation followed by late approval, compared with prior approval tied to the exact request.
4. Duplicate ticket application, compared with a deduplicated resend that records no second side effect.
5. Existing evidence ID from an old inventory version, compared with the configured current version.
6. Preview call with its result missing, compared with complete paired evidence.

The UI provides a sample picker, scoped sample reset, baseline/candidate inspector, optional editable JSON, current reactive results, accessible per-event SVG/table cumulative timing, event-focused failure explanations, and JSON export with both current inputs/evaluations, comparison, versions, source research date, public source links and limitations. Invalid JSON immediately blocks the paired export and removes that side from comparisons. Edits to another tab do not reuse stale evaluations. Editable state persists through the shared local persistence helper; derived results are recalculated.

## Verification

`node --test tests/ensapia.test.mjs`: 32 executable engine tests pass; no skips. Tests include all six fixture pairs, invalid runtime data, cross-user/tool violations, call/result edge cases, time budget starting at zero, stale/missing/future evidence, recovered retries, legitimate unavailable/refused outcomes, exact approval invalidation, idempotent/repeated/independent writes, comparison exclusions and regressions, and deterministic JSON export roundtrip.

`npx tsc --noEmit`: initial integration run found only the shared `src/shared/utils.ts` ES2020 `replaceAll` library mismatch; no ENSAPIA type errors. `npx tsc --noEmit --lib ES2021,DOM,DOM.Iterable` then passed without code/config changes. Parent/root owns the shared configuration and final project typecheck/build/browser verification.

## Sources and boundaries

Public role/context sources, researched 2026-09-29:

- https://recruit.cocone.co.kr/job_posting/xGnZyTs4 — public AI engineering role context.
- https://recruit.cocone.co.kr/job_posting/AH8VH2Bm — public AX/log-analysis role context.
- https://ensapia.com/en/ — public avatar-world context.

All scenario users, tool names, policies, traces, timings and responses are synthetic. No API credentials, network requests, LLM invocation, user data, paid service, actual external latency or measured production outcome is involved. Outcome checking verifies structured evidence associations; it does not understand natural-language truth, prove privacy/security completeness, authenticate approval identities, or prove supplied logs are truthful/complete. Content markers are explicitly labeled noncryptographic FNV-1a local change indicators, not signatures or tamper-proof evidence. Real-trace adapters, cryptographic approval verification, complete semantic evaluation and production infrastructure remain outside this prototype.
