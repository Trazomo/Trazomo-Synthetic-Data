// FIN-16 collections-contact-log: the outreach on co-002's aged receivable,
// plus the collections policy the log is measured against. Thin wrapper: the
// rows come from FIN-15's seeded builder so the credit note behind a disputed
// invoice and the contact that disputed it always name the same document (the
// FIN-07 over FIN-06 pattern). Ignores its own rng on purpose.
import { toCsv } from "../csv.js";
import { buildCollections, CONTACT_LOG_COLUMNS } from "./fin-15-collections.js";

export const id = "FIN-16";

export function generate() {
  const { contacts, policy } = buildCollections();
  return [
    { path: "collections-contact-log.csv", content: toCsv(CONTACT_LOG_COLUMNS, contacts) },
    { path: "collections-policy.json", content: JSON.stringify(policy, null, 2) + "\n" },
  ];
}
