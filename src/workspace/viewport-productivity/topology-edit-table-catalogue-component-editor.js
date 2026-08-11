export function renderTopologyEditTableCatalogueComponentEditor(row, stagedIntent) {
  if (!['FLANGE', 'REDUCER'].includes(row?.elementType)
    || row.identity?.canonicalKind !== 'EDGE') return '';
  const staged = stagedIntent?.intentKind === 'CATALOGUE_COMPONENT_REPLACEMENT'
    ? stagedIntent : null;
  const binding = staged?.requestedValue?.catalogueBinding ?? null;
  const json = binding ? JSON.stringify(binding, null, 2) : '';
  return `<section class="topology-edit-table__editor" data-table-fitting-catalogue-editor="${esc(row.identity.canonicalId)}">
    <div class="topology-edit-table__identity"><strong>Exact ${esc(row.elementType)} catalogue replacement</strong><code>${esc(row.identity.canonicalId)}</code><span>REPLACE_INLINE_COMPONENT</span></div>
    <p class="topology-edit-table__notice">Paste one exact ${esc(row.elementType)} catalogue record. Type, nominal sizes, end connections, piping class, and current node-to-node envelope must remain compatible. No coordinate movement is inferred.</p>
    <div class="topology-edit-table__editor-grid">
      <label class="topology-edit-table__wide">Exact catalogue JSON<textarea rows="8" spellcheck="false" data-table-edit-fitting-catalogue placeholder='{"catalogueHash":"…","sourceHash":"…","recordId":"…","recordHash":"…","componentType":"${esc(row.elementType)}","nominalSizeMm":100,"outsideDiameterMm":114.3,"pipingClass":"…","componentLengthMm":100,"endConnectionFrom":"…","endConnectionTo":"…","sourceReference":{"documentId":"…","revision":"…","path":"…"}}'>${esc(json)}</textarea></label>
      <button type="button" data-table-fitting-catalogue-stage data-canonical-id="${esc(row.identity.canonicalId)}">Stage exact ${esc(row.elementType)} replacement</button>
    </div>
    <div class="topology-edit-table__custody"><span>Current catalogue ${esc(row.custody?.catalogueAuthority ?? 'UNRESOLVED')}</span><span>Record ${esc(shortHash(row.custody?.catalogue?.recordHash))}</span><span>Revision ${esc(shortHash(row.targetRevision))}</span></div>
  </section>`;
}

function shortHash(value) {
  const text = String(value ?? '—');
  return text.length > 16 ? `${text.slice(0, 13)}…` : text;
}
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}
