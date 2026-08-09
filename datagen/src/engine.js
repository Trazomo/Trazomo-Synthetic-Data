// Glue between spec + canon loading and the generator registry. No disk I/O
// here on purpose: generators are pure (spec + seed in, files out), which is
// what makes the determinism test ("same seed -> identical bytes") checkable
// without ever touching the filesystem.
import { createRng } from "./seed.js";
import { getGenerator } from "./generators/index.js";

/**
 * Run the registered generator for a deterministic spec.
 * @param {object} spec one entry from specLoader's artifacts list
 * @param {Map} canon canon companies lookup (loadCanonCompanies())
 * @returns {{path: string, content: string}[]}
 */
export function generateArtifact(spec, canon) {
  if (spec.generation !== "deterministic") {
    throw new Error(
      `generateArtifact: ${spec.id} has generation "${spec.generation}" -- structured generation only applies to "deterministic" specs (drafted-frozen artifacts are authored, not generated).`
    );
  }
  const generator = getGenerator(spec.id); // throws NotImplementedError with the spec id
  const rng = (stream) => createRng(spec.id, stream);
  const files = generator.generate({ spec, canon, rng });
  if (!Array.isArray(files) || files.some((f) => typeof f.path !== "string" || typeof f.content !== "string")) {
    throw new Error(`generator for ${spec.id} returned malformed output (expected [{path, content}])`);
  }
  return files;
}
