import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLinearPipingInputXmlIntake } from '../src/workspace/linear-piping-inputxml-intake.js';
import {
  authorizeLinearPipingInputXmlPreFlight,
  prepareLinearPipingInputXmlPreFlight,
} from '../src/workspace/linear-piping-inputxml-prefea.js';
import { buildInputXmlRunRequestCase } from '../src/core/linear-piping-analysis-consumer/inputxml-run-request-cases.js';
import { compileLinearPipingInputXmlAnalysisContext } from '../src/core/linear-piping-analysis-consumer/index.js';
import { nodalResult } from '../src/core/linear-piping-analysis-consumer/generic-inputxml-solve-case.js';

const STRICT = 'STRICT_INPUTXML_LINEAR_STATIC_V1';
const FIXTURE = 'benchmarks/LFEA/SPRING_DRAFT/MixedFixedSkewSpring.xml';
const deliberateBreak = process.argv.includes('--deliberate-break');
const N = Object.freeze([0.6, 0.8, 0]);
const TOL = 1e-9;

function close(actual, expected, label, tolerance = TOL) {
  const scale = Math.max(1, Math.abs(actual), Math.abs(expected));
  assert.ok(Math.abs(actual - expected) <= tolerance * scale,
    `${label}: expected ${expected}, got ${actual}`);
}

let xml = readFileSync(FIXTURE, 'utf8');
if (deliberateBreak) {
  // Break the exact rigid-UX half of the mixed support. TYPE=2 with a zero
  // direction vector is invalid, so the production preflight must turn red.
  xml = xml.replace(
    'XCOSINE="1.000000" YCOSINE="0.000000" ZCOSINE="0.000000" TAG="RIGID_X"',
    'XCOSINE="0.000000" YCOSINE="0.000000" ZCOSINE="0.000000" TAG="RIGID_X"',
  );
}

const intake = createLinearPipingInputXmlIntake(
  { fileName: 'MixedFixedSkewSpring.xml', content: xml },
  { fallbackUnit: 'mm', requestedProfileId: STRICT, requestedCaseIds: ['IXP-W'] },
);
const initial = prepareLinearPipingInputXmlPreFlight(intake);
assert.notEqual(initial.status, 'BLOCK',
  `mixed fixed+skew exercise must prepare: ${JSON.stringify(initial.preparation.findings)}`);
const authorized = initial.solveAuthorized ? initial : authorizeLinearPipingInputXmlPreFlight(initial, {
  approverIdentity: 'LFEA-MIXED-FIXED-SKEW-DRAFT-CHECK',
  reason: 'Self-authored mixed fixed+directional spring reaction-custody exercise; not a reference.',
});

const model = authorized.preparation.structuralPreparation.compilation.model;
const directional = model.constraints.find(
  (row) => row.behavior === 'LINEAR_SPRING' && Array.isArray(row.direction),
);
assert.ok(directional, 'mixed exercise must compile one directional ground spring');
assert.deepEqual(directional.direction, N);
assert.equal(directional.stiffness, 1000000, '1000 N/mm must compile as 1e6 N/m');
assert.equal(directional.connectedNodeId, undefined,
  'mixed exercise is a grounded directional spring, not a CNODE spring');

const fixedUx = model.constraints.find(
  (row) => row.nodeId === directional.nodeId && row.behavior === 'FIXED' && row.dof === 'UX',
);
assert.ok(fixedUx,
  'the directional spring node must also carry an exact rigid UX restraint');

const request = buildInputXmlRunRequestCase({
  intake: authorized.intake,
  preparation: authorized.preparation,
  caseId: 'IXP-W',
  analysisIdentity: 'MIXED-FIXED-SKEW-DRAFT-W',
  analysisRevision: 1,
});
const result = compileLinearPipingInputXmlAnalysisContext(request, { factorizationCache: null })
  .sourceAnalysisContext.analysisResult;
assert.equal(result.status, 'QUALIFIED',
  'mixed fixed+skew exercise must qualify through the production solve path');
assert.ok(result.limitations.some((row) => row.limitation?.code === 'DRAFT_SPRING_SUPPORT_NO_REFERENCE'),
  'mixed support solve must retain DRAFT spring-reference disclosure');

const execution = result.execution;
const displacementAt = (dof) => execution.displacement.find(
  (row) => row.nodeId === directional.nodeId && row.dof === dof,
)?.value;
const u = ['UX', 'UY', 'UZ'].map(displacementAt);
u.forEach((value, index) => assert.ok(Number.isFinite(value), `missing finite displacement ${index}`));
close(u[0], 0, 'rigid UX displacement', 1e-12);

const q = N.reduce((sum, component, index) => sum + component * u[index], 0);
assert.ok(Math.abs(q) > 1e-12,
  'skew spring must carry nonzero projected displacement in the mixed exercise');
const springReaction = N.map((component) => -directional.stiffness * q * component);
assert.ok(Math.abs(springReaction[0]) > 1e-6,
  'skew spring must generate a material UX support component overlapping the rigid UX restraint');

const uxAtMixedNode = execution.reactions.filter(
  (row) => row.nodeId === directional.nodeId && row.dof === 'UX',
);
assert.ok(uxAtMixedNode.length === 1 || uxAtMixedNode.length === 2,
  `public reaction custody must be one aggregate row or two support-contribution rows, got ${uxAtMixedNode.length}`);
if (uxAtMixedNode.length === 2) {
  assert.ok(uxAtMixedNode.some((row) => Math.abs(row.value - springReaction[0])
    <= TOL * Math.max(1, Math.abs(springReaction[0]))),
  'decomposed public rows must retain the exact skew-spring UX contribution');
}

const mixedUxSum = uxAtMixedNode.reduce((sum, row) => sum + row.value, 0);
const projectedNodal = nodalResult({ execution }, directional.nodeId);
close(projectedNodal.reaction.UX, mixedUxSum,
  'generic nodal reaction projection must sum all mixed-node UX support contributions');

const allUx = execution.reactions.filter((row) => row.dof === 'UX');
const globalUxSupport = allUx.reduce((sum, row) => sum + row.value, 0);
const globalUxScale = allUx.reduce((sum, row) => sum + Math.abs(row.value), 0);
assert.ok(Math.abs(globalUxSupport) <= 1e-8 * Math.max(1, globalUxScale),
  `zero-applied-UX case must close public support equilibrium, got ${globalUxSupport}`);
assert.equal(execution.diagnostics.forceEquilibrium.status, 'PASS');
assert.equal(execution.diagnostics.forceEquilibrium.groundedSpringCount, 1);

const representation = uxAtMixedNode.length === 2
  ? 'DECOMPOSED_DUPLICATE_NODE_DOF_ROWS'
  : 'SINGLE_NODE_DOF_ROW';

console.log(JSON.stringify({
  check: 'lfea-mixed-fixed-skew-reaction',
  status: 'PASS',
  state: 'DRAFT_EXERCISE_ONLY',
  mixedNodeId: directional.nodeId,
  fixedDof: fixedUx.dof,
  direction: directional.direction,
  springStiffness: directional.stiffness,
  projectedDisplacement: q,
  expectedSpringUxReaction: springReaction[0],
  publicMixedUxRows: uxAtMixedNode.map((row) => row.value),
  publicMixedUxSum: mixedUxSum,
  projectedNodalUxReaction: projectedNodal.reaction.UX,
  publicRepresentation: representation,
  interpretation: 'NODE_PROJECTION_AGGREGATES_ALL_SUPPORT_CONTRIBUTIONS',
  authority: 'Self-authored exercise only; does not clear DRAFT or establish CAESAR parity.',
}, null, 2));
