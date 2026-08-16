import { stringValue } from '../../core/shared-piping-model/index.js';

const EMPTY_MARKERS = new Set(['', '0', 'NONE', 'UNSET', 'FALSE', 'N/A', 'NA']);
const EXPLICIT_RESTRAINT_FIELDS = Object.freeze([
  'SUPPORT_KIND',
  'SUPPORT_MAPPER_KIND',
  'SUPPORT_TYPE',
  'CMPSUPTYPE',
  'MDSSUPPTYPE',
  'CMPSTRESSN',
]);
const RESTRAINT_TEXT = /\b(ANCHOR|FIXED|GUIDE|LINE\s*STOP|LINESTOP|SPRING|HANGER|REST|SHOE|BASE\s*PLATE|PIPE\s*SUPPORT)\b/iu;
const NON_RESTRAINT_ATTACHMENT_TEXT = /\b(FENCE|FLOOR|WALL|ROOF|SLAB)\b[\s\S]*\b(OPENING|PENETRATION|SLEEVE)\b|\b(OPENING|PENETRATION|SLEEVE)\b[\s\S]*\b(FENCE|FLOOR|WALL|ROOF|SLAB)\b/iu;

/** Classify SJSON ATTA records without inventing restraint capability. */
export function classifySjsonSupportProjection(attributes) {
  const explicit = explicitRestraintEvidence(attributes);
  if (explicit) {
    return Object.freeze({
      disposition: 'EMIT_SUPPORT_ATTACHMENT',
      authority: `ATTRIBUTE:${explicit.field}`,
    });
  }
  const description = [attributes.DTXR, attributes.ISONOTE, attributes.DESCRIPTION]
    .map(stringValue).filter(Boolean).join(' | ');
  if (NON_RESTRAINT_ATTACHMENT_TEXT.test(description) && !RESTRAINT_TEXT.test(description)) {
    return Object.freeze({
      disposition: 'DEFER_SUPPORT',
      authority: 'NON_RESTRAINT_ATTACHMENT_DESCRIPTION',
      attachmentClassification: 'PENETRATION_ATTACHMENT',
    });
  }
  return Object.freeze({
    disposition: 'EMIT_SUPPORT_ATTACHMENT',
    authority: RESTRAINT_TEXT.test(description)
      ? 'DESCRIPTION_RESTRAINT_SEMANTICS'
      : 'LEGACY_ATTA_FALLBACK',
  });
}

function explicitRestraintEvidence(attributes) {
  for (const field of EXPLICIT_RESTRAINT_FIELDS) {
    if (meaningful(attributes[field])) return { field, value: stringValue(attributes[field]) };
  }
  const nodeType = Number(attributes.NODETYPE);
  if (Number.isFinite(nodeType) && nodeType > 0) return { field: 'NODETYPE', value: String(nodeType) };
  const stiffness = numericAttribute(attributes, ['NODESTIFF']);
  return stiffness !== null && stiffness > 0
    ? { field: 'NODESTIFF', value: String(stiffness) }
    : null;
}

function meaningful(value) {
  return !EMPTY_MARKERS.has(stringValue(value).toUpperCase());
}

function numericAttribute(attributes, keys) {
  for (const key of keys) {
    const raw = attributes?.[key];
    if (raw === null || raw === undefined) continue;
    const parsed = Number(String(raw).replace(/[^0-9.-]/gu, ''));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}
