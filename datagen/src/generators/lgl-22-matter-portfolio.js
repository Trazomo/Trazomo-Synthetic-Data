// LGL-22 matter-portfolio-dashboard-dataset: a matter state machine (intake
// -> triage -> assigned -> in_progress -> review -> closed), a portfolio
// capacity model (3 hrs/matter/week, 35-hour weekly cap per attorney), and
// aging/escalation signals for co-001's matter portfolio.
import { toCsv } from "../csv.js";
import { ANCHOR_DATE, addDays, diffDays } from "../dates.js";
import { createRng } from "../seed.js";
import { buildRoster } from "./core-04-people-roster.js";

export const id = "LGL-22";

const STATES = ["intake", "triage", "assigned", "in_progress", "review", "closed"];
const HOURS_PER_MATTER_PER_WEEK = 3;
const WEEKLY_CAPACITY_CAP_HOURS = 35;
const AGING_ESCALATION_DAYS = 60; // open matters older than this get an aging signal

const MATTER_COUNT = 48;

export function generate({ rng }) {
  const roster = buildRoster(createRng("CORE-04", "roster"));
  const attorneys = roster.filter((r) => r.department === "Legal" && r.employment_status === "active");
  const r = rng("portfolio");

  const matters = [];
  for (let i = 1; i <= MATTER_COUNT; i++) {
    const openedDate = addDays(ANCHOR_DATE, -r.int(1, 220));
    const stateIndex = r.int(0, STATES.length - 1);
    const state = STATES[stateIndex];
    const attorney = state === "intake" ? null : r.pick(attorneys);
    const ageDays = diffDays(openedDate, ANCHOR_DATE);
    const isOpen = state !== "closed";
    matters.push({
      matter_id: `MAT-${String(i).padStart(4, "0")}`,
      state,
      opened_date: openedDate,
      assigned_attorney_employee_id: attorney ? attorney.employee_id : "",
      assigned_attorney_name: attorney ? `${attorney.first_name} ${attorney.last_name}` : "",
      age_days: ageDays,
      is_open: isOpen,
      aging_escalation_flag: isOpen && ageDays > AGING_ESCALATION_DAYS,
    });
  }

  const capacityByAttorney = new Map();
  for (const attorney of attorneys) {
    capacityByAttorney.set(attorney.employee_id, {
      attorney_employee_id: attorney.employee_id,
      attorney_name: `${attorney.first_name} ${attorney.last_name}`,
      active_matter_count: 0,
    });
  }
  for (const m of matters) {
    if (m.is_open && m.assigned_attorney_employee_id && capacityByAttorney.has(m.assigned_attorney_employee_id)) {
      capacityByAttorney.get(m.assigned_attorney_employee_id).active_matter_count += 1;
    }
  }
  const capacity = [...capacityByAttorney.values()].map((c) => {
    const weeklyHoursCommitted = c.active_matter_count * HOURS_PER_MATTER_PER_WEEK;
    return {
      ...c,
      hours_per_matter_per_week: HOURS_PER_MATTER_PER_WEEK,
      weekly_hours_committed: weeklyHoursCommitted,
      weekly_capacity_cap_hours: WEEKLY_CAPACITY_CAP_HOURS,
      over_capacity: weeklyHoursCommitted > WEEKLY_CAPACITY_CAP_HOURS,
    };
  });

  const matterColumns = [
    "matter_id", "state", "opened_date", "assigned_attorney_employee_id",
    "assigned_attorney_name", "age_days", "is_open", "aging_escalation_flag",
  ];
  const capacityColumns = [
    "attorney_employee_id", "attorney_name", "active_matter_count",
    "hours_per_matter_per_week", "weekly_hours_committed",
    "weekly_capacity_cap_hours", "over_capacity",
  ];

  return [
    { path: "matter-portfolio.csv", content: toCsv(matterColumns, matters) },
    { path: "capacity-model.csv", content: toCsv(capacityColumns, capacity) },
  ];
}
