// SMB-32 data-handling-checklist: the policy-as-code file the guardrails
// validator runs every outgoing message against. No defects: a rule planted
// wrong here would be a broken policy rather than a finding.
//
// Twelve top-level keys in a documented order, three outcomes that all leave
// the draft held, the four data classes SMB-33 uses (one constant, shared),
// six purposes with required and permitted client fields that resolve in
// SMB-02's field dictionary or SMB-18's three payment plan columns, the
// AI-assistance disclosure line, the restricted categories that never appear
// in an outgoing message, and six rules DHR-LDB-01 to -06.
//
// Built in the shared builder smb-c4-controls.js, which also builds SMB-33 and
// is never registered as a generator of its own.
import {
  DISCLOSURE_TEXT, POLICY_KEYS, buildDataHandlingPolicy, renderPolicyYaml,
} from "./smb-c4-controls.js";

export const id = "SMB-32";

export { DISCLOSURE_TEXT, POLICY_KEYS, buildDataHandlingPolicy };

export function generate() {
  return [{ path: "data-handling-checklist.yaml", content: renderPolicyYaml(buildDataHandlingPolicy()) }];
}
