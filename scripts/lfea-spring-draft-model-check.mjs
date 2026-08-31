/*
 * Self-authored support models exercise production paths but are not reference
 * answers. Positive models must solve and satisfy position-independent
 * constitutive invariants; negative controls must continue refusing by name.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './lfea-skew-spring-check.mjs';
import './lfea-cnode-spring-check.mjs';
import './lfea-cnode-mechanism-check.mjs';
import './lfea-hanger-predefined-check.mjs';
import './lfea-hanger-case-selection-check.mjs';
import './lfea-blocked-execution-custody-check.mjs';
import './lfea-mixed-fixed-skew-reaction-check.mjs';
import './lfea-results-reaction-aggregation-check.mjs';
import './lfea-unilateral-mixed-reaction-review-check.mjs';
import './lfea-support-refusal-fixture-check.mjs';
import { createLinearPipingInputXmlIntake } from '../src/workspace/linear-piping-inputxml-intake.js';
import {
  prepareLinearPipingInputXmlPreFlight,
  authorizeLinearPipingInputXmlPreFlight,
} from '../src/workspace/linear-piping-inputxml-prefea.js';
import { buildInputXmlRunRequestCase } from '../src/core/linear-piping-analysis-consumer/inputxml-run-request-cases.js';
import { compileLinearPipingInputXmlAnalysisContext } from '../src/core/linear-piping-analysis-consumer/index.js';

const DIR = 'benchmarks/LFEA/SPRING_DRAFT';
const EXPECTED_ELASTIC_MODULUS_PA = 203_395_008_000;
const EXECUTABLE_FIXTURE_NAMES = Object.freeze([
  'CnodeSpringSupports.xml', 'MixedFixedSkewSpring.xml', 'PredefinedHanger.xml',
  'SkewSpringSupports.xml', 'SpringSupports.xml',
]);
const read = (name) => readFileSync(`${DIR}/${name}`, 'utf8');

function preFlightOf(fileName) {
  const intake = createLinearPipingInputXmlIntake(
    { fileName, content: read(fileName) },
    {
      fallbackUnit: 'mm',
      componentOrigins: fileName === 'CnodeSpringSupports.xml'
        ? { 50: { x: 6006, y: -3992, z: 0 } }
        : {},
      requestedProfileId: 'STRICT_INPUTXML_LINEAR_STATIC_V1',
    },
  );
  return prepareLinearPipingInputXmlPreFlight(intake);
}

function assertFixtureModulus(fileName) {
  const preFlight = preFlightOf(fileName);
  assert.ok(preFlight.preparation.structuralPreparation,
    `${fileName} must retain structural preparation for the fixture modulus guard`);
  const material = preFlight.preparation.structuralPreparation.compilation.model.materialStates[0];
  assert.equal(material?.elasticModulus, EXPECTED_ELASTIC_MODULUS_PA,
    `${fileName} must compile the declared 203395008 KPa modulus as 203.395008 GPa`);
}

const findingCodes = (preFlight, disposition) => preFlight.preparation.findings
  .filter((row) => row.disposition === disposition).map((row) => row.code);

// Guard every executable fixture against a self-consistent but 1000x-stiff material model.
for (const fileName of EXECUTABLE_FIXTURE_NAMES) assertFixtureModulus(fileName);

// Positive ordinary spring model.
const springs = preFlightOf('SpringSupports.xml');
assert.deepEqual(findingCodes(springs, 'BLOCK'), [],
  `SpringSupports.xml must reach the solver: ${JSON.stringify(findingCodes(springs, 'BLOCK'))}`);

const authorized = springs.solveAuthorized ? springs : authorizeLinearPipingInputXmlPreFlight(springs, {
  approverIdentity: 'LFEA-SPRING-DRAFT-CHECK',
  reason: 'Deterministic draft-model verification.',
});
const request = buildInputXmlRunRequestCase({
  intake: authorized.intake,
  preparation: authorized.preparation,
  caseId: `${authorized.preparation.structuralPreparation.modelId}-W`,
  analysisIdentity: 'SPRING-DRAFT-A',
  analysisRevision: 1,
});
const context = compileLinearPipingInputXmlAnalysisContext(request, { factorizationCache: null });
assert.equal(context.sourceAnalysisContext.analysisResult.status, 'QUALIFIED',
  'a model supported on springs must still qualify');

const model = context.sourceAnalysisContext.compilation.model;
const springRates = model.constraints
  .filter((row) => row.behavior === 'LINEAR_SPRING')
  .map((row) => row.stiffness)
  .sort((left, right) => left - right);
assert.equal(springRates.length, 2, 'both declared rates must compile to springs');
assert.ok(springRates[0] < springRates[1], 'the two rates must stay distinct');
assert.equal(model.constraints.filter((row) => row.behavior === 'FIXED' && row.dof === 'UY').length >= 1, true,
  'the undeclared support must stay rigid');

const execution = context.sourceAnalysisContext.analysisResult.execution;
const at = (rows, nodeId, dof) => {
  const row = rows.find((entry) => entry.nodeId === nodeId && entry.dof === dof);
  assert.ok(row, `nothing recovered for ${nodeId}:${dof}`);
  return row.value;
};
const springIdentities = model.constraints
  .filter((row) => row.behavior === 'LINEAR_SPRING')
  .map((constraint) => {
    const displacement = at(execution.displacement, constraint.nodeId, constraint.dof);
    const reaction = at(execution.reactions, constraint.nodeId, constraint.dof);
    assert.ok(Math.abs(displacement) > 0, `${constraint.nodeId} must actually deflect`);
    const implied = Math.abs(reaction / displacement);
    const error = Math.abs(implied - constraint.stiffness) / constraint.stiffness;
    assert.ok(error < 1e-9,
      `${constraint.nodeId}: reaction/displacement must equal the compiled rate `
      + `(got ${implied}, expected ${constraint.stiffness})`);
    return {
      nodeId: constraint.nodeId,
      rate: constraint.stiffness,
      displacement,
      reaction,
      identityRelativeError: error,
    };
  });
assert.equal(springIdentities.length, 2, 'both springs must satisfy the identity');

const totalVertical = execution.reactions
  .filter((row) => row.dof === 'UY').reduce((sum, row) => sum + Math.abs(row.value), 0);
const springShare = springIdentities.reduce((sum, row) => sum + Math.abs(row.reaction), 0) / totalVertical;
assert.ok(springShare > 0.1,
  `the springs must carry a real share of the load, not sit in the anchor's shadow `
  + `(carrying ${(100 * springShare).toFixed(1)}%)`);

const limitations = authorized.preparation.structuralPreparation.constraintBindings
  .flatMap((row) => row.limitationCodes ?? []);
assert.ok(limitations.includes('DRAFT_SPRING_SUPPORT_NO_REFERENCE'),
  'a compiled spring must disclose that it has no reference behind it');

// Combined legacy negative control remains useful as a cross-feature regression.
// Dedicated per-feature refusal fixtures are guarded separately above.
const unsupported = preFlightOf('UnsupportedSupports.xml');
const blocked = findingCodes(unsupported, 'BLOCK');
assert.ok(blocked.includes('MODEL_RESTRAINT_CONNECTING_NODE_UNSUPPORTED'),
  `a rigid CNODE restraint must still be refused by name, got ${JSON.stringify(blocked)}`);
assert.ok(blocked.includes('MODEL_HANGER_PREDEFINED_DATA_INCOMPLETE'),
  `an incomplete predefined hanger must still be refused by name, got ${JSON.stringify(blocked)}`);
const unsupportedSkew = preFlightOf('UnsupportedSkewSupport.xml');
const skewBlocked = findingCodes(unsupportedSkew, 'BLOCK');
assert.ok(skewBlocked.includes('MODEL_RESTRAINT_SKEW_DIRECTION_UNSUPPORTED'),
  `a rigid skew restraint must still be refused by name, got ${JSON.stringify(skewBlocked)}`);

console.log(JSON.stringify({
  check: 'lfea-spring-draft-model',
  status: 'PASS',
  state: 'DRAFT',
  springModelQualifies: true,
  compiledSpringRates: springRates,
  springIdentities,
  springLoadShare: Number((100 * springShare).toFixed(1)),
  disclosesDraft: true,
  dedicatedRefusalFixturesGuarded: true,
  stillRefused: [
    ...blocked.filter((code) => /CONNECTING_NODE|HANGER/u.test(code)),
    ...skewBlocked.filter((code) => /SKEW_DIRECTION/u.test(code)),
  ],
  clearedBy: 'A CAESAR-solved model containing the support feature. Not by more self-authored coverage.',
}, null, 2));
