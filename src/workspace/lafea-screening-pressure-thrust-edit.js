/** Identity-safe nested edit command for LAFEA.2 pressure-thrust custody. */
import { AXIAL_PRESSURE_THRUST_BASES } from '../core/local-attachment-screening/index.js';
import { lafeaDocumentDigest } from './lafea-edit-command.js';
import { normalizeLafeaStageEdit } from './lafea-workbench-model.js';

export const LAFEA_SCREENING_PRESSURE_THRUST_EDIT_COMMAND_SCHEMA =
  'LafeaScreeningPressureThrustEditCommand/v1';
export const LAFEA_SCREENING_PRESSURE_THRUST_EDIT_RESULT_SCHEMA =
  'LafeaScreeningPressureThrustEditResult/v1';

const USER_BASES = new Set([
  AXIAL_PRESSURE_THRUST_BASES.EXCLUDES_PRESSURE_THRUST,
  AXIAL_PRESSURE_THRUST_BASES.INCLUDES_PRESSURE_THRUST,
]);
const INVALIDATION = Object.freeze([
  'CANONICAL_MODEL', 'EXECUTION', 'RECOVERY', 'CONVERGENCE', 'CODE', 'REPORT',
]);

export function createLafeaScreeningPressureThrustBasisCommand(options) {
  const value = {
    schema: LAFEA_SCREENING_PRESSURE_THRUST_EDIT_COMMAND_SCHEMA,
    commandId: requiredString(options?.commandId, 'commandId'),
    stageId: 'LAFEA.2',
    expectedDocumentDigest: requiredString(options?.expectedDocumentDigest, 'expectedDocumentDigest'),
    target: {
      screeningCaseId: requiredString(options?.screeningCaseId, 'screeningCaseId'),
    },
    input: {
      basis: requiredString(options?.basis, 'basis'),
    },
    origin: {
      surface: options?.origin?.surface ?? 'PROGRAMMATIC',
      sessionId: options?.origin?.sessionId ?? 'UNSPECIFIED_SESSION',
      sequence: Number.isInteger(options?.origin?.sequence) ? options.origin.sequence : 0,
    },
  };
  validateCommand(value);
  return deepFreeze(value);
}

export function applyLafeaScreeningPressureThrustBasisCommand(currentDocument, command) {
  const previousDocumentDigest = lafeaDocumentDigest(currentDocument);
  try {
    validateCommand(command);
    if (previousDocumentDigest !== command.expectedDocumentDigest) {
      return result(command, 'CONFLICT', currentDocument, previousDocumentDigest, previousDocumentDigest, null, [
        diagnostic('LAFEA_STALE_DOCUMENT_DIGEST', 'The editable document changed after this command was created.'),
      ]);
    }

    const document = structuredClone(currentDocument);
    const screeningCase = uniqueIdentity(
      document.screeningCases,
      'screeningCaseId',
      command.target.screeningCaseId,
      'screeningCases',
    );
    const previousValue = screeningCase.axialPressureThrustBasis
      ?? AXIAL_PRESSURE_THRUST_BASES.UNKNOWN;
    screeningCase.axialPressureThrustBasis = command.input.basis;

    const normalized = normalizeLafeaStageEdit('LAFEA.2', document);
    const currentDocumentDigest = lafeaDocumentDigest(normalized);
    const status = currentDocumentDigest === previousDocumentDigest ? 'NO_CHANGE' : 'APPLIED';
    return result(command, status, normalized, previousDocumentDigest, currentDocumentDigest, {
      operation: 'SET_SCREENING_AXIAL_PRESSURE_THRUST_BASIS',
      screeningCaseId: command.target.screeningCaseId,
      resolvedPath: `screeningCases[screeningCaseId=${command.target.screeningCaseId}].axialPressureThrustBasis`,
      previousValue,
      currentValue: command.input.basis,
    }, []);
  } catch (error) {
    return result(command, 'REJECTED', currentDocument, previousDocumentDigest, previousDocumentDigest, null, [
      diagnostic(
        typeof error?.code === 'string' ? error.code : 'LAFEA_SCREENING_PRESSURE_THRUST_EDIT_REJECTED',
        error instanceof Error ? error.message : 'Unknown LAFEA.2 pressure-thrust custody edit failure.',
        typeof error?.path === 'string' ? error.path : null,
      ),
    ]);
  }
}

function validateCommand(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('LafeaScreeningPressureThrustEditCommand/v1 must be an object.');
  }
  exactKeys(value, ['schema', 'commandId', 'stageId', 'expectedDocumentDigest', 'target', 'input', 'origin'], 'command');
  exactKeys(value.target, ['screeningCaseId'], 'command.target');
  exactKeys(value.input, ['basis'], 'command.input');
  exactKeys(value.origin, ['surface', 'sessionId', 'sequence'], 'command.origin');
  if (value.schema !== LAFEA_SCREENING_PRESSURE_THRUST_EDIT_COMMAND_SCHEMA) {
    throw new TypeError('LAFEA pressure-thrust edit schema is invalid.');
  }
  if (value.stageId !== 'LAFEA.2') {
    throw commandError('LAFEA_SCREENING_PRESSURE_THRUST_STAGE_MISMATCH', 'Pressure-thrust custody edits are authorized only for LAFEA.2.');
  }
  requiredString(value.commandId, 'commandId');
  requiredString(value.expectedDocumentDigest, 'expectedDocumentDigest');
  requiredString(value.target.screeningCaseId, 'screeningCaseId');
  if (!USER_BASES.has(value.input.basis)) {
    throw commandError(
      'LAFEA_SCREENING_PRESSURE_THRUST_BASIS_INVALID',
      'Select whether the supplied axial resultant includes or excludes closed-end pressure thrust.',
    );
  }
  if (typeof value.origin.surface !== 'string' || typeof value.origin.sessionId !== 'string') {
    throw new TypeError('command origin is invalid.');
  }
  if (!Number.isInteger(value.origin.sequence) || value.origin.sequence < 0) {
    throw new TypeError('command.origin.sequence must be a non-negative integer.');
  }
  return value;
}

function uniqueIdentity(rows, identityKey, identity, path) {
  if (!Array.isArray(rows)) throw pathError('LAFEA_COLLECTION_NOT_FOUND', path, `${path} must be an array.`);
  const matches = rows.filter((row) => row && typeof row === 'object' && row[identityKey] === identity);
  if (matches.length !== 1) {
    throw pathError(
      matches.length ? 'LAFEA_IDENTITY_COLLISION' : 'LAFEA_ENTITY_NOT_FOUND',
      path,
      `${path} must contain exactly one ${identityKey}=${identity}.`,
    );
  }
  return matches[0];
}

function result(command, status, document, previousDocumentDigest, currentDocumentDigest, change, diagnostics) {
  return deepFreeze({
    schema: LAFEA_SCREENING_PRESSURE_THRUST_EDIT_RESULT_SCHEMA,
    commandId: command?.commandId ?? 'INVALID_COMMAND',
    stageId: 'LAFEA.2',
    status,
    previousDocumentDigest,
    currentDocumentDigest,
    document: structuredClone(document),
    change: change ? structuredClone(change) : null,
    dependencyImpact: status === 'APPLIED' ? [...INVALIDATION] : [],
    diagnostics,
  });
}

function diagnostic(code, message, path = null) {
  return { severity: 'ERROR', code, path, entityId: null, message };
}

function requiredString(value, label) {
  if (typeof value !== 'string' || !value) throw new TypeError(`${label} is required.`);
  return value;
}

function exactKeys(value, expected, label) {
  const actual = Object.keys(value).sort();
  const required = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(required)) {
    throw new TypeError(`${label} exact-key contract mismatch.`);
  }
}

function commandError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function pathError(code, path, message) {
  const error = commandError(code, message);
  error.path = path;
  return error;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
