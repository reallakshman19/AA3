import { semanticHash } from '../shared-primitives/canonical-json.js';
import { validateLocalAttachmentScreeningRequest } from '../local-attachment-screening/index.js';
import { CORRELATION_GEOMETRY_SCHEMA } from './constants.js';

export function createCorrelationGeometryEvidenceFromLafea2(options) {
  const result = options?.screeningResult;
  if (!result || typeof result !== 'object') fail('CORRELATION_LAFEA2_RESULT_REQUIRED', 'screeningResult');
  if (result.qualification?.state !== 'ACCEPTED') {
    fail('CORRELATION_LAFEA2_RESULT_NOT_ACCEPTED', 'screeningResult.qualification.state');
  }
  const request = validateLocalAttachmentScreeningRequest(
    structuredClone(options?.screeningRequest),
  );
  const resultRequestHash = requiredString(
    result.semanticHashes?.screeningRequestSemanticHash,
    'screeningResult.semanticHashes.screeningRequestSemanticHash',
  );
  if (request.semanticHash !== resultRequestHash) {
    fail('CORRELATION_LAFEA2_REQUEST_RESULT_MISMATCH', 'screeningRequest.semanticHash');
  }
  const sourceEvidenceHash = requiredString(
    result.semanticHashes?.sourceEvidenceSemanticHash,
    'screeningResult.semanticHashes.sourceEvidenceSemanticHash',
  );
  if (semanticHash(request.sourceEvidence) !== sourceEvidenceHash) {
    fail('CORRELATION_LAFEA2_SOURCE_EVIDENCE_MISMATCH', 'screeningRequest.sourceEvidence');
  }
  const foundationModelHash = requiredString(
    request.sourceEvidence?.foundationModel?.semanticHash,
    'screeningRequest.sourceEvidence.foundationModel.semanticHash',
  );
  const foundationResultHash = requiredString(
    request.sourceEvidence?.foundationResult?.semanticHashes?.resultPayloadSemanticHash,
    'screeningRequest.sourceEvidence.foundationResult.semanticHashes.resultPayloadSemanticHash',
  );
  const section = result.sectionProperties;
  if (!section || typeof section !== 'object') fail('CORRELATION_LAFEA2_SECTION_REQUIRED', 'screeningResult.sectionProperties');
  const pipeOutsideDiameter = 2 * positive(section.outerRadius,
    'screeningResult.sectionProperties.outerRadius');
  const pipeThickness = positive(section.assessmentPipeThickness,
    'screeningResult.sectionProperties.assessmentPipeThickness');
  const base = {
    schema: CORRELATION_GEOMETRY_SCHEMA,
    geometryIdentity: requiredString(options?.geometryIdentity, 'geometryIdentity'),
    sourceStageId: 'LAFEA.2',
    sourceEvidenceHash,
    foundationModelHash,
    foundationResultHash,
    pipeOutsideDiameter,
    pipeThickness,
    attachmentDiameter: positive(options?.attachmentDiameter, 'attachmentDiameter'),
    sourceReferences: {
      pipeOutsideDiameter: requiredString(
        section.sourceReferences?.outsideDiameter,
        'screeningResult.sectionProperties.sourceReferences.outsideDiameter',
      ),
      pipeThickness: requiredString(
        section.sourceReferences?.assessmentPipeThickness,
        'screeningResult.sectionProperties.sourceReferences.assessmentPipeThickness',
      ),
      attachmentDiameter: requiredString(options?.attachmentSourceReference,
        'attachmentSourceReference'),
    },
  };
  return freeze({ ...base, semanticHash: semanticHash(base) });
}

export function validateCorrelationGeometryEvidence(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('CORRELATION_GEOMETRY_EVIDENCE_OBJECT_REQUIRED', 'geometryEvidence');
  }
  exactKeys(value, [
    'schema', 'geometryIdentity', 'sourceStageId', 'sourceEvidenceHash',
    'foundationModelHash', 'foundationResultHash',
    'pipeOutsideDiameter', 'pipeThickness', 'attachmentDiameter',
    'sourceReferences', 'semanticHash',
  ], 'geometryEvidence');
  if (value.schema !== CORRELATION_GEOMETRY_SCHEMA) {
    fail('CORRELATION_GEOMETRY_SCHEMA_MISMATCH', 'geometryEvidence.schema');
  }
  requiredString(value.geometryIdentity, 'geometryEvidence.geometryIdentity');
  if (value.sourceStageId !== 'LAFEA.2') fail('CORRELATION_GEOMETRY_SOURCE_STAGE_MISMATCH', 'geometryEvidence.sourceStageId');
  requiredString(value.sourceEvidenceHash, 'geometryEvidence.sourceEvidenceHash');
  requiredString(value.foundationModelHash, 'geometryEvidence.foundationModelHash');
  requiredString(value.foundationResultHash, 'geometryEvidence.foundationResultHash');
  positive(value.pipeOutsideDiameter, 'geometryEvidence.pipeOutsideDiameter');
  positive(value.pipeThickness, 'geometryEvidence.pipeThickness');
  positive(value.attachmentDiameter, 'geometryEvidence.attachmentDiameter');
  exactKeys(value.sourceReferences, [
    'pipeOutsideDiameter', 'pipeThickness', 'attachmentDiameter',
  ], 'geometryEvidence.sourceReferences');
  Object.entries(value.sourceReferences).forEach(([key, source]) => requiredString(source,
    `geometryEvidence.sourceReferences.${key}`));
  const { semanticHash: retainedHash, ...base } = value;
  if (retainedHash !== semanticHash(base)) {
    fail('CORRELATION_GEOMETRY_HASH_MISMATCH', 'geometryEvidence.semanticHash');
  }
  return freeze(structuredClone(value));
}

function exactKeys(value, expected, path) {
  const actual = Object.keys(value).sort(); const required = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(required)) fail('CORRELATION_EXACT_KEYS_MISMATCH', path);
}
function positive(value, path) { if (!Number.isFinite(value) || value <= 0) fail('CORRELATION_NUMBER_NOT_POSITIVE', path); return value; }
function requiredString(value, path) { if (typeof value !== 'string' || !value) fail('CORRELATION_STRING_REQUIRED', path); return value; }
function fail(code, path) { const error = new Error(code); error.code = code; error.path = path; throw error; }
function freeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.values(value).forEach(freeze); return Object.freeze(value); }
