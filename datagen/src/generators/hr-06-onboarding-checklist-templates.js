// HR-06 onboarding-checklist-templates: the standard onboarding task catalog,
// the catalog instantiated for one new hire, and the template document a People
// Operations coordinator hands a hiring manager.
//
// Thin wrapper: every row comes from hr-lifecycle.js's seeded builder, so the
// onboarding pack, the offboarding tracker and the review cycle describe one
// company at one as-of (the FIN-02 and FIN-03 over FIN-01 pattern). Ignores its
// own rng on purpose.
import { toCsv } from "../csv.js";
import {
  ONBOARDING_CHECKLIST_COLUMNS,
  ONBOARDING_TEMPLATE_COLUMNS,
  buildLifecycleCoordination,
  renderOnboardingTemplateMarkdown,
} from "./hr-lifecycle.js";

export const id = "HR-06";

const CANON_COMPANY = "co-002";

export function generate({ canon }) {
  const company = canon?.get(CANON_COMPANY);
  if (!company) throw new Error(`${id}: canon carries no ${CANON_COMPANY} entry to name the employer`);
  const { onboarding } = buildLifecycleCoordination();
  return [
    {
      path: "onboarding-task-template.csv",
      content: toCsv(ONBOARDING_TEMPLATE_COLUMNS, onboarding.template_rows),
    },
    {
      path: "new-hire-checklist.csv",
      content: toCsv(ONBOARDING_CHECKLIST_COLUMNS, onboarding.checklist_rows),
    },
    {
      path: "onboarding-checklist-template.md",
      content: renderOnboardingTemplateMarkdown(onboarding.template_rows, company.name),
    },
  ];
}
