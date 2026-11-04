# Generator regression tests

Run `npm test` from the project root (Node 22 or later; no package installation required). Tests use Node's built-in runner and import only the site's native modules, the bundle builder, and these fixtures. Browser layout, navigation, printing, dependency failure, and ZIP export additionally need browser checks.

`fixtures/generation-baselines.json` records fixed input settings, expected seeded random sequences (including Unicode seeds), the collector catalog hash, and hashes of `JSON.stringify(result)` and rendered document HTML. Tests use only files included in this project.

These fixtures detect changes to random-draw order, catalog ordering, generated values, document markup, and escaping. Keep them when rearranging code. For an intentional behavior change, review the affected input/output difference before updating its expected hash; do not refresh all fixtures merely to make a failing test pass.

`account-types.test.js` covers the bank generator's personal account types: business output unchanged when `accountType` is omitted, reconciliation across tiers and break modes, revenue-tier and DBA validation, absence of business strings in personal output, DBA escaping, the below $10k deposit cap, and the deposit-source mix. Personal baseline entries in the fixtures are append-only like the others.

Other tests independently recompute daily balances and totals, exercise negative continuity and required payments, verify financing calendars and collector aliases, and check ownership math, owner signatures, titles, validation, and immutable inputs. PDF helper tests use controlled element/canvas doubles to verify integer boundaries, heading/row protection, complete slice coverage, and canvas release after success or simulated renderer/context/image failures. Actual document layout, controls, and exported PDFs are also verified in the browser.
