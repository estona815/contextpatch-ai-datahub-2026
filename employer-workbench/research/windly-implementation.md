# Windly / AdSpec implementation

Implemented 2026-09-29. Independent applicant demonstration; no affiliation or internal access is asserted.

## Actual behavior

AdSpec runs entirely in the browser over editable JSON or the visible campaign form. Every edit recomputes validation and approval eligibility immediately. It supplies eleven synthetic examples, bounded JSON import, explicit repair previews, source-linked field findings, a two-version local rule comparison, an unsent Google budget request preview, regression execution, and current-report exports.

`engine.ts` has no React imports or external calls. `validateAdSpec` validates unknown runtime input and returns `invalid_input`, `blocked`, `needs_review` or `ready_for_local_approval`. Unsupported platforms have incomplete coverage and never become locally approvable. Unknown fields are rejected rather than silently omitted from an approved plan.

Amounts are decimal strings and convert with BigInt to integer micros; zero, negative values, numeric JS values, scientific notation, excess fractional precision and int64 overflow are rejected. ISO dates are checked against the real calendar and normalized time order. Tracking merge preserves existing non-UTM query fields/fragments; conflicting and duplicate UTM values require correction. No automatic currency conversion, money rounding or undocumented platform policy is performed.

An approval records the complete canonical valid input and rule version. The display fingerprint is explicitly a local change marker, not a cryptographic signature. Equality compares the entire canonical input, so object key order is harmless while any campaign/rule change invalidates approval. Invalid input or unresolved review blocks approval.

The original brief's proposed SHA-256 was intentionally replaced by full canonical snapshot comparison plus a display-only marker. This does not claim tamper-resistant identity or server-side authorization.

## Useful review sequence

1. Load `출시 전 오류 3개`. See the budget conflict, invalid URL and absent campaign tracking value.
2. Inspect each before/after proposal. Explicitly choose the daily budget while removing the displayed total-budget field; apply HTTPS and tracking suggestions separately.
3. Observe current local validation pass, inspect the request preview and approve the snapshot.
4. Change the budget: the previous approval becomes stale. The report only includes an approval if it matches the current input.
5. Load `규칙 변경 영향`, open rule comparison: v1 passes but v2 requires `utm_campaign`.
6. Load unsupported Meta or malformed JSON: there is no Google request preview or false-ready approval.
7. Execute regression checks to compare actual issue IDs to independently specified fixture expectations.

## Tests and verification

Command:

```sh
node --test tests/windly.test.mjs
```

Result after independent-review repair: **33 tests passed, 0 failed, 0 skipped**. Coverage includes eleven fixture expectations plus exact micros boundaries, malformed types, unknown fields, budget mapping, unsent request fields, UTF-8 byte limits, leap dates/timezone equality, URL/UTM preservation and conflicts, unsupported platform coverage, canonical approval binding, stale metadata, rule-version changes, explicit repair behavior and round-trip reproducibility. Additional regressions cover 8,000-level nested JSON, a deeply nested extra field in an otherwise valid campaign, wide/cyclic input and bounded error observations.

`npx tsc --noEmit` passes after root's shared-helper fix. Final application build and browser/visual verification belong to the integrated application pass and were not claimed here.

## Independent-review failure repaired

A 16KB string containing 8,000 nested arrays parses as JSON, but the original schema failure echoed that raw nested array in `issue.actual`. Rendering the observation with JSON.stringify could therefore overflow the JavaScript stack. Validation now performs an iterative precheck with depth 32 and 10,000-node limits before cloning or canonicalization. It rejects cyclic/repeated object references and excessive scalar/key lengths. Every issue observation is a bounded shallow summary rather than a reference to caller-owned nested input. Invalid-input exports are disabled, and over-limit data cannot enter form cloning or rule-version mutation. The exact crash reproduction and additional negative cases are executable regressions.

## Public basis

- Official Windly AI Product Builder job, platform/API constraint research, SDD and QA: https://team.windly.cc/34981025-15df-80c0-af67-e6965f2dcf4f
- Abear Pervis already describes setup, budget/UTM checks and approval workflows: https://www.pervis.ai/
- Google Ads API v24 request validation semantics: https://developers.google.com/google-ads/api/reference/rpc/v24/MutateCampaignBudgetsRequest
- Google Ads API v24 budget units, period, exclusive amount fields and name byte limit: https://developers.google.com/google-ads/api/reference/rpc/v24/CampaignBudget

Sources were read through Exa on 2026-09-29. This date is the research date, not an asserted publication date.

## Limits

Only some Google budget fields and disclosed AdSpec workflow constraints are evaluated. The preview uses proto field names and is not a tested REST payload. No live API validation, campaign creation, authentication, account currency/balance inspection, destination reachability or advertisement review is implemented. Synthetic local tests do not establish provider acceptance, ad performance or quantified time savings. Source provenance, local constraints and untested coverage remain in exported reports.
