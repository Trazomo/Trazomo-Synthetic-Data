import { readFileSync } from "node:fs";
import yaml from "js-yaml";

const REQUIRED_FIELDS = [
  "id",
  "name",
  "type",
  "format",
  "generation",
  "canon_entities",
  "planted_features",
  "consuming_modules",
];

const VALID_GENERATION = new Set(["deterministic", "drafted-frozen"]);

/**
 * Load and validate specs/artifact-specs.yaml (or a fixture spec file with the
 * same schema). Throws with a precise message on the first schema violation
 * found -- a bad spec file should fail loudly, not generate silently-wrong data.
 *
 * @param {string} specPath absolute or cwd-relative path to the YAML file
 * @returns {{ artifacts: object[], byId: Map<string, object> }}
 */
export function loadSpecs(specPath) {
  const raw = readFileSync(specPath, "utf8");
  const doc = yaml.load(raw);

  if (!doc || !Array.isArray(doc.artifacts)) {
    throw new SpecValidationError(
      `${specPath}: expected a top-level "artifacts:" list, found ${typeof doc}`
    );
  }

  const byId = new Map();
  for (const [index, artifact] of doc.artifacts.entries()) {
    validateArtifact(artifact, index, specPath);
    if (byId.has(artifact.id)) {
      throw new SpecValidationError(
        `${specPath}: duplicate artifact id "${artifact.id}" (entry #${index})`
      );
    }
    byId.set(artifact.id, artifact);
  }

  return { artifacts: doc.artifacts, byId };
}

function validateArtifact(artifact, index, specPath) {
  if (!artifact || typeof artifact !== "object") {
    throw new SpecValidationError(
      `${specPath}: artifacts[${index}] is not an object`
    );
  }
  for (const field of REQUIRED_FIELDS) {
    if (!(field in artifact)) {
      throw new SpecValidationError(
        `${specPath}: artifacts[${index}] (id: ${artifact.id ?? "?"}) missing required field "${field}"`
      );
    }
  }
  // TEST-01 / TEST-01-DOC / etc: the datagen CLI's own test-fixture ids
  // (see tests/fixtures/TEST-01/). Never a real Trazomo-Synthetic-Data id.
  if (!/^[A-Z]+-\d+[A-Z]?$/.test(artifact.id) && !artifact.id.startsWith("TEST-01")) {
    throw new SpecValidationError(
      `${specPath}: artifacts[${index}] has malformed id "${artifact.id}" (expected PREFIX-NN)`
    );
  }
  if (!VALID_GENERATION.has(artifact.generation)) {
    throw new SpecValidationError(
      `${specPath}: ${artifact.id} has unknown generation "${artifact.generation}" (expected one of ${[...VALID_GENERATION].join(", ")})`
    );
  }
  if (!Array.isArray(artifact.planted_features)) {
    throw new SpecValidationError(
      `${specPath}: ${artifact.id}.planted_features must be a list`
    );
  }
  if (!Array.isArray(artifact.canon_entities)) {
    throw new SpecValidationError(
      `${specPath}: ${artifact.id}.canon_entities must be a list`
    );
  }
}

/** Track prefix (LGL, FIN, ...) parsed off an artifact id like "LGL-07". */
export function trackPrefix(artifactId) {
  const match = /^([A-Z]+)-\d+[A-Z]?$/.exec(artifactId);
  if (!match) throw new Error(`cannot derive track prefix from id "${artifactId}"`);
  return match[1];
}

/**
 * Physical dataset track directory name for an artifact id's prefix.
 * CORE is cross-path (2+ consuming paths) so it gets its own "core" track
 * directory rather than living inside one of the five path directories.
 */
const TRACK_DIR_BY_PREFIX = {
  CORE: "core",
  LGL: "legal",
  FIN: "finance",
  HR: "hr",
  REV: "revenue",
  OPS: "operations",
  SMB: "smb",
  // TEST-01's own track, kept obviously separate from the real program
  // tracks above -- see tests/fixtures/TEST-01/.
  TEST: "fixture",
};

export function trackDir(artifactId) {
  const prefix = trackPrefix(artifactId);
  const dir = TRACK_DIR_BY_PREFIX[prefix];
  if (!dir) {
    throw new Error(`no dataset track directory mapped for prefix "${prefix}" (id: ${artifactId})`);
  }
  return dir;
}

export class SpecValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "SpecValidationError";
  }
}
