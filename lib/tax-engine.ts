// TaxVault 2026 Tax Engine Constants
// Legal guardrail: all estimates are illustrative until CPA-verified

export const TAX_CONSTANTS = {
  FEIE_LIMIT: 126_500,
  FEIE_DAYS_REQUIRED: 330,
  FBAR_THRESHOLD: 10_000,
  FATCA_THRESHOLD_YEAREND: 200_000,
  FATCA_THRESHOLD_ANYTIME: 300_000,
  SE_TAX_RATE: 0.153,
  QBI_RATE: 0.20,
  SECTION_179_MAX: 2_560_000,
  RETIREMENT_MAX_2026: 69_000,
  IRS_BASE_HOUSING: 17_920,
  US_DR_TAX_TREATY: false,
  FISCAL_YEAR: 2026,
};

export interface TaxCalculation {
  grossRevenue: number;
  totalDeductions: number;
  netTaxable: number;
  seTax: number;
  incomeTax: number;
  totalTax: number;
  quarterlyPayment: number;
  effectiveRate: number;
}

export function calculateTax(
  grossRevenue: number,
  totalDeductions: number,
  salary: number = 60_000,
  feieApplied: boolean = false
): TaxCalculation {
  const net = Math.max(0, grossRevenue - totalDeductions);

  // SE tax: applies to FULL net (FEIE does NOT eliminate SE tax — legal guardrail)
  const seTaxBase = Math.min(net, salary);
  const seTax = seTaxBase * TAX_CONSTANTS.SE_TAX_RATE;

  // Income tax: net minus FEIE if applicable
  const feieAmount = feieApplied ? Math.min(net, TAX_CONSTANTS.FEIE_LIMIT) : 0;
  const incomeTaxBase = Math.max(0, net - feieAmount);
  // Simplified bracket (22% on distribution above salary)
  const distribution = Math.max(0, incomeTaxBase - salary);
  const incomeTax = salary * 0.12 + distribution * 0.22;

  const totalTax = seTax + Math.max(0, incomeTax);
  const quarterlyPayment = totalTax / 4;
  const effectiveRate = grossRevenue > 0 ? totalTax / grossRevenue : 0;

  return {
    grossRevenue,
    totalDeductions,
    netTaxable: net,
    seTax,
    incomeTax: Math.max(0, incomeTax),
    totalTax,
    quarterlyPayment,
    effectiveRate,
  };
}

export function formatCurrency(n: number, short = false): string {
  if (short && Math.abs(n) >= 1_000) {
    return "$" + (n / 1_000).toFixed(1) + "k";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function getQuarterlyDueDates(year: number) {
  return [
    { quarter: "Q1", due: `${year}-04-15`, label: "Apr 15" },
    { quarter: "Q2", due: `${year}-06-16`, label: "Jun 16" },
    { quarter: "Q3", due: `${year}-09-15`, label: "Sep 15" },
    { quarter: "Q4", due: `${year + 1}-01-15`, label: `Jan 15, ${year + 1}` },
  ];
}

export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
