import {
  computePipingComponentSemanticHash,
  deriveMec21BendPressureFreeState,
  requirePipingComponent,
} from '../linear-fea-piping-components/index.js';
import {
  cleanVector,
  transformDisplacementToLocal,
  transformLoadToGlobal,
} from '../linear-fea-frame-element/frame-element-stiffness.js';
import { computeFrameElementSemanticHash, requireFrameElement } from '../linear-fea-frame-element/index.js';
import { bourdonAbcVectorToGlobal, buildBourdonBendSegments } from './bourdon-bend-segments.js';
import { failLinearPipingAnalysis } from './validation.js';
import { compareAscii } from './inputxml-linear-element-authority-support.js';

/**
 * Apply the Bourdon (bend-opening) pressure effect to bend arc chords.
 *
 * Pressure opens a bend: the curved pipe tries to straighten, and on a
 * restrained system that shows up as real load. It is an initial load rather
 * than a stiffness change, so unlike bend pressure stiffening it is naturally
 * per case and needs nothing from the sealed stiffness state.
 *
 * The physics is the shared MEC-21 kernel, unchanged. What this adds is the
 * per-chord sampling: each chord's free state is the difference between the
 * cumulative swept field at its two ends, both measured from the physical
 * bend's start. Sampling that way is what makes a free bend give
 * q = K(d - d0) = 0, so its endpoint does not move when the arc is subdivided
 * more finely.
 */
const CODE = 'BOURDON_AUGMENTATION_INVALID';

export function augmentPipingComponentBourdon({
  pipingComponents,
  bendGeometryByComponent,
  pressureByElement,
}) {
  const accepted = pipingComponents.map(requirePipingComponent);
  const augmented = accepted
    .map((component) => augmentComponent(component, bendGeometryByComponent, pressureByElement))
    .sort((left, right) => compareAscii(left.componentId, right.componentId));
  return Object.freeze(augmented);
}

function augmentComponent(component, bendGeometryByComponent, pressureByElement) {
  const geometry = bendGeometryByComponent.get(component.componentId) ?? null;
  if (geometry === null) return component;

  const segments = buildBourdonBendSegments({
    points: geometry.points,
    centre: geometry.centre,
    bendRadius: geometry.bendRadius,
    totalBendAngle: geometry.totalBendAngle,
    incomingDirection: geometry.incomingDirection,
    bendId: component.componentId,
  });
  if (segments.length !== component.elements.length) {
    failLinearPipingAnalysis(
      `Bourdon geometry for ${component.componentId} produced ${segments.length} chords `
      + `for ${component.elements.length} component elements.`,
      CODE,
      { componentId: component.componentId },
    );
  }

  let changed = false;
  const elements = component.elements.map((entry, index) => {
    const pressure = pressureByElement.get(entry.elementId) ?? null;
    // No pressure primitive on this chord, or one that does not authorize
    // Bourdon, leaves the chord exactly as it was.
    if (pressure === null || pressure.authorizedEffects?.bourdon !== true) return entry;
    changed = true;
    return {
      ...entry,
      frameElement: augmentFrameElementBourdon({
        frameElement: entry.frameElement,
        effectiveLocalStiffness: entry.effectiveLocalStiffness,
        segment: segments[index],
        pressure: pressure.pressure,
        geometry,
      }),
    };
  });
  if (!changed) return component;

  const draft = { ...component, elements, semanticHash: '' };
  draft.semanticHash = computePipingComponentSemanticHash(draft);
  return requirePipingComponent(draft);
}

function augmentFrameElementBourdon({
  frameElement, effectiveLocalStiffness, segment, pressure, geometry,
}) {
  const accepted = requireFrameElement(frameElement);
  const stateInput = {
    pressure,
    innerRadius: geometry.innerDiameter / 2,
    bendRadius: segment.bendRadius,
    elasticModulus: accepted.material.elasticModulus,
    secondMoment: accepted.section.secondMomentY,
    poissonRatio: geometry.poissonRatio,
  };
  const startState = deriveMec21BendPressureFreeState({ ...stateInput, bendAngle: segment.startAngle });
  const endState = deriveMec21BendPressureFreeState({ ...stateInput, bendAngle: segment.endAngle });

  // Both chord ends sampled in the bend's own reference frame, then taken to
  // global once, so the pair stays consistent.
  const freeDofGlobal = [
    ...bourdonAbcVectorToGlobal(segment.referenceAxes, startState.translationAbc),
    ...bourdonAbcVectorToGlobal(segment.referenceAxes, startState.rotationAbc),
    ...bourdonAbcVectorToGlobal(segment.referenceAxes, endState.translationAbc),
    ...bourdonAbcVectorToGlobal(segment.referenceAxes, endState.rotationAbc),
  ];
  const freeDofLocal = transformDisplacementToLocal(freeDofGlobal, accepted.transformation.matrix);
  const stiffness = effectiveLocalStiffness ?? accepted.localStiffness;
  const generatedLocal = matrixVector(stiffness, freeDofLocal, accepted.elementId);
  const generatedGlobal = transformLoadToGlobal(generatedLocal, accepted.transformation.matrix);

  const draft = {
    ...accepted,
    initialStrainLoadVector: {
      local: cleanVector(accepted.initialStrainLoadVector.local
        .map((value, index) => value + generatedLocal[index])),
      global: cleanVector(accepted.initialStrainLoadVector.global
        .map((value, index) => value + generatedGlobal[index])),
    },
    semanticHash: '',
  };
  // requireFrameElement validates the hash rather than computing it, so the
  // record is resealed here before it is handed back.
  draft.semanticHash = computeFrameElementSemanticHash(draft);
  return requireFrameElement(draft);
}

function matrixVector(matrix, vector, elementId) {
  // Effective local stiffness is retained flat (12x12 = 144), which is how the
  // component kernel stores it; nested rows are accepted too so this does not
  // depend on which of the two a caller happens to hold.
  const size = vector.length;
  if (Array.isArray(matrix) && matrix.length === size * size && !Array.isArray(matrix[0])) {
    return vector.map((_value, row) =>
      vector.reduce((sum, term, column) => sum + matrix[row * size + column] * term, 0));
  }
  if (Array.isArray(matrix) && matrix.length === size && Array.isArray(matrix[0])) {
    return matrix.map((row, index) => {
      if (row.length !== size) {
        failLinearPipingAnalysis(
          `Bourdon augmentation for ${elementId} found a ragged stiffness row at ${index}.`,
          CODE,
          { elementId, row: index },
        );
      }
      return row.reduce((sum, value, column) => sum + value * vector[column], 0);
    });
  }
  failLinearPipingAnalysis(
    `Bourdon augmentation for ${elementId} cannot multiply a ${size}-vector by a stiffness of `
    + `${Array.isArray(matrix) ? matrix.length : 'unknown'} entries.`,
    CODE,
    { elementId },
  );
  return [];
}
