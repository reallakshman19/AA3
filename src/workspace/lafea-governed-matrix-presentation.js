/**
 * Declared presentation-only identity × value-column families for governed inputs.
 *
 * This module may group existing StageInputDescriptor instances for display. It
 * does not define engineering values, entity identity, edit authority, source
 * custody, invalidation, pressure mechanics, or calculation behavior.
 */

export const LAFEA_GOVERNED_MATRIX_PRESENTATION_SCHEMA =
  'lafea-governed-matrix-presentation/v1';

const MATRIX_FAMILIES = Object.freeze([
  deepFreeze({
    schema: LAFEA_GOVERNED_MATRIX_PRESENTATION_SCHEMA,
    familyId: 'LAFEA.1.pressure',
    groupId: 'PRESSURE',
    rowLabel: 'Pressure',
    columns: [
      {
        columnId: 'INTERNAL',
        label: 'Internal',
        descriptorId: 'LAFEA.1.pressure.internal',
      },
      {
        columnId: 'EXTERNAL',
        label: 'External',
        descriptorId: 'LAFEA.1.pressure.external',
      },
    ],
  }),
]);

/**
 * Resolve complete, compatible declared matrix families from an exact descriptor set.
 *
 * Returned Map keys are descriptor IDs. A family is omitted entirely when any
 * declared column is absent or when its descriptors disagree on the engineering
 * identity collection, value contract, unit contract, invalidation, or edit/source
 * authority. The renderer can therefore fall back without guessing.
 */
export function collectDeclaredGovernedMatrices(descriptors) {
  const byId = new Map(descriptors.map((descriptor) => [descriptor.descriptorId, descriptor]));
  const result = new Map();

  MATRIX_FAMILIES.forEach((definition) => {
    const members = definition.columns.map((column) => ({
      ...column,
      descriptor: byId.get(column.descriptorId) ?? null,
    }));
    if (members.some((member) => !member.descriptor)) return;

    const basis = members[0].descriptor;
    if (!isMatrixBasis(basis, definition)) return;
    if (!members.every((member) => matrixCompatible(basis, member.descriptor, definition))) return;

    const matrix = Object.freeze({
      familyId: definition.familyId,
      groupId: definition.groupId,
      rowLabel: definition.rowLabel,
      target: Object.freeze({
        collectionPath: basis.target.collectionPath,
        identityKey: basis.target.identityKey,
      }),
      columns: Object.freeze(members.map((member) => Object.freeze({
        columnId: member.columnId,
        label: member.label,
        descriptor: member.descriptor,
      }))),
    });
    members.forEach((member) => result.set(member.descriptor.descriptorId, matrix));
  });

  return result;
}

export function lafeaGovernedMatrixDefinitions() {
  return MATRIX_FAMILIES;
}

function isMatrixBasis(descriptor, definition) {
  return descriptor?.valueContract?.domainType === 'NUMBER'
    && descriptor?.presentation?.control === 'NUMBER'
    && descriptor?.presentation?.groupId === definition.groupId
    && typeof descriptor?.target?.collectionPath === 'string'
    && descriptor.target.collectionPath.length > 0
    && typeof descriptor?.target?.identityKey === 'string'
    && descriptor.target.identityKey.length > 0;
}

function matrixCompatible(basis, candidate, definition) {
  return candidate?.stageId === basis.stageId
    && candidate?.presentation?.groupId === definition.groupId
    && candidate?.presentation?.control === basis.presentation.control
    && candidate?.target?.collectionPath === basis.target.collectionPath
    && candidate?.target?.identityKey === basis.target.identityKey
    && equalContract(candidate?.valueContract, basis.valueContract)
    && equalContract(candidate?.unitContract, basis.unitContract)
    && equalContract(candidate?.invalidation, basis.invalidation)
    && equalContract(candidate?.authority, basis.authority);
}

function equalContract(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
