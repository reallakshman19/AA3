import {
  LOAD_PRIMITIVE_SCHEMA,
  REPRESENTABLE_LOAD_SIGN_CONVENTION,
} from '../linear-fea-load-case/load-case-contract.js';
import {
  loadLedgerRow,
  safePhysicalId,
  sourceEvidence,
} from './inputxml-linear-physical-case-builders.js';

const FORCE_FIELDS = Object.freeze(['fx', 'fy', 'fz']);
const MOMENT_FIELDS = Object.freeze(['mx', 'my', 'mz']);

/**
 * Gather the model's own declared FORCESMOMENTS vectors into one primitive list
 * per CAESAR vector-set number.
 *
 * Geometry ingestion already converts every component to SI and retains the
 * records on `segment.meta.analysis.forcesMoments`, but nothing ever read them
 * back -- which is what `MODEL_NODAL_FORCE_VECTOR_NOT_COMPILED` was reporting.
 * This is that missing binding, so declared vectors are applied rather than
 * disclosed as uncompiled.
 *
 * Sets are kept separate on purpose. CAESAR numbers force vectors into sets
 * that a model commonly uses as ALTERNATIVE occasional directions (BM4 declares
 * seven), so summing them into a single case would apply loads simultaneously
 * that the model never intended to act together. Reading the model's own <CASE>
 * combination records to learn which sets combine is a separate job; until that
 * exists, one case per set is the faithful reading, and superposition is left to
 * whoever authorizes the run.
 *
 * `ledger` is appended to in place, matching how the gravity/pressure/thermal
 * binding loops in compileInputXmlLinearPhysicalCases already record evidence.
 */
export function collectAppliedForceSets(structural, ledger) {
  const segments = structural.conditionedTopology?.geometry?.segments ?? [];
  const bySet = new Map();
  for (const segment of segments) {
    for (const record of segment.meta?.analysis?.forcesMoments ?? []) {
      if (record.nodeId === null || record.nodeId === undefined) continue;
      // The compiled mechanical model binds nodes under a model-qualified
      // scheme (`${modelId}.N${nodeId}`); requireBoundNode needs that form,
      // not the bare topology node number the source declares.
      const nodeId = `${structural.modelId}.N${safePhysicalId(String(record.nodeId))}`;
      for (const vector of record.vectors ?? []) {
        if (vector.number === null || vector.number === undefined) continue;
        const force = componentsOf(vector.force, FORCE_FIELDS);
        const moment = componentsOf(vector.moment, MOMENT_FIELDS);
        if (!anyNonZero(force) && !anyNonZero(moment)) continue;
        const key = String(vector.number);
        if (!bySet.has(key)) bySet.set(key, []);
        const ordinal = bySet.get(key).length;
        const segmentToken = safePhysicalId(String(segment.id));
        const primitiveId = `${segmentToken}-F${safePhysicalId(key)}-${ordinal}`;
        bySet.get(key).push(nodalForceMomentPrimitiveInput({
          primitiveId, segmentId: segment.id, key, ordinal, nodeId, force, moment,
        }));
        ledger.push(loadLedgerRow({
          ledgerId: `IXLOAD:FORCESMOMENTS:${segmentToken}:${key}:${ordinal}`,
          sourceKind: 'APPLIED_NODAL_FORCE_MOMENT',
          sourceFeatureId: String(segment.sourceComponentUid ?? segment.id),
          segmentId: String(segment.id),
          elementId: null,
          disposition: 'COMPILED',
          primitiveIds: [primitiveId],
          limitationCode: null,
          evidence: { vectorSet: key, nodeId, force, moment },
        }));
      }
    }
  }
  return [...bySet.entries()]
    .sort((left, right) => Number(left[0]) - Number(right[0]))
    .map(([setNumber, primitives]) => ({ setNumber, primitives }));
}

function nodalForceMomentPrimitiveInput(value) {
  return {
    schema: LOAD_PRIMITIVE_SCHEMA,
    primitiveId: value.primitiveId,
    kind: 'NODAL_FORCE_MOMENT',
    sourceEvidence: sourceEvidence({
      sourceId: 'INPUTXML_FORCESMOMENTS',
      sourceRevision: `${value.segmentId}/${value.key}/${value.ordinal}`,
      nodeId: value.nodeId,
      force: value.force,
      moment: value.moment,
    }),
    nodeId: value.nodeId,
    // Declared local bases are not read here; CAESAR's FORCESMOMENTS vectors
    // are global by construction.
    basis: { kind: 'GLOBAL' },
    force: value.force,
    moment: value.moment,
    // This package works in SI and converts nothing -- ingestion has already
    // converted these components out of the file's declared units.
    units: { force: 'N', moment: 'N*m', length: 'm' },
    signConvention: REPRESENTABLE_LOAD_SIGN_CONVENTION,
  };
}

function componentsOf(record, fields) {
  const result = {};
  for (const key of fields) {
    const raw = record?.[key];
    // A component CAESAR left blank reads back as the ingestion's null, which
    // means "no load on this axis" -- zero, not an unknown to guess at.
    result[key] = typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
  }
  return result;
}

function anyNonZero(record) {
  return Object.values(record).some((value) => value !== 0);
}
