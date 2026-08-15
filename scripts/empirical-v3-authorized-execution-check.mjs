import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  sealEmpiricalV3CalculationAuthorization,
  sealEngineeringRiskSet,
} from '../src/core/empirical-v3-safety/index.js';
import {
  buildEmpiricalV3SourceBoundExecutionDependency,
  executeAuthorizedEmpiricalV3SourceBoundThermalRom,
} from '../src/workspace/engineering-loads/adapters/empirical-v3-authorized-source-bound-execution.js';

const h = (digit) => `fnv1a64:${String(digit).repeat(16)}`;
const runId = 'RUN:AUTHORIZED-EXECUTION';
const riskSet = sealEngineeringRiskSet({ runId, risks: [] });
const romInput = fixtureRomInput();
const dependency = buildEmpiricalV3SourceBoundExecutionDependency(romInput);
const reordered = buildEmpiricalV3SourceBoundExecutionDependency({
  ...romInput,
  processAuthorities: [...romInput.processAuthorities].reverse(),
  supportMovementAuthorities: [...romInput.supportMovementAuthorities].reverse(),
  selection: {
    ...romInput.selection,
    coordinateRestraintIds: [...romInput.selection.coordinateRestraintIds].reverse(),
  },
});
assert.equal(dependency.semanticHash, reordered.semanticHash, 'request dependency must ignore presentation ordering');
assert.equal(dependency.kind, 'ROM_EXECUTION_REQUEST');

const wrongDependency = { kind: 'ROM_EXECUTION_REQUEST', ref: 'wrong-request', semanticHash: h(9) };
const wrongAuth = authorizationFor([wrongDependency]);
assert.throws(
  () => executeAuthorizedEmpiricalV3SourceBoundThermalRom({
    runId,
    authorization: wrongAuth,
    currentAuthorization: currentBasis(wrongAuth.dependencies),
    romInput,
  }),
  (error) => error?.code === 'EMP_V3_EXECUTION_REQUEST_NOT_AUTHORIZED',
  'exact ROM request dependency must be authorized before frozen ROM execution',
);

const matchingAuth = authorizationFor([dependency]);
assert.throws(
  () => executeAuthorizedEmpiricalV3SourceBoundThermalRom({
    runId,
    authorization: matchingAuth,
    currentAuthorization: {
      ...currentBasis(matchingAuth.dependencies),
      policyVersion: '2',
    },
    romInput,
  }),
  (error) => error?.code === 'EMP_V3_EXECUTION_AUTHORIZATION_STALE'
    && error?.evidence?.reasons?.includes('RISK_POLICY_CHANGED'),
  'stale policy must fail before frozen ROM execution',
);

const source = readFileSync(
  new URL('../src/workspace/engineering-loads/adapters/empirical-v3-authorized-source-bound-execution.js', import.meta.url),
  'utf8',
);
const currentnessIndex = source.indexOf('assessEmpiricalV3CalculationAuthorizationCurrent');
const requestGateIndex = source.indexOf('EMP_V3_EXECUTION_REQUEST_NOT_AUTHORIZED');
const frozenRomIndex = source.indexOf('executeCanonicalSourceBoundThermalRomCompatibility(input.romInput)');
assert.ok(currentnessIndex >= 0 && requestGateIndex > currentnessIndex && frozenRomIndex > requestGateIndex,
  'currentness and request-identity gates must precede the frozen ROM call');
assert.doesNotMatch(source, /rooted-tree-component-flexibility|restraint-compatibility|solveRootedTree|calculateCircularElbow/i);
assert.match(source, /canonical-thermal-rom-source-bound-execution\.js/);

console.log('PASS empirical v3 authorized execution fail-closed contract');

function authorizationFor(dependencies) {
  return sealEmpiricalV3CalculationAuthorization({
    runId,
    policyId: 'EMP_V3_RISK_POLICY',
    policyVersion: '1',
    dependencies,
    riskSet,
    confirmations: [],
  });
}
function currentBasis(dependencies) {
  return {
    runId,
    policyId: 'EMP_V3_RISK_POLICY',
    policyVersion: '1',
    dependencies,
    riskSet,
    confirmations: [],
  };
}
function fixtureRomInput() {
  return {
    dataset: {
      datasetId: 'DATASET:1',
      sourceSnapshot: { sourceSemanticHash: 'SOURCE:DATASET:1' },
      sharedModel: { semanticHash: h(1) },
    },
    adaptedRequest: { semanticHash: h(2) },
    topologyGraph: { semanticHash: h(3) },
    supportAttachmentModel: { semanticHash: h(4) },
    restraintCapabilityModel: { semanticHash: h(5) },
    processAuthorities: [{ semanticHash: h(6) }, { semanticHash: h(7) }],
    materialSectionAuthority: { semanticHash: h(8) },
    supportMovementAuthorities: [{ semanticHash: h('a') }, { semanticHash: h('b') }],
    selection: {
      loadCaseId: 'THERMAL',
      rootRestraintId: 'R0',
      coordinateRestraintIds: ['R2', 'R1'],
    },
    options: { maximumCompatibilityResidualM: 1e-10, nested: { enabled: true } },
  };
}
