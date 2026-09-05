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

v1.7.0: the legal slice, the complete finance build through clusters 3 and 4 (35 finance datasets), the core datasets including the CORE-03 inbound lead-form view (additive; the five pre-existing CORE-03 CSVs byte-identical to v1.5.0), REV-07 crm-object-model-seed (the first `datasets/revenue/` entry), and 19 drafted artifact sets including FIN-21, FIN-28, FIN-30 and the operations capture spine (OPS-01 delivery sync transcript, OPS-02 retro transcript, OPS-03B follow-up email thread), which adds no `datasets/operations/` directory. The people and HR governance spine takes the drafted set to 22 (HR-01 role requisition library, HR-03 interview transcript corpus, HR-09 manager notes and review draft pair) and, in the deterministic half stacked on it, opens `datasets/hr/` with HR-17 mixed-sensitivity-employee-dataset and HR-18 hris-export, taking the dataset count to 47. HR-18's generator reads the frozen HR-01 register at build time, which is why the drafted half lands first. Both ship in the tag cut at their merge, expected v1.8.0. Operations cluster 2 (planning and intake) births `datasets/operations/` with OPS-04 intake-request-batch (request CSV, the published intake-rubric.yaml, six eml messages) and OPS-05 backlog-export-with-quality-gaps, and adds the drafted OPS-03 project brief, which joins the already-frozen CORE-01 master services agreement; it ships in the tag cut at its own merge, v1.9.0. The revenue cluster 2 slice (REV-01 consent-suppression-master with its policy JSON and two tool exports, the drafted REV-06 product-security fact sheet and claim snippets, REV-11 policy-as-code-scenarios) takes the pack to 51 datasets and 24 drafted sets in the tag cut at its own merge, v1.10.0; that PR changes no byte under `datasets/core/` or `canon/`. Check `MANIFEST.json` for what is actually present before assuming a dataset exists.
