import { createSeed } from '../shared/random.js';
import { pad } from '../shared/formatting.js';
import { fillSelect, createFeedback } from '../shared/ui.js';
import {
  BANKS, STATEMENT_COUNTS, REVENUE_TIERS, BALANCE_TIERS, FINANCING_PATTERNS,
  DEBT_COLLECTORS, DEBT_COLLECTOR_COUNTS, BREAK_MODES,
} from './data.js';
import { generateStatements, getMonths, collectorStatementNameOptions } from './generation.js';
import { renderStatement } from './rendering.js';
import { renderPdf, downloadBlob } from './pdf.js';

async function exportStatements() {
  if (!canExport()) return;
  showError('');
  if (typeof window.html2canvas !== 'function' || !window.jspdf?.jsPDF || typeof window.JSZip !== 'function') {
    showError('PDF libraries could not load. Check your connection and reload, or use Print / Save PDF.');
    return;
  }
  state.exporting = true;
  updateControls();
  try {
    await document.fonts.ready;
    const statements = [...ui.preview.querySelectorAll('.statement')];
    const zip = new window.JSZip();
    for (const [index, element] of statements.entries()) {
      setStatus(`Rendering statement ${index + 1} of ${statements.length}…`);
      zip.file(`bank-statement-${pad(index + 1)}.pdf`, await renderPdf(element));
    }
    setStatus('Preparing ZIP download…');
    downloadBlob(await zip.generateAsync({ type: 'blob' }), 'bank-statements.zip');
    setStatus(`ZIP ready: ${statements.length} statement PDF${statements.length === 1 ? '' : 's'}.`);
  } catch (error) {
    showError(`Export failed. ${error.message || 'Please try again.'} You can also use Print / Save PDF.`);
    setStatus('Export did not complete. Your generated statements are still available.');
  } finally {
    state.exporting = false;
    updateControls();
  }
}

/* ---------------- Application state and controls ---------------- */
const state = { draft: null, result: null, appliedSignature: '', exporting: false };
const ui = Object.fromEntries([
  'generatorForm', 'settings', 'bizName', 'ownerName', 'bank', 'lastMonth', 'numMonths', 'revenue',
  'balanceTier', 'overdrafts', 'financings', 'financingControls', 'financingNotice', 'breakMode', 'seed',
  'includeDebtCollectors', 'debtCollectorSettings', 'debtCollectorCount', 'debtCollectorControls', 'debtCollectorNotice',
  'btnGen', 'btnExport', 'btnPrint', 'status', 'error', 'seedInfo', 'generatedSeed', 'preview',
].map(id => [id, document.getElementById(id)]));

const { setStatus, showError } = createFeedback({
  form: ui.generatorForm,
  status: ui.status,
  error: ui.error,
  resolveField: field => ui[field === 'allowOverdraft' ? 'overdrafts' : field] || (field && document.getElementById(field)),
});

function readDraft() {
  return {
    bizName: ui.bizName.value.trim(), ownerName: ui.ownerName.value.trim(), bank: ui.bank.value,
    lastMonth: ui.lastMonth.value, numMonths: Number(ui.numMonths.value), revenue: ui.revenue.value,
    balanceTier: ui.balanceTier.value, allowOverdraft: ui.overdrafts.checked, seed: ui.seed.value.trim(),
    breakMode: ui.breakMode.value,
    financings: [...ui.financingControls.querySelectorAll('.financing-card')].map(card => ({
      pattern: card.querySelector('[data-pattern]').value,
      stopMonth: card.querySelector('[data-stop]').value,
    })),
    debtCollectors: ui.includeDebtCollectors.checked ? readDebtCollectorControls() : [],
  };
}

function readDebtCollectorControls() {
  return [...ui.debtCollectorControls.querySelectorAll('.collector-card')].map(card => ({
    name: card.querySelector('[data-collector-name]').value,
    statementName: card.querySelector('[data-collector-statement-name]').value,
  }));
}

function rebuildDebtCollectorControls() {
  const previous = readDebtCollectorControls();
  const agencyOptions = [{ value: 'random', label: 'Random agency' }, ...DEBT_COLLECTORS.map(collector => ({ value: collector.name, label: collector.name }))];
  const cards = Array.from({ length: Number(ui.debtCollectorCount.value) }, (_, index) => {
    const selection = previous[index] || { name: 'random', statementName: 'canonical' };
    const card = document.createElement('fieldset');
    card.className = 'collector-card';
    card.innerHTML = `<legend>Collector ${index + 1}</legend><div class="fields">
      <div class="field"><label for="collectorName_${index}">Collector</label><select id="collectorName_${index}" data-collector-name></select></div>
      <div class="field"><label for="collectorStatementName_${index}">Statement name</label><select id="collectorStatementName_${index}" data-collector-statement-name></select></div></div>`;
    fillSelect(card.querySelector('[data-collector-name]'), agencyOptions, selection.name);
    fillSelect(card.querySelector('[data-collector-statement-name]'), collectorStatementNameOptions(selection.name), selection.statementName);
    return card;
  });
  ui.debtCollectorControls.replaceChildren(...cards);
  ui.debtCollectorNotice.textContent = '';
}

function updateCollectorStatementNames(agencySelect) {
  const card = agencySelect.closest('.collector-card');
  const statementSelect = card.querySelector('[data-collector-statement-name]');
  const options = collectorStatementNameOptions(agencySelect.value);
  const previous = statementSelect.value;
  const valid = options.some(option => option.value === previous);
  fillSelect(statementSelect, options, valid ? previous : 'canonical');
  ui.debtCollectorNotice.textContent = valid ? '' : `${card.querySelector('legend').textContent}: the previous alias is unavailable; reset to Agency name.`;
}

function rebuildFinancingControls() {
  const previous = readDraft().financings;
  const count = Number(ui.financings.value);
  let months;
  try { months = getMonths(ui.lastMonth.value, Number(ui.numMonths.value)).slice(0, -1); }
  catch { months = null; } // An incomplete period must not discard existing stop dates.
  const reset = [];
  const cards = Array.from({ length: count }, (_, index) => {
    const financing = previous[index] || { pattern: 'daily', stopMonth: '' };
    if (months && financing.stopMonth && !months.some(month => month.key === financing.stopMonth)) {
      financing.stopMonth = '';
      reset.push(index + 1);
    }
    const card = document.createElement('fieldset');
    card.className = 'financing-card';
    card.innerHTML = `<legend>Financing ${index + 1}</legend><div class="fields">
      <div class="field"><label for="finPattern_${index}">Pattern</label><select id="finPattern_${index}" data-pattern></select></div>
      <div class="field"><label for="finStop_${index}">Stops after</label><select id="finStop_${index}" data-stop></select></div></div>`;
    fillSelect(card.querySelector('[data-pattern]'), FINANCING_PATTERNS, financing.pattern);
    const stopChoices = months ? months.map(month => ({ value: month.key, label: month.label }))
      : financing.stopMonth ? [{ value: financing.stopMonth, label: financing.stopMonth }] : [];
    fillSelect(card.querySelector('[data-stop]'), [{ value: '', label: 'Never (whole period)' }, ...stopChoices], financing.stopMonth);
    return card;
  });
  ui.financingControls.replaceChildren(...cards);
  ui.financingNotice.textContent = reset.length ? `Financing ${reset.join(', ')}: stop month is outside the selectable range; reset to Never.` : '';
}

function hasPendingSettings() {
  return JSON.stringify(state.draft) !== state.appliedSignature;
}

function canExport() {
  return Boolean(state.result) && !hasPendingSettings() && !state.exporting;
}

function updateControls() {
  ui.settings.disabled = state.exporting;
  ui.debtCollectorSettings.hidden = !ui.includeDebtCollectors.checked;
  ui.debtCollectorSettings.disabled = !ui.includeDebtCollectors.checked;
  ui.btnExport.disabled = ui.btnPrint.disabled = !canExport();
  ui.btnExport.textContent = state.exporting ? 'Exporting…' : 'Download ZIP';
  ui.preview.setAttribute('aria-busy', String(state.exporting));
}

function readyStatus() {
  if (!state.result) return 'Choose your settings and generate statements.';
  const statements = state.result.statements;
  const broken = statements.at(-1).breakInfo;
  return `${statements.length} statement${statements.length === 1 ? '' : 's'} · ${statements[0].month.label} – ${statements.at(-1).month.label} · ${broken ? 'Intentional mismatch in latest statement' : 'Balances reconcile'}`;
}

function draftChanged(event) {
  if (state.exporting) return;
  if (['financings', 'numMonths', 'lastMonth'].includes(event.target.id)) rebuildFinancingControls();
  if (event.target.id === 'debtCollectorCount') rebuildDebtCollectorControls();
  if (event.target.matches('[data-collector-name]')) updateCollectorStatementNames(event.target);
  if (event.target.matches('[data-collector-statement-name]')) ui.debtCollectorNotice.textContent = '';
  state.draft = readDraft();
  showError('');
  const pending = hasPendingSettings();
  setStatus(pending ? 'Settings changed—generate to apply.' : readyStatus(), pending ? 'warning' : '');
  updateControls();
}

function generatePreview(event) {
  event?.preventDefault();
  if (state.exporting) return;
  state.draft = readDraft();
  showError('');
  try {
    const seed = state.draft.seed || createSeed();
    const result = generateStatements({ ...state.draft, seed });
    const html = result.statements.map(statement => renderStatement(result, statement)).join('');
    // Publish the result only after the complete ledger and markup succeed.
    ui.preview.innerHTML = html;
    state.result = result;
    state.appliedSignature = JSON.stringify(state.draft);
    ui.generatedSeed.textContent = result.seed;
    ui.seedInfo.hidden = false;
    setStatus(readyStatus());
  } catch (error) {
    showError(error.message || 'Could not generate statements. Check your settings and try again.', error.field);
    setStatus('Generation did not complete. Check the settings above.', 'warning');
  }
  updateControls();
}

function initialize() {
  fillSelect(ui.bank, [{ value: 'random', label: 'Random bank' }, ...BANKS.map((bank, index) => ({ value: index, label: `${bank.name} ${bank.tag}` }))], 'random');
  fillSelect(ui.numMonths, STATEMENT_COUNTS.map(count => ({ value: count, label: String(count) })), 3);
  fillSelect(ui.revenue, Object.entries(REVENUE_TIERS).map(([value, tier]) => ({ value, label: tier.label })), 'moderate');
  fillSelect(ui.balanceTier, Object.entries(BALANCE_TIERS).map(([value, tier]) => ({ value, label: tier.label })), 'mid');
  fillSelect(ui.financings, [0, 1, 2, 3].map(count => ({ value: count, label: String(count) })), 0);
  fillSelect(ui.debtCollectorCount, DEBT_COLLECTOR_COUNTS.map(count => ({ value: count, label: String(count) })), 1);
  fillSelect(ui.breakMode, BREAK_MODES, 'none');
  const now = new Date();
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  ui.lastMonth.value = `${previousMonth.getFullYear()}-${pad(previousMonth.getMonth() + 1)}`;
  rebuildFinancingControls();
  rebuildDebtCollectorControls();
  ui.generatorForm.addEventListener('input', draftChanged);
  ui.generatorForm.addEventListener('submit', generatePreview);
  ui.btnExport.addEventListener('click', exportStatements);
  ui.btnPrint.addEventListener('click', () => { if (canExport()) window.print(); });
  generatePreview();
}

initialize();
