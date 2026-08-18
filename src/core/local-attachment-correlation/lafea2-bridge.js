import { CORRELATION_REQUEST_SCHEMA } from './constants.js';
import { validateCorrelationGeometryEvidence } from './geometry-evidence.js';

export function createCorrelationRequestFromLafea2(options) {
  const result = options?.screeningResult;
  if (!result || typeof result !== 'object') fail('CORRELATION_LAFEA2_RESULT_REQUIRED', 'screeningResult');
  if (result.qualification?.state !== 'ACCEPTED') {
    fail('CORRELATION_LAFEA2_RESULT_NOT_ACCEPTED', 'screeningResult.qualification.state');
  }
  const requestIdentity = requiredString(options?.requestIdentity, 'requestIdentity');
  const screeningCaseId = requiredString(options?.screeningCaseId, 'screeningCaseId');
  const geometryEvidence = validateCorrelationGeometryEvidence(options?.geometryEvidence);
  const targetMappings = validateTargetMappings(options?.targetMappings);
  const hashes = result.semanticHashes;
  if (!hashes || typeof hashes !== 'object') fail('CORRELATION_LAFEA2_HASH_EVIDENCE_REQUIRED', 'screeningResult.semanticHashes');
  const sourceRequestHash = requiredString(hashes.screeningRequestSemanticHash,
    'screeningResult.semanticHashes.screeningRequestSemanticHash');
  const sourceResultHash = requiredString(hashes.screeningResultPayloadSemanticHash,
    'screeningResult.semanticHashes.screeningResultPayloadSemanticHash');
  const sourceEvidenceHash = requiredString(hashes.sourceEvidenceSemanticHash,
    'screeningResult.semanticHashes.sourceEvidenceSemanticHash');
  if (geometryEvidence.sourceEvidenceHash !== sourceEvidenceHash) {
    fail('CORRELATION_GEOMETRY_SOURCE_EVIDENCE_MISMATCH', 'geometryEvidence.sourceEvidenceHash');
  }

  const screeningCase = uniqueRow(result.screeningCases, 'screeningCaseId', screeningCaseId,
    'screeningResult.screeningCases');
  const section = result.sectionProperties;
  if (!section || typeof section !== 'object') fail('CORRELATION_LAFEA2_SECTION_REQUIRED', 'screeningResult.sectionProperties');
  const pipeOutsideDiameter = 2 * positive(section.outerRadius,
    'screeningResult.sectionProperties.outerRadius');
  const pipeThickness = positive(section.assessmentPipeThickness,
    'screeningResult.sectionProperties.assessmentPipeThickness');
  if (geometryEvidence.pipeOutsideDiameter !== pipeOutsideDiameter) {
    fail('CORRELATION_GEOMETRY_PIPE_DIAMETER_MISMATCH', 'geometryEvidence.pipeOutsideDiameter');
  }
  if (geometryEvidence.pipeThickness !== pipeThickness) {
    fail('CORRELATION_GEOMETRY_PIPE_THICKNESS_MISMATCH', 'geometryEvidence.pipeThickness');
  }

  const force = vector3(screeningCase.combinedForceLocal,
    `screeningResult.screeningCases[screeningCaseId=${screeningCaseId}].combinedForceLocal`);
  const moment = vector3(screeningCase.combinedMomentLocal,
    `screeningResult.screeningCases[screeningCaseId=${screeningCaseId}].combinedMomentLocal`);
  const pressureByTarget = targetMappings.map((mapping) => pressureRow(
    result.pointStressStates, screeningCaseId, mapping,
  ));

  return freeze({
    schema: CORRELATION_REQUEST_SCHEMA,
    requestIdentity,
    sourceCustody: {
      authorityType: 'LAFEA2_RETAINED_RESULT',
      sourceStageId: 'LAFEA.2',
      sourceRequestHash,
      sourceResultHash,
      geometryEvidenceHash: geometryEvidence.semanticHash,
      screeningCaseId,
      targetMappings,
    },
    geometry: {
      pipeOutsideDiameter: geometryEvidence.pipeOutsideDiameter,
      pipeThickness: geometryEvidence.pipeThickness,
      attachmentDiameter: geometryEvidence.attachmentDiameter,
    },
    loads: {
      FX: force[0], FY: force[1], FZ: force[2],
      MX: moment[0], MY: moment[1], MZ: moment[2],
    },
    pressureByTarget,
  });
}

function pressureRow(pointStates, screeningCaseId, mapping) {
  if (!Array.isArray(pointStates)) fail('CORRELATION_LAFEA2_POINT_STATES_REQUIRED', 'screeningResult.pointStressStates');
  const matches = pointStates.filter((row) => row?.screeningCaseId === screeningCaseId
    && row?.evaluationLocationId === mapping.evaluationLocationId);
  if (matches.length !== 1) {
    fail(matches.length ? 'CORRELATION_LAFEA2_POINT_IDENTITY_COLLISION' : 'CORRELATION_LAFEA2_POINT_NOT_FOUND',
      `screeningResult.pointStressStates[${screeningCaseId}/${mapping.evaluationLocationId}]`);
  }
  const pressure = matches[0].pressureStress;
  if (!pressure || typeof pressure !== 'object') {
    fail('CORRELATION_LAFEA2_PRESSURE_STRESS_REQUIRED',
      `screeningResult.pointStressStates[${screeningCaseId}/${mapping.evaluationLocationId}].pressureStress`);
  }
  return freeze({
    targetId: mapping.targetId,
    SIGMA_X: finite(pressure.sigmaXPressure, 'pressureStress.sigmaXPressure'),
    SIGMA_THETA: finite(pressure.sigmaThetaPressure, 'pressureStress.sigmaThetaPressure'),
    SIGMA_R: finite(pressure.sigmaRPressure, 'pressureStress.sigmaRPressure'),
    TAU_XTHETA: 0,
  });
}

function validateTargetMappings(values) {
  if (!Array.isArray(values) || !values.length) fail('CORRELATION_TARGET_MAPPINGS_REQUIRED', 'targetMappings');
  const targetIds = new Set();
  return values.map((row, index) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) fail('CORRELATION_TARGET_MAPPING_OBJECT_REQUIRED', `targetMappings[${index}]`);
    const keys = Object.keys(row).sort();
    if (JSON.stringify(keys) !== JSON.stringify(['evaluationLocationId', 'targetId'])) {
      fail('CORRELATION_TARGET_MAPPING_EXACT_KEYS_MISMATCH', `targetMappings[${index}]`);
    }
    const targetId = requiredString(row.targetId, `targetMappings[${index}].targetId`);
    const evaluationLocationId = requiredString(row.evaluationLocationId,
      `targetMappings[${index}].evaluationLocationId`);
    if (targetIds.has(targetId)) fail('CORRELATION_TARGET_MAPPING_DUPLICATE', `targetMappings[${index}].targetId`);
    targetIds.add(targetId);
    return freeze({ targetId, evaluationLocationId });
  });
}

function uniqueRow(rows, identityKey, identity, path) {
  if (!Array.isArray(rows)) fail('CORRELATION_LAFEA2_COLLECTION_REQUIRED', path);
  const matches = rows.filter((row) => row?.[identityKey] === identity);
  if (matches.length !== 1) fail(
    matches.length ? 'CORRELATION_LAFEA2_IDENTITY_COLLISION' : 'CORRELATION_LAFEA2_ENTITY_NOT_FOUND', path,
  );
  return matches[0];
}
function vector3(value, path) {
  if (!Array.isArray(value) || value.length !== 3) fail('CORRELATION_LAFEA2_VECTOR3_REQUIRED', path);
  return value.map((row, index) => finite(row, `${path}[${index}]`));
}
function positive(value, path) { const row = finite(value, path); if (row <= 0) fail('CORRELATION_NUMBER_NOT_POSITIVE', path); return row; }
function finite(value, path) { if (!Number.isFinite(value)) fail('CORRELATION_NUMBER_NON_FINITE', path); return value; }
function requiredString(value, path) { if (typeof value !== 'string' || !value) fail('CORRELATION_STRING_REQUIRED', path); return value; }
function fail(code, path) { const error = new Error(code); error.code = code; error.path = path; throw error; }
function freeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.values(value).forEach(freeze); return Object.freeze(value); }
