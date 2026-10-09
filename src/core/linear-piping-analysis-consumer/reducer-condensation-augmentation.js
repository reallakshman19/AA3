import {
  REDUCER_CONDENSATION_REQUEST_SCHEMA,
  REDUCER_SAMPLING_RULE,
  REDUCER_SEGMENT_COUNT,
  compileTenCylinderReducerAuthority,
  sealReducerCondensationRequest,
} from '../linear-fea-reducer-condensation/index.js';
import { computeFrameElementSemanticHash, requireFrameElement } from '../linear-fea-frame-element/index.js';
import {
  applyOffsetToLoad,
  applyOffsetToStiffness,
  cleanVector,
  frameOffsetMatrix,
  transformLoadToGlobal,
  transformStiffnessToGlobal,
} from '../linear-fea-frame-element/frame-element-stiffness.js';
import { failLinearPipingAnalysis } from './validation.js';
import { INPUTXML_GRAVITY_ACCELERATION } from './inputxml-linear-preparation-profile.js';

/**
 * Replace a reducer's prismatic stiffness with the ten-cylinder condensed one.
 *
 * Production keeps one analysis element per reducer span -- unlike a bend,
 * nothing re-topologizes it -- so the ten cylinders are condensed to the twelve
 * boundary DOFs that element already has. That is why this is an augmentation
 * rather than a component: the element identity, nodes and bindings are
 * untouched, and only the stiffness and the load vectors it was carrying under
 * the uniform-section approximation are replaced.
 *
 * Applied only when the capability profile authorizes exact reducer mechanics,
 * which in turn requires the explicit owner authorization record in
 * reducer-production-authorization.js.
 */
const CODE = 'REDUCER_AUGMENTATION_INVALID';

/**
 * An explicit engineering-authority boundary for a tapered reducer under
 * pressure. The candidate ten-cylinder request only carries thermal initial
 * strain; it has no pressure input or qualified axial-pressure section rule.
 * Replacing an existing pressure+thermal vector with its thermal-only result
 * would silently delete a physical pressure load while leaving a sealed frame.
 */
export function requireReducerAxialPressureBasis(frame, reducerId) {
  const pressure = frame?.pressure ?? null;
  if (pressure?.axialThrustApplied === true && pressure.axialStrain !== 0) {
    failLinearPipingAnalysis(
      `Reducer ${reducerId} cannot replace its pressure axial initial strain with a thermal-only ten-cylinder condensed vector.`,
      'REDUCER_TAPERED_AXIAL_PRESSURE_BASIS_UNQUALIFIED',
      {
        reducerId,
        pressurePrimitiveId: pressure.primitiveId,
        pressureAxialStrain: pressure.axialStrain,
        missingAuthority: 'TAPER_AWARE_AXIAL_PRESSURE_INITIAL_STRAIN_CONDENSATION',
      },
    );
  }
}

export function augmentFrameElementReducer(input) {
  const accepted = requireFrameElement(input.frameElement);
  // The pressure authority check precedes both condenser evaluation and the
  // re-sealing of any local/global matrix. No partial candidate escapes.
  requireReducerAxialPressureBasis(accepted, input.reducerId);
  const { reducer, section, material, gravityDirectionLocal, thermal, gravity, sourceEvidence } = input;

  const request = sealReducerCondensationRequest({
    schema: REDUCER_CONDENSATION_REQUEST_SCHEMA,
    reducerId: input.reducerId,
    length: accepted.geometry.length,
    fromSection: {
      outerDiameter: requirePositive(section.dimensions?.outerDiameter, 'fromSection.outerDiameter', input.reducerId),
      wallThickness: requirePositive(section.dimensions?.wallThickness, 'fromSection.wallThickness', input.reducerId),
    },
    toSection: {
      outerDiameter: requirePositive(reducer.toOuterDiameter, 'toSection.outerDiameter', input.reducerId),
      wallThickness: requirePositive(reducer.toWallThickness, 'toSection.wallThickness', input.reducerId),
    },
    segmentCount: REDUCER_SEGMENT_COUNT,
    samplingRule: REDUCER_SAMPLING_RULE,
    material: {
      elasticModulus: material.elasticModulus,
      shearModulus: material.shearModulus,
      massDensity: material.massDensity,
      thermalExpansionCoefficient: material.thermalExpansionCoefficient,
    },
    gravity,
    thermal,
    sourceEvidence,
    semanticHash: '',
  });
  const authority = compileTenCylinderReducerAuthority(request);

  // The condensed stiffness and load vectors replace the prismatic ones rather
  // than adding to them: the uniform-section element was standing in for this
  // reducer, and both cannot be present at once.
  const localStiffness = cleanVector([...authority.condensed.localStiffness]);
  const equivalentLocal = cleanVector([...authority.condensed.gravityLocalVector]);
  const initialStrainLocal = cleanVector([...authority.condensed.thermalInitialStrainLocalVector]);
  // The solver assembles GLOBAL contributions, not localStiffness. A previous
  // revision replaced only the three LOCAL arrays and re-sealed their hash,
  // leaving the *prismatic* global stiffness/load arrays in the solver. That
  // made the apparent ten-cylinder candidate mechanically inert or inconsistent.
  // Reuse the exact sealed element-axis and offset maps from the frame kernel;
  // never infer a new orientation or apply an end offset twice.
  const transformation = accepted.transformation.matrix;
  const offsets = accepted.rigidOffsets;
  const offsetMatrix = offsets.I === null && offsets.J === null
    ? null
    : frameOffsetMatrix(offsets);
  let globalStiffness = transformStiffnessToGlobal(localStiffness, transformation);
  let equivalentGlobal = transformLoadToGlobal(equivalentLocal, transformation);
  let initialStrainGlobal = transformLoadToGlobal(initialStrainLocal, transformation);
  if (offsetMatrix !== null) {
    globalStiffness = applyOffsetToStiffness(globalStiffness, offsetMatrix);
    equivalentGlobal = applyOffsetToLoad(equivalentGlobal, offsetMatrix);
    initialStrainGlobal = applyOffsetToLoad(initialStrainGlobal, offsetMatrix);
  }
  const draft = {
    ...accepted,
    localStiffness,
    globalStiffness,
    equivalentLoadVector: {
      local: equivalentLocal,
      global: equivalentGlobal,
    },
    initialStrainLoadVector: {
      local: initialStrainLocal,
      global: initialStrainGlobal,
    },
    semanticHash: '',
  };
  draft.semanticHash = computeFrameElementSemanticHash(draft);
  return requireFrameElement(draft);
}

function requirePositive(value, field, reducerId) {
  if (!Number.isFinite(value) || value <= 0) {
    failLinearPipingAnalysis(
      `Reducer ${reducerId} cannot resolve ${field} for ten-cylinder condensation.`,
      CODE,
      { reducerId, field, value },
    );
  }
  return value;
}

/**
 * Source-segment metadata by model element id.
 *
 * The reducer's To section, fluid and insulation live on the source segment,
 * not on the compiled element, so the structural binding is what connects them.
 */
export function buildSegmentMetaIndex(structuralPreparation, sourceSegments) {
  const metaBySourceId = new Map(sourceSegments.map((row) => [String(row.id), row.meta ?? {}]));
  const byElementId = new Map();
  for (const binding of structuralPreparation.segmentBindings) {
    const meta = metaBySourceId.get(String(binding.segmentId)) ?? null;
    if (meta !== null) byElementId.set(String(binding.elementId), meta);

  }
  return byElementId;
}

/** Gravity in the reducer's own local frame, as the condensation asks for it. */
export function reducerGravityRequest(meta, frameElement, gravityIncluded) {
  const analysis = meta?.analysis ?? {};
  const axes = frameElement.localAxes?.axes ?? null;
  return {
    enabled: gravityIncluded === true,
    acceleration: INPUTXML_GRAVITY_ACCELERATION.value,
    // The global gravity direction expressed on the element's own triad. The
    // component weights are computed by the condensation from these densities,
    // exactly as the benchmark does, rather than from a pre-summed line load --
    // a condensed first moment needs to know which part of the weight sits where.
    directionLocal: projectGravityToLocal(axes),
    fluidDensity: finiteOrZero(analysis.fluidDensity),
    insulationThickness: finiteOrZero(analysis.insulationThickness),
    insulationDensity: finiteOrZero(analysis.insulationDensity),
  };
}

/**
 * The condensation always wants a thermal pair. An element carrying no
 * temperature primitive is not "no thermal input" -- it is a zero thermal
 * state, which is installation temperature on both ends.
 */
export function reducerThermalRequest(temperaturePrimitive) {
  const installation = finiteOrZero(temperaturePrimitive?.installationTemperature);
  return {
    installationTemperature: installation,
    operatingTemperature: temperaturePrimitive === null || temperaturePrimitive === undefined
      ? installation
      : finiteOrZero(temperaturePrimitive.operatingTemperature),
  };
}

function projectGravityToLocal(axes) {
  if (!axes || !axes.x || !axes.y || !axes.z) {
    failLinearPipingAnalysis(
      'A reducer needs its compiled local triad to express gravity in local components.',
      'REDUCER_LOCAL_AXES_UNAVAILABLE', {});
  }
  const global = [0, -1, 0];
  return [axes.x, axes.y, axes.z].map((axis) =>
    axis[0] * global[0] + axis[1] * global[1] + axis[2] * global[2]);
}

function finiteOrZero(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}
