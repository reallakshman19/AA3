/** Identity-safe nested edit command for LAFEA.2 mechanical-term factors. */
import { lafeaDocumentDigest } from './lafea-edit-command.js';
import { normalizeLafeaStageEdit } from './lafea-workbench-model.js';

export const LAFEA_SCREENING_TERM_EDIT_COMMAND_SCHEMA = 'LafeaScreeningTermEditCommand/v1';
export const LAFEA_SCREENING_TERM_EDIT_RESULT_SCHEMA = 'LafeaScreeningTermEditResult/v1';

const DECIMAL_GRAMMAR = /^[+-]?(?:(?:0|[1-9][0-9]*)(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?$/u;
const INVALIDATION = Object.freeze([
  'CANONICAL_MODEL', 'EXECUTION', 'RECOVERY', 'CONVERGENCE', 'CODE', 'REPORT',
]);

export function createLafeaScreeningTermFactorCommand(options) {
  const value = {
    schema: LAFEA_SCREENING_TERM_EDIT_COMMAND_SCHEMA,
    commandId: requiredString(options?.commandId, 'commandId'),
    stageId: 'LAFEA.2',
    expectedDocumentDigest: requiredString(options?.expectedDocumentDigest, 'expectedDocumentDigest'),
    target: {
      screeningCaseId: requiredString(options?.screeningCaseId, 'screeningCaseId'),
      loadCaseId: requiredString(options?.loadCaseId, 'loadCaseId'),
    },
    input: {
      rawText: typeof options?.rawText === 'string' ? options.rawText : '',
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

export function applyLafeaScreeningTermFactorCommand(currentDocument, command) {
  const previousDocumentDigest = lafeaDocumentDigest(currentDocument);
  try {
    validateCommand(command);
    if (previousDocumentDigest !== command.expectedDocumentDigest) {
      return result(command, 'CONFLICT', currentDocument, previousDocumentDigest, previousDocumentDigest, null, [
        diagnostic('LAFEA_STALE_DOCUMENT_DIGEST', 'The editable document changed after this command was created.'),
      ]);
    }

    const parsedFactor = parseFactor(command.input.rawText);
    const document = structuredClone(currentDocument);
    const screeningCase = uniqueIdentity(
      document.screeningCases,
      'screeningCaseId',
      command.target.screeningCaseId,
      'screeningCases',
    );
    const mechanicalTerm = uniqueIdentity(
      screeningCase.mechanicalTerms,
      'loadCaseId',
      command.target.loadCaseId,
      `screeningCases[screeningCaseId=${command.target.screeningCaseId}].mechanicalTerms`,
    );
    const previousValue = mechanicalTerm.factor;
    mechanicalTerm.factor = parsedFactor;

    const normalized = normalizeLafeaStageEdit('LAFEA.2', document);
    const currentDocumentDigest = lafeaDocumentDigest(normalized);
    const status = currentDocumentDigest === previousDocumentDigest ? 'NO_CHANGE' : 'APPLIED';
    return result(command, status, normalized, previousDocumentDigest, currentDocumentDigest, {
      operation: 'SET_SCREENING_MECHANICAL_TERM_FACTOR',
      screeningCaseId: command.target.screeningCaseId,
      loadCaseId: command.target.loadCaseId,
      resolvedPath: `screeningCases[screeningCaseId=${command.target.screeningCaseId}].mechanicalTerms[loadCaseId=${command.target.loadCaseId}].factor`,
      previousValue,
      currentValue: parsedFactor,
    }, []);
  } catch (error) {
    return result(command, 'REJECTED', currentDocument, previousDocumentDigest, previousDocumentDigest, null, [
      diagnostic(
        typeof error?.code === 'string' ? error.code : 'LAFEA_SCREENING_TERM_EDIT_REJECTED',
        error instanceof Error ? error.message : 'Unknown LAFEA.2 mechanical-term edit failure.',
        typeof error?.path === 'string' ? error.path : null,
      ),
    ]);
  }
}

function parseFactor(rawText) {
  const trimmed = String(rawText ?? '').trim();
  if (!trimmed || !DECIMAL_GRAMMAR.test(trimmed)) {
    throw commandError('LAFEA_SCREENING_TERM_FACTOR_INVALID', 'Mechanical-term factor must be a finite decimal number.');
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    throw commandError('LAFEA_SCREENING_TERM_FACTOR_NON_FINITE', 'Mechanical-term factor must be finite.');
  }
  return Object.is(value, -0) ? 0 : value;
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

function validateCommand(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('LafeaScreeningTermEditCommand/v1 must be an object.');
  exactKeys(value, ['schema', 'commandId', 'stageId', 'expectedDocumentDigest', 'target', 'input', 'origin'], 'command');
  exactKeys(value.target, ['screeningCaseId', 'loadCaseId'], 'command.target');
  exactKeys(value.input, ['rawText'], 'command.input');
  exactKeys(value.origin, ['surface', 'sessionId', 'sequence'], 'command.origin');
  if (value.schema !== LAFEA_SCREENING_TERM_EDIT_COMMAND_SCHEMA) throw new TypeError('LAFEA screening-term edit schema is invalid.');
  if (value.stageId !== 'LAFEA.2') throw commandError('LAFEA_SCREENING_TERM_STAGE_MISMATCH', 'Mechanical-term factor edits are authorized only for LAFEA.2.');
  requiredString(value.commandId, 'commandId');
  requiredString(value.expectedDocumentDigest, 'expectedDocumentDigest');
  requiredString(value.target.screeningCaseId, 'screeningCaseId');
  requiredString(value.target.loadCaseId, 'loadCaseId');
  if (typeof value.input.rawText !== 'string') throw new TypeError('command.input.rawText must be text.');
  if (typeof value.origin.surface !== 'string' || typeof value.origin.sessionId !== 'string') throw new TypeError('command origin is invalid.');
  if (!Number.isInteger(value.origin.sequence) || value.origin.sequence < 0) throw new TypeError('command.origin.sequence must be a non-negative integer.');
  return value;
}

function result(command, status, document, previousDocumentDigest, currentDocumentDigest, change, diagnostics) {
  return deepFreeze({
    schema: LAFEA_SCREENING_TERM_EDIT_RESULT_SCHEMA,
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
  if (JSON.stringify(actual) !== JSON.stringify(required)) throw new TypeError(`${label} exact-key contract mismatch.`);
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
