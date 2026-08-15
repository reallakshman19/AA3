import fs from 'node:fs';
import assert from 'node:assert/strict';

const adapter = fs.readFileSync(
  new URL('../src/workspace/engineering-loads/adapters/canonical-thermal-rom-authority-adapter.js', import.meta.url),
  'utf8',
);
const sourceGate = fs.readFileSync(
  new URL('../src/workspace/engineering-loads/adapters/canonical-thermal-rom-source-bound-execution.js', import.meta.url),
  'utf8',
);
const combined = `${adapter}\n${sourceGate}`;

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
  'SOURCE_BACKED_SUPPORT_DISPLACEMENT',
  'freeExpansionMappingAcceptedAsSupportMovement: false',
  'GLOBAL_XYZ_Z_UP_ONLY_IN_THIS_PHASE',
  'coordinateFrameTransformationPerformed: false',
]) {
  assert.ok(combined.includes(required), `missing required custody marker: ${required}`);
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
  assert.ok(!combined.includes(prohibited), `prohibited route/mechanism marker found: ${prohibited}`);
}

assert.match(
  adapter,
  /Movement authority must cover exactly the root and solved restraint support sites; no missing movement becomes zero\./u,
);
assert.match(
  adapter,
  /reference temperature .* does not equal the current approved mean-CTE baseline/u,
);
assert.match(
  adapter,
  /Current phase requires explicit coverage of every governed restraint occurrence/u,
);
assert.match(
  sourceGate,
  /free-expansion mapping cannot become support\/ground movement authority/u,
);
assert.match(
  sourceGate,
  /coordinate-frame transformation is not yet qualified/u,
);

console.log('PASS: canonical thermal ROM custody source guard');
