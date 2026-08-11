import { lafeaUnitFactor } from '../lafea-common-input/units.js';
import { CANONICAL_UNITS } from './constants.js';
import { modelError } from './errors.js';
import { canonicalNumber } from './numeric.js';

export function canonicalizeUnits(units) {
  if (!units || typeof units !== 'object' || Array.isArray(units)) {
    throw modelError('UNITS_REQUIRED', 'units', 'Explicit engineering units are required.');
  }
  const declared = {};
  const conversionFactors = {};
  for (const dimension of Object.keys(CANONICAL_UNITS)) {
    const unit = units[dimension];
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
  return { declared, canonical: CANONICAL_UNITS, conversionFactors };
}

export function convertScalar(value, dimension, units, path) {
  return canonicalNumber(value * units.conversionFactors[dimension], path);
}

export function convertVector(vector, dimension, units, path) {
  return vector.map((value, index) => (
    convertScalar(value, dimension, units, `${path}[${index}]`)
  ));
}
