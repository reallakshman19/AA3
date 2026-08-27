import { buildCurrentPreFeaRequestInput } from '../non-fea-common-input-runtime.js';
import {
  createCalculationEffectiveValuesInspection,
} from './non-fea-calculation-effective-values-model.js';

/**
 * Appends a read-only inspection of the exact current Common Input resolution
 * decisions to the existing Step-3 Advanced surface. Failure to build current
 * authority is disclosed as unavailable; it never fabricates a fallback winner.
 */
export function renderNonFeaCalculationEffectiveValuesInspector(container) {
  if (!container) throw new TypeError('Effective-value inspection requires a container.');
  const advanced = container.querySelector?.('[data-role="calculation-defaults-advanced"] .advanced-defaults');
  if (!advanced) return null;
  advanced.querySelector?.('[data-role="calculation-effective-values"]')?.remove();

  const state = currentInspectionState();
  const summary = advanced.querySelector?.('.advanced-defaults__summary');
  if (summary?.insertAdjacentHTML) {
    summary.insertAdjacentHTML('afterend', stateMarkup(state));
  } else if (advanced.insertAdjacentHTML) {
    advanced.insertAdjacentHTML('afterbegin', stateMarkup(state));
  }
  return state;
}

export function currentCalculationEffectiveValuesInspection() {
  return currentInspectionState();
}

function currentInspectionState() {
  try {
    const current = buildCurrentPreFeaRequestInput();
    const inspection = createCalculationEffectiveValuesInspection(current.resolutionLedger);
    return Object.freeze({
      state: 'AVAILABLE',
      inspection,
      unavailableCode: null,
      unavailableMessage: null,
    });
  } catch (error) {
    return Object.freeze({
      state: 'UNAVAILABLE',
      inspection: null,
      unavailableCode: error?.code || 'CURRENT_EFFECTIVE_VALUES_UNAVAILABLE',
      unavailableMessage: error instanceof Error ? error.message : String(error),
    });
  }
}

function stateMarkup(state) {
  if (state.state !== 'AVAILABLE') {
    return `<section class="scoped-defaults" data-role="calculation-effective-values" data-state="UNAVAILABLE">
      <header><div><span class="eyebrow">CURRENT EFFECTIVE VALUES</span><h4>Current resolver decisions</h4>
        <p>The current Common Input resolver is not available for inspection. No fallback value is inferred by this view.</p></div>
        <code>${escape(state.unavailableCode)}</code></header>
      <p class="defaults-note">${escape(state.unavailableMessage)}</p>
    </section>`;
  }

  const model = state.inspection;
  return `<section class="scoped-defaults" data-role="calculation-effective-values" data-state="AVAILABLE">
    <header><div><span class="eyebrow">CURRENT EFFECTIVE VALUES</span><h4>Current resolver decisions</h4>
      <p>Read-only projection of the exact current Common Input field-resolution ledger. This table does not resolve authority, approve data, seal inputs, or authorize Run.</p></div>
      <code>${escape(compact(model.sourceResolutionSemanticHash || model.semanticHash))}</code></header>
    <div class="advanced-defaults__summary">
      <article><span>Resolved decision rows</span><strong>${escape(model.summary.resolvedCount)} / ${escape(model.summary.rowCount)}</strong><code>${escape(model.sourceResolutionStatus || 'STATUS NOT DECLARED')}</code></article>
      <article><span>Higher-authority winners</span><strong>${escape(model.summary.sourceExplicitCount + model.summary.sourceInheritedCount + model.summary.exactMasterCount + model.summary.acceptedOverrideCount)}</strong><code>source / inherited / exact master / accepted override</code></article>
      <article><span>Project configured-default winners</span><strong>${escape(model.summary.projectConfiguredDefaultCount)}</strong><code>selected by existing Common Input resolver</code></article>
    </div>
    <details class="advanced-authority">
      <summary><strong>Inspect ${escape(model.summary.rowCount)} target-level resolution decisions</strong><span>Actual resolver winner, source and basis; candidate custody remains visible.</span></summary>
      <div class="defaults-table-wrap"><table data-role="calculation-effective-values-table">
        <thead><tr><th>Target</th><th>Field</th><th>Effective value</th><th>Unit</th><th>Effective authority</th><th>Source / revision</th><th>Basis</th></tr></thead>
        <tbody>${model.rows.length ? model.rows.map(rowMarkup).join('') : '<tr><td colspan="7"><span class="panel-empty">No target-level resolution decisions are present in the current resolver ledger.</span></td></tr>'}</tbody>
      </table></div>
      <p class="defaults-note">This is a decision ledger, not a duplicate of the complete source model. A field carried directly from source with no competing enrichment/default candidate may require no resolution row and is therefore not claimed here as a complete calculation-input inventory. Product-global screening assumptions remain in the versioned Product-default catalog below and are not relabelled as target-level winners.</p>
    </details>
  </section>`;
}

function rowMarkup(row) {
  const authority = row.effectiveAuthority || row.status;
  const source = [row.sourceId, row.revision].filter(Boolean).join(' · ') || 'NOT RESOLVED';
  const candidateNote = row.candidateCount > 1
    ? `${row.candidateCount} candidates: ${row.candidateAuthorities.join(', ')}`
    : `${row.candidateCount} candidate${row.candidateCount === 1 ? '' : 's'}`;
  const basis = row.basis || (row.status === 'RESOLVED' ? 'No basis text supplied by selected evidence' : 'No selected candidate');
  return `<tr data-effective-value-key="${escape(row.resolutionKey)}" data-resolution-status="${escape(row.status)}">
    <td><strong>${escape(row.targetId)}</strong><code>${escape(row.targetKind)}</code></td>
    <td>${escape(row.fieldLabel)}<code>${escape(row.fieldId)}</code></td>
    <td>${escape(valueText(row.value))}<small>${escape(candidateNote)}</small></td>
    <td>${escape(row.unit || '—')}</td>
    <td><span class="authority-chip" data-authority="${escape(authority)}">${escape(authority)}</span></td>
    <td>${escape(source)}${row.defaultId ? `<small>${escape(row.defaultId)}</small>` : ''}</td>
    <td>${escape(basis)}</td>
  </tr>`;
}

function valueText(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function compact(value) {
  const text = String(value || '');
  return text.length > 24 ? `${text.slice(0, 12)}…${text.slice(-8)}` : text;
}

function escape(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[character]);
}
