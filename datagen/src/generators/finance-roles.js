// Shared finance role vocabulary for the Track B templates (FIN-36, FIN-37,
// FIN-39). Three artifacts name owners, reviewers and approvers, and all three
// have to name the same people-shaped thing: a role_title that an active
// CORE-04 employee actually holds. Keeping the ladder in one module is what
// stops the close checklist from routing to a title the authority matrix has
// never heard of.
//
// The ladder is finance seniority, not the roster's `level` column. CORE-04
// ships Controller at level IC (a roster quirk from the v1.0.x generator, not
// worth rerolling 600 rows over), so `level` cannot order these titles on its
// own. Manager, Director, VP and Executive do agree with the ladder, and
// assertLadderMatchesRoster() below checks that much rather than nothing.
import { buildRoster } from "./core-04-people-roster.js";
import { createRng } from "../seed.js";

/** Least to most senior. Index is the seniority score. */
export const ROLE_LADDER = [
  "AP Clerk",
  "AR Clerk",
  "Staff Accountant",
  "FP&A Analyst",
  "Finance Manager",
  "Controller",
  "Director, Finance",
  "VP, Finance",
  // Not a Finance-department title: the only rung above VP, Finance, used as the
  // escalation target for a decision the finance organization cannot settle on
  // its own.
  "Chief Executive Officer",
];

/** Titles a finance artifact may name as an owner, preparer or approver. */
export const FINANCE_ROLES = ROLE_LADDER.filter((t) => t !== "Chief Executive Officer");

export function seniority(roleTitle) {
  const rank = ROLE_LADDER.indexOf(roleTitle);
  if (rank < 0) throw new Error(`finance-roles: "${roleTitle}" is not on the role ladder`);
  return rank;
}

/** The CORE-04 roster, built from its own seeded stream (the FIN-04 convention). */
export function financeRoster() {
  return buildRoster(createRng("CORE-04", "roster"));
}

/**
 * Every ladder title is held by at least one active CORE-04 employee, Finance
 * titles sit in the Finance department, and the roster's own level column does
 * not contradict the ladder where it distinguishes (Manager < Director < VP <
 * Executive). Called at build time by every generator that names a role, so a
 * roster change breaks generation rather than shipping a routing dead end.
 */
export function assertLadderMatchesRoster(roster = financeRoster()) {
  const LEVEL_ORDER = ["Manager", "Director", "VP", "Executive"];
  let lastLevelRank = -1;
  for (const title of ROLE_LADDER) {
    const holders = roster.filter((r) => r.role_title === title && r.employment_status === "active");
    if (holders.length === 0) {
      throw new Error(`finance-roles: no active CORE-04 employee holds the title "${title}"`);
    }
    if (title !== "Chief Executive Officer") {
      const outside = holders.find((r) => r.department !== "Finance");
      if (outside) {
        throw new Error(`finance-roles: "${title}" is held outside Finance (${outside.department})`);
      }
    }
    const levelRank = LEVEL_ORDER.indexOf(holders[0].level);
    if (levelRank >= 0) {
      if (levelRank < lastLevelRank) {
        throw new Error(
          `finance-roles: the ladder puts "${title}" (level ${holders[0].level}) above a more senior level`
        );
      }
      lastLevelRank = levelRank;
    }
  }
  return roster;
}

/** Throw unless every title used by an artifact is on the ladder and in the roster. */
export function assertRolesUsed(artifactId, titles, roster = financeRoster()) {
  assertLadderMatchesRoster(roster);
  for (const title of titles) {
    if (!ROLE_LADDER.includes(title)) {
      throw new Error(`${artifactId}: "${title}" is not on the finance role ladder`);
    }
  }
}
