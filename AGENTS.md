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

v1.6.0: the legal slice, the complete finance build through clusters 3 and 4 (35 finance datasets), the core datasets including the CORE-03 inbound lead-form view (additive; the five pre-existing CORE-03 CSVs byte-identical to v1.5.0), REV-07 crm-object-model-seed (the first `datasets/revenue/` entry), and 16 drafted artifact sets including FIN-21, FIN-28 and FIN-30. The operations capture spine (OPS-01 delivery sync transcript, OPS-02 retro transcript, OPS-03B follow-up email thread) is the first operations content in the pack, adds no `datasets/operations/` directory, and ships in the tag cut at its own merge, expected v1.7.0. Operations cluster 2 (planning and intake) births `datasets/operations/` with OPS-04 intake-request-batch (request CSV, the published intake-rubric.yaml, six eml messages) and OPS-05 backlog-export-with-quality-gaps, and adds the drafted OPS-03 project brief, which joins the already-frozen CORE-01 master services agreement; it ships in the tag cut at its own merge, expected v1.8.0. Check `MANIFEST.json` for what is actually present before assuming a dataset exists.
