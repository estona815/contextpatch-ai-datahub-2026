# ContextPatch Workbench Design System

Source of truth: `design/concepts/contextpatch-workbench-v1.png` (generated 2026-07-21, native 1536 × 1024).

## Visual direction

A forensic editorial command console: deep navy-black, precise one-pixel rails, disciplined monospace evidence labels, and a single cyan approval action. The app uses open lists, tables, and one lineage canvas rather than a grid of floating cards.

## Locked first-viewport copy

- `ContextPatch AI`
- `REPLAY MODE`
- `Recorded DataHub Context Replay`
- `How it works`
- `July DSP payouts dropped sharply after a schema change`
- `raw_dsp_settlements`
- `artist_share → rights_split_pct`
- `net_amount → payable_revenue`
- `Incident`, `Context`, `Impact`, `Patch`, `Validate`, `Approve`, `Write-back`
- `LINEAGE GRAPH`, `MCP TRACE (Recorded session)`, `Patch diff`, `Validation`
- `Evidence & approval`, `Evidence confidence`, `Assumptions`, `Evidence citations`, `Rollback plan`
- `Approve Patch`, `Request Revision`, `Reject`, `Export Only`
- `No API key required`, `Synthetic data`, `Local replay`

No decorative eyebrow, unverified metric, or extra product claim may be added above the fold.

## Tokens

| Token | Value | Role |
|---|---:|---|
| `--bg` | `#03111d` | True dark navy page background |
| `--surface` | `#071826` | Workbench rails and selected surfaces |
| `--surface-raised` | `#0b1d2b` | Code, trace, and inspector rows |
| `--border` | `#29404f` | Primary one-pixel dividers |
| `--border-quiet` | `#1a3140` | Interior table rules |
| `--text` | `#eef7f6` | Primary copy |
| `--muted` | `#8da0aa` | Secondary copy |
| `--teal` | `#42d4cf` | Verified, selected, pass, approve |
| `--teal-dim` | `#12383d` | Selected background |
| `--coral` | `#ff5a55` | Direct impact, reject, deletion |
| `--amber` | `#f2b642` | Indirect impact, warning |
| `--focus` | `#80eee8` | Keyboard focus ring |

No gradient, glass blur, glow field, or off-palette tint is used.

## Typography

- Product/content: `Inter`, `SF Pro Display`, `Segoe UI`, system sans-serif.
- Evidence/code/control chrome: `JetBrains Mono`, `SFMono-Regular`, `Cascadia Code`, monospace.
- Product mark 18/700; incident title 20/650; section label 11/650 uppercase with 0.12em tracking; body 13–14/1.5; code 12.5/1.55; controls 13/650.
- Control typography is always explicit; no browser-default button or input sizing.

## Layout

- Desktop target: 1536 × 1024.
- Header: 54px. Footer: 38px.
- Left stage rail: 240px. Right evidence rail: 326px. Center workspace fills remaining width.
- Center upper region: lineage canvas then MCP trace rail. Center lower region: diff/validation tabs and evidence explanation.
- Border radius: 4px for nodes/rows, 2px for buttons; no large rounded containers.
- Spacing scale: 4, 8, 12, 16, 24, 32px.

## Component families

- `AppHeader`, `ModeNotice`, `StageRail`, `LineageCanvas`, `LineageNode`, `TraceRail`, `WorkspaceTabs`, `DiffViewer`, `ValidationPanel`, `EvidenceInspector`, `ApprovalControls`, `StatusFooter`.
- Impact variants: source/direct (coral), indirect (amber), healthy (teal).
- Stage variants: complete, active, upcoming.
- Button variants: approve/primary, outline, reject/danger, export/quiet.
- Evidence rows use a compact list with a citation count, verification mark, and disclosure chevron.

## Icon inventory

All icons are code-native inline SVG with `currentColor`, 1.5px stroke, round caps/joins: bracket logo, help circle, database, table, chart, check circle, warning triangle, terminal, shield, comment, ban, download, chevron, lock, copy, clock. No emoji or text-glyph icon substitutes.

## Interaction and responsive rules

- Stage selection, lineage node selection, diff/validation tabs, trace expansion, evidence details, and approval controls update local state.
- Approval becomes available only when deterministic validation passes. Approving changes only local replay state and reveals a recorded write-back receipt; it never mutates DataHub.
- Below 1180px the evidence rail becomes a right drawer. Below 820px the stage rail becomes a top stepper and lineage scrolls horizontally. Primary actions remain reachable with keyboard and touch.
- Respect `prefers-reduced-motion`; motion is limited to 140–180ms opacity/color/position state transitions.

