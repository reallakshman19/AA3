import fs from 'node:fs';

const value = JSON.parse(fs.readFileSync(new URL('../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-friction-authority-closure.json', import.meta.url), 'utf8'));
const required = [
  'FRICTION_STATE_HISTORY_SEMANTICS_AUTHORITY_REQUIRED',
  'GAP_CONTACT_STATE_SEMANTICS_AUTHORITY_REQUIRED',
];

check(value.schema === 'm047-bm4l-friction-authority-closure/v2', 'schema');
check(value.benchmarkId === 'BM4_L', 'benchmark');
check(value.officialPrimaryEvidence.frictionStiffness.rawCfgValue === 1000000, 'raw friction stiffness');
check(value.officialPrimaryEvidence.frictionStiffness.siValueNPerM === 175126835.24647635, 'SI friction stiffness');
check(value.officialPrimaryEvidence.frictionAngleVariationDeg.value === 15, 'angle variation');
check(value.officialPrimaryEvidence.frictionNormalForceVariation.value === 0.15, 'normal-force variation');
check(value.officialPrimaryEvidence.frictionSlideMultiplier.status === 'RESOLVED', 'slide multiplier status');
check(value.officialPrimaryEvidence.frictionSlideMultiplier.numericValue === 1, 'slide multiplier exact cfg value');
check(value.exactCfgEvidence.frictionControls.FRICT_SLIDE_MULT === 1, 'cfg slide multiplier custody');
check(value.historicalRepositoryAndArtifactSearch.disposition === 'SUPERSEDED_AS_A_BLOCKER_BY_USER_SUPPLIED_EXACT_CFG', 'historical search disposition');
for (const setting of ['DEFAULT_AMBIENT_TEMPERATURE','BOURDON_PRESSURE','COEFFICIENT_OF_FRICTION_(MU)','FLEXIBILITY_ELASTIC_MODULUS']) {
  check(value.exactCfgEvidence.overrideExclusions.includes(setting), `missing cfg override exclusion ${setting}`);
}
check(JSON.stringify([...value.decision.remainingBlockers].sort()) === JSON.stringify([...required].sort()), 'remaining blockers');
check(value.decision.resolvedSinceV1.includes('FRICTION_SLIDE_MULTIPLIER_AUTHORITY_REQUIRED'), 'slide blocker resolution');
check(value.decision.status === 'SLIDE_MULTIPLIER_RESOLVED_TWO_SEMANTICS_BLOCKERS_REMAIN', 'decision');
check(value.decision.l13ProductionSolveAuthorized === false, 'L13 must remain blocked');
check(value.decision.l7ProductionSolveAuthorized === false, 'L7 must remain blocked');
check(value.decision.newMechanicsAuthorized === false, 'new mechanics must remain blocked');

console.log(JSON.stringify({
  check: 'm047-friction-authority-closure',
  status: 'PASS',
  remainingBlockers: required,
  slideMultiplierNumericValue: 1,
  productionFrictionAuthorized: false,
  newMechanicsAuthorized: false,
}, null, 2));

function check(condition, message) { if (!condition) throw new Error(message); }
