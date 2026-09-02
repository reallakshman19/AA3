import { caseRecord } from './inputxml-linear-physical-case-builders.js';

export function appendInputXmlHangerCases({
  cases,
  structural,
  loadCaseProfile,
  modelReference,
  primitives,
  thermalComplete,
}) {
  if (primitives.hanger.length === 0) return;
  cases.push(caseRecord({
    structural, loadCaseProfile, modelReference,
    caseToken: 'WH', caseRole: 'WEIGHT_HANGER_PRELOAD',
    primitives: [...primitives.gravity, ...primitives.hanger],
    loadCaseClass: 'MIXED_PHYSICAL', label: 'W+H',
    description: 'InputXML self-weight with predefined hanger installation preload.',
  }));
  if (primitives.pressure.length > 0) cases.push(caseRecord({
    structural, loadCaseProfile, modelReference,
    caseToken: 'WPH', caseRole: 'WEIGHT_PRESSURE_HANGER_PRELOAD',
    primitives: [...primitives.gravity, ...primitives.pressure, ...primitives.hanger],
    loadCaseClass: 'MIXED_PHYSICAL', label: 'W+P1+H',
    description: 'InputXML sustained physical components with predefined hanger preload.',
  }));
  if (!thermalComplete) return;
  cases.push(caseRecord({
    structural, loadCaseProfile, modelReference,
    caseToken: 'WTH', caseRole: 'WEIGHT_TEMPERATURE_HANGER_PRELOAD',
    primitives: [...primitives.gravity, ...primitives.thermal, ...primitives.hanger],
    loadCaseClass: 'MIXED_PHYSICAL', label: 'W+T1+H',
    description: 'InputXML self-weight, temperature, and predefined hanger preload.',
  }));
  if (primitives.pressure.length > 0) cases.push(caseRecord({
    structural, loadCaseProfile, modelReference,
    caseToken: 'WPTH', caseRole: 'WEIGHT_PRESSURE_TEMPERATURE_HANGER_PRELOAD',
    primitives: [...primitives.gravity, ...primitives.pressure, ...primitives.thermal, ...primitives.hanger],
    loadCaseClass: 'MIXED_PHYSICAL', label: 'W+P1+T1+H',
    description: 'InputXML operating physical components with predefined hanger preload.',
  }));
}
