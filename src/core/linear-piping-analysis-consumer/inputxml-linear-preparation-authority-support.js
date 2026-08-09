import { semanticHash } from '../shared-piping-model/canonical-json.js';
import { InputXmlLinearSolvePreparationError } from './inputxml-linear-preparation-profile.js';

export function authoritySourceEvidence(value) {
  return Object.freeze({
    sourceId: String(value.sourceId),
    sourceRevision: String(value.sourceRevision),
    sourceSemanticHash: semanticHash(value),
  });
}

export function finiteAuthorityValue(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function positiveAuthorityValue(value, segmentId, field) {
  const number = finiteAuthorityValue(value);
  if (!(number > 0)) {
    throw new InputXmlLinearSolvePreparationError(
      `Segment ${segmentId} requires positive ${field}.`,
      'INPUTXML_PREPARATION_REQUIRED_FIELD_INVALID',
      { segmentId, field, value },
    );
  }
  return number;
}
