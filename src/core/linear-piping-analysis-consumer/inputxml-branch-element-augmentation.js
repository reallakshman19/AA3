import {
  computeFrameElementSemanticHash,
  frameOffsetMatrix,
  requireFrameElement,
  transformDisplacementToLocal,
  transformLoadToGlobal,
} from '../linear-fea-frame-element/index.js';
import { elementAuthorityError } from './inputxml-linear-element-authority-support.js';

export function branchRigidOffsets(modifier) {
  if (modifier?.rigidOffset == null) return null;
  const offset = asOffsetRecord(modifier.rigidOffset);
  return modifier.junctionEnd === 'I'
    ? { I: offset, J: null }
    : { I: null, J: offset };
}

export function branchPhysicalEndpoint(point, modifier, end) {
  if (modifier?.rigidOffset == null || modifier.junctionEnd !== end) return point;
  return point.map((value, index) => value + modifier.rigidOffset[index]);
}

/**
 * Add the qualified run-surface thermal free growth after tee spring
 * condensation. This mirrors the M047 CAESAR qualification ordering.
 */
export function augmentBranchRigidThermalFreeState(frameElement, modifier, temperatureByElement) {
  const frame = requireFrameElement(frameElement);
  if (modifier?.rigidOffset == null || temperatureByElement.size === 0) return frame;
  const authority = modifier.runThermalAuthority;
  const temperatures = authority.runElementIds.map((elementId) => temperatureByElement.get(elementId) ?? null);
  if (temperatures.some((row) => row === null)) {
    fail('BRANCH_RUN_THERMAL_AUTHORITY_MISSING',
      `Tee ${modifier.junctionNodeId} thermal case lacks a temperature primitive on each run leg.`);
  }
  const first = temperatures[0];
  for (const row of temperatures) {
    if (row.operatingTemperature !== first.operatingTemperature
      || row.installationTemperature !== first.installationTemperature
      || row.stiffnessEvaluationMaterialStateId !== authority.materialStateId) {
      fail('BRANCH_RUN_THERMAL_AUTHORITY_MISMATCH',
        `Tee ${modifier.junctionNodeId} run legs do not share one qualified thermal/material state.`);
    }
  }
  const strain = authority.thermalExpansionCoefficient
    * (first.operatingTemperature - first.installationTemperature);
  const freeTranslationGlobal = modifier.rigidOffset.map((value) => value * strain);
  const freeDofGlobal = new Array(12).fill(0);
  const base = modifier.junctionEnd === 'I' ? 0 : 6;
  freeDofGlobal[base] = freeTranslationGlobal[0];
  freeDofGlobal[base + 1] = freeTranslationGlobal[1];
  freeDofGlobal[base + 2] = freeTranslationGlobal[2];
  const freeDofLocal = transformDisplacementToLocal(freeDofGlobal, frame.transformation.matrix);
  const freeLoadLocal = matrixVector12(frame.localStiffness, freeDofLocal);
  const addedLocal = freeLoadLocal.map((value) => -value);
  let addedGlobal = transformLoadToGlobal(addedLocal, frame.transformation.matrix);
  if (frame.rigidOffsets.I !== null || frame.rigidOffsets.J !== null) {
    addedGlobal = transformLoadToGlobal(addedGlobal, frameOffsetMatrix(frame.rigidOffsets));
  }
  const draft = {
    ...frame,
    initialStrainLoadVector: {
      local: frame.initialStrainLoadVector.local.map((value, index) => value + addedLocal[index]),
      global: frame.initialStrainLoadVector.global.map((value, index) => value + addedGlobal[index]),
    },
    semanticHash: '',
  };
  draft.semanticHash = computeFrameElementSemanticHash(draft);
  return requireFrameElement(draft);
}

function matrixVector12(matrix, vector) {
  if (!Array.isArray(matrix) || matrix.length !== 144 || !Array.isArray(vector) || vector.length !== 12) {
    fail('BRANCH_RIGID_THERMAL_MATRIX_INVALID', 'Tee rigid thermal conversion requires a 12x12 matrix and 12-vector.');
  }
  return Array.from({ length: 12 }, (_, row) => {
    let sum = 0;
    for (let column = 0; column < 12; column += 1) sum += matrix[row * 12 + column] * vector[column];
    return Math.abs(sum) < 1e-15 ? 0 : sum;
  });
}
function asOffsetRecord(value) {
  if (!Array.isArray(value) || value.length !== 3 || value.some((entry) => !Number.isFinite(entry))) {
    fail('BRANCH_RIGID_OFFSET_INVALID', 'Tee rigid offset must be a finite three-component vector.');
  }
  return { x: value[0], y: value[1], z: value[2] };
}
function fail(code, message, data) { throw elementAuthorityError(code, message, data); }
