// The recognized-certifications vocabulary for revenue cluster 2.
//
// THE CONTRACT, in two sentences.
//
//   1. Extraction is by vocabulary membership. A snippet, a scenario excerpt or
//      any other drafted string "asserts" a certification when one of the exact
//      strings below appears in it as a substring. Nothing smarter runs: no
//      stemming, no acronym expansion, no fuzzy match. That is what makes the
//      REV-C2-T5 and REV-C2-T6 extractions mechanical rather than editorial.
//   2. The register alone says what is held. Membership here marks nothing at
//      all. This list is deliberately a superset of REV-06's certification
//      register: it carries schemes co-002 holds, the scheme the fabricated
//      snippet asserts, and further schemes co-002 simply does not hold. So
//      appearing here leaks no answer, and a certification resolves if and only
//      if it also appears in a `certification` row of the REV-06 claims
//      register.
//
// Two consequences of "pure substring membership" that constrain edits:
//
//   * Entries are the exact strings as the documents write them. Change a
//      document's wording and this file changes with it, or extraction goes
//      quiet, which is worse than failing.
//   * No entry may be a substring of another, or one assertion would extract as
//      two. `tests/drafted/rev-c2-drafted-screen.test.js` recomputes that, so
//      adding "SOC 2" beside "SOC 2 Type II", or "Cyber Essentials Plus" beside
//      "Cyber Essentials", fails by name rather than silently double-counting.
//
// Consumers: REV-06's structural screen and REV-11's `policy-rules.json` and
// scenario test (data plan 2.2 and 2.3). REV-11 embeds its own copy of this
// vocabulary in `policy-rules.json` as fixture data; this module is where the
// test side reads it, so the two stay comparable.

/**
 * The recognized-certifications vocabulary, exact document strings.
 *
 * Held by co-002, and therefore carried by a `certification` row of the REV-06
 * claims register:
 *   SOC 2 Type II, ISO/IEC 27001, ISO/IEC 27017, Cyber Essentials
 *
 * Real schemes co-002 does not hold. One of them is asserted by exactly one
 * REV-06 snippet and resolves to no register row; one is the scheme REV-11's
 * blocked scenario names by design; the rest appear in neither REV-06 file
 * nor REV-11's scenarios (they ride along only in policy-rules.json's copy
 * of this vocabulary):
 *   FedRAMP Authorized, PCI DSS Level 1 Service Provider, HITRUST CSF,
 *   ISO/IEC 27018, ISO 9001
 *
 * The vocabulary lists recognized schemes; the register alone says what is
 * held. REV-11's blocked scenario naming one non-held scheme is ground
 * truth, not a leak, since REV-11's own data files state it directly. Which
 * certification the REV-06 snippets assert without a register row is
 * recorded nowhere in this repository: that is the answer key, and answer
 * keys live only in the private training content keyed to the data-pack
 * version.
 */
export const REV_C2_CERT_VOCABULARY = [
  "SOC 2 Type II",
  "ISO/IEC 27001",
  "ISO/IEC 27017",
  "ISO/IEC 27018",
  "ISO 9001",
  "Cyber Essentials",
  "FedRAMP Authorized",
  "PCI DSS Level 1 Service Provider",
  "HITRUST CSF",
];

/** Every vocabulary entry that appears in `text`, in vocabulary order. */
export const certificationsIn = (text) =>
  REV_C2_CERT_VOCABULARY.filter((entry) => text.includes(entry));
