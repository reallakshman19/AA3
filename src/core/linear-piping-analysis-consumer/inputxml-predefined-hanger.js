import { isCaesarUnsetSentinel } from '../geometry/adapters/caesar-unset-sentinel.js';
import {
  declaredLengthToSiFactor,
  resolveSpringRate,
} from './restraint-spring-rate.js';
import {
  DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE as APPROXIMATE,
  STRICT_INPUTXML_LINEAR_STATIC_PROFILE as STRICT,
  exactDisposition,
  invalidDisposition,
  unsupportedDisposition,
} from './inputxml-model-health-profile.js';

const Y_UP = Object.freeze([0, 1, 0]);
const DRAFT_CODE = 'DRAFT_SPRING_SUPPORT_NO_REFERENCE';

export function classifyPredefinedHanger(attributes, stiffnessToSi, lengthUnit) {
  const nodeId = nodeAttribute(attributes, ['NODE']);
  const springRate = optionalNumber(attributes, ['SPRING_RATE']);
  const coldLoad = optionalNumber(attributes, ['COLD_LOAD']);
  const numberOfHangers = optionalNumber(attributes, ['NUM_HANGERS']);
  const rate = resolveSpringRate(springRate, stiffnessToSi);
  const lengthScale = declaredLengthToSiFactor(lengthUnit);
  const forceToSi = Number.isFinite(stiffnessToSi) && Number.isFinite(lengthScale)
    ? stiffnessToSi * lengthScale
    : null;
  const countValid = Number.isInteger(numberOfHangers) && numberOfHangers > 0;
  const coldLoadDeclared = finitePositive(coldLoad) ? coldLoad : null;
  const coldLoadPerHanger = coldLoadDeclared !== null && Number.isFinite(forceToSi)
    ? coldLoadDeclared * forceToSi
    : null;
  const fullyPredefined = rate.stiffnessDeclared !== null && coldLoadDeclared !== null && countValid;
  return Object.freeze({
    kind: 'HANGER',
    nodeId,
    hangerType: optionalNumber(attributes, ['HGR_TYPE']),
    hangerTable: optionalNumber(attributes, ['HGR_TABLE']),
    numberOfHangers: countValid ? numberOfHangers : null,
    numberOfHangersDeclared: numberOfHangers,
    springRateDeclaredPerHanger: rate.stiffnessDeclared,
    springRatePerHanger: rate.stiffnessValue,
    springRateTotal: rate.stiffnessValue !== null && countValid
      ? rate.stiffnessValue * numberOfHangers
      : null,
    coldLoadDeclaredPerHanger: coldLoadDeclared,
    coldLoadPerHanger,
    coldLoadTotal: coldLoadPerHanger !== null && countValid
      ? coldLoadPerHanger * numberOfHangers
      : null,
    unitsResolvable: rate.stiffnessUnitsResolvable && Number.isFinite(forceToSi),
    fullyPredefined,
    verticalDirection: Y_UP,
    verticalAxisAuthority: 'LFEA_INPUTXML_Y_VERTICAL_SUBSET_R1',
    draftLimitationCode: DRAFT_CODE,
  });
}

export function predefinedHangerDispositions(classification) {
  if (classification.nodeId === null) {
    return both(invalidDisposition('MODEL_HANGER_NODE_INVALID'));
  }
  if (!classification.fullyPredefined) {
    if (classification.numberOfHangersDeclared !== null && classification.numberOfHangers === null) {
      return both(invalidDisposition('MODEL_HANGER_COUNT_INVALID'));
    }
    return both(unsupportedDisposition('MODEL_HANGER_PREDEFINED_DATA_INCOMPLETE'));
  }
  if (!classification.unitsResolvable
    || classification.springRatePerHanger === null
    || classification.coldLoadPerHanger === null) {
    return both(unsupportedDisposition('MODEL_HANGER_UNITS_UNRESOLVED'));
  }
  return both(exactDisposition());
}

export function predefinedHangerLimitationCodes(classification) {
  return classification?.springRateTotal !== null && classification?.coldLoadTotal !== null
    ? Object.freeze([DRAFT_CODE])
    : Object.freeze([]);
}

function optionalNumber(attributes, names) {
  const value = attribute(attributes, names);
  if (value === null) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || isCaesarUnsetSentinel(number)) return null;
  return number;
}

function nodeAttribute(attributes, names) {
  const value = attribute(attributes, names);
  if (value === null) return null;
  const number = Number(value);
  if (Number.isFinite(number)) {
    if (isCaesarUnsetSentinel(number)) return null;
    return String(number);
  }
  return value;
}

function attribute(attributes, names) {
  for (const name of names) {
    const key = Object.keys(attributes ?? {}).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
    if (key !== undefined) {
      const text = String(attributes[key] ?? '').trim();
      return text.length > 0 ? text : null;
    }
  }
  return null;
}

function finitePositive(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function both(disposition) {
  return Object.freeze({ [STRICT]: disposition, [APPROXIMATE]: disposition });
}
