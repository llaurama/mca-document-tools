import { formatMoney, escapeHtml } from '../shared/formatting.js';
import { CATEGORIES, MONTH_NAMES } from './data.js';

function displayedClosing(statement) {
  return statement.closingCents + (statement.breakInfo?.mode === 'phantom' ? statement.breakInfo.deltaCents : 0);
}

function renderTransactionSection(statement, category) {
  const rows = statement.transactions.flatMap((transaction, index) => {
    if (transaction.category !== category.key) return [];
    const adjustment = statement.breakInfo?.mode === 'misstated' && statement.breakInfo.transactionIndex === index
      ? statement.breakInfo.deltaCents : 0;
    return [`<tr><td class="date-column">${MONTH_NAMES[statement.month.index]} ${transaction.day}</td>
      <td>${escapeHtml(transaction.label)}<div class="desc-sub">${escapeHtml(transaction.detail)}</div></td>
      ${category.withRef ? `<td>${escapeHtml(transaction.ref)}</td>` : ''}
      <td class="amount">${formatMoney(transaction.amountCents + adjustment)}</td></tr>`];
  });
  if (category.key === 'financing' && !rows.length) return '';
  const title = category.key === 'deposits'
    ? `<h2 class="sec-head">${escapeHtml(category.label)}</h2>`
    : `${category.key === 'card' ? '<h2 class="sec-head">Withdrawals &amp; Other Debits</h2>' : ''}<h3 class="sec-sub">${escapeHtml(category.label)}</h3>`;
  const columns = category.withRef ? 4 : 3;
  return `<section data-keep-start>${title}<table class="tx">
    <thead><tr><th scope="col" class="date-column">Date</th><th scope="col">Description</th>
    ${category.withRef ? '<th scope="col" class="ref-column">Ref Number</th>' : ''}<th scope="col" class="amount amount-column">Amount</th></tr></thead>
    <tbody>${rows.join('') || `<tr><td colspan="${columns}">No transactions this period.</td></tr>`}
    <tr class="total"><td colspan="${columns - 1}">${category.key === 'deposits' ? 'Total Deposits &amp; Other Credits' : 'Subtotal'}</td>
    <td class="amount">${formatMoney(category.sign * statement.totals[category.key])}</td></tr></tbody>
  </table></section>`;
}

function renderDailyBalances(statement) {
  const cells = statement.dailyBalances.map(({ day, balanceCents }) => {
    const adjustment = statement.breakInfo?.mode === 'phantom' && day >= statement.breakInfo.pivotDay
      ? statement.breakInfo.deltaCents : 0;
    return `<td>${MONTH_NAMES[statement.month.index]} ${day}</td><td class="amount">${formatMoney(balanceCents + adjustment)}</td>`;
  });
  const rows = [];
  for (let index = 0; index < cells.length; index += 3) {
    const group = cells.slice(index, index + 3);
    rows.push(`<tr>${group.join('')}${'<td></td><td></td>'.repeat(3 - group.length)}</tr>`);
  }
  return `<section data-keep-start><h2 class="sec-head">Daily Ending Balance</h2><table class="balances">
    <thead><tr>${'<th scope="col">Date</th><th scope="col" class="amount">Balance</th>'.repeat(3)}</tr></thead>
    <tbody>${rows.join('')}</tbody></table></section>`;
}

function renderStatement(result, statement) {
  const { bank, business } = result;
  const { month } = statement;
  const summary = CATEGORIES.map(category => {
    const count = statement.transactions.filter(transaction => transaction.category === category.key).length;
    if (category.key === 'financing' && !count) return '';
    return `<tr><td class="k">${escapeHtml(category.summaryLabel)} (${count})</td><td class="amount">${formatMoney(category.sign * statement.totals[category.key])}</td></tr>`;
  }).join('');
  return `<article class="statement" aria-label="${escapeHtml(month.label)} statement" style="--accent:${escapeHtml(bank.accent)};--accent-lt:${escapeHtml(bank.accentLt)}">
    <header class="bank-header"><div class="bank-logo">${escapeHtml(bank.name)}<span class="tag">${escapeHtml(bank.tag)}</span></div>
      <div class="bank-meta"><div class="doc-title">Business Bank Statement</div>Member FDIC &mdash; Synthetic Test Document</div></header>
    <div class="addr-row"><div class="addr-block"><div class="name">${escapeHtml(business.ownerName)}</div><div>${escapeHtml(business.legal)}</div>
      <div>${escapeHtml(business.addr.street)}</div><div>${escapeHtml(business.addr.city)}, ${escapeHtml(business.addr.state)} ${escapeHtml(business.addr.zip)}</div></div>
      <div class="period-block"><div><span class="k">Account Number:</span> <span class="v">${escapeHtml(business.acct)}</span></div>
      <div><span class="k">Statement Period:</span> <span class="v">${MONTH_NAMES[month.index]} 1, ${month.year} &ndash; ${MONTH_NAMES[month.index]} ${month.days}, ${month.year}</span></div>
      <div><span class="k">Account Type:</span> <span class="v">Business Checking</span></div></div></div>
    <section data-keep-start><h2 class="sec-head">Account Summary</h2><table class="summary"><tbody>
      <tr><td class="k">Beginning Balance</td><td class="amount">${formatMoney(statement.openingCents)}</td></tr>${summary}
      <tr class="total"><td>Ending Balance</td><td class="amount">${formatMoney(displayedClosing(statement))}</td></tr></tbody></table></section>
    ${CATEGORIES.map(category => renderTransactionSection(statement, category)).join('')}
    ${renderDailyBalances(statement)}
    <footer class="foot">${escapeHtml(business.legal)} &mdash; Account ${escapeHtml(business.acct)} &mdash; ${escapeHtml(month.label)} Statement<br>
      <span class="warn">SYNTHETIC TEST DOCUMENT.</span> All account, business, and transaction data on this page is fictitious and generated for testing purposes only. It does not represent any real bank, account, or individual.</footer>
  </article>`;
}

export { renderStatement };
