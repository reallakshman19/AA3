import {
  buildFittingWeightReviewRows,
  fittingWeightRecordFor,
} from './load-calc-fitting-weight-review.js';

/**
 * Review dialog for catalogue fitting weights.
 *
 * Bore and rating leave a DN150 900# fitting with ten master rows spanning
 * 26 kg to 538 kg, and face-to-face length narrows that without always
 * deciding it. The ranker's own best pick is demonstrably wrong for valves,
 * so no candidate is preselected and nothing is written until a reviewer
 * chooses. Every candidate is shown with its weight, its catalogue length and
 * how far that sits from the component's measured length, because those are
 * what distinguish a gate valve from a globe valve of the same size.
 */
export function openFittingWeightDialog({ documentRef, dataset, masters, onAccept }) {
  const review = buildFittingWeightReviewRows({ dataset, masters });
  const host = documentRef.createElement('div');
  host.className = 'lcfw-backdrop';
  host.dataset.role = 'load-calc-fitting-weight-dialog';
  host.innerHTML = `${styles()}${markup(review)}`;
  documentRef.body.appendChild(host);

  const close = () => host.remove();
  host.addEventListener('click', (event) => {
    if (event.target === host || event.target.closest('[data-lcfw-close]')) return close();
    const applyButton = event.target.closest('[data-lcfw-apply]');
    if (!applyButton) return;
    const selections = [...host.querySelectorAll('[data-lcfw-row]')].flatMap((rowEl) => {
      const chosen = rowEl.querySelector('input[type="radio"]:checked');
      if (!chosen) return [];
      const row = review.rows.find((candidate) => candidate.targetId === rowEl.dataset.lcfwRow);
      const candidate = row?.candidates[Number(chosen.value)];
      return row && candidate ? [fittingWeightRecordFor(row, candidate, masters)] : [];
    });
    if (selections.length === 0) {
      const note = host.querySelector('[data-lcfw-note]');
      if (note) note.textContent = 'Select a catalogue row for at least one fitting before applying.';
      return;
    }
    close();
    onAccept?.(selections);
  });
  return host;
}

function markup(review) {
  const { rows, summary } = review;
  if (summary.weightMasterRowCount === 0) {
    return panel('Component weight review', `
      <p class="lcfw-empty">The Weights master has no rows. Import it in Import Masters before reviewing fitting weights.</p>
      <div class="lcfw-actions"><button type="button" data-lcfw-close>Close</button></div>`);
  }
  if (rows.length === 0) {
    return panel('Component weight review', `
      <p class="lcfw-empty">No catalogue fitting is currently missing a component weight.</p>
      <div class="lcfw-actions"><button type="button" data-lcfw-close>Close</button></div>`);
  }
  return panel('Component weight review', `
    <p class="lcfw-lead">${summary.fittingCount} fitting(s) need a catalogue weight.
      ${summary.singleCandidate} match a single row on bore, rating and length;
      ${summary.needsChoice} need a choice between rows that share the same length;
      ${summary.unresolvable} could not be matched.
      Nothing is preselected: a wrong row can differ by several hundred kilograms.</p>
    <div class="lcfw-rows">${rows.map(rowMarkup).join('')}</div>
    <p class="lcfw-note" data-lcfw-note></p>
    <div class="lcfw-actions">
      <button type="button" data-lcfw-apply class="lcfw-primary">Apply selected weights</button>
      <button type="button" data-lcfw-close>Cancel</button>
    </div>`);
}

function rowMarkup(row) {
  if (row.unresolvable) {
    return `<section class="lcfw-row lcfw-row--blocked">
      <header><strong>${escapeHtml(row.description || row.targetId)}</strong>
        <span>${escapeHtml(row.type)} · ${row.boreMm ? `DN${row.boreMm}` : 'no bore'} · ${row.lengthMm ? `${row.lengthMm} mm` : 'no length'}</span></header>
      <p class="lcfw-blocked-note">${escapeHtml(unresolvableText(row.unresolvable))}</p>
    </section>`;
  }
  return `<section class="lcfw-row" data-lcfw-row="${escapeHtml(row.targetId)}">
    <header><strong>${escapeHtml(row.description || row.targetId)}</strong>
      <span>${escapeHtml(row.type)} · DN${row.boreMm} · ${row.rating ? `${escapeHtml(row.rating)}#` : 'no rating'} · measured ${row.lengthMm} mm</span></header>
    <table>
      <thead><tr><th></th><th>Catalogue row</th><th>Weight</th><th>Face to face</th><th>Length delta</th></tr></thead>
      <tbody>${row.candidates.map((candidate, index) => `<tr class="${candidate.lengthQualified ? '' : 'lcfw-unqualified'}">
        <td><input type="radio" name="lcfw-${escapeHtml(row.targetId)}" value="${index}"></td>
        <td>${escapeHtml(candidate.typeDesc)}</td>
        <td><strong>${escapeHtml(candidate.weightKg)} kg</strong></td>
        <td>${escapeHtml(candidate.rowLengthMm)} mm</td>
        <td>${candidate.lengthDeltaMm === null ? '—' : `${escapeHtml(round(candidate.lengthDeltaMm))} mm${candidate.lengthQualified ? '' : ' (outside tolerance)'}`}</td>
      </tr>`).join('')}</tbody>
    </table>
  </section>`;
}

function unresolvableText(code) {
  if (code === 'NO_BORE_OR_LENGTH') return 'This fitting has no bore or no measurable face-to-face length, so no catalogue row can be matched to it.';
  if (code === 'NO_CANDIDATE') return 'No Weights master row shares this bore and rating.';
  return 'Candidate ranking failed for this fitting.';
}

function panel(title, body) {
  return `<div class="lcfw-panel" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
    <header class="lcfw-head"><h2>${escapeHtml(title)}</h2><button type="button" data-lcfw-close aria-label="Close">✕</button></header>
    ${body}
  </div>`;
}

function round(value) {
  return Math.round(Number(value) * 100) / 100;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/gu, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[character]);
}

function styles() {
  return `<style>
    .lcfw-backdrop{position:fixed;inset:0;z-index:9000;background:rgba(2,6,16,.72);display:flex;align-items:center;justify-content:center;padding:24px}
    .lcfw-panel{display:flex;flex-direction:column;gap:10px;max-width:1080px;width:100%;max-height:88vh;overflow:auto;padding:16px 18px;border:1px solid #334155;border-radius:9px;background:#0b1424;color:#e2e8f0;box-shadow:0 18px 48px rgba(0,0,0,.55)}
    .lcfw-head{display:flex;justify-content:space-between;align-items:center;gap:12px}
    .lcfw-head h2{margin:0;font-size:17px}
    .lcfw-head button{border:1px solid #334155;border-radius:5px;background:#111c2f;color:#e2e8f0;padding:5px 9px;cursor:pointer}
    .lcfw-lead{margin:0;color:#bae6fd;font-size:12px;line-height:1.5;padding:9px 11px;border:1px solid #155e75;border-radius:6px;background:#082f49}
    .lcfw-empty{margin:0;color:#94a3b8}
    .lcfw-rows{display:flex;flex-direction:column;gap:9px}
    .lcfw-row{border:1px solid #293548;border-radius:7px;background:#0d1728;padding:10px 12px}
    .lcfw-row--blocked{border-color:#7f1d1d}
    .lcfw-row header{display:flex;flex-direction:column;gap:2px;margin-bottom:7px}
    .lcfw-row header strong{color:#7dd3fc;font-size:13px}
    .lcfw-row header span{color:#94a3b8;font-size:11px}
    .lcfw-blocked-note{margin:0;color:#fca5a5;font-size:11px}
    .lcfw-row table{width:100%;border-collapse:collapse;font-size:12px}
    .lcfw-row th{text-align:left;color:#94a3b8;font-size:10px;text-transform:uppercase;padding:4px 6px;border-bottom:1px solid #26354a}
    .lcfw-row td{padding:5px 6px;border-bottom:1px solid #1b2839}
    .lcfw-row tr.lcfw-unqualified td{color:#94a3b8}
    .lcfw-note{margin:0;min-height:16px;color:#fbbf24;font-size:11px}
    .lcfw-actions{display:flex;gap:8px;justify-content:flex-end}
    .lcfw-actions button{border:1px solid #334155;border-radius:5px;background:#111c2f;color:#e2e8f0;padding:7px 12px;cursor:pointer}
    .lcfw-primary{border-color:#0ea5e9;background:#0c4a6e;color:#e0f2fe}
  </style>`;
}
