import {
  createPreFeaPipingCheckRequest,
  runPreFeaPipingCheck,
} from '../../core/non-fea-common-checker/index.js';
import { buildCurrentPreFeaRequestInput } from '../non-fea-common-input-runtime.js';
import {
  createCalculationDefaultsObservability,
} from './non-fea-calculation-defaults-observability-model.js';
import {
  createCalculationEffectiveValuesInspection,
} from './non-fea-calculation-effective-values-model.js';

/**
 * Appends read-only inspection of exact current Common Input resolution
 * decisions plus Issue #1321 default-usage / checker-coverage observability.
 * One current request build feeds both surfaces. Failure never fabricates a
 * fallback winner, usage receipt or coverage decision.
 */
export function renderNonFeaCalculationEffectiveValuesInspector(container) {
  if (!container) throw new TypeError('Effective-value inspection requires a container.');
  const advanced = container.querySelector?.('[data-role="calculation-defaults-advanced"] .advanced-defaults');
  if (!advanced) return null;
  advanced.querySelector?.('[data-role="calculation-effective-values"]')?.remove();
  advanced.querySelector?.('[data-role="calculation-defaults-observability"]')?.remove();

  const state = currentInspectionState();
  const summary = advanced.querySelector?.('.advanced-defaults__summary');
  const markup = stateMarkup(state);
  if (summary?.insertAdjacentHTML) {
    summary.insertAdjacentHTML('afterend', markup);
  } else if (advanced.insertAdjacentHTML) {
    advanced.insertAdjacentHTML('afterbegin', markup);
  }
  return state;
}

export function currentCalculationEffectiveValuesInspection() {
  return currentInspectionState();
}

function currentInspectionState() {
  let current;
  let inspection;
  try {
    current = buildCurrentPreFeaRequestInput();
    inspection = createCalculationEffectiveValuesInspection(current.resolutionLedger);
  } catch (error) {
    return Object.freeze({
      state: 'UNAVAILABLE',
      inspection: null,
      observability: unavailable(error, 'CURRENT_EFFECTIVE_VALUES_UNAVAILABLE'),
      unavailableCode: error?.code || 'CURRENT_EFFECTIVE_VALUES_UNAVAILABLE',
      unavailableMessage: error instanceof Error ? error.message : String(error),
    });
  }

  let observability;
  try {
    const request = createPreFeaPipingCheckRequest(current);
    const report = runPreFeaPipingCheck(request);
    observability = Object.freeze({
      state: 'AVAILABLE',
      model: createCalculationDefaultsObservability({
        configuredDefaultUsageLedger: request.configuredDefaultUsageLedger,
        productDefaultProvider: current.productDefaultProvider,
        report,
      }),
      unavailableCode: null,
      unavailableMessage: null,
    });
  } catch (error) {
    observability = unavailable(error, 'CALCULATION_DEFAULTS_OBSERVABILITY_UNAVAILABLE');
  }

  return Object.freeze({
    state: 'AVAILABLE',
    inspection,
    observability,
    unavailableCode: null,
    unavailableMessage: null,
  });
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

  return `${effectiveValuesMarkup(state.inspection)}${observabilityMarkup(state.observability)}`;
}

function effectiveValuesMarkup(model) {
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

function observabilityMarkup(state) {
  if (state.state !== 'AVAILABLE') {
    return `<section class="scoped-defaults" data-role="calculation-defaults-observability" data-state="UNAVAILABLE">
      <header><div><span class="eyebrow">DEFAULT USAGE & COVERAGE</span><h4>Current Common Input observability</h4>
        <p>The canonical usage/checker evidence could not be built. No usage count, coverage percentage or exception state is inferred.</p></div><code>${escape(state.unavailableCode)}</code></header>
      <p class="defaults-note">${escape(state.unavailableMessage)}</p>
    </section>`;
  }
  const model = state.model;
  return `<section class="scoped-defaults" data-role="calculation-defaults-observability" data-state="AVAILABLE">
    <header><div><span class="eyebrow">DEFAULT USAGE & COVERAGE</span><h4>Current Common Input observability</h4>
      <p>Read-only summary from the existing configured-default usage ledger and canonical Common Input checker. The view does not rank defaults, determine coverage, seal inputs or execute calculation.</p></div><code>${escape(compact(model.bindings.checkerReportSemanticHash || model.semanticHash))}</code></header>
    <div class="advanced-defaults__summary">
      <article><span>Checker package</span><strong>${escape(model.package.state)}</strong><code>${escape(model.package.readyMethodCount)} ready · ${escape(model.package.blockedMethodCount)} blocked</code></article>
      <article><span>Configured-default selections</span><strong>${escape(model.configuredUsage.selectedTargetFieldCount)}</strong><code>${escape(model.configuredUsage.configuredDefaultCount)} defaults · ${escape(model.configuredUsage.receiptCount)} method receipts</code></article>
      <article><span>Product profile assumptions</span><strong>${escape(model.productUsage.appliedCount)}</strong><code>${escape(model.productUsage.shadowedCount)} shadowed by existing authority</code></article>
      <article><span>Requested coverage</span><strong>${escape(model.coverage.readyCount)} / ${escape(model.coverage.requestedCount)} ready</strong><code>${escape(model.coverage.incompleteCount)} incomplete</code></article>
      <article><span>Current checker exceptions</span><strong>${escape(model.exceptions.exceptionGroupCount)}</strong><code>${escape(model.exceptions.blockerReceiptCount)} method/blocker receipts</code></article>
    </div>
    ${defaultUsageMarkup(model)}
    ${coverageMarkup(model)}
    <p class="defaults-note">Configured-default selection counts are actual usage-ledger receipts after higher-authority resolution. Product-default counts are Project Data profile assumptions applied to otherwise-empty slots; they are intentionally not presented as target-level winners. Checker blockers shown here are pre-Run readiness exceptions, not post-calculation unallocated-load or equilibrium results.</p>
  </section>`;
}

function defaultUsageMarkup(model) {
  const configuredRows = model.configuredUsage.defaults.length
    ? model.configuredUsage.defaults.map((row) => `<tr><td><strong>${escape(row.defaultId)}</strong></td><td>${escape(row.fieldId)}</td><td>${escape(row.targetCount)}<small>${escape(listText(row.targetIds))}</small></td><td>${escape(row.methodCount)}<small>${escape(listText(row.methodIds))}</small></td><td>${escape(row.receiptCount)}</td></tr>`).join('')
    : '<tr><td colspan="5"><span class="panel-empty">No PROJECT_CONFIGURED_DEFAULT winner is present in the current usage ledger.</span></td></tr>';
  const productRows = model.productUsage.applied.length
    ? model.productUsage.applied.map((row) => `<tr><td><strong>${escape(row.defaultId)}</strong></td><td><code>${escape(row.projectDataPath)}</code></td><td>${escape(valueText(row.value))}</td><td>${escape(row.unit || '—')}</td><td>${escape(row.basis || 'No basis text')}</td></tr>`).join('')
    : '<tr><td colspan="5"><span class="panel-empty">No Product-default profile assumption is currently filling an empty Project Data slot.</span></td></tr>';
  return `<details class="advanced-authority" data-role="calculation-default-usage-summary">
    <summary><strong>Inspect default usage</strong><span>${escape(model.configuredUsage.selectedTargetFieldCount)} target-field selections · ${escape(model.productUsage.appliedCount)} Product profile assumptions</span></summary>
    <h4>Selected project configured defaults</h4>
    <div class="defaults-table-wrap"><table><thead><tr><th>Default</th><th>Field</th><th>Targets</th><th>Methods</th><th>Receipts</th></tr></thead><tbody>${configuredRows}</tbody></table></div>
    <h4>Applied Product-default profile assumptions</h4>
    <div class="defaults-table-wrap"><table><thead><tr><th>Default</th><th>Project Data path</th><th>Value</th><th>Unit</th><th>Basis</th></tr></thead><tbody>${productRows}</tbody></table></div>
  </details>`;
}

function coverageMarkup(model) {
  const coverageRows = model.coverage.rows.map((row) => `<tr data-coverage-requirement="${escape(row.requirementId)}" data-coverage-state="${escape(row.state)}"><td><strong>${escape(row.label)}</strong><code>${escape(row.requirementId)}</code></td><td>${escape(row.state)}</td><td>${row.present ? `${escape(row.covered)} / ${escape(row.total)}` : '—'}</td><td>${row.coveragePercent === null ? '—' : `${escape(row.coveragePercent)}%`}</td><td>${escape(row.missing.length)}<small>${escape(listText(row.missing))}</small></td><td>${escape(listText(row.methodIds))}</td></tr>`).join('');
  const exceptionRows = model.exceptions.rows.length
    ? model.exceptions.rows.map((row) => `<tr><td><strong>${escape(row.code)}</strong></td><td>${escape(row.path)}</td><td>${escape(row.message)}</td><td>${escape(listText(row.methodIds))}</td><td>${escape(row.occurrenceCount)}</td></tr>`).join('')
    : '<tr><td colspan="5"><span class="panel-empty">No current Common Input checker blockers.</span></td></tr>';
  return `<details class="advanced-authority" data-role="calculation-coverage-exception-summary">
    <summary><strong>Inspect coverage and readiness exceptions</strong><span>${escape(model.coverage.incompleteCount)} incomplete coverage areas · ${escape(model.exceptions.exceptionGroupCount)} exception groups</span></summary>
    <h4>Canonical checker coverage</h4>
    <div class="defaults-table-wrap"><table><thead><tr><th>Coverage</th><th>State</th><th>Covered</th><th>Coverage</th><th>Missing</th><th>Requested methods</th></tr></thead><tbody>${coverageRows}</tbody></table></div>
    <h4>Current checker blockers</h4>
    <div class="defaults-table-wrap"><table><thead><tr><th>Code</th><th>Path</th><th>Message</th><th>Methods</th><th>Receipts</th></tr></thead><tbody>${exceptionRows}</tbody></table></div>
  </details>`;
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

function unavailable(error, fallbackCode) {
  return Object.freeze({
    state: 'UNAVAILABLE',
    model: null,
    unavailableCode: error?.code || fallbackCode,
    unavailableMessage: error instanceof Error ? error.message : String(error),
  });
}
function listText(values) {
  return Array.isArray(values) && values.length ? values.join(', ') : '—';
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
