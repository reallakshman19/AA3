import { semanticHash } from '../shared-piping-model/canonical-json.js';
import { INPUTXML_GRAVITY_ACCELERATION } from './inputxml-linear-preparation-profile.js';
import {
  authoritySourceEvidence,
  finiteAuthorityValue,
} from './inputxml-linear-preparation-authority-support.js';
import { productionAuthorizedPressureEffects } from './production-capability-profile.js';

const ZERO_TOLERANCE = 1e-12;

export function loadBindingFor({
  segment,
  element,
  analysis,
  materialResolution,
  physicalSection,
  rigidAuthority,
  thermalAuthority,
  installationTemperature,
  modelId,
  sourceBundleSemanticHash,
}) {
  return Object.freeze({
    loadBindingId: `${modelId}:LOAD:${segment.id}`,
    segmentId: String(segment.id),
    sourceFeatureId: element.sourceFeatureId,
    gravity: gravityAuthority({
      segment, element, analysis, materialResolution, physicalSection, rigidAuthority,
      modelId, sourceBundleSemanticHash,
    }),
    pressure: pressureAuthority(segment, element, analysis, modelId, sourceBundleSemanticHash),
    thermal: thermalLoadAuthority(
      segment, element, analysis, thermalAuthority, installationTemperature,
      modelId, sourceBundleSemanticHash,
    ),
  });
}

function gravityAuthority({
  segment,
  element,
  analysis,
  materialResolution,
  physicalSection,
  rigidAuthority,
  modelId,
  sourceBundleSemanticHash,
}) {
  if (rigidAuthority !== null) {
    const payload = {
      kind: 'DISTRIBUTED_GRAVITY_LINE_LOAD',
      basis: 'GLOBAL', direction: [0, -1, 0],
      lineForcePerLength: rigidAuthority.gravity.totalLineWeight,
      componentWeightsPerLength: null,
      sourceAuthority: 'RIGID_ELEMENT_AUTHORITY',
      rigidAuthoritySemanticHash: rigidAuthority.semanticHash,
    };
    return Object.freeze({
      ...payload, semanticHash: semanticHash(payload),
      sourceEvidence: authoritySourceEvidence({
        sourceId: `${modelId}-GRAVITY-${segment.id}`,
        sourceRevision: sourceBundleSemanticHash,
        sourceFeatureId: element.sourceFeatureId,
        rigidAuthoritySemanticHash: rigidAuthority.semanticHash,
      }),
    });
  }
  const area = physicalSection.sectionState.area;
  const innerDiameter = physicalSection.dimensions.innerDiameter;
  const pipeMassPerLength = materialResolution.materialState.massDensity * area;
  const fluidDensity = finiteAuthorityValue(analysis.fluidDensity) ?? 0;
  const contentsArea = Math.PI * innerDiameter ** 2 / 4;
  const contentsMassPerLength = fluidDensity * contentsArea;
  const insulationThickness = finiteAuthorityValue(analysis.insulationThickness) ?? 0;
  const insulationDensity = finiteAuthorityValue(analysis.insulationDensity) ?? 0;
  const outsideDiameter = physicalSection.dimensions.outerDiameter;
  const insulatedDiameter = outsideDiameter + 2 * insulationThickness;
  const insulationArea = Math.PI * (insulatedDiameter ** 2 - outsideDiameter ** 2) / 4;
  const insulationMassPerLength = insulationDensity * insulationArea;
  const componentWeightsPerLength = {
    pipe: pipeMassPerLength * INPUTXML_GRAVITY_ACCELERATION.value,
    contents: contentsMassPerLength * INPUTXML_GRAVITY_ACCELERATION.value,
    insulation: insulationMassPerLength * INPUTXML_GRAVITY_ACCELERATION.value,
  };
  const lineForcePerLength = Object.values(componentWeightsPerLength).reduce((sum, value) => sum + value, 0);
  const payload = {
    kind: 'DISTRIBUTED_GRAVITY_LINE_LOAD', basis: 'GLOBAL', direction: [0, -1, 0],
    lineForcePerLength, componentWeightsPerLength,
    sourceAuthority: 'PREPARED_PHYSICAL_LINE_WEIGHT', rigidAuthoritySemanticHash: null,
  };
  return Object.freeze({
    ...payload, semanticHash: semanticHash(payload),
    sourceEvidence: authoritySourceEvidence({
      sourceId: `${modelId}-GRAVITY-${segment.id}`,
      sourceRevision: sourceBundleSemanticHash,
      sourceFeatureId: element.sourceFeatureId,
      materialResolutionSemanticHash: materialResolution.semanticHash,
      physicalSectionSemanticHash: physicalSection.semanticHash,
      fieldEvidence: {
        FLUID_DENSITY: element.fieldEvidence.FLUID_DENSITY,
        INSUL_THICK: element.fieldEvidence.INSUL_THICK,
        INSUL_DENSITY: element.fieldEvidence.INSUL_DENSITY,
      },
    }),
  });
}

function pressureAuthority(segment, element, analysis, modelId, sourceBundleSemanticHash) {
  const pressure = finiteAuthorityValue(analysis.pressure);
  const active = pressure !== null && Math.abs(pressure) > ZERO_TOLERANCE;
  const payload = {
    kind: 'PRESSURE_INPUT_CUSTODY', active,
    pressure: active ? pressure : null,
    pressureBasis: active ? 'GAUGE' : null,
    authorizedEffects: active ? productionAuthorizedPressureEffects() : null,
  };
  return Object.freeze({
    ...payload, semanticHash: semanticHash(payload),
    sourceEvidence: authoritySourceEvidence({
      sourceId: `${modelId}-PRESSURE-${segment.id}`,
      sourceRevision: sourceBundleSemanticHash,
      sourceFeatureId: element.sourceFeatureId,
      fieldEvidence: element.fieldEvidence.PRESSURE1,
    }),
  });
}

function thermalLoadAuthority(
  segment,
  element,
  analysis,
  thermalAuthority,
  installationTemperature,
  modelId,
  sourceBundleSemanticHash,
) {
  const operatingTemperature = finiteAuthorityValue(analysis.operatingTemperature);
  const active = operatingTemperature !== null;
  const resolved = active && thermalAuthority.status === 'RESOLVED';
  const deltaTemperature = active ? operatingTemperature - installationTemperature : null;
  const thermalStrain = resolved ? thermalAuthority.coefficientPerKelvin * deltaTemperature : null;
  const payload = {
    kind: 'UNIFORM_TEMPERATURE_INPUT_CUSTODY', active,
    status: !active ? 'NOT_ACTIVE' : resolved ? 'RESOLVED' : 'UNRESOLVED',
    installationTemperature,
    operatingTemperature, deltaTemperature,
    coefficientPerKelvin: resolved ? thermalAuthority.coefficientPerKelvin : null,
    thermalStrain,
    thermalAuthoritySemanticHash: thermalAuthority.semanticHash,
  };
  return Object.freeze({
    ...payload, semanticHash: semanticHash(payload),
    sourceEvidence: authoritySourceEvidence({
      sourceId: `${modelId}-THERMAL-${segment.id}`,
      sourceRevision: sourceBundleSemanticHash,
      sourceFeatureId: element.sourceFeatureId,
      fieldEvidence: element.fieldEvidence.TEMP_EXP_C1,
      materialNumber: segment.meta?.materialNumber ?? null,
      thermalAuthority,
    }),
  });
}
