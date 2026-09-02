import {
  LOAD_PRIMITIVE_SCHEMA,
  REPRESENTABLE_LOAD_SIGN_CONVENTION,
} from '../linear-fea-load-case/load-case-contract.js';
import {
  loadLedgerRow,
  physicalCaseError,
  safePhysicalId,
  sourceEvidence,
} from './inputxml-linear-physical-case-builders.js';

const Y_DOWN = Object.freeze([0, -1, 0]);

export function collectHangerPreloads(structural, gravityDirection, ledger) {
  const hangers = structural.constraintBindings
    .filter((row) => row.sourceKind === 'HANGER')
    .sort((left, right) => compareAscii(left.inventoryId, right.inventoryId));
  if (hangers.length === 0) return [];
  const actualGravity = [gravityDirection.x, gravityDirection.y, gravityDirection.z];
  if (actualGravity.some((value, index) => value !== Y_DOWN[index])) {
    throw physicalCaseError(
      'INPUTXML_HANGER_VERTICAL_AXIS_UNSUPPORTED',
      'Predefined InputXML hangers are currently qualified only for Y-up / Y-down gravity.',
      { supportedGravityDirection: Y_DOWN, actualGravityDirection: actualGravity },
    );
  }

  return hangers.map((binding, ordinal) => {
    const coldLoad = binding.coldLoadTotal;
    if (!(typeof coldLoad === 'number' && Number.isFinite(coldLoad) && coldLoad > 0)) {
      throw physicalCaseError(
        'INPUTXML_HANGER_PRELOAD_INVALID',
        `Hanger ${binding.inventoryId} has no positive finite retained cold load.`,
        { inventoryId: binding.inventoryId, coldLoad },
      );
    }
    const nodeId = `${structural.modelId}.N${safePhysicalId(binding.targetNodeId)}`;
    const primitiveId = `H-${safePhysicalId(binding.inventoryId)}-${ordinal}`;
    const primitive = Object.freeze({
      schema: LOAD_PRIMITIVE_SCHEMA,
      primitiveId,
      kind: 'NODAL_FORCE_MOMENT',
      sourceEvidence: sourceEvidence({
        sourceId: 'INPUTXML_PREDEFINED_HANGER',
        sourceRevision: binding.sourceRecordSemanticHash,
        inventoryId: binding.inventoryId,
        numberOfHangers: binding.numberOfHangers,
        coldLoadPerHanger: binding.coldLoadPerHanger,
        coldLoadTotal: coldLoad,
        verticalAxisAuthority: binding.verticalAxisAuthority,
      }),
      nodeId,
      basis: { kind: 'GLOBAL' },
      force: { fx: 0, fy: coldLoad, fz: 0 },
      moment: { mx: 0, my: 0, mz: 0 },
      units: { force: 'N', moment: 'N*m', length: 'm' },
      signConvention: REPRESENTABLE_LOAD_SIGN_CONVENTION,
    });
    ledger.push(loadLedgerRow({
      ledgerId: `IXLOAD:HANGER:${safePhysicalId(binding.inventoryId)}`,
      sourceKind: 'HANGER_COLD_LOAD',
      sourceFeatureId: binding.sourceFeatureId,
      segmentId: null,
      elementId: null,
      disposition: 'COMPILED_WITH_DECLARED_LIMITATION',
      primitiveIds: [primitiveId],
      limitationCode: 'DRAFT_SPRING_SUPPORT_NO_REFERENCE',
      evidence: {
        nodeId,
        numberOfHangers: binding.numberOfHangers,
        coldLoadPerHanger: binding.coldLoadPerHanger,
        coldLoadTotal: coldLoad,
        appliedForce: primitive.force,
        verticalAxisAuthority: binding.verticalAxisAuthority,
      },
    }));
    return primitive;
  });
}

function compareAscii(left, right) {
  const a = String(left); const b = String(right);
  return a < b ? -1 : a > b ? 1 : 0;
}
