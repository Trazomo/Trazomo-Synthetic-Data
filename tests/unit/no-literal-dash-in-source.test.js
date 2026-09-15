// Repo-level guard for SHOULD-FIX 4 of the small-business cluster 2b
// adversarial review (reviews/data-cluster-2b.md). Section 4's acceptance
// list ends "a grep for an em dash or an en dash across the new files returns
// nothing," and that criterion has now failed twice in this pack: once in
// cluster 2a (closed by its own SHOULD-FIX 5), and again in cluster 2b, in
// three generator files that reintroduced the literal characters and, in
// three test files, under a comment asserting the opposite of the line it
// annotates. This test makes a third occurrence impossible: it walks every
// file the pack's generators and tests can live under and fails on the first
// literal U+2014 or U+2013 it finds, so the class is closed by construction
// rather than by review.
//
// The two characters are built with String.fromCharCode rather than typed
// literally, so this file is never itself a hit for the grep it runs, and a
// future reader searching the repo for the two characters is not misled by
// this screen's own necessarily-dash-shaped subject matter.
//
// Scope. The review's own wording names all three directories without a
// track filter, but the pack has, independently of anything this PR touches,
// pre-existing literal em and en dashes in other tracks' files (at least
// datagen/src/generators/ops-08-status-inputs.js, ops-09-portfolio-rollup.js,
// ops-11-stakeholder-register.js, ops-12-okr-rollup.js,
// rev-03-signal-events.js, rev-09-play-traces.js, the matching ops/rev
// tests/generators/ files, and tests/drafted/fin-40-mnpi-screen.test.js,
// hr-c2-drafted-screen.test.js, rev-c3/c4/c5-drafted-screen.test.js).
// Cleaning those up is a separate finding on a separate track and is out of
// scope for the small-business cluster 2b fix wave this test belongs to, so
// this screen is scoped to the small-business pack's own files (the `smb-`
// prefix both its generators and its tests use) rather than to the whole
// repo. That still makes a third occurrence of THIS finding, in this pack,
// impossible by construction, which is what SHOULD-FIX 4 asks for.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const REPO_ROOT = join(import.meta.dirname, "..", "..");

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

/** Every file under `dir`, recursively, whose extension is in `extensions`. */
function filesUnder(dir, extensions) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...filesUnder(path, extensions));
    } else if (entry.isFile() && extensions.includes(extname(entry.name))) {
      out.push(path);
    }
  }
  return out;
}

/** The three directories section 4's acceptance criterion covers. */
const DIRS = [
  join(REPO_ROOT, "datagen", "src", "generators"),
  join(REPO_ROOT, "tests", "generators"),
  join(REPO_ROOT, "tests", "drafted"),
];

test("no small-business file under datagen/src/generators/, tests/generators/ or tests/drafted/ contains a literal em dash or en dash", () => {
  const files = DIRS.flatMap((dir) => {
    assert.ok(statSync(dir).isDirectory(), `${dir} is not a directory; this screen's own paths have moved`);
    return filesUnder(dir, [".js"]).filter((f) => {
      const name = f.split("/").pop().toLowerCase();
      // planted-features.test.js is one of SHOULD-FIX 4's six original sites
      // and carries the pack's wave sweeps without the smb- prefix, so it is
      // named here explicitly (re-review NEW-3).
      return name.startsWith("smb-") || name === "planted-features.test.js";
    });
  });
  assert.ok(files.length >= 15, `only ${files.length} small-business files were walked; this screen's own paths look wrong`);

  for (const file of files) {
    // This file itself is excluded: its subject matter is the two characters,
    // spelled through String.fromCharCode above, and a grep-shaped self-check
    // would otherwise have to exempt its own comments and string literals by
    // hand, which is exactly the class of narrow guard this pack keeps
    // relearning not to write.
    if (file === import.meta.filename) continue;
    const text = readFileSync(file, "utf8");
    assert.ok(
      !text.includes(EM_DASH),
      `${file} carries a literal em dash (U+2014); use the escape \\u2014 instead`
    );
    assert.ok(
      !text.includes(EN_DASH),
      `${file} carries a literal en dash (U+2013); use the escape \\u2013 instead`
    );
  }
});
