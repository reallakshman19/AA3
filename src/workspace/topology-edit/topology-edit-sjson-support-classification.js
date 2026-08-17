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
const EXPLICIT_SUPPORT_INTENT_TEXT = /\b(SUPPORT|BRACE|BRACING|GUIDE|STOP|ANCHOR|REST|HANGER|SPRING)\b/iu;
const REFERENCE_IDENTITY = /\/SREF$/iu;
const OPAQUE_SOURCE_ID = /^=[^\s]+$/u;
const GENERIC_SUPPORT_HARDWARE_TEXT = /^PIPE\s+SUPPORT\s+TYPE[- ]?\d+\b/iu;
const EMPTY_DESCRIPTION = /^-*$/u;

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
    return nonRestraint('SOURCE_REFERENCE_IDENTITY');
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

  if (isSourceSupportHardwareMember(attributes)) {
    return nonRestraint('SOURCE_SUPPORT_HARDWARE_MEMBER');
  }
  if (isOpaqueGenericAttachment(attributes)) {
    return nonRestraint('SOURCE_GENERIC_ATTACHMENT_PLACEHOLDER');
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
  if (/\bSPRING\b/iu.test(token)) return 'SPRING';
  if (/\bHANGER\b/iu.test(token)) return 'HANGER';

  const descriptionField = field === 'DTXR' || field === 'DESCRIPTION';
  if (!descriptionField && /\bANCHOR\b|\bFIXED\b|\bANCI\b/iu.test(token)) return 'ANCHOR';
  if (descriptionField && /\bANCHOR\b/iu.test(token) && !/\bDIRECTIONAL\b/iu.test(token)) return 'ANCHOR';

  if (/\bPIPE\s*REST\b|\bREST\b|\bWEAR\s*PLATE\b|\bW\.?\s*PAD\b/iu.test(token)) return 'REST';
  if ((field === 'CMPSUPTYPE' || field === 'MDSSUPPTYPE') && /^SH[- ]/iu.test(token)) return 'REST';
  return null;
}

function isSourceSupportHardwareMember(attributes) {
  const name = stringValue(attributes.NAME);
  const tag = stringValue(attributes.SUPPORT_TAG);
  const reference = stringValue(attributes.CMPSUPREFN);
  const opaqueIdentity = [name, tag, reference].filter(Boolean);
  if (opaqueIdentity.length < 2
      || !opaqueIdentity.every((value) => value === opaqueIdentity[0])
      || !OPAQUE_SOURCE_ID.test(opaqueIdentity[0])) return false;

  const description = stringValue(attributes.DTXR);
  const specification = stringValue(attributes.SPRE);
  return GENERIC_SUPPORT_HARDWARE_TEXT.test(description)
    && /^\/MDF\//iu.test(specification)
    && !meaningful(attributes.CMPSUPTYPE)
    && !meaningful(attributes.SUPPORT_TYPE);
}

function isOpaqueGenericAttachment(attributes) {
  const name = stringValue(attributes.NAME);
  const tag = stringValue(attributes.SUPPORT_TAG);
  const reference = stringValue(attributes.CMPSUPREFN);
  const ids = [name, tag, reference].filter(Boolean);
  if (ids.length < 2 || !ids.every((value) => value === ids[0]) || !OPAQUE_SOURCE_ID.test(ids[0])) {
    return false;
  }
  const specification = stringValue(attributes.SPRE);
  const description = stringValue(attributes.DTXR).trim();
  const note = [attributes.ISONOTE, attributes.DESCRIPTION]
    .map(stringValue).filter(Boolean).join(' | ');
  // A source note such as "BRACING SUPPORT BY CONTRACTOR" is real support
  // intent even when its family is unresolved; retain it for engineering review.
  if (EXPLICIT_SUPPORT_INTENT_TEXT.test(note)) return false;
  const mtoOff = stringValue(attributes.MTOC).toUpperCase() === 'OFF';
  const ignored = stringValue(attributes.FSTAT).toUpperCase() === 'IGN';
  const nonSpoolBreak = stringValue(attributes.SPKBRK).toLowerCase() === 'false';
  const noNodeCapability = !(Number(attributes.NODETYPE) > 0)
    && !(numericAttribute(attributes, ['NODESTIFF']) > 0);
  return /\/ATTA(?:-|$)/iu.test(specification)
    && mtoOff
    && nonSpoolBreak
    && (ignored || EMPTY_DESCRIPTION.test(description))
    && noNodeCapability;
}

function nonRestraint(authority) {
  return Object.freeze({
    disposition: 'DEFER_SUPPORT',
    authority,
    // Canonical checker already treats reference points as non-restraint
    // attachments. This role intentionally carries no restraint capability.
    attachmentClassification: 'REFERENCE_POINT',
  });
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
