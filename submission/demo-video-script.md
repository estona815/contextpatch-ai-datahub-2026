# Under-three-minute demo script

**0:00–0:18**  
An upstream provider replaced two royalty fields—and changed one from a fraction to a percentage. A fix can compile and still change artist payouts.

**0:18–0:40**  
This is ContextPatch AI in Recorded DataHub Context Replay. It needs no key, account, API, Docker, or network. These six trace rows reproduce search, entity, schema, lineage, path, and query context with explicit evidence IDs.

**0:40–1:05**  
The schema analyzer maps artist share to rights split percent and net amount to payable revenue. Recorded lineage expands that local change into eight downstream assets and identifies three responsible teams.

**1:05–1:38**  
The agent creates a bounded eight-file plan: backward-compatible staging SQL, the royalty calculation, schema tests, share-range and settlement-key checks, payout reconciliation, a versioned contract, and migration guidance. Values like point-six-five stay fractions; sixty-five becomes point-six-five; invalid values are quarantined.

**1:38–2:08**  
Before approval, nothing touches the source tree. The patch runs in an isolated DuckDB sandbox. Three seeds, four models, and nine tests produced sixteen passes with zero warnings or errors. Old and new fixture totals both reconcile to three hundred sixty dollars.

**2:08–2:32**  
Now the reviewer can approve, reject, or request revision. Approval creates only a local replay write-back record here—no live DataHub mutation is being claimed.

**2:32–2:46**  
Our measured ablation found both mappings with schema context, but none of eight downstream assets. Full recorded DataHub context found all eight and the complete patch. Data context in. Production-ready patch out. Knowledge ready to write back.
