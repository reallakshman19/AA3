import {
  deepFreeze,
  isPlainRecord,
  semanticHash,
  stringValue,
} from '../../../core/shared-piping-model/index.js';

export const TOPOLOGY_EDIT_VALIDATION_IDENTITY_SCHEMA =
  'TopologyEditValidationIdentity.v1';
export const TOPOLOGY_EDIT_VALIDATION_IDENTITY_FIELDS = Object.freeze([
  'sourceHash',
  'basisHash',
  'sessionId',
  'sessionVersion',
  'selectionRevision',
  'interactionId',
]);

export function createTopologyEditValidationIdentity(input = {}) {
  const material = {
    schema: TOPOLOGY_EDIT_VALIDATION_IDENTITY_SCHEMA,
    sourceHash: requiredText(input.sourceHash, 'sourceHash'),
    basisHash: requiredText(input.basisHash, 'basisHash'),
    sessionId: requiredText(input.sessionId, 'sessionId'),
    sessionVersion: nonNegativeInteger(input.sessionVersion, 'sessionVersion'),
    selectionRevision: nonNegativeInteger(
      input.selectionRevision,
      'selectionRevision',
    ),
    interactionId: requiredText(input.interactionId, 'interactionId'),
  };
  return deepFreeze({ ...material, identityHash: semanticHash(material) });
}

export function assertTopologyEditValidationIdentity(value) {
  if (!isPlainRecord(value)) fail('identity must be an object.');
  const rebuilt = createTopologyEditValidationIdentity(value);
  if (value.schema !== TOPOLOGY_EDIT_VALIDATION_IDENTITY_SCHEMA
    || value.identityHash !== rebuilt.identityHash) {
    fail('identity differs from its immutable normalized authority.', RangeError);
  }
  return rebuilt;
}

export function topologyEditValidationIdentityStaleFields(expectedInput, actualInput) {
  const expected = assertTopologyEditValidationIdentity(expectedInput);
  const actual = assertTopologyEditValidationIdentity(actualInput);
  return TOPOLOGY_EDIT_VALIDATION_IDENTITY_FIELDS.filter((field) => (
    expected[field] !== actual[field]
  ));
}

export function topologyEditValidationSessionId(input = {}) {
  const sourceHash = requiredText(input.sourceHash, 'sourceHash');
  const datasetSessionVersion = nonNegativeInteger(
    input.datasetSessionVersion,
    'datasetSessionVersion',
  );
  const digest = semanticHash({ sourceHash, datasetSessionVersion }).split(':').at(-1);
  return `validation-session:${datasetSessionVersion}:${digest}`;
}

export function topologyEditValidationInteractionId(input = {}) {
  const planHash = requiredText(input.planHash, 'planHash');
  const selectionRevision = nonNegativeInteger(
    input.selectionRevision,
    'selectionRevision',
  );
  const digest = semanticHash({ planHash, selectionRevision }).split(':').at(-1);
  return `validation-interaction:${selectionRevision}:${digest}`;
}

function nonNegativeInteger(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    fail(`${label} must be a non-negative integer.`, RangeError);
  }
  return number;
}

function requiredText(value, label) {
  const text = stringValue(value);
  if (!text) fail(`${label} is required.`);
  return text;
}

function fail(message, Constructor = TypeError) {
  throw new Constructor(`TopologyEditValidationIdentity: ${message}`);
}
