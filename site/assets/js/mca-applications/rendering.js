import { formatMoney, escapeHtml } from '../shared/formatting.js';
import { formatName, formatDate } from './generation.js';

// Rows describe document fields; values are always text, never trusted markup.
function renderFields(rows) {
  return rows.map(row => `<div class="form-row" style="--columns:${row.length}">${row.map(([label, value]) =>
        `<dl class="form-field"><dt class="lbl">${escapeHtml(label)}</dt><dd class="val">${value === '' || value == null ? '&nbsp;' : escapeHtml(value)}</dd></dl>`
      ).join('')}</div>`).join('');
}

function ownerHeading(index, total) {
  return total === 1 ? 'Owner — Primary Guarantor'
    : `Owner ${index + 1} — ${index === 0 ? 'Primary Guarantor' : 'Co-Guarantor'}`;
}

function renderOwner(owner, index, total) {
  return `<section class="owner-block"><h4 class="who">${escapeHtml(ownerHeading(index, total))}</h4>${renderFields([
        [['First Name', owner.first], ['Last Name', owner.last], ['Ownership %', `${owner.pct}%`]],
        [['SSN', owner.ssn], ['Date of Birth', formatDate(owner.dob)], ['Email', owner.email]],
        [['Cell Phone', owner.cell], ['Home Phone', owner.home], ['Title', owner.title]],
        [['Home Address (Line 1)', owner.addr.street1], ['Home Address (Line 2)', owner.addr.street2]],
        [['City', owner.addr.city], ['State', owner.addr.state], ['ZIP', owner.addr.zip]],
      ])}</section>`;
}

function renderSignature(owner, index, total, applicationDate) {
  const name = escapeHtml(formatName(owner));
  return `<section class="signature-block"><h4 class="who">${escapeHtml(ownerHeading(index, total))}</h4>
      <div class="sig-row">
        <div><span class="lbl">Authorized Owner Signature</span><div class="sig-line"><span class="sig-name">${name}</span></div><div class="sig-cap">Signature of Owner / Guarantor</div></div>
        <div><span class="lbl">Date</span><div class="sig-line">${escapeHtml(applicationDate)}</div><div class="sig-cap">Date Signed</div></div>
      </div>
      <div class="sig-row">
        <div><span class="lbl">Printed Name</span><div class="sig-line">${name}</div><div class="sig-cap">Printed Name</div></div>
        <div><span class="lbl">Title</span><div class="sig-line">${escapeHtml(owner.title)}</div><div class="sig-cap">Title</div></div>
      </div>
    </section>`;
}

export function renderApplication(application) {
  const applicationDate = formatDate(application.appDate);
  return `<header class="doc-header">
      <h2>Merchant Cash Advance Application</h2>
      <div class="sub">Business Funding Application &mdash; Confidential</div>
      <div class="synthetic">SYNTHETIC TEST DOCUMENT</div>
    </header>
    <div class="iso-bar"><div><strong>Submitted by ISO / Broker:</strong> ${escapeHtml(application.iso)}</div>
      <div class="application-date"><strong>Application Date:</strong> ${applicationDate}</div></div>
    <section><h3 class="sec-head">Business / Customer Information</h3>${renderFields([
        [['Legal Business Name', application.legal], ['DBA / Trade Name', application.dba]],
        [['Entity Type', application.entity], ['FEIN / EIN', application.fein]],
        [['Business Email', application.email], ['Business Phone', application.phone]],
        [['Business Start Date', formatDate(application.start)], ['Years in Business', application.years]],
        [['Street Address (Line 1)', application.biz.street1], ['Street Address (Line 2)', application.biz.street2]],
        [['City', application.biz.city], ['State', application.biz.state], ['ZIP', application.biz.zip]],
      ])}</section>
    <section><h3 class="sec-head">Funding Request</h3>${renderFields([
        [['Amount Requested', formatMoney(application.amountCents)], ['ISO / Broker Name', application.iso], ['Use of Funds', application.use]],
      ])}</section>
    <section class="owners-section"><h3 class="sec-head">Owner / Guarantor Information</h3>
      ${application.owners.map((owner, index) => renderOwner(owner, index, application.owners.length)).join('')}</section>
    <section class="signature-section"><div class="authorization-intro"><h3 class="sec-head">Authorization &amp; Signature${application.owners.length === 1 ? '' : 's'}</h3>
      <p class="attest">By signing below, the undersigned owner(s) and guarantor(s) certify that all information provided
        in this application is true, complete, and accurate. The undersigned authorizes ${escapeHtml(application.iso)} and its
        funding partners to obtain business and personal credit reports, verify bank and financial
        information, and contact references in connection with this funding request. This authorization
        shall remain in effect for the duration of the application review.</p></div>
      ${application.owners.map((owner, index) => renderSignature(owner, index, application.owners.length, applicationDate)).join('')}
    </section>
    <footer class="foot">${escapeHtml(application.legal)} &mdash; Merchant Cash Advance Application<br>
      <strong class="synthetic">SYNTHETIC TEST DOCUMENT.</strong> All data is fictitious.</footer>`;
}
