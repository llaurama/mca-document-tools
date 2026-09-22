/* ---------------- Data pools ---------------- */
const BANKS = [
  { name: "Meridian", tag: "National Bank", accent: "#14487a", accentLt: "#eaf1f8" },
  { name: "Coastline", tag: "Business Bank", accent: "#0d5c46", accentLt: "#e8f4f0" },
  { name: "Ironbridge", tag: "Commercial Bank", accent: "#5a3b13", accentLt: "#f6efe4" },
  { name: "Highline", tag: "Community Bank", accent: "#5b1f66", accentLt: "#f2e9f4" },
];

const FIRST = ["Marcus", "Tanya", "Priya", "Elena", "Devin", "Carla", "Omar", "Lena", "Gregory", "Naomi", "Hector", "Sofia", "Andre", "Maya", "Victor", "Rachel", "Dmitri", "Aisha", "Liam", "Bianca"];
const LAST = ["Delgado", "Okonkwo", "Nakamura", "Vasquez", "Whitfield", "Brennan", "Castellano", "Petrov", "Adebayo", "Sorensen", "Mercado", "Halloran", "Yamamoto", "Okafor", "Donnelly", "Rivera", "Kowalski", "Fontaine", "Ashford", "Salinas"];
const BIZ_CORE = ["Riverstone", "Bluefield", "Cedar Peak", "Harborview", "Ironwood", "Summit Lane", "Maple Crest", "Northgate", "Silverbrook", "Coastal Pine", "Granite Hollow", "Westwind", "Brightwater", "Stonebridge", "Lakeside", "Harbor Lane"];
const BIZ_KIND = [["Outdoor Supply", "LLC"], ["Auto Works", "LLC"], ["Catering Group", "LLC"], ["Logistics", "Inc"], ["Construction", "LLC"], ["Medical Supply", "Inc"], ["Print Solutions", "LLC"], ["Landscaping", "LLC"], ["Fitness Studios", "LLC"], ["Bakers", "LLC"], ["Plumbing Services", "LLC"], ["Electric Co", "LLC"]];
const STREETS = ["Harborview Boulevard", "Industrial Parkway", "Cedar Hollow Lane", "Palmetto Ridge Court", "Maple Crest Drive", "Stonebridge Way", "Lakeshore Avenue", "Granite Hollow Road", "Westwind Terrace", "Brightwater Circle", "Whetsel Avenue"];
const CITIES = [["Springfield", "OH", "45504"], ["Tampa", "FL", "33607"], ["Austin", "TX", "78704"], ["Denver", "CO", "80205"], ["Raleigh", "NC", "27604"], ["Portland", "OR", "97214"], ["Phoenix", "AZ", "85016"], ["Columbus", "OH", "43215"], ["Sacramento", "CA", "95814"], ["Nashville", "TN", "37210"], ["Cincinnati", "OH", "45227"]];

const PROCESSORS = ["STRIPE", "Square Inc", "PayPal Transfer", "Clover Payments", "Toast Payroll Deposit", "Payoneer", "SumUp Inc"];
const PLATFORM_DEPOSITS = ["DoorDash, Inc.", "UBER USA 6787", "Grubhub Holdings", "Instacart Payments", "Amazon Marketplace Payout"];
const CUSTOMER_NAMES = ["Jungle Jim's Market", "HHS Culinary and Nutrition", "Beechmont Retail Group", "CCHMC Comp AP", "PNP Bill Payment", "Riverside Medical Group", "Union Terminal Events", "Greenway Property Mgmt", "Maple School District"];

const VENDORS = ["THE WEBSTAURANT STORE", "ULINE SHIP SUPPLIES", "SYSCO FOOD SVC", "US FOODS INC", "RESTAURANT DEPOT", "AMAZON MKTPLACE", "WALMART.COM", "STAPLES BUSINESS", "HOME DEPOT PRO", "GRAINGER INDUSTRIAL"];
const SUBSCRIPTIONS = ["GOOGLE WORKSPACE", "ADOBE INC", "WIX.COM", "QUICKBOOKS ONLINE", "MICROSOFT 365", "GUSTO PAYROLL", "ADP PAYROLL SVC", "MAILCHIMP", "SQUARESPACE", "ZOOM.US"];
const UTILITIES = ["CITY WATER UTILITY", "REGIONAL POWER & LIGHT", "METRO GAS CO", "WASTE MGMT SVC", "SPECTRUM BUSINESS", "COMCAST BUSINESS"];
const INSURANCE = ["PROGRESSIVE COMMERCIAL", "STATE FARM BUS INS", "HARTFORD INSURANCE", "NEXT INSURANCE"];
const LEASES = ["PAWNEE LEASING CORP", "NAVITAS CREDIT CORP", "US BANK EQUIP FINANCE", "BALBOA CAPITAL"];
const CC_PAYMENTS = ["CHASE CARD SERVICES", "AMEX EPAYMENT", "CAPITAL ONE CRCARDPMT", "CITI CARD ONLINE PMT"];

const FUNDERS = ["Apex Capital Advance", "Vantage Funding Group", "Bridgepoint Capital Partners", "Swift Business Capital", "Keystone Merchant Funding", "Lighthouse Advance Co", "Summit Ridge Capital"];

// Fictional collector names and statement aliases for sample transactions.
// Customize the embedded catalog directly; generation never fetches external data.
const DEBT_COLLECTORS = [
  {
    "name": "Example Alder Recovery",
    "aliases": [
      "Example Alder Recov",
      "Example A.R."
    ]
  },
  {
    "name": "Example Birch Collections",
    "aliases": []
  },
  {
    "name": "Example Cedar & Pine",
    "aliases": [
      "Example Cedar/Pine",
      "Example C&P"
    ]
  },
  {
    "name": "Example Delta Recovery",
    "aliases": [
      "Example Delta / 202-555-0104"
    ]
  },
  {
    "name": "Example Elm Receivables",
    "aliases": []
  },
  {
    "name": "Example Fern Resolution",
    "aliases": [
      "Example Fern Res"
    ]
  },
  {
    "name": "Example Grove Services",
    "aliases": [
      "Example GRS"
    ]
  },
  {
    "name": "Example Harbor Collections",
    "aliases": []
  },
  {
    "name": "Example Iris O'Neil Recovery",
    "aliases": [
      "Example Iris O'Neil"
    ]
  },
  {
    "name": "Example Juniper Recovery",
    "aliases": []
  }
];
const DEBT_COLLECTOR_BY_NAME = new Map(DEBT_COLLECTORS.map(collector => [collector.name, collector]));
const DEBT_COLLECTOR_COUNTS = [1, 2, 3];

/* ---------------- Configuration and data contracts ---------------- */
const REVENUE_TIERS = {
  verylight: { label: "Very Light ($300–1.5k/day)", dayMin: 300, dayMax: 1500, depsPerDay: [0, 1] },
  light: { label: "Light ($1.5k–5k/day)", dayMin: 1500, dayMax: 5000, depsPerDay: [0, 2] },
  moderate: { label: "Moderate ($4k–12k/day)", dayMin: 4000, dayMax: 12000, depsPerDay: [1, 3] },
  high: { label: "High ($10k–30k/day)", dayMin: 10000, dayMax: 30000, depsPerDay: [1, 4] },
  veryhigh: { label: "Very High ($25k–60k/day)", dayMin: 25000, dayMax: 60000, depsPerDay: [2, 5] },
  enterprise: { label: "Enterprise ($50k–100k/day)", dayMin: 50000, dayMax: 100000, depsPerDay: [3, 6] },
};
const BALANCE_TIERS = {
  verylow: { label: "Very Low ($500–2k)", min: 500, max: 2000 },
  low: { label: "Low ($1k–5k)", min: 1000, max: 5000 },
  mid: { label: "Mid ($5k–20k)", min: 5000, max: 20000 },
  high: { label: "High ($20k–60k)", min: 20000, max: 60000 },
  veryhigh: { label: "Very High ($60k–100k)", min: 60000, max: 100000 },
};
const STATEMENT_COUNTS = [1, 2, 3, 4, 6];
const FINANCING_PATTERNS = [
  { value: "daily", label: "Daily (business days)" },
  { value: "weekly", label: "Weekly (Wednesday)" },
  { value: "obfuscated", label: "Obfuscated (irregular sub-payments)" },
];
const BREAK_MODES = [
  { value: "none", label: "Normal (reconciles)" },
  { value: "misstated", label: "Break: Misstated transaction line" },
  { value: "phantom", label: "Break: Unlisted balance shift" },
  { value: "random", label: "Break: Random method on latest statement" },
];
const CATEGORIES = [
  { key: "deposits", label: "Deposits & Other Credits", summaryLabel: "Total Deposits & Credits", sign: 1, withRef: true },
  { key: "card", label: "Card Purchases", summaryLabel: "Total Card Purchases", sign: -1, withRef: false },
  { key: "ach", label: "Electronic / ACH Withdrawals", summaryLabel: "Total ACH / Electronic Withdrawals", sign: -1, withRef: false },
  { key: "financing", label: "Recurring Financing / Merchant Advance Debits", summaryLabel: "Total Recurring Financing Debits", sign: -1, withRef: false },
];
const CATEGORY_BY_KEY = Object.fromEntries(CATEGORIES.map(category => [category.key, category]));
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Config: {bizName, ownerName, bank, lastMonth, numMonths, revenue, balanceTier,
 *   allowOverdraft, seed, breakMode, financings: [{pattern, stopMonth}],
 *   debtCollectors: [{name: "random" | canonicalName,
 *     statementName: "canonical" | "random" | "alias:<catalog alias>"}]}.
 * Month: {key: "YYYY-MM", label, year, index: 0..11, days}.
 * Transaction: {day, category, label, detail, ref, amountCents}; amounts are positive.
 *   Collector ACH debits also carry {required: true, collectorName}.
 * Statement: {month, openingCents, closingCents, transactions, dailyBalances,
 *   totals: {deposits, card, ach, financing}, breakInfo}.
 * Result: {seed, bank, business: {legal, ownerName, acct, addr}, statements,
 *   debtCollectors: [{name, statementName: resolvedPrintedName, amountCents, ref}]}.
 * All ledger values are integer cents. breakInfo describes presentation-only
 * corruption; the true transactions, totals and daily balances remain unchanged.
 */


export {
  BANKS, FIRST, LAST, BIZ_CORE, BIZ_KIND, STREETS, CITIES, PROCESSORS, PLATFORM_DEPOSITS,
  CUSTOMER_NAMES, VENDORS, SUBSCRIPTIONS, UTILITIES, INSURANCE, LEASES, CC_PAYMENTS, FUNDERS,
  DEBT_COLLECTORS, DEBT_COLLECTOR_BY_NAME, DEBT_COLLECTOR_COUNTS, REVENUE_TIERS, BALANCE_TIERS,
  STATEMENT_COUNTS, FINANCING_PATTERNS, BREAK_MODES, CATEGORIES, CATEGORY_BY_KEY, MONTH_NAMES,
};
