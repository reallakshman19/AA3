import {
  LINEAR_FEA_MATERIAL_RESOLUTION_PROFILE,
  resolveLinearFeaMaterialState,
  sealMaterialTable,
} from '../linear-fea-material/index.js';
import {
  PIPE_SECTION_FORMULATION_ID,
  PIPE_SECTION_PROFILE,
  PIPE_SECTION_REQUEST_SCHEMA,
  computePipeSectionRequestSemanticHash,
  resolvePipeSection,
} from '../linear-fea-section/index.js';
import {
  RIGID_ELEMENT_REQUEST_SCHEMA,
  compileCaesarRigidElementAuthority,
  sealRigidElementRequest,
} from '../linear-fea-rigid-element/index.js';
import { semanticHash } from '../shared-piping-model/canonical-json.js';
import {
  INPUTXML_GRAVITY_ACCELERATION,
  InputXmlLinearSolvePreparationError,
} from './inputxml-linear-preparation-profile.js';
import {
  authoritySourceEvidence,
  finiteAuthorityValue,
  positiveAuthorityValue,
} from './inputxml-linear-preparation-authority-support.js';

export function materialFor({
  segment,
  element,
  analysis,
  evaluationTemperature,
  thermalAuthority,
  sourceBundleSemanticHash,
  modelId,
  materialBySignature,
  materialResolutions,
}) {
  const elasticModulus = positiveAuthorityValue(analysis.elasticModulus, segment.id, 'elasticModulus');
  const poissonRatio = finiteAuthorityValue(analysis.poissonRatio);
  const massDensity = positiveAuthorityValue(analysis.pipeDensity, segment.id, 'pipeDensity');
  if (!(poissonRatio > 0 && poissonRatio < 0.5)) {
    throw new InputXmlLinearSolvePreparationError(
      `Segment ${segment.id} Poisson ratio must be in (0, 0.5).`,
      'INPUTXML_PREPARATION_POISSON_RATIO_INVALID',
      { segmentId: segment.id, poissonRatio },
    );
  }
  const thermalExpansionCoefficient = thermalAuthority.coefficientPerKelvin ?? 0;
  const signature = semanticHash({
    materialNumber: segment.meta?.materialNumber ?? null,
    materialName: segment.material ?? null,
    elasticModulus,
    poissonRatio,
    massDensity,
    evaluationTemperature,
    thermalExpansionCoefficient,
    thermalUsageAuthorized: thermalAuthority.status === 'RESOLVED',
  });
  if (materialBySignature.has(signature)) return materialBySignature.get(signature);
  const materialOrdinal = materialResolutions.length + 1;
  const materialId = `${modelId}-MATERIAL-${materialOrdinal}`;
  const table = sealMaterialTable({
    schema: 'fea-linear-material-table/v1',
    materialId,
    sourceEvidence: authoritySourceEvidence({
      sourceId: `${materialId}-SOURCE`,
      sourceRevision: sourceBundleSemanticHash,
      sourceFeatureId: element.sourceFeatureId,
      sourceIndex: element.sourceIndex,
      materialNumber: segment.meta?.materialNumber ?? null,
      materialName: segment.material ?? null,
      fieldEvidence: {
        MODULUS: element.fieldEvidence.MODULUS,
        POISSONS: element.fieldEvidence.POISSONS,
        PIPE_DENSITY: element.fieldEvidence.PIPE_DENSITY,
      },
      thermalAuthority,
    }),
    points: [{
      absoluteTemperature: evaluationTemperature,
      elasticModulus,
      shearModulus: elasticModulus / (2 * (1 + poissonRatio)),
      poissonRatio,
      massDensity,
      thermalExpansionCoefficient,
    }],
    semanticHash: '',
  });
  const resolution = resolveLinearFeaMaterialState({
    table,
    request: {
      materialStateId: `${modelId}-MAT-${materialOrdinal}`,
      materialId,
      evaluationTemperature,
    },
    profile: LINEAR_FEA_MATERIAL_RESOLUTION_PROFILE,
  });
  materialBySignature.set(signature, resolution);
  materialResolutions.push(resolution);
  return resolution;
}

export function sectionFor({
  segment,
  element,
  sourceBundleSemanticHash,
  modelId,
  sectionBySignature,
  sectionResolutions,
}) {
  return resolveSectionShared({
    outerDiameter: positiveAuthorityValue(segment.diameter, segment.id, 'diameter'),
    wallThickness: positiveAuthorityValue(segment.thickness, segment.id, 'thickness'),
    sourceId: `${modelId}-PHYSICAL-SECTION`,
    sourceRevision: sourceBundleSemanticHash,
    sourceRecord: {
      sourceFeatureId: element.sourceFeatureId,
      sourceIndex: element.sourceIndex,
      diameter: element.fieldEvidence.DIAMETER,
      wallThickness: element.fieldEvidence.WALL_THICK,
    },
    modelId,
    sectionBySignature,
    sectionResolutions,
  });
}

export function rigidSectionFor({
  segment,
  rigidAuthority,
  sourceBundleSemanticHash,
  modelId,
  sectionBySignature,
  sectionResolutions,
}) {
  return resolveSectionShared({
    outerDiameter: rigidAuthority.stiffnessSection.outsideDiameter,
    wallThickness: rigidAuthority.stiffnessSection.wallThickness,
    sourceId: `${modelId}-RIGID-STIFFNESS-SECTION`,
    sourceRevision: sourceBundleSemanticHash,
    sourceRecord: { segmentId: segment.id, rigidAuthoritySemanticHash: rigidAuthority.semanticHash },
    modelId,
    sectionBySignature,
    sectionResolutions,
  });
}

export function rigidFor({
  segment,
  element,
  rigidFeature,
  analysis,
  physicalSection,
  materialResolution,
  thermalAuthority,
  installationTemperature,
  sourceBundleSemanticHash,
  modelId,
}) {
  const operatingTemperature = finiteAuthorityValue(analysis.operatingTemperature)
    ?? installationTemperature;
  const request = sealRigidElementRequest({
    schema: RIGID_ELEMENT_REQUEST_SCHEMA,
    rigidElementId: `${modelId}-RIGID-${segment.id}`,
    length: positiveAuthorityValue(segment.length, segment.id, 'length'),
    insideDiameter: physicalSection.dimensions.innerDiameter,
    enteredOutsideDiameter: physicalSection.dimensions.outerDiameter,
    pipeWallThickness: physicalSection.dimensions.wallThickness,
    enteredRigidWeight: finiteAuthorityValue(analysis.rigid?.weight) ?? 0,
    fluidDensity: finiteAuthorityValue(analysis.fluidDensity) ?? 0,
    insulationThickness: finiteAuthorityValue(analysis.insulationThickness) ?? 0,
    insulationDensity: finiteAuthorityValue(analysis.insulationDensity) ?? 0,
    refractoryWeight: 0,
    claddingWeight: 0,
    gravityAcceleration: INPUTXML_GRAVITY_ACCELERATION.value,
    installationTemperature,
    operatingTemperature,
    material: {
      elasticModulus: materialResolution.materialState.elasticModulus,
      shearModulus: materialResolution.materialState.shearModulus,
      thermalExpansionCoefficient: thermalAuthority.coefficientPerKelvin ?? 0,
    },
    sourceEvidence: authoritySourceEvidence({
      sourceId: rigidFeature.sourceFeatureId,
      sourceRevision: sourceBundleSemanticHash,
      sourceFeature: rigidFeature,
      sourceElementIndex: element.sourceIndex,
      physicalSectionSemanticHash: physicalSection.semanticHash,
      thermalAuthority,
    }),
    semanticHash: '',
  });
  return compileCaesarRigidElementAuthority(request);
}

function resolveSectionShared({
  outerDiameter,
  wallThickness,
  sourceId,
  sourceRevision,
  sourceRecord,
  modelId,
  sectionBySignature,
  sectionResolutions,
}) {
  const signature = semanticHash({ outerDiameter, wallThickness });
  if (sectionBySignature.has(signature)) return sectionBySignature.get(signature);
  const sectionStateId = `${modelId}-SEC-${sectionResolutions.length + 1}`;
  const payload = {
    schema: PIPE_SECTION_REQUEST_SCHEMA,
    sectionStateId,
    formulationId: PIPE_SECTION_FORMULATION_ID,
    outerDiameter,
    wallThickness,
    sourceEvidence: authoritySourceEvidence({
      sourceId, sourceRevision, sourceRecord, outerDiameter, wallThickness,
    }),
  };
  const section = resolvePipeSection({
    request: { ...payload, semanticHash: computePipeSectionRequestSemanticHash(payload) },
    profile: PIPE_SECTION_PROFILE,
  });
  sectionBySignature.set(signature, section);
  sectionResolutions.push(section);
  return section;
}
