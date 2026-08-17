export const LAFEA_HOLE_FRONT_LEGACY_GROWTH = 1.6;
const TRIANGULAR_ROW_HEIGHT_FACTOR = Math.sqrt(3) / 2;

/**
 * Map the retained longest-edge adjacency limit onto the row-height growth used
 * by the two-layer hole-front constructor.
 *
 * For an aligned triangular strip with boundary pitch e and next-row increment
 * g*(sqrt(3)/2)*e, the longest connecting diagonal is
 *
 *   e * sqrt(1 + 3 g^2 / 4).
 *
 * Requiring that characteristic edge to remain <= r*e gives
 *
 *   g <= (2/sqrt(3))*sqrt(r^2 - 1).
 *
 * The actual child mesh is still measured by the retained mesh-quality gate;
 * this policy only prevents the constructor from intentionally requesting a
 * transition that is already incompatible with that gate.
 */
export function lafeaHoleFrontGradingPolicy(adjacentSizeRatioMax = null) {
  if (adjacentSizeRatioMax === null || adjacentSizeRatioMax === undefined) {
    return freeze({
      mode: 'LEGACY_UNGOVERNED',
      adjacentSizeRatioMax: null,
      activationRatio: LAFEA_HOLE_FRONT_LEGACY_GROWTH,
      layerGrowth: LAFEA_HOLE_FRONT_LEGACY_GROWTH,
      idealStripCharacteristicRatio: characteristicRatio(LAFEA_HOLE_FRONT_LEGACY_GROWTH),
    });
  }
  if (!Number.isFinite(adjacentSizeRatioMax) || !(adjacentSizeRatioMax > 1)) {
    const error = new TypeError('LAFEA_HOLE_FRONT_ADJACENT_SIZE_RATIO_INVALID');
    error.code = 'LAFEA_HOLE_FRONT_ADJACENT_SIZE_RATIO_INVALID';
    throw error;
  }
  const compatibleGrowth = (1 / TRIANGULAR_ROW_HEIGHT_FACTOR)
    * Math.sqrt(adjacentSizeRatioMax ** 2 - 1);
  const layerGrowth = Math.min(LAFEA_HOLE_FRONT_LEGACY_GROWTH, compatibleGrowth);
  return freeze({
    mode: 'ADJACENT_SIZE_GOVERNED',
    adjacentSizeRatioMax,
    activationRatio: adjacentSizeRatioMax,
    layerGrowth,
    idealStripCharacteristicRatio: characteristicRatio(layerGrowth),
  });
}

export function lafeaHoleFrontCharacteristicRatio(layerGrowth) {
  if (!Number.isFinite(layerGrowth) || !(layerGrowth > 0)) {
    throw new TypeError('LAFEA_HOLE_FRONT_LAYER_GROWTH_INVALID');
  }
  return characteristicRatio(layerGrowth);
}

function characteristicRatio(layerGrowth) {
  return Math.sqrt(1 + 3 * layerGrowth ** 2 / 4);
}
function freeze(value) { return Object.freeze(value); }
