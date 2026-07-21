# Rollback Plan

Synthetic example for `inc-2026-07-dsp-001`.

1. Revert the locally approved patch.
2. Restore provider contract version 1.
3. Quarantine provider-v2 rows.
4. Re-run v1 payout reconciliation before re-enabling downstream exports.

