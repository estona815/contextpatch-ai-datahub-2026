# Performance and cost

Only measured values are reported.

| Measurement | Actual result | Scope |
| --- | ---: | --- |
| Deterministic router median | 0.004834 ms | 25 in-process cases on this Mac run |
| Deterministic router P95 | 0.010959 ms | same run; nearest-rank implementation |
| dbt seed elapsed | 0.18 s | three DuckDB seeds, dbt-reported |
| dbt build elapsed | 0.34 s | 3 seeds + 4 models + 9 tests, dbt-reported |
| External AI calls | 0 | Replay evaluation |
| Estimated AI cost | USD 0 | no provider call or token use |

The recorded trace durations are fixture provenance, not live MCP benchmarks. DataHub startup, ingestion, MCP connection/retrieval, live planning, model tokens, and Full Mode end-to-end time were not measured because those systems did not run.

Cost and latency controls already present are deterministic diffing, recorded replay, context deduplication through fixed snapshots, five-hop lineage bounding, no retry loop, and zero external inference. Full Mode should add result pagination, cache TTLs, node budgets, tool-call limits, and observed token/cost telemetry before any claim is made.
