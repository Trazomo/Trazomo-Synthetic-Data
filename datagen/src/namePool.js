// Obviously-fictional name pool shared by generators that need people (the
// people-roster generator, and anything that needs to reference a consistent
// "employee" without inventing new names ad hoc). Deliberately unusual
// first/last name combinations so nothing here reads as a real person, per
// canon/companies.md's ground rule: "Fully synthetic: no real people, no real
// PII, obviously fictional names."

export const FIRST_NAMES = [
  "Wrenna", "Cassian", "Odalys", "Fenwick", "Sable", "Thessaly", "Corin",
  "Marlowe", "Ondine", "Baxter", "Perrin", "Lior", "Saskia", "Tobin",
  "Reyna", "Cormac", "Halcyon", "Isolde", "Quillon", "Briar", "Dashiell",
  "Emlyn", "Faro", "Guinevere", "Hollis", "Ivo", "Junot", "Kestrel",
  "Lyric", "Merritt", "Nessa", "Oleander", "Piran", "Quenby", "Rhoswen",
  "Sorrel", "Tamsin", "Ulric", "Verity", "Wystan", "Yara", "Zephyrine",
  "Aldous", "Branwen", "Corwin", "Delphine", "Ewald", "Freya", "Gideon",
  "Honora",
];

export const LAST_NAMES = [
  "Ashgrove", "Bellcrest", "Corrigan", "Duskwood", "Everhart", "Fairweather",
  "Grayling", "Hallowell", "Ivorwood", "Juniper", "Kestenbaum", "Larkspur",
  "Moorfield", "Norwich", "Osgood", "Pemberton", "Quennell", "Ravenscroft",
  "Stonebridge", "Thistlewood", "Underhill", "Vantree", "Whitlock",
  "Yarrow", "Ashby", "Blackwood", "Crestfall", "Dunmore", "Elderkin",
  "Fenmore", "Greywick", "Holloway", "Ingledew", "Jarrow", "Kirtland",
  "Loxley", "Marchbanks", "Nightshade", "Oakhurst", "Pennington",
];

/**
 * Deterministically draw `count` unique "First Last" names using the given
 * Rng. Uniqueness is enforced by re-drawing (still deterministic: the Rng's
 * sequence is fixed, only how many draws we consume depends on collisions,
 * which is itself deterministic).
 */
export function drawUniqueNames(rng, count) {
  const seen = new Set();
  const out = [];
  let guard = 0;
  while (out.length < count) {
    guard += 1;
    if (guard > count * 50) {
      throw new Error("drawUniqueNames: exhausted name pool combinations");
    }
    const first = rng.pick(FIRST_NAMES);
    const last = rng.pick(LAST_NAMES);
    const key = `${first} ${last}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ firstName: first, lastName: last });
  }
  return out;
}
