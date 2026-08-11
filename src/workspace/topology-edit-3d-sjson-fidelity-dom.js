/**
 * Stateless DOM helpers for the SJSON fidelity viewport controls.
 *
 * Extracted so topology-edit-3d-sjson-fidelity-controller.js stays inside the
 * 300 physical line budget. Every function here takes its host element as an
 * argument and retains nothing.
 */
export function publishSourceVisualCacheEvidence(host, status) {
  if (!host) return;
  host.dataset.topologyEditSjsonSourceVisualCache = status;
  host.dataset.topologyEditSourceVisualCache = status;
}

export function sjsonDisplayControlsMarkup() {
  return `
    <fieldset data-role="sjson-display-controls" aria-label="SJSON node and camera controls">
      <legend>SJSON viewport</legend>
      <label>Node radius (mm)
        <input type="range" min="1" max="12" step="0.5" value="4.2" data-role="sjson-node-radius-mm">
      </label>
      <label><input type="checkbox" checked data-role="sjson-camera-auto-clipping"> Auto camera clipping</label>
      <label>Near (mm) <input type="number" min="0.001" step="any" value="0.1" data-role="sjson-camera-near-mm"></label>
      <label>Far (mm) <input type="number" min="1" step="any" value="1000000" data-role="sjson-camera-far-mm"></label>
      <button type="button" data-action="apply-sjson-display-controls">Apply viewport settings</button>
      <output data-role="sjson-display-control-status" aria-live="polite"></output>
    </fieldset>`;
}

export function finiteInput(host, role) {
  const value = Number(host.querySelector(`[data-role="${role}"]`)?.value);
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${role} requires a positive finite number.`);
  }
  return value;
}

export function setInput(host, role, value) {
  const input = host.querySelector(`[data-role="${role}"]`);
  if (input && Number.isFinite(Number(value))) input.value = String(value);
}

export function setChecked(host, role, checked) {
  const input = host.querySelector(`[data-role="${role}"]`);
  if (input) input.checked = Boolean(checked);
}

export function setOutput(host, text) {
  const output = host.querySelector('[data-role="sjson-display-control-status"]');
  if (output) output.textContent = text;
}
