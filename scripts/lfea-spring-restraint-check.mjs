/*
 * A restraint that declares a spring rate must behave like a spring.
 *
 * The solver has carried LINEAR_SPRING as a first-class constraint behavior all
 * along, and the model compiler has carried PARTIAL_RELEASE_SPRING as the
 * declaration kind that produces it. What was missing was the consumer: any
 * restraint with a declared STIFF was refused outright
 * (MODEL_RESTRAINT_FINITE_STIFFNESS_UNSUPPORTED), which forced every compliant
 * support to be idealised to a rigid one by hand before the model would run.
 *
 * The identity below is what makes this verifiable without a CAESAR reference:
 * for a linear spring the reaction is exactly the rate times the displacement
 * of the node it restrains. A spring that was quietly compiled as FIXED fails
 * it, because the displacement would be zero while the reaction is not.
 */
import assert from 'node:assert/strict';
import { compileLinearPipingInputXmlAnalysisContext } from '../src/core/linear-piping-analysis-consumer/index.js';
import { buildInputXmlRunRequestCase } from '../src/core/linear-piping-analysis-consumer/inputxml-run-request-cases.js';
import { createLinearPipingInputXmlIntake } from '../src/workspace/linear-piping-inputxml-intake.js';
import {
  prepareLinearPipingInputXmlPreFlight,
  authorizeLinearPipingInputXmlPreFlight,
} from '../src/workspace/linear-piping-inputxml-prefea.js';

// STIFF is declared in the model's own force/length units (N/mm here), so a
// rate of 1 is deliberately soft: the support should visibly deflect.
const model = (restraint) => `<CAESARII xmlns="COADE" VERSION="14.00" XML_TYPE="Input">
  <UNITS>
    <LENGTH LABEL="MM" FACTOR="25.4"/><FORCE LABEL="N" FACTOR="4.4482216152605"/>
    <MOMENT-INPUT LABEL="N-M" FACTOR="0.1129848290276167"/><STRESS LABEL="MPA" FACTOR="0.006894757293168"/>
    <PRESSURE LABEL="MPA" FACTOR="0.006894757293168"/><EMOD LABEL="MPA" FACTOR="0.006894757293168"/>
    <TEMP LABEL="C" FACTOR="0.5555555555555556"/><PDENS LABEL="KG/M3" FACTOR="27679.9047102"/>
    <IDENS LABEL="KG/M3" FACTOR="27679.9047102"/><FDENS LABEL="KG/M3" FACTOR="27679.9047102"/>
  </UNITS>
  <PIPINGMODEL xmlns="" JOBNAME="SPRING-CHECK">
    <PIPINGELEMENT FROM_NODE="10" TO_NODE="20" DELTA_X="3000" DELTA_Y="0" DELTA_Z="0"
      DIAMETER="168.3" WALL_THICK="7.11" MATERIAL_NAME="A106 B" MATERIAL_NUM="106"
      MODULUS="200000" POISSONS="0.3" PIPE_DENSITY="7850" TEMP_EXP_C1="100">
      <RESTRAINT NODE="10" TYPE="0" XCOSINE="1" YCOSINE="0" ZCOSINE="0"/>
    </PIPINGELEMENT>
    <PIPINGELEMENT FROM_NODE="20" TO_NODE="30" DELTA_X="3000" DELTA_Y="0" DELTA_Z="0"
      DIAMETER="168.3" WALL_THICK="7.11" MATERIAL_NAME="A106 B" MATERIAL_NUM="106"
      MODULUS="200000" POISSONS="0.3" PIPE_DENSITY="7850" TEMP_EXP_C1="100">
      ${restraint}
    </PIPINGELEMENT>
  </PIPINGMODEL>
</CAESARII>`;

function solve(xml, label) {
  const intake = createLinearPipingInputXmlIntake(
    { fileName: `${label}.xml`, content: xml },
    { fallbackUnit: 'mm', requestedProfileId: 'STRICT_INPUTXML_LINEAR_STATIC_V1' },
  );
  let preFlight = prepareLinearPipingInputXmlPreFlight(intake);
  const blocked = preFlight.preparation.findings
    .filter((row) => row.disposition === 'BLOCK').map((row) => row.code);
  assert.deepEqual(blocked, [], `${label} must reach the solver: ${JSON.stringify(blocked)}`);
  if (!preFlight.solveAuthorized) {
    preFlight = authorizeLinearPipingInputXmlPreFlight(preFlight, {
      approverIdentity: 'LFEA-SPRING-CHECK', reason: 'Deterministic spring-restraint verification.',
    });
  }
  const request = buildInputXmlRunRequestCase({
    intake: preFlight.intake,
    preparation: preFlight.preparation,
    caseId: `${preFlight.preparation.structuralPreparation.modelId}-W`,
    analysisIdentity: `SPRING-CHECK-${label}`,
    analysisRevision: 1,
  });
  const context = compileLinearPipingInputXmlAnalysisContext(request, { factorizationCache: null });
  const result = context.sourceAnalysisContext.analysisResult;
  assert.equal(result.status, 'QUALIFIED', `${label} must qualify.`);
  return { context, result, model: context.sourceAnalysisContext.compilation.model };
}

const SPRING_RATE = 1000; // N/mm as declared
const springNode = `<RESTRAINT NODE="30" TYPE="2" XCOSINE="0" YCOSINE="1" ZCOSINE="0" STIFF="${SPRING_RATE}"/>`;
const rigidNode = `<RESTRAINT NODE="30" TYPE="2" XCOSINE="0" YCOSINE="1" ZCOSINE="0"/>`;

const spring = solve(model(springNode), 'spring');
const rigid = solve(model(rigidNode), 'rigid');

// 1. The declaration reached the model as a real spring, not a rigid support.
const springConstraints = spring.model.constraints.filter((c) => c.behavior === 'LINEAR_SPRING');
assert.equal(springConstraints.length, 1, 'the declared rate must compile to exactly one LINEAR_SPRING');
assert.ok(springConstraints[0].stiffness > 0, 'the compiled spring must carry a positive rate');
assert.equal(rigid.model.constraints.filter((c) => c.behavior === 'LINEAR_SPRING').length, 0,
  'a restraint with no declared rate must stay FIXED');

const compiledRate = springConstraints[0].stiffness;
const springDof = springConstraints[0].dof;
const springNodeId = springConstraints[0].nodeId;

// 2. The identity. Reaction must equal rate x displacement at that node/DOF.
const pick = (rows, nodeId, dof, what) => {
  const row = rows.find((entry) => entry.nodeId === nodeId && entry.dof === dof);
  assert.ok(row, `no ${what} recovered for ${nodeId}:${dof}`);
  return row.value;
};
const displacementOf = (run, nodeId, dof) =>
  pick(run.result.execution.displacement, nodeId, dof, 'displacement');
const reactionOf = (run, nodeId, dof) =>
  pick(run.result.execution.reactions, nodeId, dof, 'reaction');

const disp = displacementOf(spring, springNodeId, springDof);
const react = reactionOf(spring, springNodeId, springDof);
assert.ok(Number.isFinite(disp) && Number.isFinite(react),
  `spring node must report both a displacement and a reaction (got ${disp}, ${react})`);
assert.ok(Math.abs(disp) > 0, 'a spring-supported node must actually deflect');

const implied = Math.abs(react / disp);
const identityError = Math.abs(implied - compiledRate) / compiledRate;
assert.ok(identityError < 1e-9,
  `reaction / displacement must equal the compiled spring rate: got ${implied}, expected ${compiledRate} `
  + `(relative error ${identityError})`);

// 3. It must differ from the rigid idealisation it replaces -- otherwise the
// spring is being silently compiled as FIXED and the identity above is vacuous.
const rigidDisp = displacementOf(rigid, springNodeId, springDof);
assert.ok(Math.abs(rigidDisp) < Math.abs(disp) / 100,
  `the rigid support must be far stiffer than the spring (rigid ${rigidDisp} vs spring ${disp})`);

console.log(JSON.stringify({
  check: 'lfea-spring-restraint',
  status: 'PASS',
  declaredRate: SPRING_RATE,
  compiledRate,
  springNodeId,
  springDof,
  springDisplacement: disp,
  springReaction: react,
  impliedRate: implied,
  identityRelativeError: identityError,
  rigidDisplacement: rigidDisp,
}, null, 2));
