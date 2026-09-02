import { InputXmlLinearStructuralPreparationError } from './inputxml-linear-structural-profile.js';
import { predefinedHangerLimitationCodes } from './inputxml-predefined-hanger.js';
import {
  requireStructuralConstraintNode,
  resolveStructuralConstraintNode,
} from './inputxml-structural-constraint-target.js';

const ALLOWED_DISPOSITIONS = new Set([
  'IMPLEMENTED_EXACTLY',
  'IMPLEMENTED_WITH_DECLARED_APPROXIMATION',
]);

export function compileInputXmlHangerConstraints({
  inventory,
  modelId,
  analysisProfileId,
  nodeRetargeting,
  conditionedNodeIds,
}) {
  const declarations = [];
  const bindings = [];
  const available = conditionedNodeIds === undefined || conditionedNodeIds === null
    ? null
    : new Set(conditionedNodeIds.map(String));
  const hangers = inventory
    .filter((row) => row.active && row.sourceKind === 'HANGER')
    .sort((left, right) => compareAscii(left.inventoryId, right.inventoryId));

  for (const item of hangers) {
    const disposition = item.dispositionByProfile[analysisProfileId] ?? null;
    if (!ALLOWED_DISPOSITIONS.has(disposition?.disposition)) {
      fail(
        'INPUTXML_STRUCTURAL_HANGER_NOT_REPRESENTABLE',
        `Hanger ${item.inventoryId} is not representable under ${analysisProfileId}.`,
        { inventoryId: item.inventoryId, disposition },
      );
    }
    const sourceNodeId = item.classification.nodeId ?? null;
    const stiffness = item.classification.springRateTotal ?? null;
    const coldLoad = item.classification.coldLoadTotal ?? null;
    if (sourceNodeId === null || !(stiffness > 0) || !(coldLoad > 0)) {
      fail(
        'INPUTXML_STRUCTURAL_HANGER_DATA_INVALID',
        `Hanger ${item.inventoryId} has no qualified node, rate or cold load.`,
        { inventoryId: item.inventoryId, sourceNodeId, stiffness, coldLoad },
      );
    }
    const targetNodeId = resolveStructuralConstraintNode(
      sourceNodeId,
      nodeRetargeting,
      item.inventoryId,
    );
    requireStructuralConstraintNode(available, targetNodeId, item.inventoryId, sourceNodeId);
    const declarationId = `${modelId}-C-${safe(item.sourceFeatureId)}-HGR-UY`;
    declarations.push(Object.freeze({
      declarationId,
      kind: 'PARTIAL_RELEASE_SPRING',
      nodeId: `${modelId}.N${safe(targetNodeId)}`,
      dof: 'UY',
      stiffness,
    }));
    bindings.push(Object.freeze({
      sourceKind: 'HANGER',
      sourceFeatureId: item.sourceFeatureId,
      inventoryId: item.inventoryId,
      sourceRecordSemanticHash: item.sourceRecordSemanticHash,
      sourceNodeId: String(sourceNodeId),
      targetNodeId,
      retargetedByBendRetopology: targetNodeId !== String(sourceNodeId),
      targetDofs: Object.freeze(['UY']),
      implementation: disposition.disposition,
      limitationCode: disposition.limitationCode,
      limitationCodes: predefinedHangerLimitationCodes(item.classification),
      declarationIds: Object.freeze([declarationId]),
      numberOfHangers: item.classification.numberOfHangers,
      springRatePerHanger: item.classification.springRatePerHanger,
      springRateTotal: stiffness,
      coldLoadPerHanger: item.classification.coldLoadPerHanger,
      coldLoadTotal: coldLoad,
      verticalDirection: Object.freeze([...item.classification.verticalDirection]),
      verticalAxisAuthority: item.classification.verticalAxisAuthority,
    }));
  }
  return Object.freeze({
    declarations: Object.freeze(declarations),
    bindings: Object.freeze(bindings),
  });
}

function fail(code, message, data) {
  throw new InputXmlLinearStructuralPreparationError(message, code, data);
}

function safe(value) {
  return String(value).replace(/[^A-Za-z0-9_.-]/gu, '-');
}

function compareAscii(left, right) {
  const a = String(left); const b = String(right);
  return a < b ? -1 : a > b ? 1 : 0;
}
