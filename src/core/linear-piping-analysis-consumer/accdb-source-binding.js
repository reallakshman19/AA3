import { accdbTablesToCanonicalGeometry } from '../geometry/adapters/accdb-to-canonical-geometry.js';
import { INPUTXML_MODEL_HEALTH_SOURCE_SCHEMA } from '../geometry/adapters/inputxml-model-health-source.js';
import { convertCaesarValue } from '../fea-benchmarks/caesar-accdb-units.js';

/**
 * Wrap ACCDB-derived canonical geometry in the same
 * InputXmlModelHealthSource bundle shape (schema, elementRecords with
 * PIPINGELEMENT[i]-shaped identity, fieldEvidence, childFeatures) the
 * governed diagnose/prepare pipeline requires -- injected via
 * diagnoseInputXmlLinearPreFea's existing options.parseSource seam.
 *
 * The identity is synthetic and disclosed, not a claim that these were
 * ever real CAESAR II PIPINGELEMENT tags: ACCDB elements were never XML,
 * and this binding exists only to satisfy a type contract written around
 * InputXML's own identity scheme so ACCDB models can reach the same
 * governed Error-check pipeline InputXML and StagedJSON-converted models
 * do. Callers should surface `sourceKind: 'ACCDB'` on the returned bundle
 * to keep that fact visible in the UI rather than letting a caller assume
 * "PIPINGELEMENT" means "came from an XML file."
 *
 * Unlike InputXML's parseInputXmlModelHealthSource, fieldEvidence here is
 * not an independent cross-check against a separately-parsed raw value --
 * ACCDB canonical geometry and this binding are both built from the exact
 * same table rows, so there is only one source of truth to begin with.
 * fieldEvidence exists to satisfy the same provenance/evidence shape
 * downstream authority modules already read (element.fieldEvidence.MODULUS
 * etc.), not to re-derive a second, independently-computed value.
 */
export function parseAccdbModelHealthSource(tables, options) {
  const opts = options ?? {};
  const geometry = accdbTablesToCanonicalGeometry(tables, opts);
  const elementRows = sortedByElementId(tables.INPUT_BASIC_ELEMENT_DATA.rows);
  const segmentByFeatureId = new Map(geometry.segments.map((segment) => [segment.sourceComponentUid, segment]));
  const rigidsByPointer = indexByPointer(tables.INPUT_RIGIDS.rows, 'RIGID_PTR');
  const reducersByPointer = indexByPointer(tables.INPUT_REDUCERS.rows, 'RED_PTR');
  const sifsByNode = groupByNode(tables.INPUT_SIFTEES.rows, 'NODE');

  const lengthUnit = geometry.summary?.accdbUnits?.length ?? null;
  const effectiveByField = new Map();
  const elementRecords = elementRows.map((row, sourceIndex) => {
    const sourceFeatureId = `PIPINGELEMENT[${sourceIndex}]`;
    const sourceElementId = String(row.ELEMENTID);
    const segment = segmentByFeatureId.get(`ACCDB-SOURCE-E${sourceElementId}`) ?? null;
    const fieldEvidence = Object.fromEntries(FIELD_SPECS.map((spec) => [
      spec.name,
      fieldEvidenceFor({ spec, row, sourceFeatureId, segment, effectiveByField }),
    ]));
    return Object.freeze({
      sourceFeatureId,
      sourceIndex,
      accdbElementId: sourceElementId,
      fromNodeId: cleanNodeId(row.FROM_NODE),
      toNodeId: cleanNodeId(row.TO_NODE),
      // DELTA_X/Y/Z are declared in ACCDB's own raw length unit (e.g. mm),
      // but geometry.nodes are always normalized to metres (the adapter's
      // unit: 'm' contract) -- convert here so the topology closure check
      // (which compares rawDelta directly against node-coordinate deltas
      // with no unit conversion of its own) compares like with like. This
      // is a real, independent cross-check for ACCDB: node positions come
      // from INPUT_NODAL_COORDINATES, DELTA_X/Y/Z from a separate table.
      rawDelta: rawDeltaFor(row, lengthUnit),
      rawAttributes: Object.freeze({ ...row }),
      childFeatures: Object.freeze(childFeatureRecords({
        sourceFeatureId, row, rigidsByPointer, reducersByPointer, sifsByNode,
      })),
      fieldEvidence: Object.freeze(fieldEvidence),
      canonicalSegmentId: segment?.id ?? null,
      canonicalSegmentType: segment?.type ?? null,
      canonicalStatus: segment ? 'RECONCILED' : 'UNRESOLVED',
    });
  });

  return Object.freeze({
    schema: INPUTXML_MODEL_HEALTH_SOURCE_SCHEMA,
    sourceKind: 'ACCDB',
    source: geometry.source ?? opts.source ?? 'accdb',
    fileName: opts.fileName ?? null,
    jobName: tables.INPUT_BASIC_ELEMENT_DATA.rows[0]?.JOBNAME ?? null,
    modelFeatureId: null,
    modelAttributes: Object.freeze({}),
    unitSystem: Object.freeze({ lengthUnit: geometry.unit, declared: geometry.summary?.accdbUnits ?? null }),
    // CAESAR stores ACCDB node coordinates as single-precision REALs -- every
    // one of the 576 coordinates in the real BM4_L.ACCDB is exactly a float32
    // value. Declaring that lets the topology closure check allow for the
    // quantization a coordinate difference inherits from its own storage
    // (see COORDINATE_PRECISION_RELATIVE in topology-graph-diagnostics.js)
    // instead of reporting it as 45 model errors.
    coordinatePrecision: 'FLOAT32',
    elementRecords: Object.freeze(elementRecords),
    sourceRecordCount: elementRecords.length,
    canonicalSegmentCount: geometry.segments.length,
    geometry,
    diagnostics: geometry.diagnostics,
  });
}

const FIELD_SPECS = Object.freeze([
  field('DIAMETER', (segment) => segment?.diameter),
  field('WALL_THICK', (segment) => segment?.thickness),
  field('MATERIAL_NAME', (segment) => segment?.material, 'STRING'),
  field('MODULUS', (segment) => segment?.meta?.analysis?.elasticModulus),
  field('POISSONS', (segment) => segment?.meta?.analysis?.poissonRatio),
  field('TEMP_EXP_C1', (segment) => segment?.meta?.analysis?.operatingTemperature),
  field('TEMP_EXP_C2', (segment) => segment?.meta?.analysis?.operatingTemperature2),
  field('PRESSURE1', (segment) => segment?.meta?.analysis?.pressure),
  field('HYDRO_PRESSURE', (segment) => segment?.meta?.analysis?.hydroPressure),
  field('FLUID_DENSITY', (segment) => segment?.meta?.analysis?.fluidDensity),
  field('PIPE_DENSITY', (segment) => segment?.meta?.analysis?.pipeDensity),
  field('INSUL_THICK', (segment) => segment?.meta?.analysis?.insulationThickness),
  field('INSUL_DENSITY', (segment) => segment?.meta?.analysis?.insulationDensity),
  field('CORR_ALLOW', (segment) => segment?.meta?.analysis?.corrosionAllowance),
]);

/**
 * The element fields this binding inventories, name + kind only.
 *
 * Exported so the property table the engineer edits and the override
 * validator that accepts their edits are driven by the same list the
 * evidence records are built from -- a field cannot appear in one and be
 * unknown to another.
 */
export const ACCDB_ELEMENT_FIELD_SPECS = Object.freeze(
  FIELD_SPECS.map((spec) => Object.freeze({ name: spec.name, kind: spec.kind })),
);

function field(name, canonicalValue, kind) {
  return Object.freeze({ name, canonicalValue, kind: kind ?? 'NUMBER' });
}

const ACCDB_BLANK_SENTINEL = -1.01010000705719;
const ACCDB_SENTINEL_TOLERANCE = 0.001;

function fieldEvidenceFor({ spec, row, sourceFeatureId, segment, effectiveByField }) {
  const rawValue = row[spec.name];
  const rawState = classifyRawField(rawValue, spec.kind);
  const canonicalValue = normalizeCanonical(spec.canonicalValue(segment));
  const prior = effectiveByField.get(spec.name) ?? null;
  let disposition;
  let effectiveSourceFeatureId = null;
  if (rawState === 'EXPLICIT') {
    disposition = 'EXPLICIT';
    effectiveSourceFeatureId = sourceFeatureId;
  } else if (prior && canonicalValue !== null) {
    disposition = rawState === 'ABSENT' ? 'INHERITED' : `${rawState}_INHERITED`;
    effectiveSourceFeatureId = prior.sourceFeatureId;
  } else {
    disposition = rawState;
  }
  if (canonicalValue !== null && effectiveSourceFeatureId !== null) {
    effectiveByField.set(spec.name, Object.freeze({ sourceFeatureId: effectiveSourceFeatureId, canonicalValue }));
  }
  return Object.freeze({
    disposition,
    rawAttributeName: spec.name,
    rawValue: rawValue ?? null,
    effectiveSourceFeatureId,
    canonicalValue,
  });
}

function classifyRawField(rawValue, kind) {
  if (rawValue === null || rawValue === undefined || rawValue === '') return 'ABSENT';
  if (kind === 'STRING') return String(rawValue).trim() ? 'EXPLICIT' : 'ABSENT';
  const numeric = Number(rawValue);
  if (!Number.isFinite(numeric)) return 'INVALID';
  if (Math.abs(numeric - ACCDB_BLANK_SENTINEL) < ACCDB_SENTINEL_TOLERANCE) return 'SENTINEL_UNSET';
  return 'EXPLICIT';
}

function normalizeCanonical(value) {
  return value === undefined || value === null ? null : value;
}

function childFeatureRecords({ sourceFeatureId, row, rigidsByPointer, reducersByPointer, restraintsByNode, sifsByNode }) {
  const records = [];
  const rigidPointer = numberOrNull(row.RIGID_PTR);
  if (rigidPointer != null && rigidPointer > 0) {
    const declaration = rigidsByPointer.get(rigidPointer);
    if (declaration) {
      records.push(Object.freeze({
        sourceFeatureId: `${sourceFeatureId}/RIGID[0]`,
        parentFeatureId: sourceFeatureId,
        kind: 'RIGID',
        ordinal: 0,
        rawAttributes: Object.freeze({ TYPE: declaration.RIGID_TYPE ?? null, WEIGHT: declaration.RIGID_WGT ?? null }),
      }));
    }
  }
  const reducerPointer = numberOrNull(row.REDUCER_PTR);
  if (reducerPointer != null && reducerPointer > 0) {
    const declaration = reducersByPointer.get(reducerPointer);
    if (declaration) {
      records.push(Object.freeze({
        sourceFeatureId: `${sourceFeatureId}/REDUCER[0]`,
        parentFeatureId: sourceFeatureId,
        kind: 'REDUCER',
        ordinal: 0,
        rawAttributes: Object.freeze({ ...declaration }),
      }));
    }
  }
  const fromNode = cleanNodeId(row.FROM_NODE);
  const toNode = cleanNodeId(row.TO_NODE);
  // Restraints attach to nodes, not elements, in ACCDB's own table shape
  // (unlike InputXML's inline per-element <RESTRAINT> tags), so they are
  // not represented as childFeatures here -- restraint evidence already
  // lives on geometry.nodes[].meta.restraints from the geometry adapter.
  let sifOrdinal = 0;
  for (const nodeId of [fromNode, toNode]) {
    for (const sifRow of sifsByNode.get(nodeId) ?? []) {
      records.push(Object.freeze({
        sourceFeatureId: `${sourceFeatureId}/SIF[${sifOrdinal}]`,
        parentFeatureId: sourceFeatureId,
        kind: 'SIF',
        ordinal: sifOrdinal,
        rawAttributes: Object.freeze({ NODE: sifRow.NODE, TYPE: sifRow.TYPE, SIF_IN: sifRow.SIF_IN, SIF_OUT: sifRow.SIF_OUT }),
      }));
      sifOrdinal += 1;
    }
  }
  return records;
}

function indexByPointer(rows, pointerField) {
  const map = new Map();
  for (const row of rows) {
    const pointer = numberOrNull(row[pointerField]);
    if (pointer != null) map.set(pointer, row);
  }
  return map;
}

function groupByNode(rows, field2) {
  const map = new Map();
  for (const row of rows) {
    const key = cleanNodeId(row[field2]);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  if (Math.abs(numeric - ACCDB_BLANK_SENTINEL) < ACCDB_SENTINEL_TOLERANCE) return null;
  return numeric;
}

function cleanNodeId(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const numeric = Number(text);
  return Number.isFinite(numeric) ? String(numeric) : text;
}

function rawDeltaFor(row, lengthUnit) {
  return Object.freeze({
    x: convertedDeltaAxis(row.DELTA_X, lengthUnit),
    y: convertedDeltaAxis(row.DELTA_Y, lengthUnit),
    z: convertedDeltaAxis(row.DELTA_Z, lengthUnit),
  });
}

function convertedDeltaAxis(rawValue, lengthUnit) {
  // Sentinel/blank means "no declared offset on this axis" -- resolve to
  // zero before conversion, not after: converting the sentinel's raw
  // magnitude would land it far outside the closure check's own (much
  // tighter, InputXML-shaped) sentinel-detection tolerance.
  const numeric = numberOrNull(rawValue);
  if (numeric === null) return 0;
  if (!lengthUnit) return null;
  return convertCaesarValue(numeric, lengthUnit, 'LENGTH').value;
}

function sortedByElementId(rows) {
  return [...rows].sort((left, right) => Number(left.ELEMENTID) - Number(right.ELEMENTID));
}
