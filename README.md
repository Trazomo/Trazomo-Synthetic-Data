# Trazomo Synthetic Data

The shared synthetic-data universe for [Trazomo](https://www.trazomo.com) exemplar repos, learning-path exercises, and learner builds. Point your coding agent at this repo; it can self-orient from `AGENTS.md` and `MANIFEST.json`.

**Everything here is fictional.** Companies, people, transactions, and documents are synthetic. Any resemblance to real entities is coincidental. The anchor entities are **Atticus Dundee LLP** (a law firm) and **Atticus Dundee Inc.** (a corporate client).

## What lives here

- `canon/` — the universe bible: companies, people, and timeline that keep entity IDs consistent across every dataset
- `datasets/` — per-track data (`legal`, `finance`, `hr`, `revenue`, `operations`, `smb`) sharing canon IDs so cross-track joins work
- `datagen/` — seeded, deterministic generators; same seed, same output
- `MANIFEST.json`: machine-readable index of every dataset, including dataset variants and how each one is derived

## Status

Legal slice frozen at v1.0.2; the finance cash reconciliation slice (FIN-01, FIN-02, FIN-03, FIN-22) ships in v1.1.0, the finance reconciliation-cluster datasets (FIN-04 through FIN-11) in v1.2.0, the Track B templates, reliability drill and board-pack excerpt (FIN-36 through FIN-40) in v1.3.0, and the cluster 2 payables, collections and controls datasets (FIN-13 through FIN-20 and FIN-35) in v1.4.0. Lessons and demo videos pin to tagged releases.

## Using it

Clone the repo or fetch raw files. Each Trazomo exemplar repo vendors a pinned slice under its own `/data` directory, so exemplars work standalone; this repo is the source of truth.

## License

Generator code: MIT (see `LICENSE`). Datasets and canon content: dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
