import {
  deriveTopologyEditTableSupportPlacementCapability,
} from '../topology-edit/table/topology-edit-table-edit-capability.js';

export function renderTopologyEditTableSupportPlacementEditor(row, stagedIntent, runtime) {
  if (row?.elementType !== 'SUPPORT' || row.identity?.canonicalKind !== 'SUPPORT') return '';
  const topology = runtime?.controller?.session?.currentTopology?.();
  const capability = deriveTopologyEditTableSupportPlacementCapability({
    row,
    projection: runtime?.projection,
    canonicalTopology: topology,
  });
  const staged = stagedIntent?.intentKind === 'SUPPORT_PLACEMENT' ? stagedIntent : null;
  const details = capability.details ?? {};
  const stationMm = staged?.requestedValue?.stationMm ?? details.currentStationMm ?? '';
  const disabled = capability.status !== 'NEEDS_INPUT';
  const bounds = Number.isFinite(details.hostLengthMm)
    ? `0–${format(details.hostLengthMm)} mm from host FROM`
    : 'No certified station range';
  return `<section class="topology-edit-table__editor" data-table-support-placement-editor="${esc(row.identity.canonicalId)}" data-table-support-placement-status="${esc(capability.status)}" data-table-support-placement-reason="${esc(capability.reasonCode)}">
    <div class="topology-edit-table__identity"><strong>Certified support placement</strong><code>${esc(row.identity.canonicalId)}</code><span>UPDATE_SUPPORT_PLACEMENT</span></div>
    <p class="topology-edit-table__notice">Relocate only along the same exact straight host. Host rebinding, free XYZ motion, and automatic support-follow remain unavailable.</p>
    <div class="topology-edit-table__editor-grid">
      <label>Station from host FROM (mm)<input type="number" min="0" ${Number.isFinite(details.hostLengthMm) ? `max="${esc(details.hostLengthMm)}"` : ''} step="any" data-table-edit-support-station value="${esc(stationMm)}" ${disabled ? 'disabled' : ''}></label>
      <button type="button" data-table-support-placement-stage data-canonical-id="${esc(row.identity.canonicalId)}" ${disabled ? 'disabled' : ''}>Stage support station</button>
    </div>
    <div class="topology-edit-table__custody"><span>Host ${esc(details.hostEntityId ?? row.fields?.hostEntityId ?? '—')}</span><span>Canonical edge ${esc(details.hostEdgeId ?? '—')}</span><span>${esc(bounds)}</span><span>Basis ${esc(details.stationAuthority ?? 'UNRESOLVED')}</span></div>
    <p class="topology-edit-table__notice" data-table-support-placement-message>${esc(capability.reason)}</p>
  </section>`;
}

function format(value) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
}
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}
