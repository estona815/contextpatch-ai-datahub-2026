# Guided demo script

Target length: 2:35–2:50. This version demonstrates Replay Mode honestly; it does not show a live DataHub UI.

**0:00–0:18 — Problem.** “A provider replaced two payout fields and changed the share unit. A syntactically plausible fix can still underpay artists.” Show the incident and the persistent Recorded Context badge.

**0:18–0:42 — Context.** Open the evidence inspector and six recorded MCP-shaped trace entries. State that the demo needs no key, API, account, Docker, or network.

**0:42–1:08 — Impact.** Select lineage nodes from staging through royalty ledger, monthly payout, export, and dashboard. Point out eight bounded assets and three owners.

**1:08–1:42 — Patch.** Show `artist_share → rights_split_pct` and `net_amount → payable_revenue`, then the staging SQL, tests, contract, and migration note. Explain mixed 0.65/65 normalization and invalid-row quarantine.

**1:42–2:12 — Validation.** Open Validation. Show old/new payable totals both 360.00 and the measured sandbox result: 16 pass, zero warning/error. Emphasize that source files remain untouched.

**2:12–2:35 — Approval.** Approve the patch. Show the local replay write-back record and clearly say that no live DataHub mutation occurs in this build.

**2:35–2:48 — Close.** “Data context in. Production-ready patch out. Knowledge ready to write back—after a human approves.”
