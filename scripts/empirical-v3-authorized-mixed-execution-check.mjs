import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createEmpiricalElbowFlexibilityAuthority,
  normalizeCircularElbowGeometry,
} from '../src/core/empirical-piping-mechanics/circular-elbow-flexibility.js';
import { semanticHash } from '../src/core/empirical-piping-mechanics/identity.js';
import {
  ENGINEERING_QUANTITY_AUTHORITY_SCHEMA,
  sealEmpiricalV3CalculationAuthorization,
  sealEngineeringQuantityAuthority,
  sealEngineeringRiskSet,
} from '../src/core/empirical-v3-safety/index.js';
import {
  buildEmpiricalV3MixedComponentExecutionDependency,
  executeAuthorizedEmpiricalV3MixedComponentThermalRom,
  requireEmpiricalV3AuthorizedMixedComponentExecution,
} from '../src/workspace/engineering-loads/adapters/empirical-v3-authorized-mixed-component-execution.js';
import {
  buildEmpiricalV3SourceBoundMixedComponentRomInput,
} from '../src/workspace/engineering-loads/adapters/empirical-v3-source-bound-mixed-component-producer.js';

const runId = 'RUN:MIXED-AUTHORIZED';
const route = mixedRoute();
const producer = buildEmpiricalV3SourceBoundMixedComponentRomInput({
  route,
  componentRows: route.components.map(componentRow),
  restraintBinding: restraintBinding(route),
  options: {},
});
assert.equal(producer.policy.executionEnabled, false, 'producer remains inert; bridge owns execution crossing');
const dependency = buildEmpiricalV3MixedComponentExecutionDependency(producer);
assert.equal(dependency.kind, 'ROM_EXECUTION_REQUEST');
assert.equal(dependency.request.producerRef.semanticHash, producer.semanticHash);
assert.equal(dependency.request.routeRef.semanticHash, route.semanticHash);
assert.equal(dependency.request.bindingRef.semanticHash, producer.restraintBinding.semanticHash);

const riskSet = sealEngineeringRiskSet({ runId, risks: [] });
const wrongAuth = authorization([{ kind: 'ROM_EXECUTION_REQUEST', ref: 'wrong', semanticHash: hash('wrong') }]);
assert.throws(() => executeAuthorizedEmpiricalV3MixedComponentThermalRom({
  runId,
  authorization: wrongAuth,
  currentAuthorization: currentBasis(wrongAuth.dependencies),
  producer,
}), (error) => error?.code === 'EMP_V3_MIXED_EXECUTION_REQUEST_NOT_AUTHORIZED');

const currentAuth = authorization([dependency]);
assert.throws(() => executeAuthorizedEmpiricalV3MixedComponentThermalRom({
  runId,
  authorization: currentAuth,
  currentAuthorization: { ...currentBasis(currentAuth.dependencies), policyVersion: '2' },
  producer,
}), (error) => error?.code === 'EMP_V3_MIXED_EXECUTION_AUTHORIZATION_STALE'
  && error?.evidence?.reasons?.includes('RISK_POLICY_CHANGED'));

const execution = executeAuthorizedEmpiricalV3MixedComponentThermalRom({
  runId,
  authorization: currentAuth,
  currentAuthorization: currentBasis(currentAuth.dependencies),
  producer,
});
assert.equal(requireEmpiricalV3AuthorizedMixedComponentExecution(execution), execution);
assert.equal(execution.frozenRom.mechanicsSchema, 'empirical-rooted-component-thermal-compatibility/v1');
assert.equal(execution.evidence.sourceMechanicsSchema, execution.frozenRom.mechanicsSchema);
assert.equal(execution.evidence.authorizationRef.semanticHash, currentAuth.semanticHash);
assert.equal(execution.evidence.evidencePolicy.mechanicsRecomputed, false);
assert.equal(execution.evidence.evidencePolicy.uiOrReportMayResolveMechanics, false);

const expectedF = [
  [3.0214810087147528e-5, -1.0064363521234052e-5],
  [-1.0064363521234052e-5, 5.9767023052964523e-6],
];
for (let row = 0; row < 2; row += 1) {
  for (let column = 0; column < 2; column += 1) {
    assertNear(execution.evidence.coupledSystem.flexibilityMatrixMPerN[row][column], expectedF[row][column], 2e-14);
  }
}
const reactionById = new Map(execution.evidence.coordinates.map((row) => [row.coordinateId, row.reactionN]));
assertNear(reactionById.get('TIP-X'), -606.8995590818411, 1e-6);
assertNear(reactionById.get('TIP-Y'), -1523.9269614290317, 1e-6);
assert.equal(execution.evidence.coordinates[0].pairEvidence.length, 2);
assert.ok(execution.evidence.coordinates.flatMap((row) => row.pairEvidence)
  .some((pair) => pair.componentContributions.some((item) => item.componentId === 'E1')));

const source = readFileSync(
  new URL('../src/workspace/engineering-loads/adapters/empirical-v3-authorized-mixed-component-execution.js', import.meta.url),
  'utf8',
);
const currentnessIndex = source.indexOf('assessEmpiricalV3CalculationAuthorizationCurrent');
const requestIndex = source.indexOf('EMP_V3_MIXED_EXECUTION_REQUEST_NOT_AUTHORIZED');
const frozenIndex = source.indexOf('solveRootedTreeComponentThermalCompatibility(producer.romInput)');
assert.ok(currentnessIndex >= 0 && requestIndex > currentnessIndex && frozenIndex > requestIndex,
  'authorization currentness and exact request identity must gate the frozen mixed ROM');
assert.match(source, /rooted-tree-component-flexibility-gate\.js/);
assert.doesNotMatch(source, /rooted-tree-component-flexibility\.js['"]|restraint-compatibility\.js|assembly\.js|calculateCircularElbowVirtualWorkContribution|calculatePrismaticVirtualWorkContribution/);

console.log('PASS empirical v3 authorized mixed-component execution / frozen benchmark');

function authorization(dependencies) {
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
  return { runId, policyId: 'EMP_V3_RISK_POLICY', policyVersion: '1', dependencies, riskSet, confirmations: [] };
}
function mixedRoute() {
  const geometry = normalizeCircularElbowGeometry({
    componentId: 'E1',
    startPointM: [0, 0, 0],
    endPointM: [1, 1, 0],
    centerPointM: [0, 1, 0],
    planeNormal: [0, 0, 1],
  });
  const material = {
    schema: 'empirical-canonical-component-rom-route/v1',
    datasetId: 'MIXED:SOURCE',
    connectedComponentId: 'REGION:1',
    topologyGraphSemanticHash: hash('topology'),
    sharedModelSemanticHash: hash('shared'),
    nodes: [
      node('N0', -2, 0, 0, ['P1:A']),
      node('N1', 0, 0, 0, ['P1:B', 'E1:A']),
      node('N2', 1, 1, 0, ['E1:B', 'P2:A']),
      node('N3', 1, 3, 0, ['P2:B']),
    ],
    components: [
      straight('P1', 'N0', 'N1', ['P1:A', 'P1:B']),
      {
        componentId: 'E1', sourceType: 'BEND', kind: 'CIRCULAR_ELBOW', nodeAId: 'N1', nodeBId: 'N2',
        sourcePortKeys: ['E1:A', 'E1:B'], geometry, geometryAuthoritySemanticHash: hash('elbow-geometry'),
      },
      straight('P2', 'N2', 'N3', ['P2:A', 'P2:B']),
    ],
    evidence: { topologyAuthority: 'VALIDATED_EXACT_PIPING_PORT_TOPOLOGY_GRAPH' },
  };
  return Object.freeze({ ...material, semanticHash: semanticHash(material) });
}
function restraintBinding(routeValue) {
  const material = {
    schema: 'empirical-v3-source-bound-mixed-restraint-binding/v1',
    requestRef: { ref: 'SCENARIO:THERMAL', semanticHash: hash('request') },
    attachmentModelRef: { ref: 'MIXED:SOURCE', semanticHash: hash('attachment') },
    restraintModelRef: { ref: 'MIXED:SOURCE', semanticHash: hash('restraint') },
    routeRef: { ref: routeValue.connectedComponentId, semanticHash: routeValue.semanticHash },
    loadCaseId: 'THERMAL',
    root: {
      restraintId: 'ROOT', supportSiteId: 'SUPPORT:ROOT', attachmentId: 'ATTACH:ROOT', nodeId: 'N0',
      movementAuthorityRef: { ref: 'MOVE:ROOT', semanticHash: hash('move-root') },
    },
    coordinates: [
      coordinate('TIP-X', [1, 0, 0], 'MOVE:TIP-X', hash('move-x')),
      coordinate('TIP-Y', [0, 1, 0], 'MOVE:TIP-Y', hash('move-y')),
    ],
    movementRecords: [],
    policy: {
      explicitRestraintQualificationOnly: true,
      sourceBackedSupportMovementOnly: true,
      qualifiedMovementOnly: true,
      existingCanonicalRouteNodesOnly: true,
      attachedPortOnly: true,
      supportStationSplittingPerformed: false,
      chainageConsumed: false,
      contactGapFrictionSolved: false,
      targetDisplacementDerivedHere: true,
      mechanicsSolved: false,
    },
  };
  const semantic = semanticHash(material);
  return Object.freeze({ ...material, bindingId: `mixed-restraint:${semantic.slice('fnv1a64:'.length)}`, semanticHash: semantic });
}
function coordinate(id, direction, ref, semantic) {
  return {
    coordinateId: id, restraintId: id, supportSiteId: 'SUPPORT:TIP', attachmentId: 'ATTACH:TIP', nodeId: 'N3',
    direction, targetDisplacementM: 0, supportStiffnessNPerM: null,
    movementAuthorityRef: { ref, semanticHash: semantic },
  };
}
function componentRow(component) {
  const quantities = commonQuantities(component.componentId);
  if (component.kind === 'CIRCULAR_ELBOW') {
    quantities.OUTER_DIAMETER = exactQuantity(component.componentId, 'OUTER_DIAMETER', 0.2, 'm');
    quantities.WALL_THICKNESS = exactQuantity(component.componentId, 'WALL_THICKNESS', 0.01, 'm');
    quantities.PRESSURE = exactQuantity(component.componentId, 'PRESSURE', 0, 'Pa');
  }
  return {
    componentId: component.componentId,
    quantities,
    flexibilityAuthority: component.kind === 'CIRCULAR_ELBOW' ? elbowFlexibility() : null,
  };
}
function commonQuantities(scopeRef) {
  return {
    ELASTIC_MODULUS: exactQuantity(scopeRef, 'ELASTIC_MODULUS', 200e9, 'Pa'),
    SHEAR_MODULUS: exactQuantity(scopeRef, 'SHEAR_MODULUS', 76.923076923e9, 'Pa'),
    AREA: exactQuantity(scopeRef, 'AREA', 0.004, 'm2'),
    SECOND_MOMENT_Y: exactQuantity(scopeRef, 'SECOND_MOMENT_Y', 8e-6, 'm4'),
    SECOND_MOMENT_Z: exactQuantity(scopeRef, 'SECOND_MOMENT_Z', 8e-6, 'm4'),
    TORSION_CONSTANT: exactQuantity(scopeRef, 'TORSION_CONSTANT', 1.6e-5, 'm4'),
    REFERENCE_TEMPERATURE: exactQuantity(scopeRef, 'REFERENCE_TEMPERATURE', 20, 'degC'),
    ANALYSIS_TEMPERATURE: exactQuantity(scopeRef, 'ANALYSIS_TEMPERATURE', 120, 'degC'),
    EXPANSION_COEFFICIENT: exactQuantity(scopeRef, 'EXPANSION_COEFFICIENT', 1e-5, '1/K'),
  };
}
function exactQuantity(scopeRef, quantityKind, value, unit) {
  return sealEngineeringQuantityAuthority({
    schema: ENGINEERING_QUANTITY_AUTHORITY_SCHEMA,
    quantityId: `Q:${scopeRef}:${quantityKind}`,
    quantityKind,
    scopeRef,
    value,
    unit,
    authorityClass: 'SOURCE_EXACT',
    sourceBinding: {
      sourceType: 'GOVERNED_FIXTURE', sourceReference: `fixture:${scopeRef}:${quantityKind}`,
      sourceSemanticHash: hash(`source:${scopeRef}`), evidenceRef: `evidence:${scopeRef}:${quantityKind}`,
      evidenceHash: hash(`evidence:${scopeRef}:${quantityKind}`),
    },
    derivation: null,
    riskRefs: [],
    confirmationRef: null,
  });
}
function elbowFlexibility() {
  return createEmpiricalElbowFlexibilityAuthority({
    schema: 'empirical-elbow-flexibility-authority/v1',
    authorityId: 'B31J:E1:2023',
    componentId: 'E1',
    basis: 'CODE_COMPONENT_FLEXIBILITY',
    inPlaneFlexibilityFactor: 2.5,
    outOfPlaneFlexibilityFactor: 2.5,
    torsionalFlexibilityFactor: 1,
    source: {
      standard: 'ASME_B31J', edition: '2023', ruleId: 'B31J:FLEX',
      sourceSemanticHash: hash('b31j-source'), factorResultSemanticHash: hash('b31j-result'),
    },
    geometryBinding: { bendRadiusM: 1, outerDiameterM: 0.2, wallThicknessM: 0.01, pressurePa: 0, elasticModulusPa: 200e9 },
  });
}
function node(id, x, y, z, sourcePortKeys) { return { id, pointM: { x, y, z }, sourcePortKeys }; }
function straight(componentId, nodeAId, nodeBId, sourcePortKeys) {
  return { componentId, sourceType: 'PIPE', kind: 'STRAIGHT', nodeAId, nodeBId, sourcePortKeys, geometry: null, geometryAuthoritySemanticHash: null };
}
function hash(value) { return semanticHash({ value }); }
function assertNear(actual, expected, tolerance) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}
