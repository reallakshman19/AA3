export function createPhase1Bitset(size, fill = false) {
  requireSize(size);
  const words = new Uint32Array(Math.ceil(size / 32));
  if (fill && words.length > 0) {
    words.fill(0xffffffff);
    const excess = words.length * 32 - size;
    if (excess > 0) words[words.length - 1] >>>= excess;
  }
  return words;
}

export function setPhase1Bit(bitset, ordinal) {
  requireOrdinal(bitset, ordinal);
  bitset[ordinal >>> 5] |= (1 << (ordinal & 31)) >>> 0;
}

export function testPhase1Bit(bitset, ordinal) {
  requireOrdinal(bitset, ordinal);
  return (bitset[ordinal >>> 5] & ((1 << (ordinal & 31)) >>> 0)) !== 0;
}

export function andPhase1Bitsets(left, right) {
  requireSameLength(left, right);
  const result = new Uint32Array(left.length);
  for (let index = 0; index < result.length; index += 1) {
    result[index] = left[index] & right[index];
  }
  return result;
}

export function orPhase1Bitsets(bitsets, wordLength) {
  const valid = bitsets.filter((value) => value instanceof Uint32Array);
  const length = wordLength ?? valid[0]?.length ?? 0;
  const result = new Uint32Array(length);
  for (const bitset of valid) {
    if (bitset.length !== length) {
      throw bitsetError('E_P06_BITSET_LENGTH', 'Phase-1 bitsets must have identical word lengths.');
    }
    for (let index = 0; index < length; index += 1) result[index] |= bitset[index];
  }
  return result;
}

export function countPhase1Bits(bitset, size) {
  requireSize(size);
  if (!(bitset instanceof Uint32Array) || bitset.length !== Math.ceil(size / 32)) {
    throw bitsetError('E_P06_BITSET_LENGTH', 'Phase-1 bitset length does not match target count.');
  }
  let count = 0;
  for (const word of bitset) count += popcount32(word);
  return count;
}

export function phase1BitsetOrdinals(bitset, size) {
  requireSize(size);
  if (!(bitset instanceof Uint32Array) || bitset.length !== Math.ceil(size / 32)) {
    throw bitsetError('E_P06_BITSET_LENGTH', 'Phase-1 bitset length does not match target count.');
  }
  const ordinals = [];
  for (let ordinal = 0; ordinal < size; ordinal += 1) {
    if ((bitset[ordinal >>> 5] & ((1 << (ordinal & 31)) >>> 0)) !== 0) ordinals.push(ordinal);
  }
  return Object.freeze(ordinals);
}

export function clonePhase1Bitset(bitset) {
  if (!(bitset instanceof Uint32Array)) {
    throw bitsetError('E_P06_BITSET_REQUIRED', 'Phase-1 bitset must be Uint32Array.');
  }
  return bitset.slice();
}

function popcount32(value) {
  let word = value >>> 0;
  word -= (word >>> 1) & 0x55555555;
  word = (word & 0x33333333) + ((word >>> 2) & 0x33333333);
  return (((word + (word >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

function requireSameLength(left, right) {
  if (!(left instanceof Uint32Array) || !(right instanceof Uint32Array)
    || left.length !== right.length) {
    throw bitsetError('E_P06_BITSET_LENGTH', 'Phase-1 bitsets must have identical word lengths.');
  }
}

function requireOrdinal(bitset, ordinal) {
  if (!(bitset instanceof Uint32Array)) {
    throw bitsetError('E_P06_BITSET_REQUIRED', 'Phase-1 bitset must be Uint32Array.');
  }
  if (!Number.isSafeInteger(ordinal) || ordinal < 0 || ordinal >= bitset.length * 32) {
    throw bitsetError('E_P06_BITSET_ORDINAL', `Phase-1 bit ordinal is invalid: ${ordinal}`);
  }
}

function requireSize(size) {
  if (!Number.isSafeInteger(size) || size < 0) {
    throw bitsetError('E_P06_BITSET_SIZE', `Phase-1 bitset size is invalid: ${size}`);
  }
}

function bitsetError(code, message) {
  const error = new TypeError(message);
  error.code = code;
  error.analysisStage = 'LFEA_PREFLIGHT_PHASE1_INDEX';
  return error;
}
