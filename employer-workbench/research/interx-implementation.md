# INTERX module implementation

Date: 2026-09-29. Independent candidate work sample, not an employer project or production integration.

## Delivered behavior

- Editable process owner, exception owner, completion condition and synthetic equipment request.
- Seven stages can be disabled/reordered with labelled keyboard-accessible controls. Missing dependencies, disabled mandatory checks, missing approval order, unredacted external contact data and invalid fields produce concrete diagnostics.
- Local workflow actually transforms the record, masks contact, pauses for approval, simulates dispatch, records failures and successful request keys, and reuses a successful result only when both payload and complete workflow configuration match. Conflicting payloads or changed workflows sharing a key are held; prior successful output remains unchanged and is not returned as the current output. This prevents unmasked internal output from being reused under a changed external/masked delivery policy.
- Any record/workflow edit increments revision and clears prior approval and visible execution. Approval tokens bind payload and workflow configuration. These are local demo state markers, not authenticated organizational approvals.
- Five scenario presets: normal, missing equipment, approval ordering, missing masking, intentional dispatch failure. Same-key replay, conflicting replay and stale approval can be exercised by edits and reruns.
- Time model is fully editable and recomputed. Default assumed before=1000 min/week, after=628, net=372, setup recovery≈1.94 weeks. Negative net time stays negative; invalid numeric inputs show errors. No actual ROI is claimed.
- Current Markdown and JSON downloads include requirements, current record, actual trace/state, current assumptions, formulas, limitations and source version. Reports accurately retain BLOCKED/WAIT/FAILED states rather than claiming readiness.

## Meaningful checks

`node --test tests/interx.test.mjs` — 9/9 passing after replay-identity review. Checks cover no dispatch before approval, stale input/config approval rejection, same-key duplicate protection and payload/config conflicts, stage/masking/audit blockers, bad fields/calendar dates, failure retry without a stuck replay key, independent time arithmetic including negative values, and actual blocked-state export evidence. The added independent regression first executes an internal unmasked request, then changes to an external masked workflow with identical payload and asserts CONFLICT, no returned output and no additional side effect.

`npx tsc --noEmit` initially found only shared `utils.ts` replaceAll target-library mismatch; no module errors. Root owns global config and is notified to resolve it. Root integration/browser verification follows separately.

## Reviewer path

1. Normal sample → 검증하고 실행 → WAITING_APPROVAL → 현재 내용 승인하고 실행 → one successful dispatch.
2. Same run again → existing result, no extra dispatch. Edit note retaining request ID → conflict. Use a new request ID → new approval.
3. Load order/masking failures → diagnostics. Reorder or re-enable the named stage → validation recovers.
4. Set weekly requests to zero while keeping maintenance → additional maintenance hours, no claimed payback.
5. Export report after a run; changing inputs first removes old exportable execution.

## Sources and inference

- https://interxlab.career.greetinghr.com/ko/o/210619 — official AX Coordinator responsibilities/criteria, fetched with Exa.
- https://interxlab.career.greetinghr.com/ko/o/227972 — prior official internship context, used for business needs only.

Workflow design/testing and requirement structuring come from the public role description. The equipment request domain, rules and tool are our proposed demonstration, not company-specific systems or confidential workflow requirements.

## Limits

Client-only, deterministic structured input handling. No LLM, external API, message dispatch, equipment control, real customer data, durable server ledger or distributed transaction claims. Replay protection demonstrates the principle in one browser session. Local persistence applies only to editable inputs; reports preserve actual run evidence when needed.
