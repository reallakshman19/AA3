import { springRateToSiFactor } from '../../linear-piping-analysis-consumer/restraint-spring-rate.js';
import { attributeValue, firstElement } from './inputxml-tag-scanner.js';

const FACTOR_RELATIVE_TOLERANCE = 5e-4;
const FACTOR_ABSOLUTE_TOLERANCE = 1e-6;

const DECLARATIONS = Object.freeze({
  LENGTH: Object.freeze({
    M: { unit: 'm', factor: 0.0254 },
    MM: { unit: 'mm', factor: 25.4 },
    CM: { unit: 'cm', factor: 2.54 },
    IN: { unit: 'in', factor: 1 },
    INCH: { unit: 'in', factor: 1 },
    FT: { unit: 'ft', factor: 1 / 12 },
  }),
  FORCE: Object.freeze({
    N: { scale: 1, factor: 4.4482216152605 },
    KN: { scale: 1000, factor: 0.0044482216152605 },
    LBF: { scale: 4.4482216152605, factor: 1 },
  }),
  MOMENT: Object.freeze({
    NM: { scale: 1, factor: 0.1129848290276167 },
    KNM: { scale: 1000, factor: 0.0001129848290276167 },
    LBFIN: { scale: 0.1129848290276167, factor: 1 },
    LBFFT: { scale: 1.3558179483314003, factor: 1 / 12 },
  }),
  STRESS: Object.freeze({
    PA: { scale: 1, factor: 6894.757293168 },
    KPA: { scale: 1000, factor: 6.894757293168 },
    MPA: { scale: 1e6, factor: 0.006894757293168 },
    'N/SQMM': { scale: 1e6, factor: 0.006894757293168 },
    BAR: { scale: 1e5, factor: 0.06894757293168 },
    PSI: { scale: 6894.757293168, factor: 1 },
  }),
  TEMP: Object.freeze({
    C: { kind: 'CELSIUS', factor: 5 / 9 },
    F: { kind: 'FAHRENHEIT', factor: 1 },
    K: { kind: 'KELVIN', factor: 5 / 9 },
  }),
  DENSITY: Object.freeze({
    'KG/CUCM': { scale: 1e6, factor: 0.0276799047102 },
    'KG/M3': { scale: 1, factor: 27679.9047102 },
    'LB/CUIN': { scale: 27679.9047102, factor: 1 },
  }),
});

function normalizedLabel(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\bBARS\b/gu, 'BAR')
    .replace(/\bINCHES\b/gu, 'IN')
    // Compound density labels are normalized BEFORE the bare `LB -> LBF` rule
    // below, which would otherwise rewrite the `LB` of "lb. / cu.in." into
    // "LBF" and leave the imperial density label permanently unmatchable.
    // (That ordering bug made the LB/CUIN registry entry dead: every
    // US-units CAESAR export blocked on PDENS/IDENS/FDENS.)
    //
    // CAESAR writes these labels two ways and both occur in real exports:
    // slash-separated ("kg. / cu.cm.", BM1/BM2/BM3) and dot-separated
    // ("kg.cu.cm.", BM4), so the separator is optional. This does not weaken
    // validation: `declaredUnit` still cross-checks the declared FACTOR
    // against the registry factor, so a label that normalizes to the wrong
    // unit fails closed on INPUTXML_UNIT_FACTOR_MISMATCH rather than
    // silently converting with a wrong scale.
    .replace(/KG\.?\s*[/.]?\s*CU\.?\s*CM\.?/gu, 'KG/CUCM')
    .replace(/KG\.?\s*[/.]?\s*M(?:\^?3|3)\.?/gu, 'KG/M3')
    .replace(/LB\.?\s*[/.]?\s*CU\.?\s*IN\.?/gu, 'LB/CUIN')
    // The lookahead keeps this rule from re-corrupting an already-normalized
    // `LB/CUIN` token produced immediately above.
    .replace(/\bLBS?\.?\b(?!\/CUIN)/gu, 'LBF')
    .replace(/LBF\.?[-·*\s]*IN\.?/gu, 'LBFIN')
    .replace(/LBF\.?[-·*\s]*FT\.?/gu, 'LBFFT')
    .replace(/KN\.?[-·*\s]*M\.?/gu, 'KNM')
    .replace(/N\.?[-·*\s]*M\.?/gu, 'NM')
    .replace(/N\.?\s*\/\s*SQ\.?\s*MM\.?/gu, 'N/SQMM')
    .replace(/[.\s]/gu, '');
}

function declaredUnit(unitsInner, tagName, registry, diagnostics) {
  const tag = firstElement(unitsInner, [tagName]);
  if (!tag) return null;
  const label = attributeValue(tag.attributes, 'LABEL');
  const factorText = attributeValue(tag.attributes, 'FACTOR');
  const factor = Number(factorText);
  const key = normalizedLabel(label);
  const definition = registry[key];
  if (!definition) {
    diagnostics.push({
      severity: 'error',
      code: 'INPUTXML_UNIT_LABEL_UNSUPPORTED',
      message: `InputXML <${tagName}> unit label "${label}" is unsupported.`,
      data: { tagName, label, factor: factorText },
    });
    return null;
  }
  if (!Number.isFinite(factor) || !factorMatches(factor, definition.factor)) {
    diagnostics.push({
      severity: 'error',
      code: 'INPUTXML_UNIT_FACTOR_MISMATCH',
      message: `InputXML <${tagName}> factor ${factorText} is inconsistent with label "${label}".`,
      data: { tagName, label, factor: factorText, expectedFactor: definition.factor },
    });
  }
  return Object.freeze({ tagName, label, factor, key, ...definition });
}

function factorMatches(actual, expected) {
  const tolerance = Math.max(
    Math.abs(expected) * FACTOR_RELATIVE_TOLERANCE,
    FACTOR_ABSOLUTE_TOLERANCE,
  );
  return Math.abs(actual - expected) <= tolerance;
}

export function parseInputXmlUnitSystem(xmlText, fallbackLengthUnit, diagnostics) {
  const units = firstElement(xmlText, ['UNITS']);
  if (!units) {
    return Object.freeze({
      declared: false,
      lengthUnit: fallbackLengthUnit || null,
      force: null,
      momentInput: null,
      stress: null,
      pressure: null,
      elasticModulus: null,
      temperature: null,
      pipeDensity: null,
      insulationDensity: null,
      fluidDensity: null,
    });
  }

  const length = declaredUnit(units.inner, 'LENGTH', DECLARATIONS.LENGTH, diagnostics);
  const result = {
    declared: true,
    lengthUnit: length?.unit ?? fallbackLengthUnit ?? null,
    force: declaredUnit(units.inner, 'FORCE', DECLARATIONS.FORCE, diagnostics),
    momentInput: declaredUnit(units.inner, 'MOMENT-INPUT', DECLARATIONS.MOMENT, diagnostics),
    stress: declaredUnit(units.inner, 'STRESS', DECLARATIONS.STRESS, diagnostics),
    pressure: declaredUnit(units.inner, 'PRESSURE', DECLARATIONS.STRESS, diagnostics),
    elasticModulus: declaredUnit(units.inner, 'EMOD', DECLARATIONS.STRESS, diagnostics),
    temperature: declaredUnit(units.inner, 'TEMP', DECLARATIONS.TEMP, diagnostics),
    pipeDensity: declaredUnit(units.inner, 'PDENS', DECLARATIONS.DENSITY, diagnostics),
    insulationDensity: declaredUnit(units.inner, 'IDENS', DECLARATIONS.DENSITY, diagnostics),
    fluidDensity: declaredUnit(units.inner, 'FDENS', DECLARATIONS.DENSITY, diagnostics),
  };
  if (length && fallbackLengthUnit && fallbackLengthUnit !== length.unit) {
    diagnostics.push({
      severity: 'info',
      code: 'INPUTXML_FILE_LENGTH_UNIT_OVERRIDES_CALLER',
      message: `InputXML file declares ${length.unit}; caller unit ${fallbackLengthUnit} was not used.`,
      data: { fileUnit: length.unit, callerUnit: fallbackLengthUnit },
    });
  }
  return Object.freeze(result);
}

export function convertInputXmlScalar(value, declaration, quantityName) {
  if (value === null || value === undefined) return null;
  if (!declaration) {
    throw new TypeError(`InputXML <UNITS> does not declare ${quantityName}.`);
  }
  if (declaration.kind === 'CELSIUS') return value + 273.15;
  if (declaration.kind === 'FAHRENHEIT') return ((value - 32) * 5) / 9 + 273.15;
  if (declaration.kind === 'KELVIN') return value;
  return value * declaration.scale;
}

/**
 * Stiffness is force per length, and CAESAR declares it in the file's own
 * units -- N/mm, lb/in -- while the solver works in N/m. Neither the FORCE
 * declaration nor the LENGTH declaration alone converts it, which is how a
 * declared spring rate reached the solver unconverted: force and length are
 * each handled elsewhere, and the quotient belonged to neither.
 *
 * Returns null when the file declares no FORCE unit, so the caller can refuse
 * rather than silently assume the rate was already SI.
 */
export function inputXmlStiffnessToSiFactor(forceDeclaration, lengthUnit) {
  return springRateToSiFactor(forceDeclaration, lengthUnit);
}

export function convertInputXmlLengthToMetres(value, sourceUnit) {
  const scales = { m: 1, mm: 1e-3, cm: 1e-2, in: 0.0254, ft: 0.3048 };
  const scale = scales[sourceUnit];
  if (!scale) throw new TypeError(`Unsupported InputXML length unit ${sourceUnit}.`);
  return value * scale;
}
