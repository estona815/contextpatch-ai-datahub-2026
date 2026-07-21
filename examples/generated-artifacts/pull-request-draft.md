# Add backward-compatible DSP settlement schema migration

## Why

Recorded DataHub context shows that the synthetic provider replaced `artist_share` and `net_amount` while changing or ambiguously documenting the share unit.

## What

- Normalize v1/v2 sources into stable canonical fields.
- Quarantine invalid share values.
- Add schema, range, compatibility, and payout reconciliation tests.
- Version the provider contract and document rollback.

## Safety

This is a local draft. No remote branch, push, or pull request has been created.

