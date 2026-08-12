import fs from 'node:fs';

const observation = JSON.parse(fs.readFileSync(new URL('../benchmarks/LFEA/CAESAR_ACCDB/m047-friction-bm1-product-observation.json', import.meta.url), 'utf8'));
const plan = JSON.parse(fs.readFileSync(new URL('../benchmarks/LFEA/CAESAR_ACCDB/m047-friction-independent-micro-model-plan.json', import.meta.url), 'utf8'));

check(observation.schema === 'm047-friction-bm1-product-observation/v1', 'observation schema');
check(observation.source.caesarVersion === '14.00.00.0910' && observation.source.build === 231113, 'product build');
check(observation.model.positiveFrictionSiteCount === 2, 'BM1 positive friction site count');
check(observation.model.positiveGapCompanionCountAtFrictionSites === 0, 'BM1 friction sites must be gap-free');
check(observation.model.coefficientOfFriction === 0.3, 'BM1 coefficient of friction');

const k = observation.documentedStaticFrictionStiffness.siValue;
const mu = observation.model.coefficientOfFriction;
for (const row of observation.cases.CASE_4_SUS_W_P1_H.observations) {
  const observedK = row.tangentialReactionN / (row.tangentialDisplacementMm / 1000);
  check(relative(observedK, row.observedSecantStiffnessNPerM) < 1e-12, `CASE4 node ${row.node} secant stiffness arithmetic`);
  check(Math.abs(row.relativeDifferenceFromDocumentedStiffness) < 0.0002, `CASE4 node ${row.node} documented stiffness agreement`);
  check(row.tangentialReactionN < row.coulombLimitAtFinalNormalN, `CASE4 node ${row.node} below Coulomb cap`);
  check(relative(row.coulombLimitAtFinalNormalN, mu * row.normalReactionMagnitudeN) < 1e-12, `CASE4 node ${row.node} Coulomb arithmetic`);
}

for (const row of observation.cases.CASE_3_OPE_W_T1_P1_H.observations) {
  const trial = k * (row.tangentialDisplacementMm / 1000);
  check(relative(trial, row.documentedStickTrialMagnitudeN) < 1e-12, `CASE3 node ${row.node} stick trial arithmetic`);
  check(row.stickTrialToFinalCoulombRatio > 1000, `CASE3 node ${row.node} cannot be stick stiffness`);
  check(row.reactionToFinalCoulombRatio > 0.98 && row.reactionToFinalCoulombRatio <= 1.01, `CASE3 node ${row.node} near Coulomb cap`);
  check(Math.abs(row.impliedNormalDifferenceFromFinal) < 0.15, `CASE3 node ${row.node} multiplier-one compatibility remains inside normal-force update band`);
}

check(observation.identifiability.frictionSlideMultiplier.status === 'NOT_IDENTIFIED', 'slide multiplier must remain unidentified');
check(observation.identifiability.frictionStateHistorySemantics.status === 'PARTIALLY_CONSTRAINED_NOT_RESOLVED', 'state history must remain partial');
check(observation.identifiability.gapContactStateSemantics.status === 'NOT_EXERCISED', 'gap/contact must remain unexercised');
check(observation.decision.newMechanicsAuthorized === false, 'BM1 observation must not authorize mechanics');
check(observation.decision.l13ProductionSolveAuthorized === false && observation.decision.l7ProductionSolveAuthorized === false, 'BM4 friction solves remain unauthorized');

check(plan.schema === 'm047-friction-independent-micro-model-plan/v1', 'micro-model plan schema');
check(plan.experiments.length === 4, 'expected four independent experiments');
check(new Set(plan.experiments.map((row) => row.id)).size === 4, 'experiment ids unique');
for (const id of ['FM1_SLIDE_PLATEAU','FM2_ANGLE_UPDATE','FM3_NORMAL_FORCE_UPDATE','FM4_GAP_CONTACT']) {
  check(plan.experiments.some((row) => row.id === id), `missing experiment ${id}`);
}
check(plan.rules.bm4ResponseMaySelectParameters === false, 'BM4 response fitting prohibited');
check(plan.promotionGate.productionIntegration === 'ALL_THREE_BLOCKERS_MUST_BE_RESOLVED_INDEPENDENTLY_BEFORE_L13_OR_L7_EXECUTION', 'production promotion gate');

const inputIndex = process.argv.indexOf('--input');
const outputIndex = process.argv.indexOf('--output');
let exactSourceReplay = 'NOT_RUN';
if (inputIndex >= 0 || outputIndex >= 0) {
  const inputPath = process.argv[inputIndex + 1];
  const outputPath = process.argv[outputIndex + 1];
  if (!inputPath || !outputPath) throw new Error('--input and --output must be supplied together');
  const inputXml = fs.readFileSync(inputPath, 'utf8');
  const outputXml = fs.readFileSync(outputPath, 'utf8');
  check((inputXml.match(/FRIC_COEF="0\.300000"/g) ?? []).length === 2, 'exact BM1 positive-friction source count');
  check(outputXml.includes('VERSION="14.00.00.0910, (Build 231113)"'), 'exact BM1 output product build');
  for (const caseLabel of ['CASE 3 (OPE) W+T1+P1+H','CASE 4 (SUS) W+P1+H']) check(outputXml.includes(caseLabel), `exact BM1 output ${caseLabel}`);
  exactSourceReplay = 'PASS';
}

console.log(JSON.stringify({
  check: 'm047-friction-bm1-product-observation',
  status: 'PASS',
  documentedStaticFrictionStiffnessNPerM: k,
  directStickValidationSites: observation.cases.CASE_4_SUS_W_P1_H.observations.length,
  cappedOrSlidingCompatibleSites: observation.cases.CASE_3_OPE_W_T1_P1_H.observations.length,
  exactSourceReplay,
  identified: ['FRICTION_STIFFNESS'],
  remainingBlockers: observation.decision.remainingBlockers,
  productionFrictionAuthorized: false,
}, null, 2));

function relative(a, b) { return Math.abs(a - b) / Math.max(1, Math.abs(b)); }
function check(value, message) { if (!value) throw new Error(message); }
