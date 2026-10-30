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

const PERSONAL_DEPOSITS = ["ZELLE PAYMENT", "VENMO CASHOUT", "CASH APP TRANSFER", "APPLE CASH TRANSFER", "PAYROLL DIRECT DEP", "MOBILE CHECK DEPOSIT"];
const PERSONAL_VENDORS = ["KROGER #0412", "WALMART SUPERCENTER", "TARGET", "ALDI", "TRADER JOES", "COSTCO WHSE", "SHELL OIL", "SPEEDWAY", "CHICK-FIL-A", "CHIPOTLE ONLINE", "STARBUCKS", "CVS PHARMACY", "WALGREENS", "DOLLAR GENERAL"];
const PERSONAL_SUBSCRIPTIONS = ["NETFLIX.COM", "SPOTIFY USA", "HULU", "DISNEY PLUS", "YOUTUBE PREMIUM", "VERIZON WIRELESS", "T-MOBILE AUTOPAY", "PLANET FITNESS", "APPLE.COM/BILL"];
const PERSONAL_HOUSING = ["LANDMARK APARTMENTS RENT", "PINE RIDGE PROPERTY MGMT", "FIRST HORIZON MORTGAGE", "ROCKET MORTGAGE", "OAKWOOD RESIDENTIAL LLC", "HARTWELL LANDLORD SVCS", "FREEDOM HOME LOAN SVC", "CARDINAL MORTGAGE SVC"];
// Whole-dollar monthly rent or mortgage by revenue tier, sized against that tier's typical monthly deposits.
const PERSONAL_HOUSING_RANGES = {
  below10k: [550, 900], verylight: [1200, 2600], light: [1800, 3500], moderate: [2000, 3500],
  high: [2000, 3500], veryhigh: [2000, 3500], enterprise: [2000, 3500],
};
const PERSONAL_AUTO_LOANS = ["TOYOTA FINANCIAL SVCS", "HONDA FINANCIAL", "CAPITAL ONE AUTO PMT", "AMERICREDIT"];
const PERSONAL_STUDENT_LOANS = ["NELNET STUDENT LOAN", "MOHELA STUDENT LN", "AIDVANTAGE"];
const PERSONAL_CARDS = ["DISCOVER E-PAYMENT", "SYNCHRONY BANK PMT", "BARCLAYCARD US", "WELLS FARGO CARD PMT"];
const PERSONAL_UTILITIES = ["MUNICIPAL WATER & SEWER", "COLUMBIA GAS", "DUKE ENERGY", "XFINITY INTERNET"];
const PERSONAL_INSURANCE = ["GEICO AUTO", "STATE FARM AUTO", "LEMONADE RENTERS", "ALLSTATE"];
// [pool, min, max] absolute dollars: personal spend is not scaled by revenue tier.
// Housing is deliberately absent: it posts once a month through the profile's fixed obligation.
const PERSONAL_RECURRING = [
  [PERSONAL_AUTO_LOANS, 250, 650], [PERSONAL_STUDENT_LOANS, 80, 400],
  [PERSONAL_CARDS, 40, 600], [PERSONAL_UTILITIES, 40, 250], [PERSONAL_INSURANCE, 60, 260],
];
const PERSONAL_BANK_TAGS = { Meridian: "Personal Banking", Coastline: "Personal Banking", Ironbridge: "Consumer Bank", Highline: "Community Bank" };

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
  // At most one $300 deposit per calendar day: even 31 days total only $9,300.
  below10k: { label: "Below $10k/month", dayMin: 100, dayMax: 300, depsPerDay: [0, 1] },
  verylight: { label: "Very Light ($300–1.5k/day)", dayMin: 300, dayMax: 1500, depsPerDay: [0, 1] },
  light: { label: "Light ($1.5k–5k/day)", dayMin: 1500, dayMax: 5000, depsPerDay: [0, 2] },
  moderate: { label: "Moderate ($4k–12k/day)", dayMin: 4000, dayMax: 12000, depsPerDay: [1, 3] },
  high: { label: "High ($10k–30k/day)", dayMin: 10000, dayMax: 30000, depsPerDay: [1, 4] },
  veryhigh: { label: "Very High ($25k–60k/day)", dayMin: 25000, dayMax: 60000, depsPerDay: [2, 5] },
  enterprise: { label: "Enterprise ($50k–100k/day)", dayMin: 50000, dayMax: 100000, depsPerDay: [3, 6] },
};
const ACCOUNT_TYPES = {
  business: {
    label: "Business account", title: "Business Bank Statement", accountLabel: "Business Checking",
    revenueTiers: Object.keys(REVENUE_TIERS), personal: false,
  },
  personalCommingled: {
    label: "Personal, business income commingled", title: "Personal Bank Statement", accountLabel: "Personal Checking",
    revenueTiers: Object.keys(REVENUE_TIERS), personal: true,
  },
  personalOnly: {
    label: "Personal, personal income only", title: "Personal Bank Statement", accountLabel: "Personal Checking",
    revenueTiers: ["below10k", "verylight"], personal: true,
  },
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
 * Config: {accountType?: "business" (default) | "personalCommingled" | "personalOnly",
 *   dba?: boolean (default false; personal types only), bizName, ownerName, bank, lastMonth,
 *   numMonths, revenue (must be in ACCOUNT_TYPES[accountType].revenueTiers), balanceTier,
 *   allowOverdraft, seed, breakMode, financings: [{pattern, stopMonth}],
 *   debtCollectors: [{name: "random" | canonicalName,
 *     statementName: "canonical" | "random" | "alias:<catalog alias>"}]}.
 * Month: {key: "YYYY-MM", label, year, index: 0..11, days}.
 * Transaction: {day, category, label, detail, ref, amountCents}; amounts are positive.
 *   Collector ACH debits also carry {required: true, collectorName}. Personal results also
 *   carry exactly one required ACH "To <PERSONAL_HOUSING payee>" debit per statement, with the
 *   same amount every month (drawn once per run from PERSONAL_HOUSING_RANGES[revenue]) and a
 *   printed day within two days of a fixed anchor day; business results never do.
 * Statement: {month, openingCents, closingCents, transactions, dailyBalances,
 *   totals: {deposits, card, ach, financing}, breakInfo}.
 * Result: {seed, bank, business: {legal, ownerName, acct, addr}, statements,
 *   debtCollectors: [{name, statementName: resolvedPrintedName, amountCents, ref}],
 *   accountType?}. For personal types `business` holds the account holder identity
 *   (`legal` is "" unless dba), `bank.tag` comes from PERSONAL_BANK_TAGS, and the result
 *   carries `accountType`; business results omit that key so existing seeds stay identical.
 * All ledger values are integer cents. breakInfo describes presentation-only
 * corruption; the true transactions, totals and daily balances remain unchanged.
 */


export {
  BANKS, FIRST, LAST, BIZ_CORE, BIZ_KIND, STREETS, CITIES, PROCESSORS, PLATFORM_DEPOSITS,
  CUSTOMER_NAMES, VENDORS, SUBSCRIPTIONS, UTILITIES, INSURANCE, LEASES, CC_PAYMENTS, FUNDERS,
  PERSONAL_DEPOSITS, PERSONAL_VENDORS, PERSONAL_SUBSCRIPTIONS, PERSONAL_HOUSING, PERSONAL_HOUSING_RANGES, PERSONAL_AUTO_LOANS,
  PERSONAL_STUDENT_LOANS, PERSONAL_CARDS, PERSONAL_UTILITIES, PERSONAL_INSURANCE, PERSONAL_RECURRING,
  PERSONAL_BANK_TAGS, ACCOUNT_TYPES,
  DEBT_COLLECTORS, DEBT_COLLECTOR_BY_NAME, DEBT_COLLECTOR_COUNTS, REVENUE_TIERS, BALANCE_TIERS,
  STATEMENT_COUNTS, FINANCING_PATTERNS, BREAK_MODES, CATEGORIES, CATEGORY_BY_KEY, MONTH_NAMES,
};
