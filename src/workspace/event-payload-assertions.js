/**
 * Shared payload assertion primitives for the workspace event bus.
 *
 * Nothing here knows about a topic; callers pass the topic in so the thrown
 * message names it.
 */
export function assertRecord(value, topic) {
  if (!isRecord(value)) throw new TypeError(`${topic} payload must be an object.`);
}

export function assertNonEmptyString(value, field, topic) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${topic} payload.${field} must be a non-empty string.`);
  }
}

export function assertNonNegativeInteger(value, field, topic) {
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError(`${topic} payload.${field} must be a non-negative integer.`);
  }
}

export function assertFiniteNumber(value, field, topic) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${topic} payload.${field} must be a finite number.`);
  }
}

export function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
