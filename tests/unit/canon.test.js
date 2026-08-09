import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { companyName, loadCanonCompanies } from "../../datagen/src/canon.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");

test("loadCanonCompanies parses the real canon/companies.md anchors", () => {
  const byId = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));
  assert.equal(byId.get("co-001").name, "Atticus Dundee LLP");
  assert.equal(byId.get("co-002").name, "Atticus Dundee Inc.");
  assert.equal(byId.get("co-100").name, "Larkspur Design & Build");
});

test("loadCanonCompanies strips the (proposed)/(adopted) status suffix into a separate field", () => {
  const byId = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));
  const copperline = byId.get("co-101");
  assert.equal(copperline.name, "Copperline Software");
  assert.equal(copperline.status, "proposed");
});

test("loadCanonCompanies skips range rows like 'co-126 to co-129'", () => {
  const byId = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));
  assert.equal(byId.has("co-126"), false);
  assert.equal(byId.has("co-127"), false);
});

test("companyName resolves the co-140+ generator range and unknown ids without inventing a name", () => {
  const byId = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));
  assert.equal(companyName(byId, "co-140+"), "Generated Account Population");
  assert.match(companyName(byId, "co-999"), /Unresolved Canon Entity/);
  assert.equal(companyName(byId, "co-001"), "Atticus Dundee LLP");
});
