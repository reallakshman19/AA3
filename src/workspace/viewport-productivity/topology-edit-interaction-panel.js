import { formatTopologyEditMm } from '../viewport-interaction/topology-edit-numeric-entry.js';

export function renderTopologyEditInteractionPanel(element, options = {}) {
  if (!element) throw new TypeError('Topology-edit interaction panel element is required.');
  element.innerHTML = topologyEditInteractionPanelMarkup(options);
}

export function topologyEditInteractionPanelMarkup({
  context = null,
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
            <option value="DELTA" selected>Move by ΔX / ΔY / ΔZ</option>
            <option value="ABSOLUTE">Set absolute X / Y / Z</option>
            <option value="MAGNITUDE">Move along one axis</option>
          </select>
        </label>
        <div class="topology-edit-interaction__xyz">
          ${numberInput('X (mm)', 'interaction-value-x', 0)}
          ${numberInput('Y (mm)', 'interaction-value-y', 0)}
          ${numberInput('Z (mm)', 'interaction-value-z', 0)}
        </div>
        <div class="topology-edit-interaction__magnitude">
          ${numberInput('Distance (mm)', 'interaction-magnitude', 0)}
          <label>Axis
            <select data-role="interaction-axis">
              <option value="X">X</option>
              <option value="Y">Y</option>
              <option value="Z">Z</option>
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
      ${previewMarkup(preview)}
      <div class="topology-edit-interaction__actions">
        <button type="button" data-action="apply-professional-interaction"${applicable ? '' : ' disabled'}>Apply move</button>
        <button type="button" data-action="cancel-professional-interaction"${preview ? '' : ' disabled'}>Cancel</button>
      </div>
      ${engineeringEvidence(context, preview, acceptance)}
    </div>`;
}

function previewMarkup(preview) {
  if (!preview) return '<p>No move preview is active.</p>';
  return `
    <section aria-label="Current move preview">
      <h4>Move preview</h4>
      <dl>
        ${summaryRow('Target X/Y/Z (mm)', pointText(preview.targetPosition))}
        ${summaryRow('Change ΔX/ΔY/ΔZ (mm)', pointText(preview.delta))}
      </dl>
    </section>`;
}

function engineeringEvidence(context, preview, acceptance) {
  return `
    <details data-role="interaction-engineering-evidence">
      <summary>Engineering evidence</summary>
      <dl>
        ${summaryRow('Canonical basis', context?.basisHash ?? '—')}
        ${summaryRow('Preview hash', preview?.previewHash ?? '—')}
        ${summaryRow('Intent hash', preview?.intentHash ?? '—')}
        ${summaryRow('Preview authority', preview?.authority ?? '—')}
        ${summaryRow('Preview pickable', preview ? String(preview.pickable) : '—')}
        ${summaryRow('Acceptance hash', acceptance?.acceptanceHash ?? '—')}
      </dl>
    </details>`;
}

function numberInput(label, role, value) {
  return `<label>${escapeHtml(label)}
    <input type="text" inputmode="decimal" autocomplete="off" data-role="${escapeHtml(role)}" value="${escapeHtml(formatTopologyEditMm(Number(value)))}">
  </label>`;
}
function nudgeButton(label, axis, sign) {
  return `<button type="button" data-action="nudge-professional-interaction" data-axis="${axis}" data-sign="${sign}">${label}</button>`;
}
function summaryRow(label, value) {
  return `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`;
}
function pointText(point) {
  return ['x', 'y', 'z'].map((key) => formatTopologyEditMm(Number(point?.[key] ?? 0))).join(', ');
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}
