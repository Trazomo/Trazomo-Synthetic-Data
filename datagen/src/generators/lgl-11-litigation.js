// LGL-11 litigation-matter-commercial-employment: co-002 v. co-117 (Redgate
// Manufacturing). Two planted deadline-math features:
//   1. A deadline chain: complaint served -> FRCP 12(a)(1) 21-day response
//      -> +3-day mail extension -> weekend rollover.
//   2. A trial-continuance cascade: one trial-date change recalculates 7
//      dependent deadlines (before/after).
import { addDays, isWeekend, rollForwardPastWeekend } from "../dates.js";

export const id = "LGL-11";

const COMPLAINT_SERVED_DATE = "2026-01-20"; // fixed matter anchor, not derived from Date.now()
const FRCP_12A1_RESPONSE_DAYS = 21;
const MAIL_EXTENSION_DAYS = 3;

const ORIGINAL_TRIAL_DATE = "2026-11-02";
const CONTINUANCE_SHIFT_DAYS = 63; // trial pushed out ~9 weeks

// Offsets (days before trial) for the 7 dependent deadlines in the cascade.
const DEPENDENT_DEADLINES = [
  { name: "discovery_cutoff", offsetDays: -90 },
  { name: "expert_disclosure", offsetDays: -60 },
  { name: "dispositive_motions_deadline", offsetDays: -45 },
  { name: "final_pretrial_conference", offsetDays: -14 },
  { name: "motions_in_limine_deadline", offsetDays: -10 },
  { name: "proposed_jury_instructions_due", offsetDays: -7 },
  { name: "final_witness_exhibit_list_due", offsetDays: -5 },
];

export function generate() {
  // ---- deadline chain ----------------------------------------------
  const baseDeadline = addDays(COMPLAINT_SERVED_DATE, FRCP_12A1_RESPONSE_DAYS);
  const withMailExtension = addDays(baseDeadline, MAIL_EXTENSION_DAYS);
  const landedOnWeekend = isWeekend(withMailExtension);
  const finalResponseDeadline = rollForwardPastWeekend(withMailExtension);

  const deadlineChain = {
    complaint_served_date: COMPLAINT_SERVED_DATE,
    frcp_12a1_response_days: FRCP_12A1_RESPONSE_DAYS,
    base_response_deadline: baseDeadline,
    mail_extension_days: MAIL_EXTENSION_DAYS,
    response_deadline_with_mail_extension: withMailExtension,
    landed_on_weekend: landedOnWeekend,
    final_response_deadline: finalResponseDeadline,
  };

  // ---- trial-continuance cascade -------------------------------------
  const beforeCascade = DEPENDENT_DEADLINES.map((d) => ({
    name: d.name,
    date: addDays(ORIGINAL_TRIAL_DATE, d.offsetDays),
  }));
  const newTrialDate = addDays(ORIGINAL_TRIAL_DATE, CONTINUANCE_SHIFT_DAYS);
  const afterCascade = DEPENDENT_DEADLINES.map((d) => ({
    name: d.name,
    date: addDays(newTrialDate, d.offsetDays),
  }));

  const cascade = {
    original_trial_date: ORIGINAL_TRIAL_DATE,
    continuance_shift_days: CONTINUANCE_SHIFT_DAYS,
    new_trial_date: newTrialDate,
    dependent_deadline_count: DEPENDENT_DEADLINES.length,
    before: beforeCascade,
    after: afterCascade,
  };

  const record = {
    universe_version: "0.2.0",
    generated_from_spec: "LGL-11",
    matter_id: "MAT-LIT-0117",
    matter_type: "commercial/employment dispute",
    plaintiff_canon_id: "co-002",
    defendant_canon_id: "co-117",
    defendant_name: "Redgate Manufacturing",
    deadline_chain: deadlineChain,
    trial_continuance_cascade: cascade,
  };

  const md = buildMarkdown(record);

  return [
    { path: "matter.json", content: JSON.stringify(record, null, 2) + "\n" },
    { path: "matter.md", content: md },
  ];
}

function buildMarkdown(record) {
  const dc = record.deadline_chain;
  const cc = record.trial_continuance_cascade;
  const lines = [];
  lines.push("# Litigation Matter: Commercial/Employment Dispute");
  lines.push("");
  lines.push(`**Matter ID:** ${record.matter_id}  `);
  lines.push(`**Plaintiff:** Atticus Dundee Inc. (${record.plaintiff_canon_id})  `);
  lines.push(`**Defendant:** ${record.defendant_name} (${record.defendant_canon_id})`);
  lines.push("");
  lines.push("## Deadline chain");
  lines.push("");
  lines.push(`Complaint served ${dc.complaint_served_date}. FRCP 12(a)(1) response is due ${dc.frcp_12a1_response_days} days later: ${dc.base_response_deadline}. Service included a ${dc.mail_extension_days}-day mail extension, moving the deadline to ${dc.response_deadline_with_mail_extension}${dc.landed_on_weekend ? ", which fell on a weekend" : ""}. Final response deadline (after weekend rollover): **${dc.final_response_deadline}**.`);
  lines.push("");
  lines.push("## Trial-continuance cascade");
  lines.push("");
  lines.push(`Original trial date ${cc.original_trial_date}. A ${cc.continuance_shift_days}-day continuance moves trial to **${cc.new_trial_date}**, recalculating ${cc.dependent_deadline_count} dependent deadlines:`);
  lines.push("");
  lines.push("| Deadline | Before | After |");
  lines.push("|---|---|---|");
  for (let i = 0; i < cc.before.length; i++) {
    lines.push(`| ${cc.before[i].name} | ${cc.before[i].date} | ${cc.after[i].date} |`);
  }
  lines.push("");
  return lines.join("\n");
}
