/**
 * Single authority for CAESAR II's "field not set" sentinel.
 *
 * CAESAR writes -1.0101 (float32 -1.01010000705719) into any numeric field the
 * user never filled in, and it emits fixed-width child arrays per piping
 * element — a fixed number of RESTRAINT / SIF / FORCESMOMENTS slots — rather
 * than emitting only the records that exist. An unused slot is therefore a
 * *present* record whose every meaningful field carries the sentinel.
 *
 * Readers that do not know this read those slots as real declarations with
 * nonsense values. That has been the single most expensive defect family in
 * this consumer: it produced 268 phantom MODEL_RESTRAINT_SOURCE_INVALID
 * findings and 83 phantom topology-closure BLOCKs, each of which stalled the
 * whole import behind content the source never declared. Every reader that
 * touches raw CAESAR attributes must go through this module rather than
 * re-deriving the constant.
 *
 * Deliberately NOT provided: a generic "every field looks empty" slot test.
 * CAESAR is not consistent about its filler — in the BM4 export 56 of the 134
 * unused restraint slots carry XCOSINE/YCOSINE/ZCOSINE of 0.000000 instead of
 * the sentinel — so a blanket emptiness rule both misses real slots and risks
 * discarding declared records. Slot detection is identity-field based: a
 * caller names the attributes that identify the record, and the slot counts as
 * unfilled only when every one of them is explicitly present and unset.
 */

export const CAESAR_UNSET_SENTINEL = -1.0101;
export const CAESAR_UNSET_SENTINEL_TOLERANCE = 0.001;

/** True when a parsed number is CAESAR's unset sentinel. */
export function isCaesarUnsetSentinel(value) {
  return typeof value === 'number'
    && Number.isFinite(value)
    && Math.abs(value - CAESAR_UNSET_SENTINEL) < CAESAR_UNSET_SENTINEL_TOLERANCE;
}

/** True when an attribute's declared text parses to the unset sentinel. */
export function isCaesarUnsetSentinelText(text) {
  if (text === null || text === undefined) return false;
  const trimmed = String(text).trim();
  if (trimmed.length === 0) return false;
  return isCaesarUnsetSentinel(Number(trimmed));
}

/** Case-insensitive attribute lookup returning trimmed text, or null when absent/blank. */
export function caesarAttributeText(attributes, names) {
  const keys = Object.keys(attributes ?? {});
  for (const name of names) {
    const key = keys.find((candidate) => candidate.toLowerCase() === String(name).toLowerCase());
    if (key === undefined) continue;
    const text = String(attributes[key] ?? '').trim();
    return text.length > 0 ? text : null;
  }
  return null;
}

/** Declared numeric value, or null when the attribute is absent, blank, non-numeric, or unset. */
export function caesarDeclaredNumber(attributes, names) {
  const text = caesarAttributeText(attributes, names);
  if (text === null) return null;
  const value = Number(text);
  if (!Number.isFinite(value) || isCaesarUnsetSentinel(value)) return null;
  return value;
}

/**
 * True when a record is an unused slot of a CAESAR fixed-width child array.
 *
 * Every identity attribute must be explicitly present and carry the sentinel.
 * An absent identity attribute does NOT count as unset: absence is a different
 * (and possibly malformed) condition, and treating it as an empty slot would
 * silently discard records in exports this project has not characterized.
 *
 * @param {object} attributes Raw attributes of the record.
 * @param {Array<string>} identityAttributes Attributes that identify the record.
 * @returns {boolean} True only for a confirmed unused slot.
 */
export function isUnfilledCaesarSlot(attributes, identityAttributes) {
  if (!Array.isArray(identityAttributes) || identityAttributes.length === 0) return false;
  return identityAttributes.every(
    (name) => isCaesarUnsetSentinelText(caesarAttributeText(attributes, [name])),
  );
}
