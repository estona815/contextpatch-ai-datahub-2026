# Schema migration engine

## Mapping

Removed and added fields are compared using name similarity plus semantic overlap from descriptions and glossary terms. Native types determine compatibility. Samples and observed ranges identify a fraction-to-percentage unit change even when names differ strongly.

For the default incident:

| Old | New | Classification | Evidence |
| --- | --- | --- | --- |
| `artist_share` | `rights_split_pct` | rename + unit change | shared glossary meaning; old max ≤1; new values include 60–70 |
| `net_amount` | `payable_revenue` | semantic rename | description/glossary alignment and compatible numeric type |

The mapping retains assumptions and a human-confirmation flag. Low-evidence removals are not guessed.

## Patch strategy

The generated staging model unions provider v1 and v2 into stable canonical fields. `rights_split_pct` values in `[0,1]` remain fractions; values in `(1,100]` divide by 100; null/out-of-range values are quarantined. Downstream models continue using `artist_share` and `net_amount`.

## Deterministic constraints

Only reviewed templates under `examples/generated-artifacts` can enter the keyless plan. Paths are allowlisted, SQL template delimiters must balance, settlement-period uniqueness is tested, and a reconciliation test rejects net amounts that diverge from gross minus fee beyond `0.01`.
