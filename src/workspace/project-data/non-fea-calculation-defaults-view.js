import { semanticHash } from '../../core/shared-piping-model/canonical-json.js';
import { projectDataStore } from './project-data-store.js';
import { renderNonFeaProjectDataViewV2 } from './non-fea-project-data-view-v2.js';
import {
  createBasicCalculationDefaultReset,
  createBasicCalculationDefaultUpdate,
  createBasicCalculationDefaultsModel,
  listCalculationProductDefaults,
} from './non-fea-calculation-defaults-model.js';
import { LOAD_CALC_STANDARD_DEFAULTS_V1 } from './non-fea-product-default-profile.js';

/**
 * Normal Load Calc Step-3 surface. Basic defaults are intentionally narrow and
 * path-level; the complete Project Data editor remains available behind the
 * Advanced authority drawer rather than dominating the routine workflow.
 */
export function renderNonFeaCalculationDefaultsView(container, onChanged) {
  if (!container) throw new TypeError('Calculation Defaults requires a container.');
  projectDataStore.applyProductDefaults();
  const profile = projectDataStore.getProfile();
  const model = createBasicCalculationDefaultsModel(profile);
  container.innerHTML = `${styles()}${markup(profile, model)}`;
  bindBasicActions(container, onChanged);
  bindAdvancedAuthority(container, onChanged);
}

function markup(profile, model) {
  const policyEntry = profile?.qualificationPolicy?.configuredDefaults;
  const configuredCount = Array.isArray(policyEntry?.value?.defaults)
    ? policyEntry.value.defaults.length : 0;
  const productRows = listCalculationProductDefaults();
  const productHash = semanticHash(LOAD_CALC_STANDARD_DEFAULTS_V1);
  return `<section class="calculation-defaults" data-role="non-fea-calculation-defaults">
    <header class="calculation-defaults__header">
      <div><span class="eyebrow">STEP 3 · LOAD CALC</span><h2>Calculation Defaults</h2>
        <p>Review the screening assumptions that Load Calc will use when higher-authority source, master or project values are absent. Defaults remain visible assumptions; they never become source evidence.</p></div>
      <div class="calculation-defaults__identity"><span>Project revision ${escape(profile.revision)}</span><code>${escape(projectDataStore.getSemanticHash())}</code></div>
    </header>

    <section class="calculation-defaults__rule"><strong>Authority order:</strong> source / inherited / exact master / derivation remain above project and Product defaults. Basic editing can replace a governed Product default or a prior Basic project default; it cannot overwrite independent higher authority. Reset removes only a Basic-owned project override so the governed Product default can re-apply.</section>

    <section class="defaults-panel" data-role="calculation-defaults-basic">
      <header><div><span class="eyebrow">BASIC</span><h3>Normal screening defaults</h3></div><span>${model.rows.length} settings</span></header>
      <div class="defaults-table-wrap"><table>
        <thead><tr><th>Setting</th><th>Value</th><th>Unit</th><th>Scope</th><th>Effective authority</th><th>Basis</th><th>Reset</th></tr></thead>
        <tbody>${model.rows.map(rowMarkup).join('')}</tbody>
      </table></div>
      <p class="defaults-note">Length unit and vertical-axis choices are intentionally limited to the currently qualified Load Calc basis. Unsupported conventions are not exposed as if the mechanics already implement them. If a row is protected by higher authority or contains additional keyed values, use Advanced authority editing rather than overwriting its custody.</p>
    </section>

    <details class="defaults-panel defaults-panel--advanced" data-role="calculation-defaults-advanced">
      <summary><div><span class="eyebrow">ADVANCED</span><strong>Advanced defaults and authority</strong></div><span>${configuredCount} scoped project defaults · ${productRows.length} Product defaults</span></summary>
      <div class="advanced-defaults">
        <section class="advanced-defaults__summary">
          <article><span>Product profile</span><strong>${escape(LOAD_CALC_STANDARD_DEFAULTS_V1.profileId)}@${escape(LOAD_CALC_STANDARD_DEFAULTS_V1.version)}</strong><code>${escape(compact(productHash))}</code></article>
          <article><span>Scoped project defaults</span><strong>${configuredCount}</strong><code>${escape(policyEntry?.approved === true ? 'APPROVED POLICY' : policyEntry?.value ? 'REVIEW' : 'NOT CONFIGURED')}</code></article>
          <article><span>Scope editor</span><strong>D2 successor</strong><code>Existing raw policy editor retained below</code></article>
        </section>
        <section class="product-default-catalog"><h4>Built-in Product-default profile</h4><p>Read-only catalog. Each row is versioned and semantic-hash bound; project/source authority may shadow it without modifying this catalog.</p>
          <div class="defaults-table-wrap"><table><thead><tr><th>ID</th><th>Project Data path</th><th>Value</th><th>Unit</th><th>Basis</th><th>Hash</th></tr></thead><tbody>${productRows.map((row) => `<tr><td><strong>${escape(row.defaultId)}</strong></td><td><code>${escape(row.projectDataPath)}</code></td><td>${escape(valueText(row.value))}</td><td>${escape(row.unit)}</td><td>${escape(row.basis)}</td><td><code>${escape(compact(row.semanticHash))}</code></td></tr>`).join('')}</tbody></table></div>
        </section>
        <details class="advanced-authority" data-role="calculation-defaults-authority-drawer">
          <summary><strong>Open full Project Data / configured-default authority editor</strong><span>Advanced evidence, approvals, raw configured-default policy and ownership matrix</span></summary>
          <div data-calculation-defaults-authority-host></div>
        </details>
      </div>
    </details>
  </section>`;
}

function rowMarkup(row) {
  const editTitle = row.editable ? 'Apply project screening default' : row.editBlockedReason;
  return `<tr data-calculation-default-row="${escape(row.fieldId)}" data-editable="${row.editable ? 'true' : 'false'}">
    <td><strong>${escape(row.label)}</strong><code>${escape(row.projectDataPath)}</code></td>
    <td><div class="value-editor">${inputMarkup(row)}<button type="button" data-default-apply="${escape(row.fieldId)}" ${row.editable ? '' : 'disabled'} title="${escape(editTitle || '')}">Apply</button></div>${row.editBlockedReason ? `<small class="authority-note">${escape(row.editBlockedReason)}</small>` : ''}</td>
    <td>${escape(row.unit)}</td>
    <td><span class="scope-chip">PROJECT GLOBAL</span></td>
    <td>${authorityMarkup(row)}</td>
    <td><span title="${escape(row.basis || row.builtInBasis || 'No basis available')}">${escape(row.basis || row.builtInBasis || 'NOT AVAILABLE')}</span></td>
    <td><button type="button" data-default-reset="${escape(row.fieldId)}" ${row.resetAvailable ? '' : 'disabled'} title="${row.resetAvailable ? 'Remove Basic-owned project override and restore governed Product default' : 'No Basic-owned project override is safe to reset'}">Reset</button></td>
  </tr>`;
}

function inputMarkup(row) {
  if (row.kind === 'choice') {
    return `<select data-default-input="${escape(row.fieldId)}" ${row.editable ? '' : 'disabled'}>${row.options.map((option) => `<option value="${escape(option)}" ${row.value === option ? 'selected' : ''}>${escape(option)}</option>`).join('')}</select>`;
  }
  if (row.kind === 'case-set') {
    return `<div class="case-set">${row.options.map((option) => `<label><input type="checkbox" data-default-case="${escape(row.fieldId)}" value="${escape(option)}" ${row.value?.includes?.(option) ? 'checked' : ''} ${row.editable ? '' : 'disabled'}>${escape(option)}</label>`).join('')}</div>`;
  }
  if (row.kind === 'elastic-thermal') {
    return `<div class="paired-input"><label>E <input type="number" step="any" data-default-elastic="${escape(row.fieldId)}" value="${escape(row.value?.elasticModulusPa ?? '')}" ${row.editable ? '' : 'disabled'}></label><label>α <input type="number" step="any" data-default-alpha="${escape(row.fieldId)}" value="${escape(row.value?.thermalExpansionPerK ?? '')}" ${row.editable ? '' : 'disabled'}></label></div>`;
  }
  return `<input type="number" step="any" data-default-input="${escape(row.fieldId)}" value="${escape(row.value ?? '')}" ${row.editable ? '' : 'disabled'}>`;
}

function authorityMarkup(row) {
  const detail = row.defaultId
    ? `${row.defaultId}${row.productProfileId ? ` · ${row.productProfileId}@${row.productProfileVersion}` : ''}`
    : row.source || '';
  return `<span class="authority-chip" data-authority="${escape(row.effectiveAuthority)}">${escape(row.effectiveAuthority)}</span>${detail ? `<small>${escape(detail)}</small>` : ''}`;
}

function bindBasicActions(container, onChanged) {
  container.addEventListener('click', (event) => {
    const apply = event.target.closest('[data-default-apply]');
    const reset = event.target.closest('[data-default-reset]');
    if (!apply && !reset) return;
    const fieldId = apply?.dataset.defaultApply || reset?.dataset.defaultReset;
    try {
      const profile = projectDataStore.getProfile();
      const plan = apply
        ? createBasicCalculationDefaultUpdate(profile, fieldId, readInput(container, fieldId))
        : createBasicCalculationDefaultReset(profile, fieldId);
      projectDataStore.update(plan.projectDataPath, plan.value, plan.evidence, plan.approved);
      refresh(container, onChanged);
    } catch (error) {
      const row = container.querySelector(`[data-calculation-default-row="${cssEscape(fieldId)}"]`);
      const message = error instanceof Error ? error.message : String(error);
      row?.setAttribute('data-error', message);
      const firstInput = row?.querySelector('input,select');
      firstInput?.setCustomValidity(message);
      firstInput?.reportValidity();
    }
  });
}

function bindAdvancedAuthority(container, onChanged) {
  const drawer = container.querySelector('[data-role="calculation-defaults-authority-drawer"]');
  if (!drawer) return;
  let rendered = false;
  drawer.addEventListener('toggle', () => {
    if (!drawer.open || rendered) return;
    const host = drawer.querySelector('[data-calculation-defaults-authority-host]');
    renderNonFeaProjectDataViewV2(host, () => refresh(container, onChanged));
    rendered = true;
  });
}

function readInput(container, fieldId) {
  const row = container.querySelector(`[data-calculation-default-row="${cssEscape(fieldId)}"]`);
  if (!row) throw new RangeError(`Missing Calculation Default row: ${fieldId}.`);
  const cases = [...row.querySelectorAll('[data-default-case]')];
  if (cases.length) return cases.filter((input) => input.checked).map((input) => input.value);
  const elastic = row.querySelector('[data-default-elastic]');
  const alpha = row.querySelector('[data-default-alpha]');
  if (elastic || alpha) return {
    elasticModulusPa: elastic?.value,
    thermalExpansionPerK: alpha?.value,
  };
  return row.querySelector('[data-default-input]')?.value;
}

function refresh(container, onChanged) {
  if (typeof onChanged === 'function') onChanged();
  else renderNonFeaCalculationDefaultsView(container, onChanged);
}
function valueText(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
function compact(value) {
  const text = String(value || '');
  return text.length > 24 ? `${text.slice(0, 12)}…${text.slice(-8)}` : text;
}
function cssEscape(value) { return globalThis.CSS?.escape ? CSS.escape(value) : String(value).replace(/[.]/g, '\\.'); }
function escape(value) { return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]); }
function styles() {
  return `<style>
    .calculation-defaults{height:100%;overflow:auto;padding:16px;box-sizing:border-box;background:#07101e;color:#e2e8f0}.calculation-defaults__header{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.calculation-defaults h2,.calculation-defaults h3,.calculation-defaults h4{margin:4px 0}.calculation-defaults p{color:#94a3b8}.calculation-defaults__identity{display:flex;flex-direction:column;gap:4px;max-width:380px;text-align:right}.calculation-defaults__identity code{color:#64748b;overflow-wrap:anywhere}.eyebrow{display:block;color:#38bdf8;font-size:10px;font-weight:800;letter-spacing:.1em}.calculation-defaults__rule{margin:12px 0;padding:10px 12px;border:1px solid #155e75;border-radius:6px;background:#082f49;color:#bae6fd}.defaults-panel{margin-top:10px;border:1px solid #334155;border-radius:7px;background:#0b1424;overflow:hidden}.defaults-panel>header{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:12px}.defaults-table-wrap{overflow:auto}.calculation-defaults table{width:100%;border-collapse:collapse}.calculation-defaults th,.calculation-defaults td{padding:8px;text-align:left;vertical-align:top;border-top:1px solid #223047}.calculation-defaults th{color:#7dd3fc;font-size:10px;text-transform:uppercase}.calculation-defaults td>code{display:block;margin-top:3px;color:#64748b;font-size:9px}.calculation-defaults input,.calculation-defaults select,.calculation-defaults button{background:#07101e;color:#e2e8f0;border:1px solid #475569;border-radius:4px;padding:6px}.calculation-defaults input[type="number"]{width:130px}.value-editor{display:flex;gap:6px;align-items:flex-start;flex-wrap:wrap}.case-set{display:flex;gap:8px;flex-wrap:wrap}.case-set label,.paired-input label{display:flex;align-items:center;gap:4px}.paired-input{display:flex;gap:7px;flex-wrap:wrap}.scope-chip,.authority-chip{display:inline-block;padding:3px 7px;border:1px solid #475569;border-radius:999px;font-size:9px}.authority-chip[data-authority="PRODUCT_DEFAULT"]{color:#7dd3fc;border-color:#155e75}.authority-chip[data-authority="PROJECT_POLICY"]{color:#4ade80;border-color:#166534}.calculation-defaults td small{display:block;margin-top:3px;color:#64748b}.authority-note{max-width:320px}.calculation-defaults button:disabled,.calculation-defaults input:disabled,.calculation-defaults select:disabled{opacity:.5;cursor:not-allowed}.defaults-note{padding:0 12px 10px;font-size:11px}.defaults-panel--advanced>summary,.advanced-authority>summary{display:flex;justify-content:space-between;gap:12px;padding:12px;cursor:pointer}.advanced-defaults{padding:0 12px 12px}.advanced-defaults__summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.advanced-defaults__summary article{padding:9px;border:1px solid #293548;border-radius:5px}.advanced-defaults__summary span,.advanced-defaults__summary code{display:block;color:#64748b;font-size:10px}.product-default-catalog,.advanced-authority{margin-top:10px;border:1px solid #293548;border-radius:6px;padding:10px}.advanced-authority{padding:0;overflow:hidden}.advanced-authority>summary span{color:#64748b;font-size:10px}.advanced-authority [data-calculation-defaults-authority-host]{min-height:120px}.calculation-defaults [data-error]{outline:1px solid #dc2626}@media(max-width:1000px){.advanced-defaults__summary{grid-template-columns:1fr}.calculation-defaults__header{flex-direction:column}.calculation-defaults__identity{text-align:left}}
  </style>`;
}
