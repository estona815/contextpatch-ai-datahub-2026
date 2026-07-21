# Agent design

The keyless agent is a deterministic state machine, not an autonomous production operator.

| Stage | Input | Output | Gate |
| --- | --- | --- | --- |
| Intake | Incident JSON | Structured incident | Contract validation |
| Context | Recorded snapshots | Evidence bundle and trace | Injection scan |
| Analyze | Schema versions + lineage | `SchemaChange[]`, `ImpactGraph` | Hop and confidence bounds |
| Plan | Analysis + templates | `PatchPlan` | Path/command allowlists |
| Validate | Patch + fixtures | `ValidationResult` | All required checks pass |
| Approve | Review decision | Approval receipt | Patch ID match |
| Write-back | Receipt + preview | Local replay record | No external mutation |

`MockProvider` reads reviewed generated artifacts and returns a stable structured plan. `OpenAIProvider` intentionally fails closed in this build; it contains no network call and cannot be selected accidentally. This keeps the demo useful without an API key while making the provider boundary explicit for later integration.

Trace IDs, timestamps, durations, and output order are recorded constants so two replay runs are byte-identical. Runtime router latency is measured separately by the evaluation script.
