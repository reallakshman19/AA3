import { InputXmlLinearStructuralPreparationError } from './inputxml-linear-structural-profile.js';
import {
  restraintApproximationCodes,
  restraintUnilateralAction,
} from './inputxml-feature-inventory-restraints.js';

const DOFS = Object.freeze(['UX', 'UY', 'UZ', 'RX', 'RY', 'RZ']);
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
  const declarations = [];
  const bindings = [];
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

    /*
     * A finite declared spring rate and an absent converted spring rate are not
     * the same state as "no spring was declared". The latter is a legitimate
     * rigid restraint; the former means force/length unit custody failed.
     *
     * resolveSpringRate() deliberately withholds stiffnessValue when the source
     * units cannot be resolved. Before this guard, the null below fell into the
     * NODAL_RESTRAINT/FIXED branch and silently made the requested compliant
     * support rigid. Keep this defense at the declaration owner boundary even
     * if an upstream inventory disposition is accidentally permissive.
     */
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

    const targetNodeId = structuralTargetNode(sourceNodeId, retargeting, item.inventoryId);
    if (available !== null && !available.has(targetNodeId)) {
      fail(
        'INPUTXML_STRUCTURAL_RESTRAINT_TARGET_MISSING_AFTER_RETOPOLOGY',
        `Restraint ${item.inventoryId} targets node ${targetNodeId}, which is absent after structural retopology.`,
        { inventoryId: item.inventoryId, sourceNodeId: String(sourceNodeId), targetNodeId },
      );
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
      /*
       * A restraint that declares a spring rate is a compliant support, not a
       * rigid one, and the compiler already has the kind for it:
       * PARTIAL_RELEASE_SPRING carries the rate and compiles to the solver's
       * LINEAR_SPRING behavior. NODAL_RESTRAINT deliberately does not accept a
       * spring behavior, so the kind is what changes here, not the behavior.
       */
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

function structuralTargetNode(sourceNodeId, retargeting, inventoryId) {
  const source = String(sourceNodeId);
  const record = retargeting[source] ?? null;
  if (record === null) return source;
  if (record.nearestNodeId === null || record.nearestNodeId === undefined) {
    fail(
      'INPUTXML_STRUCTURAL_RESTRAINT_RETOPOLOGY_AMBIGUOUS',
      `Restraint ${inventoryId} is bound to retired bend corner node ${source}, which has no unique retained structural target.`,
      {
        inventoryId,
        sourceNodeId: source,
        bendSegmentId: record.bendSegmentId ?? null,
        candidates: record.candidates ?? [],
      },
    );
  }
  return String(record.nearestNodeId);
}

function fail(code, message, data) {
  throw new InputXmlLinearStructuralPreparationError(message, code, data);
}

function safe(value) {
  return String(value).replace(/[^A-Za-z0-9_.-]/gu, '-');
}

function compareAscii(left, right) {
  const a = String(left);
  const b = String(right);
  return a < b ? -1 : a > b ? 1 : 0;
}
