# Source and design attribution

Company Workbench is a separately implemented portfolio demonstration created for company-specific application review.

## Existing project reference

The visual tokens, staged review layout, evidence-inspection pattern, and approve/export interaction model are adapted from **ContextPatch AI**:

- Source repository: https://github.com/estona815/contextpatch-ai-datahub-2026
- Reference revision: `838678d85fadce583f6b8256d9d6c0903f00ed36`
- Original application: `apps/web/src/App.tsx`
- Original stylesheet: `apps/web/src/styles.css`
- Original review components: `apps/web/src/components/StageRail.tsx`, `EvidenceInspector.tsx`, `DiffViewer.tsx`
- Copyright 2026 ContextPatch AI contributors
- License: Apache License 2.0; a complete copy is included in `LICENSE`.

The new company demonstrations, input validation, synthetic scenarios, computations, reports, and documentation were implemented for this workbench. The ContextPatch replay fixture and its claims of earlier validation are not evidence that these new modules passed verification; this workbench's own verification report states what was actually checked.

SPECNOTE, TRACEPATCH, and WorkTrial informed the application context through the candidate's existing portfolio description. Their original source code was not located in this session and is not claimed as a code dependency.

## Dependencies

The application uses React, React DOM, Lucide React, and the declared Vite toolchain. Their package license and copyright notices remain applicable. No external AI inference service, customer database, company credential, or proprietary company source is bundled.

## Company references

Company names and links identify the public role or product that motivated each independent sample. The workbench does not claim company sponsorship, hiring endorsement, production access, real customer data, or actual commercial performance.

## Modification notice

2026-09-29: adapted ContextPatch's review-workbench design language into a standalone company-specific portfolio application with new modules and independently verified behavior.

