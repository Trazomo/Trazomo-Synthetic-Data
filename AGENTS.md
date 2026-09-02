# Agent Orientation

This repository is the canonical synthetic-data universe for Trazomo training and exemplar repos. It is designed to be read by coding agents.

## Ground rules

- All data is fictional and safe to use in demos, tests, and templates.
- Entity IDs are canonical across the whole repo: the same company ID refers to the same fictional company in every dataset, in every track directory.
- Never invent additional facts about canon entities. Extend the universe by adding to `canon/` and regenerating via `datagen/`.
- Datasets contain deliberately planted anomalies for training exercises. Do not "fix" them; finding them is the exercise. Answer keys are intentionally not in this repo.
- Some datasets ship a `variants/` directory: a trimmed slice of the same data, derived from a sibling file by the rule recorded in `MANIFEST.json`. Read the rule before using a variant, and never edit one by hand; regenerate its parent.

## Layout

- `canon/` — companies, people, timeline (source of truth for IDs)
- `datasets/<track>/` — `legal`, `finance`, `hr`, `revenue`, `operations`, `smb`
- `datagen/` — deterministic, seeded generators (MIT)
- `MANIFEST.json` — dataset index: path, schema, row counts, version

## Current state

v1.5.0: the legal slice, the complete finance build through clusters 3 and 4 (35 finance datasets), the three core datasets and 16 drafted artifact sets including FIN-21, FIN-28 and FIN-30 (the D5b freeze review landed with the tag). On `data/revenue-cluster-1`, awaiting freeze review with expected tag v1.6.0: the CORE-03 inbound lead-form view (additive; the five existing CSVs are byte-identical to v1.5.0) and REV-07 crm-object-model-seed, the first `datasets/revenue/` entry. Check `MANIFEST.json` for what is actually present before assuming a dataset exists.
