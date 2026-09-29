# Module implementation contract

Each company owns `src/modules/<company>/index.tsx`, a default-export React component with no required props; pure logic belongs in `engine.ts`; deterministic example data in `fixtures.ts`. Test files are `tests/<company>.test.mjs` and can import pure TypeScript engines with Node 24's type stripping (`node --test tests/*.test.mjs`). Use type-only imports. Avoid enums or parameter properties.

Companies: windly, interx, docenty, ensapia, vibers, wisewires. Root owns app shell, global CSS, package/config, source/metadata ledger, and integration tests. Do not edit another company's files or global CSS/config.

Use React only (lucide-react available if it conveys meaning). No remote network, authentication, SDK, secrets, external model calls, pretending real customers, artificial delays, or fake metrics. Pure deterministic rules, editable structured inputs, transparent calculations and evidence. Explain a scenario as sample data. Real official sources are context, not a claim of internal customer access or complete platform policy coverage.

Shared helpers: `usePersistedState<T>(key, initial, validate?)` returns `[value, setValue, storageNotice]`; `downloadJson(filename, data)`; `downloadText(filename, content, mime?)`; `downloadCsv(filename, rows: Record<string,unknown>[])`; `formatNumber(value,digits?)`; `fingerprint(value)` (local change marker only, not cryptographic proof); `errorMessage(error)`.

Available global classes: `module-grid`, `panel`, `panel-header`, `panel-body`, `field`, `field-grid`, `input`, `select`, `textarea`, `button primary`, `button secondary`, `button ghost`, `button danger`, `form-note`, `result-summary`, `stat`, `metric-value`, `metric-label`, `issue-list`, `issue error`, `issue warning`, `issue pass`, `data-table`, `table-wrap`, `mono`, `mini-bars`, `bar-row`, `bar-track`, `bar-fill`, `callout`, `toolbar`, `segment-control`, `tag success`, `tag warning`, `tag danger`, `tag neutral`, `text-muted`, `split-grid`, `full-width`, `empty-state`, `check-row`, `step-list`, `step-item`, `inline-code`.

All fields need visible `<label>`. All buttons `type=button` unless purposeful form submit. Include hover/focus via classes. Avoid text smaller than 12 px; CSS root enforces standards. Tables should wrap in `table-wrap`. No custom full-app header: root provides page context, instructions, sources, limitations, documentation tabs and nav. On input changes recompute visible results or visibly invalidate prior results/approval; never leave stale success/export. Downloads must capture CURRENT input, results, sample/source version and limitations. Negative input must produce a visible message and block false-ready exports.

Persist only editable session state; validate saved structure or use a narrow reconstructing validator. Provide a deterministic sample picker and explicit reset-to-sample (do not erase unrelated state). Critical interactions and downloads should use stable clear Korean action labels and optional `data-testid`.

Write documentation `research/<company>-implementation.md`: actual behavior, test command/results, exact useful scenarios, public sources, remaining limitations. It is an implementation note, not a claims checklist in product UI.
