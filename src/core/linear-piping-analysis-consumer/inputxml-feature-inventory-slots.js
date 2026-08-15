import { isUnfilledCaesarSlot } from '../geometry/adapters/caesar-unset-sentinel.js';

// CAESAR emits a fixed number of SIF/FORCESMOMENTS child slots per element and
// leaves unused ones present with the sentinel rather than omitting them (see
// caesar-unset-sentinel.js). NODE is the reliable identity attribute for SIF:
// on BM4 every SIF slot with a declared NODE has TYPE unset regardless of
// whether the slot is real, so TYPE cannot be used to detect an empty slot.
const SIF_SLOT_IDENTITY_ATTRIBUTES = Object.freeze(['NODE']);
const FORCES_MOMENTS_SLOT_IDENTITY_ATTRIBUTES = Object.freeze(['NODE_NUM']);

export function isSifSlotUnfilled(attributes) {
  return isUnfilledCaesarSlot(attributes, SIF_SLOT_IDENTITY_ATTRIBUTES);
}

export function isForcesMomentsSlotUnfilled(attributes) {
  return isUnfilledCaesarSlot(attributes, FORCES_MOMENTS_SLOT_IDENTITY_ATTRIBUTES);
}
