# Validation engine

Validation is layered so a plausible diff cannot bypass deterministic checks.

1. **Contract:** Replay JSON validates against Draft 2020-12; the unsafe fixture is rejected.
2. **Policy:** Every path and command is allowlisted; secret-like content is rejected.
3. **Static SQL:** required clauses and Jinja delimiter balance are checked.
4. **Fixtures:** old, new, and mixed provider CSVs are normalized; invalid mixed rows are quarantined.
5. **Reconciliation:** old and new payable totals both equal `360.00` in fixture validation.
6. **Sandbox dbt:** the patch is copied to an ignored sandbox and run with dbt Core 1.12.0, dbt-duckdb 1.10.1, and DuckDB 1.5.4.
7. **Approval:** a failed or mismatched patch cannot be written back.

The measured sandbox result is 3 seeds, 4 models, 9 data tests, and `PASS=16 / WARN=0 / ERROR=0`. A direct warehouse query returned six valid model rows, payable total `720.00`, and artist payout total `472.00`. See `examples/reports/dbt-sandbox-validation.json`.

The in-process validator does not label its SQL-shape check as a real dbt compile. dbt CLI results are deliberately reported separately.
