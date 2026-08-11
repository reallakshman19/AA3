import {
  ELEMENT_END_ACTION_CONVENTION_ID,
  LINEAR_FEA_UNITS,
  REACTION_CONVENTION_ID,
  TRANSLATIONAL_DOFS,
} from '../core/linear-fea-contract/index.js';
import { semanticHash } from '../core/shared-piping-model/canonical-json.js';
import { deepFreeze } from '../core/shared-piping-model/immutable.js';
import { LFEA_NATIVE_RUN_RECORD_SCHEMA } from './native-run-history.js';

export const LFEA_NATIVE_COMPARISON_SCHEMA = 'lfea-native-run-comparison/v1';
export const LFEA_QUANTITY_SCHEMA = 'lfea-native-comparable-quantity/v1';
export const LFEA_COMPARISON_STATUS = Object.freeze({
  COMPARABLE: 'COMPARABLE',
  NOT_DIRECTLY_COMPARABLE: 'NOT_DIRECTLY_COMPARABLE',
});

const GLOBAL_BASIS_ID = 'FEA_GLOBAL_CARTESIAN_XYZ_V1';
const GLOBAL_DOF_SIGN_ID = 'FEA_CANONICAL_GLOBAL_DOF_POSITIVE_V1';
const ACTION_FIELDS = Object.freeze(['fx', 'fy', 'fz', 'mx', 'my', 'mz']);
const COMPATIBILITY_FIELDS = Object.freeze([
  ['quantityId', 'QUANTITY_ID_MISMATCH'],
  ['dimension', 'DIMENSION_MISMATCH'],
  ['unit', 'UNIT_MISMATCH'],
  ['basisId', 'BASIS_MISMATCH'],
  ['signConvention', 'SIGN_CONVENTION_MISMATCH'],
  ['entityIdentity', 'ENTITY_IDENTITY_MISMATCH'],
  ['stationIdentity', 'STATION_IDENTITY_MISMATCH'],
  ['physicalLoadCaseHash', 'PHYSICAL_CASE_MISMATCH'],
  ['resultAuthority', 'RESULT_AUTHORITY_MISMATCH'],
  ['methodIdentity', 'METHOD_IDENTITY_MISMATCH'],
]);

/** Compare two retained native runs without changing either run's authority. */
export function compareLfeaNativeRunRecords(leftRecord, rightRecord) {
  const left = extractLfeaComparableQuantities(leftRecord);
  const right = extractLfeaComparableQuantities(rightRecord);
  const leftBySlot = new Map(left.map((row) => [row.slotId, row]));
  const rightBySlot = new Map(right.map((row) => [row.slotId, row]));
  const slotIds = [...new Set([...leftBySlot.keys(), ...rightBySlot.keys()])].sort(compareAscii);
  const rows = slotIds.map((slotId) => compareQuantityPair(
    leftBySlot.get(slotId) ?? null,
    rightBySlot.get(slotId) ?? null,
    slotId,
  ));
  const comparableCount = rows.filter((row) => row.status === LFEA_COMPARISON_STATUS.COMPARABLE).length;
  const identity = {
    schema: LFEA_NATIVE_COMPARISON_SCHEMA,
    leftRunId: leftRecord.runId,
    rightRunId: rightRecord.runId,
    rowCount: rows.length,
    comparableCount,
    incompatibleCount: rows.length - comparableCount,
    rows,
  };
  return deepFreeze({ ...identity, semanticHash: semanticHash(identity) });
}

export function extractLfeaComparableQuantities(runRecord) {
  const record = requireRunRecord(runRecord);
  const raw = record.evidence.rawExecutionBatch;
  const recovery = record.evidence.recoveryBatch;
  const recoveredByCase = new Map(recovery.caseRecoveries.map((row) => [row.caseId, row]));
  const quantities = [];
  for (const rawCase of raw.caseExecutions) {
    quantities.push(...rawVectorQuantities(rawCase, 'displacement'));
    quantities.push(...rawVectorQuantities(rawCase, 'reactions'));
    const recoveredCase = recoveredByCase.get(rawCase.caseId);
    if (recoveredCase) quantities.push(...recoveredActionQuantities(rawCase, recoveredCase, recovery));
  }
  return Object.freeze(quantities.sort((left, right) => compareAscii(left.slotId, right.slotId)));
}

export function compareQuantityPair(left, right, slotId = null) {
  if (!left || !right) {
    return comparisonRow(left, right, slotId, [left ? 'QUANTITY_MISSING_RIGHT' : 'QUANTITY_MISSING_LEFT']);
  }
  const reasons = [];
  for (const [field, code] of COMPATIBILITY_FIELDS) {
    if (left[field] !== right[field]) reasons.push(code);
  }
  if (!Number.isFinite(left.value) || !Number.isFinite(right.value)) reasons.push('VALUE_UNAVAILABLE');
  return comparisonRow(left, right, slotId ?? left.slotId, reasons);
}

function rawVectorQuantities(caseRow, kind) {
  const execution = caseRow.execution;
  const rows = kind === 'displacement' ? execution.displacement : execution.reactions;
  return rows.map((row) => {
    const translation = TRANSLATIONAL_DOFS.includes(row.dof);
    const descriptor = kind === 'displacement'
      ? displacementDescriptor(row.dof, translation)
      : reactionDescriptor(row.dof, translation);
    return quantity({
      ...descriptor,
      entityIdentity: `NODE:${row.nodeId}`,
      stationIdentity: row.dof,
      physicalLoadCaseHash: caseRow.physicalLoadCaseHash,
      caseId: caseRow.caseId,
      methodIdentity: `SOLVER:${caseRow.solverProfileSemanticHash}`,
      value: row.value,
    });
  });
}

function recoveredActionQuantities(rawCase, recoveredCase, recoveryBatch) {
  const axisByElement = new Map(rawCase.elementLedger.map((row) => [row.elementId, row.localAxisResultSemanticHash]));
  const rows = [];
  for (const action of recoveredCase.recovery.elementActions) {
    for (const end of ['I', 'J']) {
      for (const basis of ['local', 'global']) {
        for (const field of ACTION_FIELDS) {
          const isForce = field.startsWith('f');
          rows.push(quantity({
            quantityId: `B3.4_ELEMENT_END_${field.toUpperCase()}`,
            dimension: isForce ? 'FORCE' : 'MOMENT',
            unit: isForce ? LINEAR_FEA_UNITS.force : LINEAR_FEA_UNITS.moment,
            basisId: basis === 'global'
              ? GLOBAL_BASIS_ID
              : `ELEMENT_LOCAL_AXES:${axisByElement.get(action.elementId) ?? 'UNAVAILABLE'}`,
            signConvention: ELEMENT_END_ACTION_CONVENTION_ID,
            entityIdentity: `ELEMENT:${action.elementId}`,
            stationIdentity: `END:${end}`,
            physicalLoadCaseHash: recoveredCase.physicalLoadCaseHash,
            caseId: recoveredCase.caseId,
            resultAuthority: 'RECOVERED_B3.4_ELEMENT_ACTION',
            methodIdentity: semanticHash({
              solverProfileSemanticHash: rawCase.solverProfileSemanticHash,
              recoveryProfileSemanticHash: recoveryBatch.recoveryProfileSemanticHash,
            }),
            value: action[basis][end][field],
          }));
        }
      }
    }
  }
  return rows;
}

function displacementDescriptor(dof, translation) {
  return {
    quantityId: `B3.3_NODE_DISPLACEMENT_${dof}`,
    dimension: translation ? 'LENGTH' : 'ROTATION',
    unit: translation ? LINEAR_FEA_UNITS.length : LINEAR_FEA_UNITS.rotation,
    basisId: GLOBAL_BASIS_ID,
    signConvention: GLOBAL_DOF_SIGN_ID,
    resultAuthority: 'RAW_B3.3_DISPLACEMENT',
  };
}

function reactionDescriptor(dof, translation) {
  return {
    quantityId: `B3.3_NODE_REACTION_${dof}`,
    dimension: translation ? 'FORCE' : 'MOMENT',
    unit: translation ? LINEAR_FEA_UNITS.force : LINEAR_FEA_UNITS.moment,
    basisId: GLOBAL_BASIS_ID,
    signConvention: REACTION_CONVENTION_ID,
    resultAuthority: 'RAW_B3.3_REACTION',
  };
}

function quantity(input) {
  const slotProjection = {
    resultAuthority: input.resultAuthority,
    caseId: input.caseId,
    entityIdentity: input.entityIdentity,
    stationIdentity: input.stationIdentity,
    quantityId: input.quantityId,
    basisKind: input.basisId.startsWith('ELEMENT_LOCAL_AXES:') ? 'LOCAL' : 'GLOBAL',
  };
  return deepFreeze({
    schema: LFEA_QUANTITY_SCHEMA,
    slotId: semanticHash(slotProjection),
    ...input,
  });
}

function comparisonRow(left, right, slotId, reasons) {
  const compatible = reasons.length === 0;
  const leftValue = left?.value ?? null;
  const rightValue = right?.value ?? null;
  return deepFreeze({
    slotId: slotId ?? left?.slotId ?? right?.slotId ?? null,
    status: compatible ? LFEA_COMPARISON_STATUS.COMPARABLE : LFEA_COMPARISON_STATUS.NOT_DIRECTLY_COMPARABLE,
    reasonCodes: Object.freeze([...new Set(reasons)].sort(compareAscii)),
    left: left ?? null,
    right: right ?? null,
    delta: compatible ? rightValue - leftValue : null,
    absoluteDelta: compatible ? Math.abs(rightValue - leftValue) : null,
  });
}

function requireRunRecord(record) {
  if (!record || record.schema !== LFEA_NATIVE_RUN_RECORD_SCHEMA
    || !record.evidence?.rawExecutionBatch || !record.evidence?.recoveryBatch) {
    const error = new TypeError('Semantic comparison requires a retained LFEA native run record.');
    error.code = 'LFEA_COMPARISON_RUN_RECORD_INVALID';
    throw error;
  }
  return record;
}

function compareAscii(left, right) {
  const a = String(left); const b = String(right);
  return a < b ? -1 : a > b ? 1 : 0;
}
