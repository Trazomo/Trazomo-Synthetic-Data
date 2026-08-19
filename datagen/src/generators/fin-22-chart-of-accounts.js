// FIN-22 chart-of-accounts: co-002's general-ledger chart (about 60 accounts)
// for a roughly 600-person B2B SaaS company. Fixes the operating cash account
// code that FIN-01/FIN-02 post against and that FIN-05, FIN-09, and FIN-24
// reuse later. A static table needs no random draws; it is deterministic by
// construction and still registered like every other generator so `generate`,
// `validate`, and `manifest` treat it uniformly.
//
// Planted feature per spec: one renamed/merged account kept on the chart as
// inactive (the stale-reference trap for finance-spreadsheet-ops and
// finance-knowledge-base). Which row that is stays out of spec text and lesson
// copy in this repo (answer-key rule).
import { toCsv } from "../csv.js";

export const id = "FIN-22";

/** The one cash account every FIN cash artifact posts to. */
export const OPERATING_CASH_ACCOUNT = { code: "1010", name: "Operating Cash - Anchor Point Bank" };

export const COLUMNS = ["account_code", "account_name", "type", "subtype", "normal_balance", "active"];

// [account_code, account_name, type, subtype, normal_balance, active]
//
// Contra accounts carry their own subtype (contra_asset, contra_revenue) rather
// than sharing a subtype with the accounts they offset, so a consumer can group
// or exclude them by subtype instead of parsing account names. The invariant is
// checked in tests: an asset row with a credit normal balance is contra_asset,
// and every contra_asset row is a credit-balance asset.
const ACCOUNTS = [
  ["1010", OPERATING_CASH_ACCOUNT.name, "asset", "cash", "debit", "true"],
  ["1020", "Payroll Cash - Anchor Point Bank", "asset", "cash", "debit", "true"],
  ["1030", "Money Market Sweep - Anchor Point Bank", "asset", "cash", "debit", "true"],
  ["1050", "Petty Cash", "asset", "cash", "debit", "true"],
  ["1100", "Accounts Receivable - Trade", "asset", "receivable", "debit", "true"],
  ["1110", "Allowance for Doubtful Accounts", "asset", "contra_asset", "credit", "true"],
  ["1120", "Unbilled Receivables", "asset", "receivable", "debit", "true"],
  ["1200", "Prepaid Software Subscriptions", "asset", "prepaid", "debit", "true"],
  ["1210", "Prepaid Insurance", "asset", "prepaid", "debit", "true"],
  ["1220", "Prepaid Rent", "asset", "prepaid", "debit", "true"],
  ["1230", "Other Prepaid Expenses", "asset", "prepaid", "debit", "true"],
  ["1310", "Security Deposits", "asset", "other_current_asset", "debit", "true"],
  ["1400", "Computer Equipment", "asset", "fixed_asset", "debit", "true"],
  ["1410", "Furniture and Fixtures", "asset", "fixed_asset", "debit", "true"],
  ["1420", "Leasehold Improvements", "asset", "fixed_asset", "debit", "true"],
  ["1490", "Accumulated Depreciation", "asset", "contra_asset", "credit", "true"],
  ["1500", "Capitalized Software Development", "asset", "intangible", "debit", "true"],
  ["1590", "Accumulated Amortization", "asset", "contra_asset", "credit", "true"],
  ["1600", "Operating Lease Right-of-Use Asset", "asset", "lease", "debit", "true"],
  ["2000", "Accounts Payable - Trade", "liability", "payable", "credit", "true"],
  ["2010", "Accrued Liabilities", "liability", "accrued", "credit", "true"],
  ["2020", "Accrued Payroll", "liability", "accrued", "credit", "true"],
  ["2030", "Accrued Bonus", "liability", "accrued", "credit", "true"],
  ["2040", "Accrued Commissions", "liability", "accrued", "credit", "true"],
  ["2100", "Payroll Taxes Payable", "liability", "payroll", "credit", "true"],
  ["2110", "Employee Benefits Payable", "liability", "payroll", "credit", "true"],
  ["2200", "Sales Tax Payable", "liability", "tax", "credit", "true"],
  ["2210", "Income Tax Payable", "liability", "tax", "credit", "true"],
  ["2300", "Deferred Revenue - Current", "liability", "deferred_revenue", "credit", "true"],
  ["2310", "Deferred Revenue - Non-Current", "liability", "deferred_revenue", "credit", "true"],
  ["2400", "Corporate Card Payable", "liability", "payable", "credit", "true"],
  ["2500", "Operating Lease Liability - Current", "liability", "lease", "credit", "true"],
  ["2510", "Operating Lease Liability - Non-Current", "liability", "lease", "credit", "true"],
  ["3000", "Common Stock", "equity", "contributed_capital", "credit", "true"],
  ["3010", "Additional Paid-In Capital", "equity", "contributed_capital", "credit", "true"],
  ["3100", "Retained Earnings", "equity", "retained_earnings", "credit", "true"],
  ["3200", "Current Year Earnings", "equity", "retained_earnings", "credit", "true"],
  ["4000", "Subscription Revenue - Enterprise", "revenue", "subscription", "credit", "true"],
  ["4010", "Subscription Revenue - Mid-Market", "revenue", "subscription", "credit", "true"],
  ["4020", "Subscription Revenue - Small Team", "revenue", "subscription", "credit", "true"],
  ["4100", "Professional Services Revenue", "revenue", "services", "credit", "true"],
  ["4200", "Interest Income", "revenue", "other_income", "credit", "true"],
  ["4900", "Sales Discounts and Credits", "revenue", "contra_revenue", "debit", "true"],
  ["5000", "Hosting and Infrastructure", "expense", "cost_of_revenue", "debit", "true"],
  ["5010", "Third-Party Software in Product", "expense", "cost_of_revenue", "debit", "true"],
  ["5020", "Customer Support Salaries", "expense", "cost_of_revenue", "debit", "true"],
  ["5100", "Payment Processing Fees", "expense", "cost_of_revenue", "debit", "true"],
  ["6000", "Salaries and Wages", "expense", "people", "debit", "true"],
  ["6010", "Payroll Taxes", "expense", "people", "debit", "true"],
  ["6020", "Employee Benefits", "expense", "people", "debit", "true"],
  ["6030", "Contractors and Consultants", "expense", "people", "debit", "true"],
  ["6040", "Recruiting", "expense", "people", "debit", "true"],
  ["6100", "Rent and Facilities", "expense", "facilities", "debit", "true"],
  ["6110", "Utilities", "expense", "facilities", "debit", "true"],
  ["6120", "Office Expense", "expense", "facilities", "debit", "true"],
  ["6125", "Office Supplies (merged into 6120 Office Expense)", "expense", "facilities", "debit", "false"],
  ["6200", "Software Subscriptions", "expense", "technology", "debit", "true"],
  ["6300", "Marketing Programs", "expense", "marketing", "debit", "true"],
  ["6310", "Events and Conferences", "expense", "marketing", "debit", "true"],
  ["6400", "Travel and Entertainment", "expense", "travel", "debit", "true"],
  ["6500", "Professional Fees - Legal", "expense", "professional_fees", "debit", "true"],
  ["6510", "Professional Fees - Accounting and Audit", "expense", "professional_fees", "debit", "true"],
  ["6600", "Insurance", "expense", "insurance", "debit", "true"],
  ["6700", "Bank Fees and Service Charges", "expense", "bank", "debit", "true"],
  ["6800", "Depreciation and Amortization", "expense", "depreciation", "debit", "true"],
];

const nameOf = (code) => {
  const row = ACCOUNTS.find(([c]) => c === code);
  if (!row) throw new Error(`FIN-22: no account ${code} on the chart`);
  return row[1];
};

// Control accounts the cluster 1 generators (FIN-04..FIN-11) post against.
// Each name is read back off ACCOUNTS rather than retyped, so renaming a chart
// row cannot silently desync a downstream generator from the chart it cites.
export const AR_CONTROL_ACCOUNT = { code: "1100", name: nameOf("1100") };
export const AP_CONTROL_ACCOUNT = { code: "2000", name: nameOf("2000") };
export const ACCRUED_LIABILITIES_ACCOUNT = { code: "2010", name: nameOf("2010") };
export const PREPAID_SOFTWARE_ACCOUNT = { code: "1200", name: nameOf("1200") };
export const PREPAID_INSURANCE_ACCOUNT = { code: "1210", name: nameOf("1210") };
/** FIN-05's plug: the residual lands here so the trial balance balances by construction. */
export const RETAINED_EARNINGS_PLUG_ACCOUNT = { code: "3200", name: nameOf("3200") };

/**
 * The chart as row objects keyed by COLUMNS. Exported so FIN-01's builder and
 * later FIN generators can look up account codes and names from the same table.
 * @returns {object[]}
 */
export function buildChartOfAccounts() {
  return ACCOUNTS.map(([account_code, account_name, type, subtype, normal_balance, active]) => ({
    account_code, account_name, type, subtype, normal_balance, active,
  }));
}

export function generate() {
  return [{ path: "chart-of-accounts.csv", content: toCsv(COLUMNS, buildChartOfAccounts()) }];
}
