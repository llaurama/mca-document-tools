/* ---------------- Data pools and configuration ---------------- */
export const FIRST = ["Marcus", "Tanya", "Priya", "Elena", "Devin", "Carla", "Omar", "Lena", "Gregory", "Naomi", "Hector", "Sofia", "Andre", "Maya", "Victor", "Rachel", "Dmitri", "Aisha", "Liam", "Bianca"];
export const LAST = ["Delgado", "Okonkwo", "Nakamura", "Vasquez", "Whitfield", "Brennan", "Castellano", "Petrov", "Adebayo", "Sorensen", "Mercado", "Halloran", "Yamamoto", "Okafor", "Donnelly", "Rivera", "Kowalski", "Fontaine", "Ashford", "Salinas"];
export const BIZ_CORE = ["Riverstone", "Bluefield", "Cedar Peak", "Harborview", "Ironwood", "Summit Lane", "Maple Crest", "Northgate", "Silverbrook", "Coastal Pine", "Granite Hollow", "Westwind", "Brightwater", "Stonebridge", "Lakeside"];
export const BIZ_KIND = [["Outdoor Supply", "Gear Co."], ["Auto Works", "Tire & Service"], ["Catering Group", "Kitchen"], ["Logistics", "Freight"], ["Construction", "Builders"], ["Medical Supply", "Health"], ["Print Solutions", "Print Shop"], ["Landscaping", "Lawn Care"], ["Fitness Studios", "Gym"], ["Bakery", "Bake Shop"], ["Plumbing Services", "Plumbers"], ["Electric Co.", "Electricians"]];
export const ISO = ["Beacon Capital Partners LLC", "Summit Lane Funding Group, Inc.", "Apex Merchant Advisors", "Keystone Funding Solutions", "Lighthouse Capital Brokers", "Vanguard Business Advance"];
export const USES = ["Inventory purchase and expansion", "Equipment upgrade and working capital", "Hiring and payroll support", "Marketing and store renovation", "Debt consolidation and growth", "New location buildout"];
export const STREETS = ["Harborview Boulevard", "Industrial Parkway", "Cedar Hollow Lane", "Palmetto Ridge Court", "Maple Crest Drive", "Stonebridge Way", "Lakeshore Avenue", "Granite Hollow Road", "Westwind Terrace", "Brightwater Circle"];
export const LINE2 = ["Suite 310", "Building C, Floor 2", "Apt 4B", "Unit 7", "Suite 120", "Floor 3", "Unit 12", "Suite 205", ""];
export const CITIES = [["Springfield", "OH", "45504"], ["Tampa", "FL", "33607"], ["Austin", "TX", "78704"], ["Denver", "CO", "80205"], ["Raleigh", "NC", "27604"], ["Portland", "OR", "97214"], ["Phoenix", "AZ", "85016"], ["Columbus", "OH", "43215"], ["Sacramento", "CA", "95814"], ["Nashville", "TN", "37210"]];

export const OWNER_COUNTS = [1, 2, 3, 4];
export const EXECUTIVE_TITLES = ["CEO", "CFO", "COO", "VP"];
export const ENTITY_TYPES = [
  { label: "Limited Liability Company (LLC)", suffix: " LLC", minOwners: 1, maxOwners: 4, titles: ["Managing Member", "Owner", "Principal", ...EXECUTIVE_TITLES] },
  { label: "Corporation (C-Corp)", suffix: " Corporation", minOwners: 1, maxOwners: 4, titles: ["President", "Chief Executive Officer", "Owner", "Principal", ...EXECUTIVE_TITLES] },
  { label: "S-Corporation", suffix: " Corporation", minOwners: 1, maxOwners: 4, titles: ["President", "Chief Executive Officer", "Owner", "Principal", ...EXECUTIVE_TITLES] },
  { label: "Sole Proprietorship", suffix: "", minOwners: 1, maxOwners: 1, fullOwnershipOnly: true, titles: ["Owner", "Principal"] },
  { label: "Partnership", suffix: " Partnership", minOwners: 2, maxOwners: 4, titles: ["Managing Partner", "Owner", "Principal"] },
];

/**
 * Config: {bizName, ownerCount: 1..4, owners: [{name, percentage}], applicationDate: "YYYY-MM-DD", seed}.
 * Input percentages are decimal strings; blank means automatic. Ownership math
 * uses integer hundredths of a percent (100% = 10000) to avoid rounding drift.
 * Address: {street1, street2, city, state, zip}.
 * Owner: {first, last, pct, ssn, dob, email, cell, home, title, addr: Address}.
 * Application: {seed, legal, dba, entity, fein, email, phone, start, years,
 *   biz: Address, amountCents, iso, use, appDate, owners: Owner[]}.
 * Dates are ISO calendar dates; money is integer cents and output pct values
 * have at most two decimal places. The renderer escapes all generated text.
 */
