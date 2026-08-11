import fs from 'node:fs';

const value = JSON.parse(fs.readFileSync(new URL('../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-friction-authority-closure.json', import.meta.url), 'utf8'));
const required = [
  'FRICTION_SLIDE_MULTIPLIER_AUTHORITY_REQUIRED',
  'FRICTION_STATE_HISTORY_SEMANTICS_AUTHORITY_REQUIRED',
  'GAP_CONTACT_STATE_SEMANTICS_AUTHORITY_REQUIRED',
];

check(value.schema === 'm047-bm4l-friction-authority-closure/v1', 'schema');
check(value.benchmarkId === 'BM4_L', 'benchmark');
check(value.officialPrimaryEvidence.frictionStiffness.value === 1000000, 'friction stiffness');
check(value.officialPrimaryEvidence.frictionAngleVariationDeg.value === 15, 'angle variation');
check(value.officialPrimaryEvidence.frictionNormalForceVariation.value === 0.15, 'normal-force variation');
check(value.officialPrimaryEvidence.frictionSlideMultiplier.numericValue === null, 'slide multiplier must remain unassigned');
check(value.repositoryEvidence.exactKeySearch.independentNumericHits === 0, 'unexpected repository numeric authority');
check(value.productionArtifactEvidence.capturedConfiguration.slideMultiplierPresent === false, 'artifact must not claim slide multiplier');
check(value.productionArtifactEvidence.accdbStringScan.slideMultiplierTextPresent === false, 'ACCDB string scan mismatch');
check(value.prohibitedInference.includes('DO_NOT_ASSUME_SLIDE_MULTIPLIER_EQUALS_ONE_FROM_MU_N_DESCRIPTION'), 'missing no-assumption invariant');
check(JSON.stringify([...value.decision.remainingBlockers].sort()) === JSON.stringify([...required].sort()), 'remaining blockers');
check(value.decision.status === 'COMPLETE_BLOCKED_NO_NEW_MECHANICS', 'decision');
check(value.decision.l13ProductionSolveAuthorized === false, 'L13 must remain blocked');
check(value.decision.l7ProductionSolveAuthorized === false, 'L7 must remain blocked');
check(value.decision.newMechanicsAuthorized === false, 'new mechanics must remain blocked');

console.log(JSON.stringify({
  check: 'm047-friction-authority-closure',
  status: 'PASS',
  remainingBlockers: required,
  slideMultiplierNumericValue: null,
  productionFrictionAuthorized: false,
  newMechanicsAuthorized: false,
}, null, 2));

function check(condition, message) { if (!condition) throw new Error(message); }
