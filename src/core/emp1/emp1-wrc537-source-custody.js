import { semanticHash } from '../shared-primitives/canonical-json.js';
import {
  createCorrelationGeometryEvidenceFromLafea2,
  validateCorrelationGeometryEvidence,
} from '../local-attachment-correlation/index.js';
import { reconstructResultHashes } from '../local-stress/index.js';
import { deriveEmp1Wrc537CylindricalBoundedGeometry } from './emp1-wrc537-cylindrical-bounded-adapter.js';
import {
  createEmp1Wrc537UnityStressConcentrationAuthority,
  requireEmp1Wrc537UnityStressConcentrationAuthority,
} from './emp1-wrc537-stress-concentration-authority.js';

export const EMP1_WRC537_RETAINED_SCREENING_LAYER_SCHEMA =
  'emp1-b-retained-screening-layer/v1';
export const EMP1_WRC537_SOURCE_CUSTODY_SCHEMA =
  'emp1-wrc537-source-custody/v1';
export const EMP1_WRC537_ATTACHMENT_GEOMETRY_EVIDENCE_SCHEMA =
  'emp1-wrc537-attachment-geometry-evidence/v1';
export const EMP1_WRC537_R0_BASIS = 'OUTSIDE_RADIUS_AT_SHELL_JUNCTURE';
export const EMP1_WRC537_ATTACHMENT_DIAMETER_BASIS = 'OUTSIDE_DIAMETER_AT_SHELL_JUNCTURE';
export const EMP1_WRC537_ATTACHMENT_SOURCE_QUALIFICATION = 'UNQUALIFIED_FOR_PRODUCTION';

/**
 * Retain the real LAFEA.2 request/result plus source-bound attachment geometry.
 * `attachmentDiameter` is explicitly interpreted as the WRC cylindrical
 * attachment OUTSIDE diameter at the shell juncture. Until that physical basis
 * is parsed from an authoritative source rather than declared by the caller,
 * the retained evidence remains comparison-only for production authorization.
 */
export function createEmp1RetainedSectionScreeningLayer({
  screeningRequest,
  screeningResult,
  geometryIdentity,
  attachmentDiameter,
  attachmentSourceReference,
} = {}) {
  requireAcceptedScreeningResult(screeningResult);
  const resultHash = requiredString(
    screeningResult.semanticHashes?.screeningResultPayloadSemanticHash,
    'EMP1_WRC537_SCREENING_RESULT_HASH_REQUIRED',
  );
  const attachmentGeometryEvidence = createAttachmentGeometryEvidence({
    outsideDiameter: attachmentDiameter,
    sourceReference: attachmentSourceReference,
  });
  const geometryEvidence = createCorrelationGeometryEvidenceFromLafea2({
    screeningRequest,
    screeningResult,
    geometryIdentity,
    attachmentDiameter: attachmentGeometryEvidence.outsideDiameter,
    attachmentSourceReference: attachmentGeometryEvidence.sourceReference,
  });
  return deepFreeze({
    schema: EMP1_WRC537_RETAINED_SCREENING_LAYER_SCHEMA,
    qualification: 'PASS',
    decision: 'ESCALATE',
    resultHash,
    reasons: [],
    screeningRequest: structuredClone(screeningRequest),
    screeningResult: structuredClone(screeningResult),
    geometryEvidence,
    attachmentGeometryEvidence,
  });
}

/**
 * Derive all physical WRC input geometry/reference/axis values from retained
 * A/B evidence. r0 is explicitly the OUTSIDE radius of the cylindrical
 * attachment at the shell juncture. The caller does not author Rm/T/r0 here.
 */
export function deriveEmp1Wrc537SourceCustody({
  foundationResult,
  sectionScreening,
  loadCaseIdentity,
} = {}) {
  const foundation = requireQualifiedFoundationResult(foundationResult);
  const screening = requireRetainedScreeningLayer(sectionScreening);
  const geometryEvidence = validateCorrelationGeometryEvidence(screening.geometryEvidence);
  const attachmentEvidence = requireAttachmentGeometryEvidence(screening.attachmentGeometryEvidence);
  const foundationHash = foundation.semanticHashes.resultPayloadSemanticHash;
  if (geometryEvidence.foundationResultHash !== foundationHash) {
    throw custodyError('EMP1_WRC537_SOURCE_GEOMETRY_FOUNDATION_RESULT_MISMATCH');
  }

  const loadCase = foundation.transformedLoadCases?.find((row) => row.identity === loadCaseIdentity);
  if (!loadCase) throw custodyError('EMP1_WRC537_SOURCE_LOAD_CASE_NOT_FOUND');
  const targetPoint = vector3(loadCase.targetPointGlobal,
    'EMP1_WRC537_SOURCE_TARGET_REFERENCE_INVALID');
  const axesEvidence = foundation.coordinateSystemEvidence;
  const vesselAxis = vector3(axesEvidence?.axesGlobal?.eX,
    'EMP1_WRC537_SOURCE_VESSEL_AXIS_INVALID');
  const nozzleAxis = vector3(axesEvidence?.axesGlobal?.eZ,
    'EMP1_WRC537_SOURCE_NOZZLE_AXIS_INVALID');

  const shellThickness = positive(geometryEvidence.pipeThickness,
    'EMP1_WRC537_SOURCE_SHELL_THICKNESS_INVALID');
  const outerRadius = positive(geometryEvidence.pipeOutsideDiameter,
    'EMP1_WRC537_SOURCE_PIPE_OD_INVALID') / 2;
  const meanRadius = outerRadius - shellThickness / 2;
  if (!(meanRadius > 0)) throw custodyError('EMP1_WRC537_SOURCE_MEAN_RADIUS_INVALID');
  const attachmentOutsideRadius = positive(attachmentEvidence.outsideDiameter,
    'EMP1_WRC537_SOURCE_ATTACHMENT_OUTSIDE_DIAMETER_INVALID') / 2;
  const geometry = deriveEmp1Wrc537CylindricalBoundedGeometry({
    meanRadius,
    shellThickness,
    attachmentOutsideRadius,
  });

  return deepFreeze({
    schema: EMP1_WRC537_SOURCE_CUSTODY_SCHEMA,
    authority: 'DERIVED_FROM_RETAINED_LAFEA1_LAFEA2_EVIDENCE',
    foundationResultHash: foundationHash,
    foundationModelHash: geometryEvidence.foundationModelHash,
    screeningResultHash: screening.resultHash,
    geometryEvidenceHash: geometryEvidence.semanticHash,
    attachmentGeometryEvidenceHash: attachmentEvidence.semanticHash,
    geometry: {
      meanRadius: geometry.meanRadius,
      shellThickness: geometry.shellThickness,
      attachmentOutsideRadius: geometry.attachmentOutsideRadius,
      attachmentRadius: geometry.attachmentOutsideRadius,
      attachmentRadiusBasis: EMP1_WRC537_R0_BASIS,
      attachmentRadiusSourceQualification: attachmentEvidence.sourceQualification,
      gamma: geometry.gamma,
      beta: geometry.beta,
      derivation: {
        meanRadius: 'PIPE_OD_OVER_2_MINUS_ASSESSMENT_THICKNESS_OVER_2',
        shellThickness: 'LAFEA2_ASSESSMENT_PIPE_THICKNESS',
        attachmentOutsideRadius: 'WRC_ATTACHMENT_OUTSIDE_DIAMETER_OVER_2_AT_SHELL_JUNCTURE',
        gamma: 'Rm/T',
        beta: '0.875*r0/Rm',
      },
    },
    geometrySourceReferences: {
      ...structuredClone(geometryEvidence.sourceReferences),
      attachmentOutsideDiameter: attachmentEvidence.sourceReference,
      attachmentDiameterBasis: attachmentEvidence.diameterBasis,
    },
    loadReference: {
      identity: requiredString(loadCase.targetReferencePointIdentity,
        'EMP1_WRC537_SOURCE_TARGET_REFERENCE_ID_REQUIRED'),
      pointGlobal: targetPoint,
      derivation: 'FOUNDATION_TRANSFORM_TARGET_REFERENCE',
    },
    axes: {
      vesselCenterlineGlobal: vesselAxis,
      nozzleCenterlineGlobal: nozzleAxis,
      coordinateSystemIdentity: requiredString(axesEvidence?.identity,
        'EMP1_WRC537_SOURCE_COORDINATE_SYSTEM_ID_REQUIRED'),
      vesselAxisDerivation: 'FOUNDATION_PIPE_AXIAL_EX',
      nozzleAxisDerivation: 'FOUNDATION_PROJECTED_RADIAL_EZ',
      handedness: axesEvidence?.handedness ?? null,
      orthogonalityResidual: axesEvidence?.orthogonalityResidual ?? null,
    },
    stressConcentration: createEmp1Wrc537UnityStressConcentrationAuthority(),
  });
}

export function requireEmp1Wrc537SourceCustody(value) {
  if (!record(value) || value.schema !== EMP1_WRC537_SOURCE_CUSTODY_SCHEMA) {
    throw custodyError('EMP1_WRC537_SOURCE_CUSTODY_REQUIRED');
  }
  requiredString(value.foundationResultHash, 'EMP1_WRC537_SOURCE_FOUNDATION_HASH_REQUIRED');
  requiredString(value.foundationModelHash, 'EMP1_WRC537_SOURCE_FOUNDATION_MODEL_HASH_REQUIRED');
  requiredString(value.screeningResultHash, 'EMP1_WRC537_SOURCE_SCREENING_HASH_REQUIRED');
  requiredString(value.geometryEvidenceHash, 'EMP1_WRC537_SOURCE_GEOMETRY_HASH_REQUIRED');
  requiredString(value.attachmentGeometryEvidenceHash,
    'EMP1_WRC537_SOURCE_ATTACHMENT_GEOMETRY_HASH_REQUIRED');
  if (value.geometry?.attachmentRadiusBasis !== EMP1_WRC537_R0_BASIS) {
    throw custodyError('EMP1_WRC537_SOURCE_R0_OUTSIDE_RADIUS_BASIS_REQUIRED');
  }
  deriveEmp1Wrc537CylindricalBoundedGeometry(value.geometry);
  vector3(value.loadReference?.pointGlobal, 'EMP1_WRC537_SOURCE_TARGET_REFERENCE_INVALID');
  requiredString(value.loadReference?.identity, 'EMP1_WRC537_SOURCE_TARGET_REFERENCE_ID_REQUIRED');
  vector3(value.axes?.vesselCenterlineGlobal, 'EMP1_WRC537_SOURCE_VESSEL_AXIS_INVALID');
  vector3(value.axes?.nozzleCenterlineGlobal, 'EMP1_WRC537_SOURCE_NOZZLE_AXIS_INVALID');
  requireEmp1Wrc537UnityStressConcentrationAuthority(value.stressConcentration);
  return deepFreeze(structuredClone(value));
}

function createAttachmentGeometryEvidence({ outsideDiameter, sourceReference }) {
  const base = {
    schema: EMP1_WRC537_ATTACHMENT_GEOMETRY_EVIDENCE_SCHEMA,
    physicalQuantity: 'WRC_CYLINDRICAL_ATTACHMENT_R0_SOURCE_DIAMETER',
    diameterBasis: EMP1_WRC537_ATTACHMENT_DIAMETER_BASIS,
    outsideDiameter: positive(outsideDiameter,
      'EMP1_WRC537_ATTACHMENT_OUTSIDE_DIAMETER_INVALID'),
    physicalLocation: 'ATTACHMENT_SHELL_JUNCTURE',
    sourceReference: requiredString(sourceReference,
      'EMP1_WRC537_ATTACHMENT_OUTSIDE_DIAMETER_SOURCE_REQUIRED'),
    basisAuthority: 'CALLER_DECLARED_SOURCE_LOCATOR_ONLY',
    sourceQualification: EMP1_WRC537_ATTACHMENT_SOURCE_QUALIFICATION,
  };
  return deepFreeze({ ...base, semanticHash: semanticHash(base) });
}

function requireAttachmentGeometryEvidence(value) {
  if (!record(value) || value.schema !== EMP1_WRC537_ATTACHMENT_GEOMETRY_EVIDENCE_SCHEMA) {
    throw custodyError('EMP1_WRC537_ATTACHMENT_GEOMETRY_EVIDENCE_REQUIRED');
  }
  if (value.diameterBasis !== EMP1_WRC537_ATTACHMENT_DIAMETER_BASIS
    || value.physicalLocation !== 'ATTACHMENT_SHELL_JUNCTURE') {
    throw custodyError('EMP1_WRC537_ATTACHMENT_OUTSIDE_DIAMETER_BASIS_REQUIRED');
  }
  positive(value.outsideDiameter, 'EMP1_WRC537_ATTACHMENT_OUTSIDE_DIAMETER_INVALID');
  requiredString(value.sourceReference, 'EMP1_WRC537_ATTACHMENT_OUTSIDE_DIAMETER_SOURCE_REQUIRED');
  if (value.sourceQualification !== EMP1_WRC537_ATTACHMENT_SOURCE_QUALIFICATION) {
    throw custodyError('EMP1_WRC537_ATTACHMENT_SOURCE_QUALIFICATION_STATE_INVALID');
  }
  const { semanticHash: retainedHash, ...base } = value;
  if (!retainedHash || retainedHash !== semanticHash(base)) {
    throw custodyError('EMP1_WRC537_ATTACHMENT_GEOMETRY_HASH_MISMATCH');
  }
  return value;
}

function requireRetainedScreeningLayer(value) {
  if (!record(value) || value.schema !== EMP1_WRC537_RETAINED_SCREENING_LAYER_SCHEMA
    || value.qualification !== 'PASS' || value.decision !== 'ESCALATE') {
    throw custodyError('EMP1_WRC537_RETAINED_SCREENING_LAYER_REQUIRED');
  }
  requireAcceptedScreeningResult(value.screeningResult);
  const resultHash = value.screeningResult.semanticHashes?.screeningResultPayloadSemanticHash;
  if (value.resultHash !== resultHash) {
    throw custodyError('EMP1_WRC537_SCREENING_LAYER_HASH_MISMATCH');
  }
  const retained = validateCorrelationGeometryEvidence(value.geometryEvidence);
  const attachment = requireAttachmentGeometryEvidence(value.attachmentGeometryEvidence);
  if (retained.attachmentDiameter !== attachment.outsideDiameter
    || retained.sourceReferences.attachmentDiameter !== attachment.sourceReference) {
    throw custodyError('EMP1_WRC537_ATTACHMENT_GEOMETRY_EVIDENCE_MISMATCH');
  }
  const replay = createCorrelationGeometryEvidenceFromLafea2({
    screeningRequest: value.screeningRequest,
    screeningResult: value.screeningResult,
    geometryIdentity: retained.geometryIdentity,
    attachmentDiameter: attachment.outsideDiameter,
    attachmentSourceReference: attachment.sourceReference,
  });
  if (replay.semanticHash !== retained.semanticHash) {
    throw custodyError('EMP1_WRC537_SCREENING_GEOMETRY_REPLAY_MISMATCH');
  }
  return value;
}

function requireQualifiedFoundationResult(value) {
  if (!record(value) || value.schema !== 'local-attachment-foundation-result/v1'
    || value.qualification?.state !== 'ACCEPTED') {
    throw custodyError('EMP1_WRC537_SOURCE_FOUNDATION_RESULT_NOT_QUALIFIED');
  }
  const retained = value.semanticHashes?.resultPayloadSemanticHash;
  const reconstructed = reconstructResultHashes(value).resultPayloadSemanticHash;
  if (!retained || retained !== reconstructed) {
    throw custodyError('EMP1_WRC537_SOURCE_FOUNDATION_RESULT_HASH_DRIFT');
  }
  return value;
}

function requireAcceptedScreeningResult(value) {
  if (!record(value) || value.qualification?.state !== 'ACCEPTED') {
    throw custodyError('EMP1_WRC537_SCREENING_RESULT_NOT_ACCEPTED');
  }
}
function positive(value, code) {
  if (!Number.isFinite(value) || value <= 0) throw custodyError(code);
  return Number(value);
}
function vector3(value, code) {
  if (!Array.isArray(value) || value.length !== 3 || value.some((item) => !Number.isFinite(item))) {
    throw custodyError(code);
  }
  return value.map(Number);
}
function requiredString(value, code) {
  if (typeof value !== 'string' || !value.trim()) throw custodyError(code);
  return value.trim();
}
function record(value) { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function custodyError(code) { const error = new TypeError(code); error.code = code; return error; }
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
