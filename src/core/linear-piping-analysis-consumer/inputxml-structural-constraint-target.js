import { InputXmlLinearStructuralPreparationError } from './inputxml-linear-structural-profile.js';

export function resolveStructuralConstraintNode(sourceNodeId, retargeting, inventoryId) {
  const source = String(sourceNodeId);
  const record = (retargeting ?? {})[source] ?? null;
  if (record === null) return source;
  if (record.nearestNodeId === null || record.nearestNodeId === undefined) {
    fail(
      'INPUTXML_STRUCTURAL_RESTRAINT_RETOPOLOGY_AMBIGUOUS',
      `Constraint ${inventoryId} targets retired bend corner node ${source}, which has no unique retained structural target.`,
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

export function requireStructuralConstraintNode(available, targetNodeId, inventoryId, sourceNodeId) {
  if (available === null || available.has(targetNodeId)) return;
  fail(
    'INPUTXML_STRUCTURAL_RESTRAINT_TARGET_MISSING_AFTER_RETOPOLOGY',
    `Constraint ${inventoryId} targets node ${targetNodeId}, which is absent after structural retopology.`,
    { inventoryId, sourceNodeId: String(sourceNodeId), targetNodeId },
  );
}

function fail(code, message, data) {
  throw new InputXmlLinearStructuralPreparationError(message, code, data);
}
