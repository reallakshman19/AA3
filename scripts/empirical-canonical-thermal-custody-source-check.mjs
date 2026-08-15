import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(
  new URL('../src/workspace/engineering-loads/adapters/canonical-thermal-rom-authority-adapter.js', import.meta.url),
  'utf8',
);

for (const required of [
  'requireStagedJsonProcessAuthority',
  'materializeStagedJsonMaterialResolutions',
  'requirePipeSectionResolution',
  'requirePreproductionThermalLiftoffDisplacementAuthority',
  'requireSjsonEmpiricalPipingRequest',
  'validateSupportAttachmentModel',
  'validateRestraintCapabilityModel',
  'solveRootedTreeThermalRestraintCompatibility',
  'implicitZeroSupportMovementPermitted: false',
  'toleranceInferredTopologyConsumed: false',
  'finiteElementSolverConsumed: false',
  'APPROVED_MEAN_BETWEEN_REFERENCE_AND_ANALYSIS',
  'STAGEDJSON_BASELINE_TEMPERATURE_K',
]) {
  assert.ok(source.includes(required), `missing required custody marker: ${required}`);
}

for (const prohibited of [
  'linear-fea-solver',
  'assemblePlanarSystem',
  'solveAssembledPlanarSystem',
  'thermalForceN',
  'EA*alpha',
  'EMPIRICAL_RESTRAINT_NETWORK_FORMULA_IDS',
  'axialComplianceMultiplier',
  'bendingComplianceMultiplier',
  'topologyInteractionMultiplier',
]) {
  assert.ok(!source.includes(prohibited), `prohibited route/mechanism marker found: ${prohibited}`);
}

assert.match(
  source,
  /Movement authority must cover exactly the root and solved restraint support sites; no missing movement becomes zero\./u,
);
assert.match(
  source,
  /reference temperature .* does not equal the current approved mean-CTE baseline/u,
);
assert.match(
  source,
  /Current phase requires explicit coverage of every governed restraint occurrence/u,
);

console.log('PASS: canonical thermal ROM custody source guard');
