import { formatTopologyEditMm } from '../viewport-interaction/topology-edit-numeric-entry.js';

export function renderTopologyEditInteractionPanel(element, options = {}) {
  if (!element) throw new TypeError('Topology-edit interaction panel element is required.');
  element.innerHTML = topologyEditInteractionPanelMarkup(options);
}

export function updateTopologyEditInteractionPanelState(element, options = {}) {
  if (!element) return;
  const preview = options.preview ?? null;
  const previewHost = element.querySelector('[data-role="interaction-preview-state"]');
  if (previewHost) previewHost.innerHTML = previewMarkup(preview);
  const apply = element.querySelector('[data-action="apply-professional-interaction"]');
  const cancel = element.querySelector('[data-action="cancel-professional-interaction"]');
  if (apply) apply.disabled = !preview?.canApply;
  if (cancel) cancel.disabled = !preview;
  const evidence = element.querySelector('[data-role="interaction-engineering-evidence"]');
  if (evidence) evidence.innerHTML = engineeringEvidenceContents(
    options.context,
    preview,
    options.acceptance,
  );
}

export function readTopologyEditInteractionValues(element, fallback = {}) {
  const value = (role, defaultValue) => element?.querySelector(`[data-role="${role}"]`)?.value
    ?? fallback[defaultValue];
  return Object.freeze({
    entryMode: value('interaction-entry-mode', 'entryMode') ?? 'DELTA',
    x: value('interaction-value-x', 'x') ?? '0',
    y: value('interaction-value-y', 'y') ?? '0',
    z: value('interaction-value-z', 'z') ?? '0',
    magnitude: value('interaction-magnitude', 'magnitude') ?? '0',
    axis: value('interaction-axis', 'axis') ?? 'X',
  });
}

export function topologyEditInteractionModeValues(context, mode = 'DELTA') {
  const entryMode = String(mode || 'DELTA').toUpperCase();
  const anchor = context?.anchorPosition ?? { x: 0, y: 0, z: 0 };
  return Object.freeze({
    entryMode,
    x: entryMode === 'ABSOLUTE' ? String(anchor.x) : '0',
    y: entryMode === 'ABSOLUTE' ? String(anchor.y) : '0',
    z: entryMode === 'ABSOLUTE' ? String(anchor.z) : '0',
    magnitude: '0',
    axis: 'X',
  });
}

export function topologyEditInteractionPanelMarkup({
  context = null,
  values = topologyEditInteractionModeValues(context),
  preview = null,
  acceptance = null,
  error = null,
  nudgeIncrementMm = 1,
} = {}) {
  const selected = Boolean(context?.nodeId);
  const applicable = Boolean(preview?.canApply);
  const anchor = context?.anchorPosition ?? { x: 0, y: 0, z: 0 };
  return `
    <header class="topology-edit-interaction__header">
      <strong>Move selected node</strong>
      <span title="The visible ghost is transient. Apply delegates to the existing certified MOVE_NODE journal path.">ⓘ</span>
    </header>
    <div class="topology-edit-interaction__body" data-role="topology-edit-contextual-move">
      ${error ? `<p role="alert"><strong>Move blocked:</strong> ${escapeHtml(error)}</p>` : ''}
      <p>${selected
        ? `Editing <strong>${escapeHtml(context.nodeId)}</strong>. Change engineering values or use the nudge controls; the ghost preview does not modify canonical topology.`
        : 'Select one node or visible endpoint in the model to edit its position.'}</p>
      <dl class="topology-edit-interaction__summary">
        ${summaryRow('Selected node', context?.nodeId ?? 'None')}
        ${summaryRow('Current X/Y/Z (mm)', pointText(anchor))}
      </dl>
      <fieldset${selected ? '' : ' disabled'}>
        <legend>Position</legend>
        <label>How to move
          <select data-role="interaction-entry-mode">
            ${option('DELTA', 'Move by ΔX / ΔY / ΔZ', values.entryMode)}
            ${option('ABSOLUTE', 'Set absolute X / Y / Z', values.entryMode)}
            ${option('MAGNITUDE', 'Move along one axis', values.entryMode)}
          </select>
        </label>
        <div class="topology-edit-interaction__xyz">
          ${numberInput('X (mm)', 'interaction-value-x', values.x)}
          ${numberInput('Y (mm)', 'interaction-value-y', values.y)}
          ${numberInput('Z (mm)', 'interaction-value-z', values.z)}
        </div>
        <div class="topology-edit-interaction__magnitude">
          ${numberInput('Distance (mm)', 'interaction-magnitude', values.magnitude)}
          <label>Axis
            <select data-role="interaction-axis">
              ${option('X', 'X', values.axis)}${option('Y', 'Y', values.axis)}${option('Z', 'Z', values.axis)}
            </select>
          </label>
        </div>
        <p class="topology-edit-interaction__hint">Committed value changes refresh the ghost automatically. Use Preview only to refresh explicitly.</p>
        <button type="button" data-action="preview-professional-interaction">Preview</button>
      </fieldset>
      <fieldset${selected ? '' : ' disabled'}>
        <legend>Quick nudge</legend>
        ${numberInput('Increment (mm)', 'interaction-nudge-increment', nudgeIncrementMm)}
        <div class="topology-edit-interaction__nudges" role="group" aria-label="Node nudge controls">
          ${nudgeButton('−X', 'X', -1)}${nudgeButton('+X', 'X', 1)}
          ${nudgeButton('−Y', 'Y', -1)}${nudgeButton('+Y', 'Y', 1)}
          ${nudgeButton('−Z', 'Z', -1)}${nudgeButton('+Z', 'Z', 1)}
        </div>
        <p class="topology-edit-interaction__hint">Arrow keys nudge X/Y, Page Down/Page Up nudges Z, Shift = 10×. Escape cancels the preview; Enter applies it.</p>
      </fieldset>
      <div data-role="interaction-preview-state">${previewMarkup(preview)}</div>
      <div class="topology-edit-interaction__actions">
        <button type="button" data-action="apply-professional-interaction"${applicable ? '' : ' disabled'}>Apply move</button>
        <button type="button" data-action="cancel-professional-interaction"${preview ? '' : ' disabled'}>Cancel</button>
      </div>
      <details data-role="interaction-engineering-evidence">${engineeringEvidenceContents(context, preview, acceptance)}</details>
    </div>`;
}

function previewMarkup(preview) {
  if (!preview) return '<p>No move preview is active.</p>';
  return `<section aria-label="Current move preview"><h4>Move preview</h4><dl>
    ${summaryRow('Target X/Y/Z (mm)', pointText(preview.targetPosition))}
    ${summaryRow('Change ΔX/ΔY/ΔZ (mm)', pointText(preview.delta))}
  </dl></section>`;
}

function engineeringEvidenceContents(context, preview, acceptance) {
  return `<summary>Engineering evidence</summary><dl>
    ${summaryRow('Canonical basis', context?.basisHash ?? '—')}
    ${summaryRow('Preview hash', preview?.previewHash ?? '—')}
    ${summaryRow('Intent hash', preview?.intentHash ?? '—')}
    ${summaryRow('Preview authority', preview?.authority ?? '—')}
    ${summaryRow('Preview pickable', preview ? String(preview.pickable) : '—')}
    ${summaryRow('Acceptance hash', acceptance?.acceptanceHash ?? '—')}
  </dl>`;
}

function numberInput(label, role, value) {
  const number = Number(value);
  const display = Number.isFinite(number) ? formatTopologyEditMm(number) : String(value ?? '');
  return `<label>${escapeHtml(label)}<input type="text" inputmode="decimal" autocomplete="off" data-role="${escapeHtml(role)}" value="${escapeHtml(display)}"></label>`;
}
function option(value, label, selected) {
  return `<option value="${value}"${value === selected ? ' selected' : ''}>${escapeHtml(label)}</option>`;
}
function nudgeButton(label, axis, sign) {
  return `<button type="button" data-action="nudge-professional-interaction" data-axis="${axis}" data-sign="${sign}">${label}</button>`;
}
function summaryRow(label, value) { return `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`; }
function pointText(point) {
  return ['x', 'y', 'z'].map((key) => formatTopologyEditMm(Number(point?.[key] ?? 0))).join(', ');
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}
