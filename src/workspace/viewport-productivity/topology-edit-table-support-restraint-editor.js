const FAMILIES = Object.freeze([
  'REST', 'HOLDOWN', 'GUIDE', 'LINE_STOP', 'LIMIT', 'CAN',
  'SPRING_WARNING', 'U_BOLT', 'SHOE', 'TRUNNION', 'HANGER',
  'SPRING_HANGER', 'ANCHOR',
]);
const DIRECTIONS = Object.freeze([
  '+X', '-X', '+Y', '-Y', '+Z', '-Z',
  'LOCAL_X', 'LOCAL_Y', 'LOCAL_Z', 'GLOBAL_VERTICAL',
]);

export function renderTopologyEditTableSupportRestraintEditor(row, stagedIntent) {
  if (row?.elementType !== 'SUPPORT' || row.identity?.canonicalKind !== 'SUPPORT') return '';
  const staged = stagedIntent?.intentKind === 'SUPPORT_RESTRAINT' ? stagedIntent : null;
  const family = staged?.requestedValue?.family ?? certifiedOption(FAMILIES, row.fields?.supportType);
  const direction = staged?.requestedValue?.direction ?? certifiedOption(DIRECTIONS, row.fields?.direction);
  const gapMm = staged?.requestedValue?.gapMm ?? row.fields?.gapMm ?? '';
  const travelMm = staged?.requestedValue?.travelMm ?? row.fields?.travelMm ?? '';
  return `<section class="topology-edit-table__editor" data-table-support-restraint-editor="${esc(row.identity.canonicalId)}">
    <div class="topology-edit-table__identity"><strong>Certified support restraint</strong><code>${esc(row.identity.canonicalId)}</code><span>UPDATE_SUPPORT_RESTRAINT</span></div>
    <p class="topology-edit-table__notice">Stage one explicit canonical restraint override. Imported restraint evidence is retained. Placement is edited separately through the certified same-host station editor; host rebinding remains unavailable.</p>
    <div class="topology-edit-table__editor-grid">
      <label>Family<select data-table-edit-support-family><option value="">Choose certified family…</option>${options(FAMILIES, family)}</select></label>
      <label>Direction<select data-table-edit-support-direction><option value="">None (ANCHOR only)</option>${options(DIRECTIONS, direction)}</select></label>
      <label>Gap (mm)<input type="number" min="0" step="any" data-table-edit-support-gap value="${esc(gapMm)}"></label>
      <label>Travel (mm)<input type="number" min="0" step="any" data-table-edit-support-travel value="${esc(travelMm)}"></label>
      <button type="button" data-table-support-restraint-stage data-canonical-id="${esc(row.identity.canonicalId)}">Stage support restraint</button>
    </div>
    <div class="topology-edit-table__custody"><span>Host ${esc(row.fields?.hostEntityId ?? '—')}</span><span>Station ${esc(row.fields?.stationMm ?? '—')}</span><span>Revision ${esc(shortHash(row.targetRevision))}</span></div>
  </section>`;
}

function options(values, selected) {
  return values.map((value) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${value}</option>`).join('');
}
function certifiedOption(values, value) {
  const token = String(value ?? '').trim().toUpperCase();
  return values.includes(token) ? token : '';
}
function shortHash(value) {
  const text = String(value ?? '');
  return text.length > 16 ? `${text.slice(0, 13)}…` : text;
}
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}
