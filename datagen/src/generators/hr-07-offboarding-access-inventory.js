// HR-07 offboarding-checklist-access-inventory: one employee exit, the access
// that person holds and held across the whole tenure, and the standard
// offboarding checklist instantiated for the exit.
//
// This is the employee side of the offboarding process. The worker type is
// employee and nothing else, no row claims coverage for a non-employee worker,
// and every access removal runs off a named access change request rather than
// off the last working day.
//
// Thin wrapper over hr-lifecycle.js's seeded builder. Ignores its own rng on
// purpose, the FIN-03 over FIN-01 pattern.
import { toCsv } from "../csv.js";
import {
  EXIT_RECORD_COLUMNS,
  GRANT_INVENTORY_COLUMNS,
  OFFBOARDING_CHECKLIST_COLUMNS,
  buildLifecycleCoordination,
} from "./hr-lifecycle.js";

export const id = "HR-07";

export function generate() {
  const { offboarding } = buildLifecycleCoordination();
  return [
    { path: "exit-record.csv", content: toCsv(EXIT_RECORD_COLUMNS, offboarding.exit_record) },
    { path: "access-grant-inventory.csv", content: toCsv(GRANT_INVENTORY_COLUMNS, offboarding.grants) },
    { path: "offboarding-checklist.csv", content: toCsv(OFFBOARDING_CHECKLIST_COLUMNS, offboarding.checklist) },
  ];
}
