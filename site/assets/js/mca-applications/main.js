import { OWNER_COUNTS } from './data.js';
import { generateApplication, analyzeOwnership, formatDate } from './generation.js';
import { renderApplication } from './rendering.js';
import { createSeed } from '../shared/random.js';
import { pad } from '../shared/formatting.js';
import { createFeedback, fillSelect } from '../shared/ui.js';

/* ---------------- Application state and controls ---------------- */
const state = { draft: null, result: null, appliedSignature: '', printing: false };
const ui = Object.fromEntries([
  'generatorForm', 'settings', 'bizNameOverride', 'ownerCount', 'ownerControls', 'ownershipStatus', 'applicationDate',
  'seed', 'btnGen', 'btnPrint', 'status', 'error', 'seedInfo', 'generatedSeed', 'page',
].map(id => [id, document.getElementById(id)]));

const { setStatus, showError } = createFeedback({
  form: ui.generatorForm,
  status: ui.status,
  error: ui.error,
  resolveField: field => ui[field] || (field && document.getElementById(field)),
});

function readDraft() {
  return {
    bizName: ui.bizNameOverride.value.trim(), owners: readOwnerControls(),
    ownerCount: Number(ui.ownerCount.value), applicationDate: ui.applicationDate.value, seed: ui.seed.value.trim(),
  };
}

function readOwnerControls() {
  return [...ui.ownerControls.querySelectorAll('.owner-card:not([hidden])')].map(card => {
    const percentage = card.querySelector('[data-owner-percentage]');
    return {
      name: card.querySelector('[data-owner-name]').value.trim(),
      // Browsers expose incomplete number entries as an empty value. They
      // must fail validation rather than silently becoming automatic shares.
      percentage: percentage.validity.badInput ? 'invalid' : percentage.value.trim(),
    };
  });
}

function initializeOwnerControls() {
  const cards = OWNER_COUNTS.map((_, index) => {
    const card = document.createElement('fieldset');
    card.className = 'owner-card';
    card.innerHTML = `<legend>Owner ${index + 1}${index === 0 ? ' — Primary signer' : ''}</legend><div class="fields">
      <div class="field"><label for="ownerName_${index}">Name</label><input id="ownerName_${index}" data-owner-name
        type="text" placeholder="Random owner name" maxlength="160"></div>
      <div class="field"><label for="ownerPercentage_${index}">Ownership (%)</label><input id="ownerPercentage_${index}" data-owner-percentage
        type="number" min="0.01" max="100" step="0.01" placeholder="Automatic" aria-describedby="ownershipHint ownershipStatus"></div>
    </div>`;
    return card;
  });
  ui.ownerControls.replaceChildren(...cards);
  updateOwnerControls();
}

function updateOwnerControls() {
  // Keep inactive rows in the DOM so names, percentages, and even unfinished
  // input survive decreasing and increasing the owner count.
  [...ui.ownerControls.children].forEach((card, index) => {
    card.hidden = index >= Number(ui.ownerCount.value);
    card.disabled = card.hidden;
  });
  updateOwnershipStatus();
}

function updateOwnershipStatus() {
  try {
    const { manualTotal, automaticCount, remaining } = analyzeOwnership(readOwnerControls());
    ui.ownershipStatus.textContent = automaticCount
      ? `${manualTotal / 100}% entered · ${automaticCount} automatic owner${automaticCount === 1 ? '' : 's'} share ${remaining / 100}%.`
      : `Total ownership: ${manualTotal / 100}%.`;
    ui.ownershipStatus.dataset.tone = '';
  } catch (error) {
    ui.ownershipStatus.textContent = error.message;
    ui.ownershipStatus.dataset.tone = 'warning';
  }
}

function hasPendingSettings() {
  return JSON.stringify(state.draft) !== state.appliedSignature;
}

function canPrint() {
  return Boolean(state.result) && !hasPendingSettings() && !state.printing;
}

function updateControls() {
  ui.settings.disabled = state.printing;
  ui.btnPrint.disabled = !canPrint();
}

function readyStatus() {
  if (!state.result) return 'Choose your settings and generate an application.';
  const { owners, entity, appDate } = state.result;
  return `${owners.length} owner${owners.length === 1 ? '' : 's'} · ${entity} · ${formatDate(appDate)}`;
}

function draftChanged(event) {
  if (state.printing) return;
  if (event.target.id === 'ownerCount') updateOwnerControls();
  else if (event.target.matches('[data-owner-percentage]')) updateOwnershipStatus();
  state.draft = readDraft();
  showError('');
  const pending = hasPendingSettings();
  setStatus(pending ? 'Settings changed—generate to apply.' : readyStatus(), pending ? 'warning' : '');
  updateControls();
}

function generatePreview(event) {
  event?.preventDefault();
  if (state.printing) return;
  state.draft = readDraft();
  showError('');
  try {
    const seed = state.draft.seed || createSeed();
    const result = generateApplication({ ...state.draft, seed });
    const html = renderApplication(result);
    // Publish only after validation, generation, and rendering all succeed.
    ui.page.innerHTML = html;
    state.result = result;
    state.appliedSignature = JSON.stringify(state.draft);
    ui.generatedSeed.textContent = result.seed;
    ui.seedInfo.hidden = false;
    setStatus(readyStatus());
  } catch (error) {
    showError(error.message || 'Could not generate the application. Check your settings and try again.', error.field);
    setStatus('Generation did not complete. Check the settings above.', 'warning');
  }
  updateControls();
}

function printApplication() {
  if (!canPrint()) return;
  showError('');
  state.printing = true;
  updateControls();
  try { window.print(); }
  catch (error) { showError(`Printing could not start. ${error.message || 'Please try again.'}`); }
  finally {
    state.printing = false;
    updateControls();
  }
}

function initialize() {
  fillSelect(ui.ownerCount, OWNER_COUNTS.map(count => ({ value: String(count), label: String(count) })), '1');
  initializeOwnerControls();
  const today = new Date();
  ui.applicationDate.value = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  ui.generatorForm.addEventListener('input', draftChanged);
  ui.generatorForm.addEventListener('submit', generatePreview);
  ui.btnPrint.addEventListener('click', printApplication);
  generatePreview();
}

initialize();
