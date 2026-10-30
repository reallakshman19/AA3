/**
 * ACCDB workspace-coordinate corrections. Never writes the binary ACCDB.
 * All changed raw cells are applied to detached INPUT_* tables BEFORE the
 * existing ACCDB canonical importer and governed pre-flight run again.
 *
 * A node has potentially many INPUT_NODAL_COORDINATES appearances. Updating
 * just one creates a contradictory source, so edits are atomic across every
 * appearance and every attached element's declared DELTA. Unrelated rows and
 * cells are left as imported. Derived/discretized node IDs are not accepted.
 */
export const ACCDB_COORDINATE_EDIT_SCHEMA = 'lfea-accdb-coordinate-edit/v1';
export const ACCDB_COORDINATE_DRAFT_SCHEMA = 'lfea-accdb-coordinate-draft/v1';
export const ACCDB_COORDINATE_AXES = Object.freeze(['X', 'Y', 'Z']);

const LENGTH_TOKENS = Object.freeze({
  'MM': 'mm', 'MM.': 'mm', 'CM': 'cm', 'CM.': 'cm', 'M': 'm', 'M.': 'm',
  'IN': 'in', 'IN.': 'in', 'INCH': 'in', 'FT': 'ft', 'FT.': 'ft',
});

function nodeId(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? String(parsed) : raw;
}

function requireFinite(value, label) {
  if (typeof value === 'string' && !value.trim()) {
    throw new TypeError(label + ' must contain a number.');
  }
  const number = Number(value);
  if (!Number.isFinite(number) || value === null || value === undefined) {
    throw new TypeError(label + ' must be a finite number.');
  }
  return number;
}

function declaredUnit(tables) {
  const units = tables?.INPUT_UNITS?.rows;
  if (!Array.isArray(units) || units.length !== 1) {
    throw new TypeError('ACCDB correction requires exactly one INPUT_UNITS row.');
  }
  const token = String(units[0].LENGTH ?? '').trim().toUpperCase();
  const unit = LENGTH_TOKENS[token];
  if (!unit) throw new TypeError('Unsupported INPUT_UNITS.LENGTH: ' + token);
  return unit;
}

/** The independent revision and exact source token prevent stale UI/draft edits. */
export function previewAccdbNodeCoordinateEdit(tables, request) {
  if (!request || typeof request !== 'object') throw new TypeError('A coordinate edit is required.');
  const rows = tables?.INPUT_NODAL_COORDINATES?.rows;
  const elements = tables?.INPUT_BASIC_ELEMENT_DATA?.rows;
  if (!Array.isArray(rows) || !Array.isArray(elements)) {
    throw new TypeError('Coordinate corrections require source INPUT_NODAL_COORDINATES and INPUT_BASIC_ELEMENT_DATA.');
  }
  if (!Number.isSafeInteger(request.revision) || request.revision < 0
      || request.expectedRevision !== request.revision) {
    throw new TypeError('Stale ACCDB draft revision. Refresh the model before editing.');
  }
  const sourceIdentity = String(request.sourceIdentity ?? '');
  if (!sourceIdentity || sourceIdentity !== request.expectedSourceIdentity) {
    throw new TypeError('ACCDB source identity mismatch. Reload the original source.');
  }
  const unit = declaredUnit(tables);
  if (String(request.unit ?? '').trim().toLowerCase() !== unit) {
    throw new TypeError('Coordinate unit must match the source INPUT_UNITS.LENGTH (' + unit + ').');
  }
  const axis = String(request.axis ?? '').trim().toUpperCase();
  if (!ACCDB_COORDINATE_AXES.includes(axis)) {
    throw new TypeError('Coordinate axis must be X, Y or Z.');
  }
  const id = nodeId(request.nodeId);
  if (!id) throw new TypeError('Select a source ACCDB node.');
  const rawValue = requireFinite(request.value, 'Coordinate');
  // The source ACCDB node coordinates are IEEE754 REAL fields. A workspace
  // override preserves that precision contract instead of fabricating exact
  // double-precision coordinates the source could not represent.
  const roundedValue = Math.fround(rawValue);
  if (!Number.isFinite(roundedValue)) throw new TypeError('Coordinate is outside the source FLOAT32 range.');

  const appearances = [];
  for (let index = 0; index < rows.length; index += 1) {
    for (const side of ['FROM', 'TO']) {
      if (nodeId(rows[index][side + '_NODE']) === id) {
        const field = side + '_NODE_' + axis;
        appearances.push({ index, field, value: requireFinite(rows[index][field], 'Existing ' + field) });
      }
    }
  }
  if (!appearances.length) {
    throw new TypeError('Node ' + id + ' has no source INPUT_NODAL_COORDINATES locator; derived nodes are read-only.');
  }
  const before = appearances[0].value;
  if (appearances.some((item) => Math.abs(item.value - before) > Math.max(1e-6, Math.abs(before) * 1e-6))) {
    throw new TypeError('Node ' + id + ' has inconsistent source coordinates; do not guess which is authoritative.');
  }
  if (Object.is(before, roundedValue) || before === roundedValue) {
    return Object.freeze({
      schema: ACCDB_COORDINATE_EDIT_SCHEMA, changed: false, nodeId: id, axis, unit,
      before, after: roundedValue, sourceIdentity, revision: request.revision,
      tables, changes: Object.freeze([]), affectedElementIds: Object.freeze([]),
      quantized: rawValue !== roundedValue,
    });
  }

  const coordinateRows = rows.map((row) => ({ ...row }));
  const changes = appearances.map((entry) => {
    coordinateRows[entry.index][entry.field] = roundedValue;
    return Object.freeze({
      table: 'INPUT_NODAL_COORDINATES', row: entry.index, field: entry.field,
      before: entry.value, after: roundedValue,
    });
  });
  const elementRows = elements.map((row) => ({ ...row }));
  const affectedElementIds = [];
  const positions = new Map();
  for (const row of coordinateRows) {
    for (const side of ['FROM', 'TO']) {
      const key = nodeId(row[side + '_NODE']);
      if (!key) continue;
      const position = ACCDB_COORDINATE_AXES.map((letter) =>
        requireFinite(row[side + '_NODE_' + letter], 'Node ' + key + ' ' + letter));
      const prior = positions.get(key);
      if (prior && position.some((value, index) => Math.abs(value - prior[index]) > Math.max(1e-6, Math.abs(prior[index]) * 1e-6))) {
        throw new TypeError('Node ' + key + ' has conflicting coordinate rows.');
      }
      positions.set(key, position);
    }
  }
  for (let index = 0; index < elementRows.length; index += 1) {
    const row = elementRows[index];
    const from = nodeId(row.FROM_NODE);
    const to = nodeId(row.TO_NODE);
    if (from !== id && to !== id) continue;
    const a = positions.get(from);
    const b = positions.get(to);
    if (!a || !b) {
      throw new TypeError('Cannot reconcile incident element ' + row.ELEMENTID + ': endpoint coordinate is missing.');
    }
    const delta = b.map((value, index) => value - a[index]);
    if (Math.hypot(...delta) <= 0) throw new TypeError('Correction would collapse element ' + row.ELEMENTID + '.');
    affectedElementIds.push(String(row.ELEMENTID));
    for (let k = 0; k < 3; k += 1) {
      const field = 'DELTA_' + ACCDB_COORDINATE_AXES[k];
      const old = row[field];
      // These are raw file-unit displacement cells; their relationship to
      // the source's coordinate rows is validated by the existing preflight.
      const next = Math.fround(delta[k]);
      if (old !== next) {
        changes.push(Object.freeze({
          table: 'INPUT_BASIC_ELEMENT_DATA', row: index, elementId: String(row.ELEMENTID),
          field, before: old ?? null, after: next,
        }));
        row[field] = next;
      }
    }
  }
  const patched = {
    ...tables,
    INPUT_NODAL_COORDINATES: { ...tables.INPUT_NODAL_COORDINATES, rows: coordinateRows },
    INPUT_BASIC_ELEMENT_DATA: { ...tables.INPUT_BASIC_ELEMENT_DATA, rows: elementRows },
  };
  return Object.freeze({
    schema: ACCDB_COORDINATE_EDIT_SCHEMA, changed: true, nodeId: id, axis, unit,
    before, after: roundedValue, sourceIdentity, revision: request.revision,
    tables: patched, changes: Object.freeze(changes),
    affectedElementIds: Object.freeze(affectedElementIds),
    quantized: rawValue !== roundedValue,
  });
}

export function requireAccdbCoordinateDraft(draft, sourceIdentity) {
  if (!draft || draft.schema !== ACCDB_COORDINATE_DRAFT_SCHEMA
      || !sourceIdentity || draft.sourceIdentity !== sourceIdentity
      || !Array.isArray(draft.edits) || draft.edits.length > 10000) {
    throw new TypeError('Correction draft does not match this original ACCDB source.');
  }
  if (!String(draft.approver ?? '').trim() || !String(draft.reason ?? '').trim()) {
    throw new TypeError('Correction draft requires approver and reason.');
  }
  return draft;
}

/** Replay from original tables; undo, redo and load never accumulate rounding. */
export function replayAccdbCoordinateDraft(tables, draft, sourceIdentity) {
  requireAccdbCoordinateDraft(draft, sourceIdentity);
  let current = tables;
  let revision = 0;
  const disclosures = [];
  for (const edit of draft.edits) {
    const applied = previewAccdbNodeCoordinateEdit(current, {
      ...edit, sourceIdentity, expectedSourceIdentity: sourceIdentity,
      revision, expectedRevision: revision,
    });
    if (applied.changed) {
      current = applied.tables;
      disclosures.push({
        nodeId: applied.nodeId, axis: applied.axis, before: applied.before,
        after: applied.after, unit: applied.unit, changes: applied.changes,
        affectedElementIds: applied.affectedElementIds,
      });
    }
    revision += 1;
  }
  return Object.freeze({ tables: current, disclosures: Object.freeze(disclosures), revision });
}
