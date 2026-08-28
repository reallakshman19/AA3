/*
 * The two draft models, and what each is allowed to prove.
 *
 * benchmarks/LFEA/BM4/PROVENANCE.md exists because phases 1-7 were verified
 * against a fixture written by the same process being verified, which passed
 * BECAUSE it was trivial. These two models are written by that same process, so
 * they are deliberately NOT treated as references. What they can honestly do is
 * exercise a path production parity cannot reach at all -- BM4_L declares no
 * spring rates -- and pin where the supported region currently ends.
 *
 *   SpringSupports.xml       must SOLVE, and must disclose DRAFT
 *   UnsupportedSupports.xml  must be REFUSED, by name
 *
 * The second is the more useful of the two. A feature that quietly half-works on
 * input it cannot represent is worse than one that refuses, and the refusal is
 * the thing most likely to erode silently as the surrounding code changes.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLinearPipingInputXmlIntake } from '../src/workspace/linear-piping-inputxml-intake.js';
import {
  prepareLinearPipingInputXmlPreFlight,
  authorizeLinearPipingInputXmlPreFlight,
} from '../src/workspace/linear-piping-inputxml-prefea.js';
import { buildInputXmlRunRequestCase } from '../src/core/linear-piping-analysis-consumer/inputxml-run-request-cases.js';
import { compileLinearPipingInputXmlAnalysisContext } from '../src/core/linear-piping-analysis-consumer/index.js';

const DIR = 'benchmarks/LFEA/SPRING_DRAFT';
const read = (name) => readFileSync(`${DIR}/${name}`, 'utf8');

function preFlightOf(fileName) {
  const intake = createLinearPipingInputXmlIntake(
    { fileName, content: read(fileName) },
    { fallbackUnit: 'mm', requestedProfileId: 'STRICT_INPUTXML_LINEAR_STATIC_V1' },
  );
  return prepareLinearPipingInputXmlPreFlight(intake);
}

const findingCodes = (preFlight, disposition) => preFlight.preparation.findings
  .filter((row) => row.disposition === disposition).map((row) => row.code);

// ---------------------------------------------------------------- Model A
// A model whose supports are compliant must reach the solver and stay there.
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

// Both declared rates must survive as distinct springs -- one rate quietly
// standing in for the other would satisfy a laxer check than this.
const model = context.sourceAnalysisContext.compilation.model;
const springRates = model.constraints
  .filter((row) => row.behavior === 'LINEAR_SPRING')
  .map((row) => row.stiffness)
  .sort((left, right) => left - right);
assert.equal(springRates.length, 2, 'both declared rates must compile to springs');
assert.ok(springRates[0] < springRates[1], 'the two rates must stay distinct');
assert.equal(model.constraints.filter((row) => row.behavior === 'FIXED' && row.dof === 'UY').length >= 1, true,
  'the undeclared support must stay rigid');

/*
 * The invariant is reaction = rate x displacement at each spring, which holds
 * wherever the spring sits. "Softer deflects more" is NOT the invariant and was
 * wrong here: node 70 is the free end of the run, so it deflects more than the
 * mid-run support despite carrying the stiffer rate. Position dominates.
 */
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

/*
 * A spring that carries almost nothing satisfies the identity trivially. The
 * rates here are chosen so the springs take a real share of the model's weight,
 * because a support in the shadow of the anchor would let the whole path rot
 * without any of the assertions above noticing.
 */
const totalVertical = execution.reactions
  .filter((row) => row.dof === 'UY').reduce((sum, row) => sum + Math.abs(row.value), 0);
const springShare = springIdentities.reduce((sum, row) => sum + Math.abs(row.reaction), 0) / totalVertical;
assert.ok(springShare > 0.1,
  `the springs must carry a real share of the load, not sit in the anchor's shadow `
  + `(carrying ${(100 * springShare).toFixed(1)}%)`);

// ---------------------------------------------------------------- disclosure
const limitations = authorized.preparation.structuralPreparation.constraintBindings
  .flatMap((row) => row.limitationCodes ?? []);
assert.ok(limitations.includes('DRAFT_SPRING_SUPPORT_NO_REFERENCE'),
  'a compiled spring must disclose that it has no reference behind it');

// ---------------------------------------------------------------- Model B
// The boundary. Both of these must still be refused, by name.
const unsupported = preFlightOf('UnsupportedSupports.xml');
const blocked = findingCodes(unsupported, 'BLOCK');
assert.ok(blocked.includes('MODEL_RESTRAINT_CONNECTING_NODE_UNSUPPORTED'),
  `a CNODE restraint must still be refused by name, got ${JSON.stringify(blocked)}`);

const allCodes = unsupported.preparation.findings.map((row) => row.code);
assert.ok(allCodes.some((code) => /HANGER/u.test(code)),
  `a HANGER record must still be reported rather than dropped, got ${JSON.stringify(allCodes)}`);

console.log(JSON.stringify({
  check: 'lfea-spring-draft-model',
  status: 'PASS',
  state: 'DRAFT',
  springModelQualifies: true,
  compiledSpringRates: springRates,
  springIdentities,
  springLoadShare: Number((100 * springShare).toFixed(1)),
  disclosesDraft: true,
  stillRefused: blocked.filter((code) => /CONNECTING_NODE|HANGER/u.test(code)),
  clearedBy: 'A CAESAR-solved model containing spring supports. Not by more self-authored coverage.',
}, null, 2));
