export function fillSelect(select, choices, selected) {
  select.replaceChildren(...choices.map(({ value, label }) => new Option(label, String(value))));
  select.value = String(selected);
}

// Controllers supply field lookup, including aliases and dynamically added rows.
// Existing help remains associated when an error is added or cleared.
export function createFeedback({ form, status, error, resolveField }) {
  function setStatus(message, tone = '') {
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function showError(message, field) {
    error.textContent = message;
    form.querySelectorAll('[aria-invalid]').forEach(input => {
      input.removeAttribute('aria-invalid');
      const descriptions = (input.getAttribute('aria-describedby') || '')
        .split(' ').filter(id => id && id !== error.id);
      if (descriptions.length) input.setAttribute('aria-describedby', descriptions.join(' '));
      else input.removeAttribute('aria-describedby');
    });
    const input = field ? resolveField(field) : null;
    if (message && input) {
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', `${input.getAttribute('aria-describedby') || ''} ${error.id}`.trim());
      input.focus();
    }
  }

  return { setStatus, showError };
}
