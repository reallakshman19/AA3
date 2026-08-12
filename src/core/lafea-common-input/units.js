import {
  supportedUnits,
  unitFactor,
} from '../shared-primitives/units.js';

/** LAFEA compatibility surface for product-neutral primitive unit conversion. */
export function lafeaUnitFactor(dimension, unit) {
  return unitFactor(dimension, unit);
}

export function lafeaSupportedUnits(dimension) {
  return supportedUnits(dimension);
}
