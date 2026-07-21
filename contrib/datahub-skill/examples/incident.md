# Synthetic incident

- Dataset: `raw_dsp_settlements`
- Environment: synthetic replay
- Old fields: `artist_share`, `net_amount`
- New fields: `rights_split_pct`, `payable_revenue`
- Concern: share values mix fraction and percentage units
- Requested lineage depth: five hops for this reviewed example
- Constraint: read-only; no mutation
