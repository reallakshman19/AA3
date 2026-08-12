import { lafeaUnitFactor } from '../lafea-common-input/units.js';
import { CANONICAL_UNITS } from './constants.js';
import { modelError } from './errors.js';
import { canonicalNumber } from './numeric.js';
import { exactRecord } from './validation.js';

const REQUIRED_DIMENSIONS = Object.freeze(['length', 'force', 'stress', 'modulus']);

export function canonicalizeUnits(value) {
  const row = exactRecord(value, REQUIRED_DIMENSIONS, 'units');
  const declared = {};
  const conversionFactors = {};
  for (const dimension of REQUIRED_DIMENSIONS) {
    const unit = row[dimension];
    const factor = lafeaUnitFactor(dimension, unit);
    if (factor === null) {
      throw modelError(
        'UNSUPPORTED_UNIT',
        `units.${dimension}`,
        `Unsupported ${dimension} unit.`,
      );
    }
    declared[dimension] = unit;
    conversionFactors[dimension] = factor;
  }
  // Body-force intensity (force/volume) is a derived dimension (stress/length)
  // composed from the declared stress and length units.
  conversionFactors.bodyForceIntensity = (
    conversionFactors.stress / conversionFactors.length
  );
  return { declared, canonical: CANONICAL_UNITS, conversionFactors };
}

export function convert(value, dimension, units, path) {
  return canonicalNumber(value * units.conversionFactors[dimension], path);
}
