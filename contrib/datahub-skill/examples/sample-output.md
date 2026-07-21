# Synthetic migration impact summary

`artist_share → rights_split_pct` is a probable rename plus unit change; observed values require mixed fraction/percentage normalization. `net_amount → payable_revenue` is a probable semantic rename. Both require review because provider documentation is incomplete.

Eight recorded downstream assets are in scope across staging, calculation, ledger, monthly payout, export, reconciliation, and dashboard paths. Owners include Royalty Data Team, Finance Operations, and Creator Payments Team. Recommended validation: old/new compatibility, share range, settlement-period uniqueness, payout reconciliation, and rollback instructions.

Evidence coverage is complete for the synthetic recorded graph. No live DataHub request or mutation occurred.
