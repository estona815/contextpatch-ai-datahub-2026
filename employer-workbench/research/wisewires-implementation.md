# WiseWires module implementation

Date: 2026-09-29. Independent candidate work sample using intentionally seeded defects, never a claim about real WiseWires/customer bugs.

## Delivered behavior

Six editable synthetic ecommerce scenarios execute separate flawed/fixed business functions and compare outputs against requirements calculated independently of the fixed function:

1. Zero/fractional/oversold quantity acceptance and side effects.
2. Coupon amount exceeding subtotal; actual negative payable versus capped discount.
3. Repeated client key: repeated orders versus stable ID/stock and conflict rejection.
4. Exact expiry instant with before/exact/after buttons and fixed ISO clock.
5. Deterministic virtual search response ordering; late A response versus latest-request B result.
6. Repeated cancellation and unpaid order: cumulative refund/stock restoration versus valid one-time state transition.

The UI shows the actual mutated/fixed order, money and timeline states. Run-all executes the current saved input for every scenario; results are computed from assertions, not canned counters. Changing any input clears previous results. Invalid harness values yield no PASS/FAIL. Domain-invalid inputs such as quantity zero are intentionally testable.

Current failed-case Markdown/JSON reports capture inputs, ordered steps, expected/actual evidence, failed assertions, editable severity, proposed fix and same-input fixed regression results. Passing/unexecuted inputs cannot export a made-up defect. Full run JSON records all current input/config and actual run states.

## Checks

`node --test tests/wisewires.test.mjs` — 14/14 passing; combined with INTERX 22/22. Each of six seeded faulty implementations must actually fail and its fixed variant pass. Additional checks cover safe quantity boundaries, valid discounts that should not produce false defects, same-key changed-content conflicts, exact expiry ±1ms, both response orderings, unpaid/repeated cancellation, invalid numeric/calendar/persistence values, and real observed report contents.

Strict TypeScript initially reported only root-owned shared utils replaceAll lib setting; no module errors. Root integration/browser validation is separate.

## Reviewer path

- Default 할인 한도 → compare → flawed actual −4,000원, fixed0원; export observed report.
- 전체6개 비교 실행 → six seeded defects reproduced / six fixed versions pass.
- Change coupon to500 → both pass, no false issue export.
- Select 주문 재실행, enable changed payload → fixed conflict for subsequent attempts, first order retained.
- Expiry exact → flaw; 1ms before/after → correct temporal interpretation.

## Sources and scope

- https://www.jobkorea.co.kr/Recruit/GI_Read/50025872?Oem_Code=C1&PageGbn=ST&sc=225 — employer SQA JD, current period September21–October5,2026, fetched Exa.
- https://www.wisewires.com/services-ecommerce.html — official ecommerce QA service/business flow context, fetched Exa.

The specific lab and its rules are a candidate's design inference. The public material supports relevance of ecommerce workflow QA; it does not show that this exact job will be assigned to these domains or tools. No real payments, inventory system, network, authentication, load/penetration tests or distributed concurrency. The independent oracle expresses a stated local policy, not the employer's complete policies. Seed suite passes are limited evidence, not exhaustive quality proof.
