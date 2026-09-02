import { InputXmlLinearStructuralPreparationError } from './inputxml-linear-structural-profile.js';
import { compileInputXmlHangerConstraints } from './inputxml-hanger-structural-constraints.js';
import {
  requireStructuralConstraintNode,
  resolveStructuralConstraintNode,
} from './inputxml-structural-constraint-target.js';
import {
  restraintApproximationCodes,
  restraintConnectingSpringDirection,
  restraintDirectionalSpringDirection,
  restraintUnilateralAction,
} from './inputxml-feature-inventory-restraints.js';

const DOFS = Object.freeze(['UX', 'UY', 'UZ', 'RX', 'RY', 'RZ']);
const TRANSLATIONAL_DOFS = Object.freeze(['UX', 'UY', 'UZ']);
const ALLOWED_DISPOSITIONS = new Set([
  'IMPLEMENTED_EXACTLY',
  'IMPLEMENTED_WITH_DECLARED_APPROXIMATION',
]);

export function compileInputXmlStructuralConstraints({
  inventory,
  modelId,
  analysisProfileId,
  nodeRetargeting,
  conditionedNodeIds,
}) {
  const hangerResult = compileInputXmlHangerConstraints({
    inventory, modelId, analysisProfileId, nodeRetargeting, conditionedNodeIds,
  });
  const declarations = [...hangerResult.declarations];
  const bindings = [...hangerResult.bindings];
  const occupied = new Map();
  const retargeting = nodeRetargeting ?? {};
  const available = conditionedNodeIds === undefined || conditionedNodeIds === null
    ? null
    : new Set(conditionedNodeIds.map(String));
  const restraints = inventory
    .filter((row) => row.active && row.sourceKind === 'RESTRAINT')
    .sort((left, right) => compareAscii(left.inventoryId, right.inventoryId));

  for (const item of restraints) {
    const disposition = item.dispositionByProfile[analysisProfileId] ?? null;
    if (!ALLOWED_DISPOSITIONS.has(disposition?.disposition)) {
      fail(
        'INPUTXML_STRUCTURAL_RESTRAINT_NOT_REPRESENTABLE',
        `Restraint ${item.inventoryId} is not representable under ${analysisProfileId}.`,
        { inventoryId: item.inventoryId, disposition },
      );
    }
    const sourceNodeId = item.classification.nodeId ?? null;
    const targetDof = item.classification.targetDof;
    if (sourceNodeId === null || targetDof === null) {
      fail(
        'INPUTXML_STRUCTURAL_RESTRAINT_TARGET_INVALID',
        `Restraint ${item.inventoryId} has no valid node/DOF target.`,
        { inventoryId: item.inventoryId, sourceNodeId, targetDof },
      );
    }
    if (item.classification.finiteStiffnessActive
      && item.classification.stiffnessValue === null) {
      fail(
        'INPUTXML_STRUCTURAL_SPRING_RATE_UNRESOLVED',
        `Restraint ${item.inventoryId} declares a finite spring rate that cannot be converted to solver units.`,
        {
          inventoryId: item.inventoryId,
          stiffnessDeclared: item.classification.stiffnessDeclared ?? null,
          stiffnessUnitsResolvable: item.classification.stiffnessUnitsResolvable ?? false,
        },
      );
    }

    const targetNodeId = resolveStructuralConstraintNode(sourceNodeId, retargeting, item.inventoryId);
    requireStructuralConstraintNode(available, targetNodeId, item.inventoryId, sourceNodeId);

    const connectingDirection = restraintConnectingSpringDirection(item.classification);
    if (connectingDirection !== null) {
      const connectedSourceNodeId = String(item.classification.connectingNodeId);
      const connectedTargetNodeId = resolveStructuralConstraintNode(
        connectedSourceNodeId,
        retargeting,
        item.inventoryId,
      );
      requireStructuralConstraintNode(available, connectedTargetNodeId, item.inventoryId, connectedSourceNodeId);
      if (connectedTargetNodeId === targetNodeId) {
        fail(
          'INPUTXML_STRUCTURAL_CONNECTING_NODE_COLLAPSED',
          `Restraint ${item.inventoryId} primary and connecting nodes collapse to ${targetNodeId} after retopology.`,
          { inventoryId: item.inventoryId, sourceNodeId, connectedSourceNodeId, targetNodeId },
        );
      }
      const declarationId = `${modelId}-C-${safe(item.sourceFeatureId)}-CNODE`;
      declarations.push(Object.freeze({
        declarationId,
        kind: 'PARTIAL_RELEASE_SPRING',
        nodeId: `${modelId}.N${safe(targetNodeId)}`,
        connectedNodeId: `${modelId}.N${safe(connectedTargetNodeId)}`,
        dof: null,
        direction: Object.freeze([...connectingDirection]),
        stiffness: item.classification.stiffnessValue,
      }));
      bindings.push(Object.freeze({
        sourceFeatureId: item.sourceFeatureId,
        inventoryId: item.inventoryId,
        sourceRecordSemanticHash: item.sourceRecordSemanticHash,
        sourceNodeId: String(sourceNodeId),
        targetNodeId,
        connectedSourceNodeId,
        connectedTargetNodeId,
        retargetedByBendRetopology: targetNodeId !== String(sourceNodeId)
          || connectedTargetNodeId !== connectedSourceNodeId,
        targetDofs: TRANSLATIONAL_DOFS,
        implementation: disposition.disposition,
        limitationCode: disposition.limitationCode,
        limitationCodes: restraintApproximationCodes(item.classification),
        unilateralAction: restraintUnilateralAction(item.classification),
        declarationIds: Object.freeze([declarationId]),
      }));
      continue;
    }

    const directionalSpringDirection = restraintDirectionalSpringDirection(item.classification);
    if (directionalSpringDirection !== null) {
      const declarationId = `${modelId}-C-${safe(item.sourceFeatureId)}-DIR`;
      declarations.push(Object.freeze({
        declarationId,
        kind: 'PARTIAL_RELEASE_SPRING',
        nodeId: `${modelId}.N${safe(targetNodeId)}`,
        dof: null,
        direction: Object.freeze([...directionalSpringDirection]),
        stiffness: item.classification.stiffnessValue,
      }));
      bindings.push(Object.freeze({
        sourceFeatureId: item.sourceFeatureId,
        inventoryId: item.inventoryId,
        sourceRecordSemanticHash: item.sourceRecordSemanticHash,
        sourceNodeId: String(sourceNodeId),
        targetNodeId,
        retargetedByBendRetopology: targetNodeId !== String(sourceNodeId),
        targetDofs: TRANSLATIONAL_DOFS,
        implementation: disposition.disposition,
        limitationCode: disposition.limitationCode,
        limitationCodes: restraintApproximationCodes(item.classification),
        unilateralAction: restraintUnilateralAction(item.classification),
        declarationIds: Object.freeze([declarationId]),
      }));
      continue;
    }

    const dofs = targetDof === 'ALL' ? DOFS : [targetDof];
    const declarationIds = [];
    for (const dof of dofs) {
      const key = `${targetNodeId}:${dof}`;
      if (occupied.has(key)) {
        fail(
          'INPUTXML_STRUCTURAL_RESTRAINT_DOF_COLLISION',
          `Constraint target ${key} has more than one retained source declaration.`,
          { key, sourceFeatureIds: [occupied.get(key), item.sourceFeatureId] },
        );
      }
      occupied.set(key, item.sourceFeatureId);
      const declarationId = `${modelId}-C-${safe(item.sourceFeatureId)}-${dof}`;
      const springRate = item.classification.stiffnessValue ?? null;
      declarations.push(Object.freeze(springRate === null
        ? {
          declarationId,
          kind: 'NODAL_RESTRAINT',
          nodeId: `${modelId}.N${safe(targetNodeId)}`,
          dof,
          behavior: 'FIXED',
        }
        : {
          declarationId,
          kind: 'PARTIAL_RELEASE_SPRING',
          nodeId: `${modelId}.N${safe(targetNodeId)}`,
          dof,
          stiffness: springRate,
        }));
      declarationIds.push(declarationId);
    }
    bindings.push(Object.freeze({
      sourceFeatureId: item.sourceFeatureId,
      inventoryId: item.inventoryId,
      sourceRecordSemanticHash: item.sourceRecordSemanticHash,
      sourceNodeId: String(sourceNodeId),
      targetNodeId,
      retargetedByBendRetopology: targetNodeId !== String(sourceNodeId),
      targetDofs: Object.freeze([...dofs]),
      implementation: disposition.disposition,
      limitationCode: disposition.limitationCode,
      limitationCodes: restraintApproximationCodes(item.classification),
      unilateralAction: restraintUnilateralAction(item.classification),
      declarationIds: Object.freeze(declarationIds),
    }));
  }

  declarations.sort((left, right) => compareAscii(left.declarationId, right.declarationId));
  bindings.sort((left, right) => compareAscii(left.inventoryId, right.inventoryId));
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
