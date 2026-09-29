# VIBERS — Inventory Reconciliation Desk implementation

Implemented 2026-09-29 as an independent work sample. VIBERS's public customer page lists multi-market inventory reconciliation automation, and its CSE role asks for customer problem definition through usable product delivery.

## Actual behavior

- Four synthetic presets: row-quality errors, conflicting duplicates, review-ready data and renamed headers requiring explicit mapping.
- CSV paste/edit/upload with six canonical fields: SKU, region/warehouse, expected quantity, counted quantity, unit cost and currency.
- Standard-header mapping is explicit; unknown headers remain unmapped. Missing/duplicate field connections block processing.
- Parser supports UTF-8 BOM, CRLF, quoted commas, escaped quotes and multiline quoted cells. Invalid quotes, duplicate/blank headers and row widths produce specific errors. Maximum 2 MB, 10,000 data rows and 128 columns. Oversized header/data rows are rejected during tokenization with a short error and empty header/record arrays so no oversized mapping selectors render.
- Quantities are finite non-negative integers up to 1 billion. Blank and malformed values are never coerced to zero. Costs respect KRW integer and USD/EUR two-decimal precision; unsafe valuation arithmetic is rejected.
- Key is SKU plus region. Exact canonical duplicates are visible and later copies excluded. Conflicting duplicates are all held; an invalid duplicate also holds a valid record with the same key.
- Duplicate grouping uses in-place list append. Conflict explanations are computed once per group and show at most 20 source line numbers plus the remaining count; every row retains its exact source line and raw values. A 10,000-row conflict therefore keeps complete row evidence without repeating a 10,000-item group list on every record.
- Signed difference equals counted minus expected. Absolute valuation difference equals absolute quantity difference times cost. Arithmetic uses currency minor units, and totals remain separated by currency.
- Current row counts partition all physical data rows. Discrepancy rate denominator is valid unique records, with no value for an empty denominator.
- Results show status filters, a 50-row page window, source line numbers, raw-field inspector, separate-currency totals and review readiness.
- Input/mapping changes make prior results stale and disable review/export. Local review is tied to exact input and run. Invalid/conflicting rows block review completion; descriptive error reports can still be exported.
- CSV export preserves row source, signed delta, status and reasons. JSON export preserves CSV, mapping, origin, exact run, optional current review, algorithm/sample versions and limitations. Shared CSV helper neutralizes formula-like text cells.
- Input origin distinguishes built-in synthetic fixture, user file and edited input. Files remain in tab memory and are not sent to a server or persisted in browser storage.

## Expected initial fixture

7 rows → 4 valid unique records. 2 matched; 2 discrepancies; 2 invalid; 1 exact duplicate; 0 conflicting duplicates. Discrepancy rate 2/4 = 50%. USD difference 17.00; EUR difference 55.50; no valid KRW total. These are current calculations of the example, not customer outcomes.

## Useful 60-second demonstration

1. Open row 6 to show a blank counted quantity is held rather than zeroed.
2. Correct blank/negative quantity in CSV and rerun; explain the denominator change.
3. Load the conflict preset and show both rows for SKU-A03 held together.
4. Load renamed-header preset and map the six fields manually.
5. Load review-ready preset, record review and export CSV/JSON.
6. Edit one value to show that the previous review/export becomes stale.

## Verification

`node --test tests/vibers.test.mjs`

13 tests pass: hand-calculated seeded totals; all-conflict holding; valid+invalid duplicate handling; BOM/quoted/multiline parser; malformed CSV; blank/negative/malformed quantities; mapping failures; SKU-region keys and currencies; input-bound approvals; row export; monetary precision/overflow; bounded explanations with all 10,000 conflicting rows retained; and early rejection of oversized headers/data rows with a valid 128-column boundary. Combined DOCENTY/VIBERS tests: 20 passed, 0 failed.

TypeScript found no module errors; root owns integrated UI/browser checks and the shared ES2020/replaceAll target fix.

## Sources

- https://www.vibers-ai.dev/ko/customers
- https://www.vibers-ai.dev/ko/team
- https://vibersai-team.super.site/opened-job/sales-manager-%EA%B2%BD%EB%A0%A5%EB%AC%B4%EA%B4%80

## Limits

No real warehouse/account access, inventory writeback, currency conversion, concurrent-user approval or production tenancy. Valuation difference is not confirmed loss. A browser-local checksum is not tamper-proof attestation. No application/network AI runtime is claimed. Pure engine lives independently of React in `src/modules/vibers/engine.ts`.
