import { ACCDB_ELEMENT_FIELD_SPECS } from './accdb-source-binding.js';

export const ACCDB_FIELD_OVERRIDE_SET_SCHEMA = 'accdb-field-override-set/v1';

/**
 * Engineer-declared overrides of ACCDB element field values.
 *
 * An imported CAESAR II model is the engineer's model, and a value they know
 * to be wrong (or a field the export left blank) has to be correctable
 * without editing the .ACCDB and re-importing. This module is the only way
 * that happens, and it is deliberately narrow:
 *
 *   - Overrides replace the RAW cell in INPUT_BASIC_ELEMENT_DATA, in the
 *     file's own declared units, before any conversion or geometry build
 *     runs. Everything downstream -- unit conversion, blank-sentinel
 *     handling, field inheritance from the prior element, canonical geometry
 *     -- then behaves exactly as if the file had carried that value. There
 *     is no second, parallel conversion path that could disagree with the
 *     import path.
 *   - Only the analysis/section fields the model-health contract already
 *     inventories are overridable (ACCDB_ELEMENT_FIELD_SPECS). Node ids,
 *     DELTA_X/Y/Z and the coordinate tables are NOT: geometry and topology
 *     stay owned by the file, so an override can never silently move the
 *     model.
 *   - Every override carries an approver and a reason, and every applied
 *     override returns a disclosure record. An override is a model edit the
 *     engineer made, and it stays visible as one rather than dissolving into
 *     the imported values.
 *
 * Validation fails closed: an unknown field, an unknown element, a
 * non-finite number, a blank string, or the same field overridden twice all
 * raise rather than being dropped or last-write-wins'd.
 */

const OVERRIDABLE_BY_NAME = new Map(ACCDB_ELEMENT_FIELD_SPECS.map((spec) => [spec.name, spec]));

export const ACCDB_OVERRIDABLE_FIELD_NAMES = Object.freeze(
  ACCDB_ELEMENT_FIELD_SPECS.map((spec) => spec.name),
);

export function requireAccdbFieldOverrideSet(value) {
  if (!value || typeof value !== 'object') {
    throw new TypeError('An ACCDB field override set is required.');
  }
  const approver = requireText(value.approver, 'approver');
  const reason = requireText(value.reason, 'reason');
  if (!Array.isArray(value.overrides) || value.overrides.length === 0) {
    throw new TypeError('An ACCDB field override set requires at least one override.');
  }
  const seen = new Set();
  const overrides = value.overrides.map((entry) => {
    if (!entry || typeof entry !== 'object') {
      throw new TypeError('Each ACCDB field override must be an object.');
    }
    const accdbElementId = requireText(entry.accdbElementId, 'accdbElementId');
    const field = requireText(entry.field, 'field');
    const spec = OVERRIDABLE_BY_NAME.get(field);
    if (!spec) {
      throw new TypeError(`ACCDB field ${field} is not overridable; overridable fields are ${ACCDB_OVERRIDABLE_FIELD_NAMES.join(', ')}.`);
    }
    const key = `${accdbElementId}:${field}`;
    if (seen.has(key)) {
      throw new TypeError(`ACCDB element ${accdbElementId} declares ${field} more than once; resolve the intent before applying.`);
    }
    seen.add(key);
    return Object.freeze({ accdbElementId, field, rawValue: requireRawValue(entry.rawValue, spec, accdbElementId) });
  });
  return Object.freeze({
    schema: ACCDB_FIELD_OVERRIDE_SET_SCHEMA,
    approver,
    reason,
    overrides: Object.freeze(overrides.slice().sort(compareOverride)),
  });
}

/**
 * Return a new table set with the override set's raw cells replaced, plus one
 * disclosure record per applied override. The input tables are never mutated:
 * the panel keeps the as-imported tables so an override can be revised or
 * withdrawn against the original file values, not against a previous edit.
 */
export function applyAccdbFieldOverrides(tables, overrideSet) {
  const accepted = requireAccdbFieldOverrideSet(overrideSet);
  const elementTable = tables?.INPUT_BASIC_ELEMENT_DATA;
  if (!elementTable || !Array.isArray(elementTable.rows)) {
    throw new TypeError('applyAccdbFieldOverrides requires tables.INPUT_BASIC_ELEMENT_DATA.rows.');
  }
  const byElementId = new Map();
  for (const [index, row] of elementTable.rows.entries()) {
    byElementId.set(String(row.ELEMENTID), index);
  }
  const rows = elementTable.rows.map((row) => ({ ...row }));
  const disclosures = [];
  for (const override of accepted.overrides) {
    const index = byElementId.get(override.accdbElementId);
    if (index === undefined) {
      throw new TypeError(`ACCDB element ${override.accdbElementId} is not present in INPUT_BASIC_ELEMENT_DATA; it cannot be overridden.`);
    }
    const originalRawValue = rows[index][override.field] ?? null;
    rows[index][override.field] = override.rawValue;
    disclosures.push(Object.freeze({
      severity: 'info',
      code: 'ACCDB_FIELD_OVERRIDDEN_BY_ENGINEER',
      message: `Element ${override.accdbElementId} field ${override.field} was overridden from ${String(originalRawValue)} to ${String(override.rawValue)} by ${accepted.approver}.`,
      data: Object.freeze({
        accdbElementId: override.accdbElementId,
        field: override.field,
        originalRawValue,
        overrideRawValue: override.rawValue,
        approver: accepted.approver,
        reason: accepted.reason,
      }),
    }));
  }
  return Object.freeze({
    tables: Object.freeze({
      ...tables,
      INPUT_BASIC_ELEMENT_DATA: Object.freeze({ ...elementTable, rows }),
    }),
    overrideSet: accepted,
    disclosures: Object.freeze(disclosures),
  });
}

function requireRawValue(rawValue, spec, accdbElementId) {
  if (spec.kind === 'STRING') {
    return requireText(rawValue, `${spec.name} on element ${accdbElementId}`);
  }
  const numeric = Number(rawValue);
  if (rawValue === null || rawValue === undefined || rawValue === '' || !Number.isFinite(numeric)) {
    throw new TypeError(`ACCDB override ${spec.name} on element ${accdbElementId} must be a finite number in the file's declared unit.`);
  }
  return numeric;
}

function requireText(value, label) {
  const text = value === null || value === undefined ? '' : String(value).trim();
  if (!text) throw new TypeError(`An ACCDB field override set requires ${label}.`);
  return text;
}

function compareOverride(left, right) {
  if (left.accdbElementId !== right.accdbElementId) {
    return left.accdbElementId < right.accdbElementId ? -1 : 1;
  }
  return left.field < right.field ? -1 : left.field > right.field ? 1 : 0;
}
