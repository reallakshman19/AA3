import { stringValue } from '../../core/shared-piping-model/index.js';

const EMPTY_MARKERS = new Set(['', '0', 'NONE', 'UNSET', 'FALSE', 'N/A', 'NA']);
const FAMILY_FIELDS = Object.freeze([
  'SUPPORT_KIND',
  'SUPPORT_MAPPER_KIND',
  'SUPPORT_TYPE',
  'MDSSUPPTYPE',
  'CMPSUPTYPE',
]);
const NON_RESTRAINT_ATTACHMENT_TEXT = /\b(FENCE|FLOOR|WALL|ROOF|SLAB)\b[\s\S]*\b(OPENING|PENETRATION|SLEEVE)\b|\b(OPENING|PENETRATION|SLEEVE)\b[\s\S]*\b(FENCE|FLOOR|WALL|ROOF|SLAB)\b/iu;
const REFERENCE_IDENTITY = /\/SREF$/iu;

/**
 * Classify SJSON ATTA records without inventing restraint capability.
 *
 * A restraint family must come from family-bearing source evidence. Generic
 * support metadata such as CMPSTRESSN, NODETYPE or stiffness proves that an
 * ATTA is support-related, but it does not prove REST/GUIDE/LINE_STOP/etc.
 * Non-restraint source semantics therefore win over those weak signals.
 */
export function classifySjsonSupportProjection(attributes = {}) {
  const familyEvidence = classifySjsonRestraintFamily(attributes);
  if (familyEvidence) {
    return Object.freeze({
      disposition: 'EMIT_SUPPORT_ATTACHMENT',
      authority: `ATTRIBUTE:${familyEvidence.field}`,
      family: familyEvidence.family,
      familySourceValue: familyEvidence.value,
    });
  }

  const identifiers = [attributes.NAME, attributes.SUPPORT_TAG, attributes.CMPSUPREFN]
    .map(stringValue).filter(Boolean);
  if (identifiers.some((value) => REFERENCE_IDENTITY.test(value))) {
    return Object.freeze({
      disposition: 'DEFER_SUPPORT',
      authority: 'SOURCE_REFERENCE_IDENTITY',
      attachmentClassification: 'REFERENCE_POINT',
    });
  }

  const description = [attributes.DTXR, attributes.ISONOTE, attributes.DESCRIPTION]
    .map(stringValue).filter(Boolean).join(' | ');
  if (NON_RESTRAINT_ATTACHMENT_TEXT.test(description)) {
    return Object.freeze({
      disposition: 'DEFER_SUPPORT',
      authority: 'NON_RESTRAINT_ATTACHMENT_DESCRIPTION',
      attachmentClassification: 'PENETRATION_ATTACHMENT',
    });
  }

  const signal = supportObjectSignal(attributes);
  return Object.freeze({
    disposition: 'EMIT_SUPPORT_ATTACHMENT',
    authority: signal ? `SUPPORT_OBJECT_SIGNAL:${signal.field}` : 'LEGACY_ATTA_FALLBACK',
  });
}

/** Returns only a source-backed, closed-taxonomy restraint family. */
export function classifySjsonRestraintFamily(attributes = {}) {
  for (const field of FAMILY_FIELDS) {
    if (!meaningful(attributes[field])) continue;
    const family = classifyFamilyToken(attributes[field], field);
    if (family) return Object.freeze({ field, value: stringValue(attributes[field]), family });
  }

  for (const field of ['DTXR', 'DESCRIPTION']) {
    if (!meaningful(attributes[field])) continue;
    const family = classifyFamilyToken(attributes[field], field);
    if (family) return Object.freeze({ field, value: stringValue(attributes[field]), family });
  }
  return null;
}

function classifyFamilyToken(value, field) {
  const raw = stringValue(value).toUpperCase();
  if (!raw) return null;
  const token = raw.replace(/[ _]+/gu, ' ').trim();

  if (/\bGUIDE\b|\bGT0?1\b/iu.test(token)) return 'GUIDE';
  if (/\bLINE\s*STOP\b|\bLINESTOP\b|\bST0?6\b|^LS[- ]/iu.test(token)) return 'LINE_STOP';
  if (/\bSPRING\b|\bHANGER\b/iu.test(token)) return 'SPRING';

  const descriptionField = field === 'DTXR' || field === 'DESCRIPTION';
  if (!descriptionField && /\bANCHOR\b|\bFIXED\b|\bANCI\b/iu.test(token)) return 'ANCHOR';
  if (descriptionField && /\bANCHOR\b/iu.test(token) && !/\bDIRECTIONAL\b/iu.test(token)) return 'ANCHOR';

  if (/\bPIPE\s*REST\b|\bREST\b|\bWEAR\s*PLATE\b|\bW\.?\s*PAD\b/iu.test(token)) return 'REST';
  if ((field === 'CMPSUPTYPE' || field === 'MDSSUPPTYPE') && /^SH[- ]/iu.test(token)) return 'REST';
  return null;
}

function supportObjectSignal(attributes) {
  for (const field of ['CMPSTRESSN', 'CMPSUPREFN']) {
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
