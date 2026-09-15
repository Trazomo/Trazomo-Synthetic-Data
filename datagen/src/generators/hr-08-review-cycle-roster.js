// HR-08 review-cycle-roster: the parameters of one half year performance review
// cycle and the reviewer to reviewee assignments inside it.
//
// The schema carries no review content of any kind: no rating, no score, no
// comment, no draft and no development area. That absence is a property of the
// shipped file rather than a lesson claim, which is what makes a chase drafted
// from these rows unable to carry anybody's feedback.
//
// Thin wrapper over hr-lifecycle.js's seeded builder. Ignores its own rng on
// purpose, the FIN-02 over FIN-01 pattern.
import { toCsv } from "../csv.js";
import {
  REVIEW_ASSIGNMENT_COLUMNS,
  REVIEW_CYCLE_COLUMNS,
  buildLifecycleCoordination,
} from "./hr-lifecycle.js";

export const id = "HR-08";

export function generate() {
  const { review } = buildLifecycleCoordination();
  return [
    { path: "review-cycle.csv", content: toCsv(REVIEW_CYCLE_COLUMNS, review.cycle) },
    { path: "review-assignments.csv", content: toCsv(REVIEW_ASSIGNMENT_COLUMNS, review.assignments) },
  ];
}
