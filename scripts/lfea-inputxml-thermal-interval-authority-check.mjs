import assert from 'node:assert/strict';
import {
  INPUTXML_THERMAL_INTERVAL_AUTHORITY_SCHEMA,
  requireInputXmlThermalIntervalAuthority,
  resolveInputXmlThermalExpansionAuthority,
  resolveInputXmlThermalInputAuthority,
  sealInputXmlThermalIntervalAuthority,
} from '../src/core/linear-piping-analysis-consumer/inputxml-thermal-authority.js';

const MODEL_ID = 'MODEL-A';
const SOURCE_HASH = 'fnv1a64:0123456789abcdef';
const INSTALLATION_TEMPERATURE = 294.15;
const OPERATING_TEMPERATURE = 393.15;
const COEFFICIENT = 1.2231989994646464e-5;

const intervalAuthority = sealInputXmlThermalIntervalAuthority({
  schema: INPUTXML_THERMAL_INTERVAL_AUTHORITY_SCHEMA,
  authorityId: 'MODEL-A-T1',
  modelId: MODEL_ID,
  sourceBundleSemanticHash: SOURCE_HASH,
  materialNumber: 106,
  installationTemperature: INSTALLATION_TEMPERATURE,
  operatingTemperature: OPERATING_TEMPERATURE,
  coefficientPerKelvin: COEFFICIENT,
  sourceEvidence: {
    sourceId: 'QUALIFIED_MODEL_INTERVAL_RECORD',
    sourceRevision: '1',
    sourceSemanticHash: 'fnv1a64:fedcba9876543210',
  },
  semanticHash: '',
});

assert.equal(intervalAuthority.status, 'RESOLVED');
assert.equal(intervalAuthority.basis, 'MODEL_INTERVAL_MEAN');
assert.equal(intervalAuthority.materialNumber, '106');
assert.equal(intervalAuthority.deltaTemperature, 99);
assert.equal(intervalAuthority.thermalStrain, 0.00121096700947);
assert.ok(Object.isFrozen(intervalAuthority));
assert.ok(Object.isFrozen(intervalAuthority.sourceEvidence));
assert.deepEqual(requireInputXmlThermalIntervalAuthority(intervalAuthority), intervalAuthority);

const explicit = resolveInputXmlThermalInputAuthority({
  intervalAuthority,
  modelId: MODEL_ID,
  sourceBundleSemanticHash: SOURCE_HASH,
  materialNumber: 106,
  operatingTemperature: OPERATING_TEMPERATURE,
});
assert.equal(explicit.basis, 'MODEL_INTERVAL_MEAN');
assert.equal(explicit.installationTemperature, INSTALLATION_TEMPERATURE);
assert.equal(explicit.thermalAuthority.semanticHash, intervalAuthority.semanticHash);

const genericAuthority = resolveInputXmlThermalExpansionAuthority(106);
const generic = resolveInputXmlThermalInputAuthority({
  modelId: MODEL_ID,
  sourceBundleSemanticHash: SOURCE_HASH,
  materialNumber: 106,
  operatingTemperature: OPERATING_TEMPERATURE,
});
assert.equal(generic.basis, 'GENERIC_MATERIAL');
assert.equal(generic.installationTemperature, 293.15);
assert.deepEqual(generic.thermalAuthority, genericAuthority);
assert.equal(genericAuthority.coefficientPerKelvin, 1.17e-5);
assert.equal(genericAuthority.semanticHash, 'fnv1a64:e5c67f01036ef16b');

expectCode(
  () => resolveExplicit({ modelId: 'MODEL-B' }),
  'INPUTXML_THERMAL_INTERVAL_AUTHORITY_MODEL_MISMATCH',
);
expectCode(
  () => resolveExplicit({ sourceBundleSemanticHash: 'fnv1a64:1111111111111111' }),
  'INPUTXML_THERMAL_INTERVAL_AUTHORITY_SOURCE_MISMATCH',
);
expectCode(
  () => resolveExplicit({ materialNumber: 360 }),
  'INPUTXML_THERMAL_INTERVAL_AUTHORITY_MATERIAL_MISMATCH',
);
expectCode(
  () => resolveExplicit({ operatingTemperature: 394.15 }),
  'INPUTXML_THERMAL_INTERVAL_AUTHORITY_OPERATING_TEMPERATURE_MISMATCH',
);

const tampered = {
  ...intervalAuthority,
  coefficientPerKelvin: intervalAuthority.coefficientPerKelvin * 1.01,
};
expectCode(
  () => requireInputXmlThermalIntervalAuthority(tampered),
  'INPUTXML_THERMAL_INTERVAL_AUTHORITY_HASH_INVALID',
);

console.log(JSON.stringify({
  status: 'PASS',
  check: 'lfea-inputxml-thermal-interval-authority',
  defaultAuthoritySemanticHash: genericAuthority.semanticHash,
  intervalAuthoritySemanticHash: intervalAuthority.semanticHash,
  intervalThermalStrain: intervalAuthority.thermalStrain,
}));

function resolveExplicit(overrides) {
  return resolveInputXmlThermalInputAuthority({
    intervalAuthority,
    modelId: MODEL_ID,
    sourceBundleSemanticHash: SOURCE_HASH,
    materialNumber: 106,
    operatingTemperature: OPERATING_TEMPERATURE,
    ...overrides,
  });
}

function expectCode(action, code) {
  assert.throws(action, (error) => error?.code === code, code);
}
