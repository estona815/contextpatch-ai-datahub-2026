# `datahub-schema-migration-impact` proposal

This unsubmitted contribution adds a focused read-only workflow for schema-migration impact analysis. It composes DataHub search, schema metadata, lineage, query usage, ownership, and evidence coverage into a reviewer-ready migration checklist.

It differs from the general search and lineage skills by making field mapping, migration uncertainty, owner routing, validation requirements, and the pre-mutation approval boundary first-class. It deliberately does not edit metadata.

## Local validation

```bash
python3 contrib/datahub-skill/tests/test_structure.py
```

Review `examples/incident.md` and `examples/sample-output.md` together. No upstream DataHub PR has been opened.
