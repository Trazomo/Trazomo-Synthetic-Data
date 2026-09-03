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

v1.4.1: legal slice (11 drafted artifact sets, 9 datasets) plus the finance cash reconciliation, reconciliation-cluster, Track B and cluster 2 payables, collections and controls datasets (25 finance datasets) and the FIN-40 board-pack excerpt; v1.4.1 differs from v1.4.0 only in the FIN-09 internal-schedule citations (issue #14); v1.5.0 adds the ten cluster 3 and 4 datasets (FIN-23 through FIN-27, FIN-29, FIN-31 through FIN-34); the drafted FIN-21, FIN-28 and FIN-30 ship in v1.5.0 if the D5b freeze review lands with it, in v1.6.0 otherwise; the operations capture spine (OPS-01 delivery sync transcript, OPS-02 retro transcript, OPS-03B follow-up email thread) is the first operations content in the pack, adds no `datasets/operations/` directory, and ships in the tag cut at its own merge, expected v1.7.0 after the revenue tag. Check `MANIFEST.json` for what is actually present before assuming a dataset exists.
