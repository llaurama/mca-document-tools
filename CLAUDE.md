# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
- Serve: `python3 -m http.server 8000 --directory site` (ES modules need HTTP, not `file://`). No build, no deps.
- Test all: `npm test` (`node --test`, Node >=22, no installs)
- Single file: `node --test tests/bank-statements.test.js`
- Single test by name: `node --test --test-name-pattern="<substring>" tests/`

## Architecture
Static, backend-less site (`site/`) with two independent generators of synthetic, test-marked documents: `bank-statements/` and `mca-applications/`. Landing page links to both; all URLs relative so nested hosting works.

Each tool's `assets/js/<tool>/` splits into:
- `data.js` — catalogs
- `generation.js` — pure generation + validation
- `rendering.js` — pure document HTML
- `main.js` — browser orchestration (draft settings vs. generated result; only Generate applies edits, invalid settings keep the existing preview)
- bank only: `pdf.js` (html2canvas/jsPDF/JSZip from cdnjs; print fallback if they fail to load)

Shared helpers in `assets/js/shared/` (seeded random, formatting/escaping, validation errors, UI helpers). Each tool owns its own CSS and print rules; keep tools separate, extract only genuinely common code.

## Seed compatibility (critical)
Output must be reproducible from settings + seed. **Do not reorder random draws or catalog entries** unless intentionally changing behavior — `tests/fixtures/generation-baselines.json` stores hashes of `JSON.stringify(result)` and rendered HTML for fixed seeds (incl. Unicode), plus the collector catalog hash. On intentional change, review the diff before updating the specific hash; never bulk-refresh fixtures to make tests pass.

## Domain notes
- Financing debits must read `To <funder> - Merchant Advance Pmt`; MoneyThumb OCR relies on the "Merchant Advance" phrase to tag MCA payments.
- "Below $10k/month" revenue tier: max one $100–$300 deposit/day so any month <= $9,300.
- Bank `accountType` (`business` default, `personalCommingled`, `personalOnly`) picks a `PROFILES` entry in `generation.js` (deposit sources, vendors, recurring pools, spend scale). Result gets an `accountType` key only for personal types; a missing value must stay byte-identical to business.
- Personal profiles add a fixed monthly housing obligation (`profile.obligations`, drawn once per run after collectors; business profiles have no such hook and draw nothing): one required ACH rent/mortgage debit per statement, same payee and amount, day jittering within two days of an anchor day 1-5. Housing is excluded from `PERSONAL_RECURRING`. Personal profiles also pick subscriptions without repeats within a month.
- Collector agencies are fictional (names start "Example"); stored as `{ name, aliases }`.
- All documents carry synthetic-test markings.

## Testing notes
Tests cover logic only (arithmetic, rendering, seeded parity, PDF helpers with doubles). Layout, navigation, printing, ZIP/PDF export need manual browser checks: serve at root and a nested URL; check 1 and 6 statements, 1- and 4-owner applications.
