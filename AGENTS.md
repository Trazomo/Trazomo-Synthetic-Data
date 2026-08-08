# Agent Orientation

This repository is the canonical synthetic-data universe for Trazomo training and exemplar repos. It is designed to be read by coding agents.

## Ground rules

- All data is fictional and safe to use in demos, tests, and templates.
- Entity IDs are canonical across the whole repo: the same company ID refers to the same fictional company in every dataset, in every track directory.
- Never invent additional facts about canon entities. Extend the universe by adding to `canon/` and regenerating via `datagen/`.
- Datasets contain deliberately planted anomalies for training exercises. Do not "fix" them; finding them is the exercise. Answer keys are intentionally not in this repo.

## Layout

- `canon/` — companies, people, timeline (source of truth for IDs)
- `datasets/<track>/` — `legal`, `finance`, `hr`, `revenue`, `operations`, `smb`
- `datagen/` — deterministic, seeded generators (MIT)
- `MANIFEST.json` — dataset index: path, schema, row counts, version

## Current state

v0.1.0 skeleton. Canon anchors exist; datasets land with the legal slice in v1.0. Check `MANIFEST.json` for what is actually present before assuming a dataset exists.
