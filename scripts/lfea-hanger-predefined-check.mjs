import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  classifyPredefinedHanger,
  predefinedHangerDispositions,
} from '../src/core/linear-piping-analysis-consumer/inputxml-predefined-hanger.js';
import { createLinearPipingInputXmlIntake } from '../src/workspace/linear-piping-inputxml-intake.js';
import {
  authorizeLinearPipingInputXmlPreFlight,
  prepareLinearPipingInputXmlPreFlight,
} from '../src/workspace/linear-piping-inputxml-prefea.js';
import { buildInputXmlRunRequestCase } from '../src/core/linear-piping-analysis-consumer/inputxml-run-request-cases.js';
import { compileLinearPipingInputXmlAnalysisContext } from '../src/core/linear-piping-analysis-consumer/index.js';

const XML = readFileSync('benchmarks/LFEA/SPRING_DRAFT/PredefinedHanger.xml', 'utf8');
const PROFILE = 'STRICT_INPUTXML_LINEAR_STATIC_V1';
const DRAFT_CODE = 'DRAFT_SPRING_SUPPORT_NO_REFERENCE';
const deliberateBreak = process.argv.includes('--deliberate-break');

const baseAttributes = {
  NODE: '40.000000', HGR_TYPE: '1.000000', SPRING_RATE: '1750.000000',
  COLD_LOAD: '4500.000000', NUM_HANGERS: '1.000000',
};
const one = classifyPredefinedHanger(baseAttributes, 1000, 'mm');
assert.equal(one.springRatePerHanger, 1750000);
assert.equal(one.springRateTotal, deliberateBreak ? 1750001 : 1750000,
  '1750 N/mm must compile as 1.75e6 N/m');
assert.equal(one.coldLoadPerHanger, 4500);
assert.equal(one.coldLoadTotal, 4500);
assert.equal(one.numberOfHangers, 1);
assert.equal(predefinedHangerDispositions(one)[PROFILE].disposition, 'IMPLEMENTED_EXACTLY');

const two = classifyPredefinedHanger({ ...baseAttributes, NUM_HANGERS: '2.000000' }, 1000, 'mm');
assert.equal(two.springRateTotal, 3500000, 'two hangers must double the per-hanger spring rate');
assert.equal(two.coldLoadTotal, 9000, 'two hangers must double the per-hanger cold load');

const unresolved = classifyPredefinedHanger(baseAttributes, null, 'mm');
assert.equal(predefinedHangerDispositions(unresolved)[PROFILE].limitationCode,
  'MODEL_HANGER_UNITS_UNRESOLVED');
const incomplete = classifyPredefinedHanger({ ...baseAttributes, COLD_LOAD: '-1.010100' }, 1000, 'mm');
assert.equal(predefinedHangerDispositions(incomplete)[PROFILE].limitationCode,
  'MODEL_HANGER_PREDEFINED_DATA_INCOMPLETE');
const invalidCount = classifyPredefinedHanger({ ...baseAttributes, NUM_HANGERS: '0.000000' }, 1000, 'mm');
assert.equal(predefinedHangerDispositions(invalidCount)[PROFILE].limitationCode,
  'MODEL_HANGER_COUNT_INVALID');
const missingNode = classifyPredefinedHanger({ ...baseAttributes, NODE: '-1.010100' }, 1000, 'mm');
assert.equal(missingNode.nodeId, null);
assert.equal(predefinedHangerDispositions(missingNode)[PROFILE].limitationCode,
  'MODEL_HANGER_NODE_INVALID');

const intake = createLinearPipingInputXmlIntake(
  { fileName: 'PredefinedHanger.xml', content: XML },
  { fallbackUnit: 'mm', requestedProfileId: PROFILE, requestedCaseIds: ['IXP-W', 'IXP-WH'] },
);
const initial = prepareLinearPipingInputXmlPreFlight(intake);
assert.notEqual(initial.status, 'BLOCK',
  `predefined hanger model must prepare: ${JSON.stringify(initial.preparation.findings)}`);
const authorized = initial.solveAuthorized ? initial : authorizeLinearPipingInputXmlPreFlight(initial, {
  approverIdentity: 'LFEA-HANGER-DRAFT-CHECK',
  reason: 'Self-authored invariant exercise; does not clear DRAFT status.',
});

const structural = authorized.preparation.structuralPreparation;
const hangerBinding = structural.constraintBindings.find((row) => row.sourceKind === 'HANGER');
assert.ok(hangerBinding, 'the HANGER source must retain one structural binding');
assert.equal(hangerBinding.springRateTotal, 1750000);
assert.equal(hangerBinding.coldLoadTotal, 4500);
assert.deepEqual(hangerBinding.limitationCodes, [DRAFT_CODE]);
assert.ok(structural.limitations.includes(DRAFT_CODE),
  'support DRAFT status must survive into structural preflight limitations');
const hangerConstraint = structural.compilation.model.constraints
  .find((row) => row.constraintId === hangerBinding.declarationIds[0]);
assert.ok(hangerConstraint, 'the HANGER rate must reach the sealed mechanical model');
assert.equal(hangerConstraint.behavior, 'LINEAR_SPRING');
assert.equal(hangerConstraint.dof, 'UY');
assert.equal(hangerConstraint.stiffness, 1750000);

const physical = authorized.preparation.physicalPreparation;
assert.ok(physical.limitations.includes(DRAFT_CODE),
  'support DRAFT status must survive into physical preflight limitations');
const hangerLedger = physical.loadLedger.find((row) => row.sourceKind === 'HANGER_COLD_LOAD');
assert.ok(hangerLedger, 'the HANGER cold load must have a physical-load ledger row');
assert.equal(hangerLedger.evidence.coldLoadTotal, 4500);
assert.equal(hangerLedger.evidence.appliedForce.fy, 4500);
assert.ok(hangerLedger.caseIds.includes('IXP-WH'), 'WH must actually contain the H preload primitive');
const wCase = physical.physicalCases.find((row) => row.caseId === 'IXP-W');
const whCase = physical.physicalCases.find((row) => row.caseId === 'IXP-WH');
assert.ok(wCase && whCase, 'legacy W and explicit WH cases must both exist');
assert.equal(wCase.primitiveIds.includes(hangerLedger.primitiveIds[0]), false,
  'legacy W semantics must not silently absorb hanger preload');
assert.equal(whCase.primitiveIds.includes(hangerLedger.primitiveIds[0]), true);

function run(caseId, identity) {
  const request = buildInputXmlRunRequestCase({
    intake: authorized.intake,
    preparation: authorized.preparation,
    caseId,
    analysisIdentity: identity,
    analysisRevision: 1,
  });
  return compileLinearPipingInputXmlAnalysisContext(request, { factorizationCache: null })
    .sourceAnalysisContext.analysisResult;
}
const wResult = run('IXP-W', 'HANGER-DRAFT-W');
const whResult = run('IXP-WH', 'HANGER-DRAFT-WH');
for (const result of [wResult, whResult]) {
  const draftRows = result.limitations.filter((row) => row.limitation?.code === DRAFT_CODE);
  assert.equal(draftRows.length, 1, 'one model-sourced spring DRAFT disclosure must survive into results');
  assert.equal(draftRows[0].sourceKind, 'MODEL_COMPILATION');
  assert.equal(draftRows[0].limitation.stiffnessRelevant, true);
  assert.equal(draftRows[0].limitation.details.referenceStatus, 'SELF_AUTHORED_EVIDENCE_ONLY');
}
const w = wResult.execution;
const wh = whResult.execution;
const nodeId = hangerConstraint.nodeId;
const valueAt = (rows, dof) => {
  const row = rows.find((entry) => entry.nodeId === nodeId && entry.dof === dof);
  assert.ok(row, `missing ${nodeId}:${dof}`);
  return row.value;
};
const uW = valueAt(w.displacement, 'UY');
const rW = valueAt(w.reactions, 'UY');
assert.ok(Math.abs(uW) > 0 && Math.abs(rW) > 0, 'hanger must actually deflect and react in W');
const directError = Math.abs(Math.abs(rW / uW) - hangerConstraint.stiffness) / hangerConstraint.stiffness;
assert.ok(directError < 1e-9, `W reaction/displacement must recover k; error=${directError}`);
const du = valueAt(wh.displacement, 'UY') - uW;
const dr = valueAt(wh.reactions, 'UY') - rW;
assert.ok(Math.abs(du) > 0 && Math.abs(dr) > 0, 'H preload must change hanger displacement and reaction');
const deltaError = Math.abs(Math.abs(dr / du) - hangerConstraint.stiffness) / hangerConstraint.stiffness;
assert.ok(deltaError < 1e-9, `preload-independent delta reaction/delta displacement must recover k; error=${deltaError}`);
const totalVertical = w.reactions
  .filter((row) => row.dof === 'UY').reduce((sum, row) => sum + Math.abs(row.value), 0);
const share = Math.abs(rW) / totalVertical;
assert.ok(share > 0.1, `hanger must carry >10% of W vertical reaction, got ${(100 * share).toFixed(2)}%`);

const wrongVertical = prepareLinearPipingInputXmlPreFlight(intake, {
  preparationOptions: { physicalCaseOptions: { gravityDirection: { x: 0, y: 0, z: -1 } } },
});
assert.equal(wrongVertical.status, 'BLOCK', 'unqualified alternate vertical axis must fail closed');
assert.ok(wrongVertical.preparation.findings.some((row) => row.code === 'INPUTXML_HANGER_VERTICAL_AXIS_UNSUPPORTED'));

console.log(JSON.stringify({
  check: 'lfea-hanger-predefined',
  status: 'PASS',
  state: 'DRAFT',
  springRatePerHangerNPerM: one.springRatePerHanger,
  coldLoadPerHangerN: one.coldLoadPerHanger,
  countTwo: { springRateTotalNPerM: two.springRateTotal, coldLoadTotalN: two.coldLoadTotal },
  constitutiveRelativeError: directError,
  deltaConstitutiveRelativeError: deltaError,
  verticalReactionSharePercent: Number((100 * share).toFixed(2)),
  preloadCase: 'IXP-WH',
  legacyWUnchanged: true,
  malformedNodeFailsClosed: true,
  invalidMultiplicityFailsClosed: true,
  draftDisclosureRetainedInPreflight: true,
  draftDisclosureRetainedInResults: true,
  alternateVerticalFailsClosed: true,
  deliberateBreakMode: '--deliberate-break',
  draftClearedBy: 'CAESAR-solved hanger reference only; this self-authored model does not clear DRAFT.',
}, null, 2));
