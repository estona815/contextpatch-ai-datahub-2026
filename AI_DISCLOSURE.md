# AI disclosure

## Runtime AI

The validated Replay Mode makes zero external AI calls. `MockProvider` is a deterministic, reviewed-template provider that produces a structured `PatchPlan`. The `OpenAIProvider` boundary intentionally raises `LiveProviderDisabled`; it contains no API request. No API key is needed or read.

## Development assistance

OpenAI Codex was used to research public technical documentation, design the architecture and UI, generate code and documentation, create the synthetic incident and evaluation cases, run tests, and fix failures. A built-in image-generation tool created the initial visual concept at `design/concepts/contextpatch-workbench-v1.png`; the final UI is native HTML/CSS/React, not a rasterized interface.

## Human review points

The intended human reviewer confirms field semantics and ambiguous units, inspects every diff, reviews test/reconciliation evidence, chooses approve/reject/revise, and separately authorizes any future live mutation, deployment, publication, submission, or upstream pull request.

## Data handling

All committed demo data is synthetic. Replay Mode sends nothing to an AI provider, DataHub, MCP server, or analytics service. Development-time web research and built-in tooling are not runtime dependencies of the product.

## Limitations

The deterministic provider demonstrates an agent workflow and safety boundary, not the quality of a live language model. The 25-case evaluation is limited to deterministic routing/security behavior; it does not claim 25 independent AI-generated patches.
