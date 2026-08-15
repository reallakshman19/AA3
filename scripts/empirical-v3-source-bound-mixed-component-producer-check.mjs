import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createEmpiricalElbowFlexibilityAuthority,
  normalizeCircularElbowGeometry,
} from '../src/core/empirical-piping-mechanics/circular-elbow-flexibility.js';
import { semanticHash } from '../src/core/empirical-piping-mechanics/identity.js';
import {
  ENGINEERING_QUANTITY_AUTHORITY_SCHEMA,
  sealEngineeringQuantityAuthority,
} from '../src/core/empirical-v3-safety/quantity-authority.js';
import {
  buildEmpiricalV3SourceBoundMixedComponentRomInput,
  requireEmpiricalV3SourceBoundMixedComponentRomInput,
} from '../src/workspace/engineering-loads/adapters/empirical-v3-source-bound-mixed-component-producer.js';

const route = mixedRoute();
const rows = route.components.map((component) => componentRow(component));
const input = {
  route,
  componentRows: rows,
  root: { nodeId: 'N0', authorityRef: ref('ROOT:ANCHOR', 'a') },
  coordinates: [{
    coordinateId: 'TIP-X', nodeId: 'N3', direction: [1, 0, 0], directionAuthorityRef: ref('RESTRAINT:TIP-X', 'b'),
    targetDisplacement: exactQuantity('TIP-X', 'TARGET_DISPLACEMENT', 0, 'm'), supportStiffness: null,
    rigidSupportRef: ref('RIGID:TIP-X', 'c'),
  }],
  options: {},
};
const produced = buildEmpiricalV3SourceBoundMixedComponentRomInput(input);
assert.equal(requireEmpiricalV3SourceBoundMixedComponentRomInput(produced), produced);
assert.equal(produced.romInput.components.length, 3);
assert.equal(produced.romInput.components.find((row) => row.componentId === 'E1').flexibilityAuthority.source.standard, 'ASME_B31J');
assert.equal(produced.romInput.coordinates[0].targetDisplacementM, 0);
assert.deepEqual(produced.policy, {
  exactQuantityAuthorityOnly: true,
  existingCanonicalRouteNodesOnly: true,
  supportStationSplittingPerformed: false,
  chainageConsumed: false,
  toleranceTopologyConsumed: false,
  benchmarkElbowFlexibilityAccepted: false,
  mechanicsSolved: false,
  numericalOptionsOverridden: false,
});

const inferred = structuredClone(input);
inferred.componentRows[0].quantities.ELASTIC_MODULUS = inferredQuantity('P1', 'ELASTIC_MODULUS', 200e9, 'Pa');
assert.throws(() => buildEmpiricalV3SourceBoundMixedComponentRomInput(inferred), /not exact source\/master\/derived authority/);

const extraQuantity = structuredClone(input);
extraQuantity.componentRows[0].quantities.CHAINAGE = exactQuantity('P1', 'CHAINAGE', 1, 'm');
assert.throws(() => buildEmpiricalV3SourceBoundMixedComponentRomInput(extraQuantity), /exactly the qualified quantity kinds/);

const chainageCoordinate = structuredClone(input);
chainageCoordinate.coordinates[0].chainageM = 3;
assert.throws(() => buildEmpiricalV3SourceBoundMixedComponentRomInput(chainageCoordinate), /unexpected or missing keys/);

const splitRequired = structuredClone(input);
splitRequired.coordinates[0].nodeId = 'INTERIOR:3M';
assert.throws(() => buildEmpiricalV3SourceBoundMixedComponentRomInput(splitRequired), /support splitting\/chainage is not qualified/);

const atRoot = structuredClone(input);
atRoot.coordinates[0].nodeId = 'N0';
assert.throws(() => buildEmpiricalV3SourceBoundMixedComponentRomInput(atRoot), /rooted anchor node/);

const benchmark = structuredClone(input);
benchmark.componentRows.find((row) => row.componentId === 'E1').flexibilityAuthority = elbowFlexibility('BENCHMARK');
assert.throws(() => buildEmpiricalV3SourceBoundMixedComponentRomInput(benchmark), /non-benchmark ASME B31J/);

const staleBinding = structuredClone(input);
const elbow = staleBinding.componentRows.find((row) => row.componentId === 'E1');
elbow.flexibilityAuthority = createEmpiricalElbowFlexibilityAuthority({
  ...authorityInput('2023'), geometryBinding: { ...authorityInput('2023').geometryBinding, wallThicknessM: 0.011 },
});
assert.throws(() => buildEmpiricalV3SourceBoundMixedComponentRomInput(staleBinding), /wallThicknessM binding does not match/);

const straightFlex = structuredClone(input);
straightFlex.componentRows.find((row) => row.componentId === 'P1').flexibilityAuthority = elbowFlexibility('2023');
assert.throws(() => buildEmpiricalV3SourceBoundMixedComponentRomInput(straightFlex), /cannot carry elbow flexibility authority/);

const tuned = structuredClone(input); tuned.options = { maximumCompatibilityResidualM: 1e-6 };
assert.throws(() => buildEmpiricalV3SourceBoundMixedComponentRomInput(tuned), /frozen default numerical options only/);

const source = readFileSync(new URL('../src/workspace/engineering-loads/adapters/empirical-v3-source-bound-mixed-component-producer.js', import.meta.url), 'utf8');
assert.doesNotMatch(source, /solveRooted|solveLinear|calculatePrismatic|calculateCircularElbowVirtualWork|chainageDistribution|topology-edit/i);
assert.match(source, /requireCanonicalComponentRomRoute/);
assert.match(source, /requireEngineeringQuantityAuthority/);
assert.match(source, /requireEmpiricalElbowFlexibilityAuthority/);
assert.match(source, /benchmarkElbowFlexibilityAccepted:\s*false/);
assert.match(source, /supportStationSplittingPerformed:\s*false/);

console.log('PASS empirical v3 source-bound mixed-component input producer qualification');

function mixedRoute() {
  const geometry = normalizeCircularElbowGeometry({
    componentId: 'E1', startPointM: [0, 0, 0], endPointM: [1, 1, 0], centerPointM: [0, 1, 0], planeNormal: [0, 0, 1],
  });
  const material = {
    schema: 'empirical-canonical-component-rom-route/v1', datasetId: 'MIXED:SOURCE', connectedComponentId: 'REGION:1',
    topologyGraphSemanticHash: 'fnv1a64:1000000000000001', sharedModelSemanticHash: 'fnv1a64:1000000000000002',
    nodes: [node('N0', -2, 0, 0), node('N1', 0, 0, 0), node('N2', 1, 1, 0), node('N3', 1, 3, 0)],
    components: [
      { componentId: 'P1', sourceType: 'PIPE', kind: 'STRAIGHT', nodeAId: 'N0', nodeBId: 'N1', sourcePortKeys: ['P1:A','P1:B'], geometry: null, geometryAuthoritySemanticHash: null },
      { componentId: 'E1', sourceType: 'BEND', kind: 'CIRCULAR_ELBOW', nodeAId: 'N1', nodeBId: 'N2', sourcePortKeys: ['E1:A','E1:B'], geometry, geometryAuthoritySemanticHash: 'fnv1a64:1000000000000003' },
      { componentId: 'P2', sourceType: 'PIPE', kind: 'STRAIGHT', nodeAId: 'N2', nodeBId: 'N3', sourcePortKeys: ['P2:A','P2:B'], geometry: null, geometryAuthoritySemanticHash: null },
    ],
    evidence: { topologyAuthority: 'VALIDATED_EXACT_PIPING_PORT_TOPOLOGY_GRAPH', toleranceInferredTopologyConsumed: false, finiteElementDiscretizationCreated: false },
  };
  return Object.freeze({ ...material, semanticHash: semanticHash(material) });
}
function componentRow(component) {
  const quantities = commonQuantities(component.componentId);
  if (component.kind === 'CIRCULAR_ELBOW') {
    quantities.OUTER_DIAMETER = exactQuantity(component.componentId, 'OUTER_DIAMETER', 0.2, 'm');
    quantities.WALL_THICKNESS = exactQuantity(component.componentId, 'WALL_THICKNESS', 0.01, 'm');
    quantities.PRESSURE = exactQuantity(component.componentId, 'PRESSURE', 0, 'Pa');
  }
  return { componentId: component.componentId, quantities, flexibilityAuthority: component.kind === 'CIRCULAR_ELBOW' ? elbowFlexibility('2023') : null };
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
    schema: ENGINEERING_QUANTITY_AUTHORITY_SCHEMA, quantityId: `Q:${scopeRef}:${quantityKind}`, quantityKind, scopeRef, value, unit,
    authorityClass: 'SOURCE_EXACT',
    sourceBinding: { sourceType: 'GOVERNED_FIXTURE', sourceReference: `fixture:${scopeRef}:${quantityKind}`, sourceSemanticHash: `source:${scopeRef}`, evidenceRef: `evidence:${scopeRef}:${quantityKind}`, evidenceHash: `hash:${scopeRef}:${quantityKind}` },
    derivation: null, riskRefs: [], confirmationRef: null,
  });
}
function inferredQuantity(scopeRef, quantityKind, value, unit) {
  return sealEngineeringQuantityAuthority({
    schema: ENGINEERING_QUANTITY_AUTHORITY_SCHEMA, quantityId: `Q:${scopeRef}:${quantityKind}:INF`, quantityKind, scopeRef, value, unit,
    authorityClass: 'INFERRED_REVIEW_REQUIRED', sourceBinding: null, derivation: null, riskRefs: ['risk:inferred'], confirmationRef: null,
  });
}
function elbowFlexibility(edition) { return createEmpiricalElbowFlexibilityAuthority(authorityInput(edition)); }
function authorityInput(edition) {
  return {
    schema: 'empirical-elbow-flexibility-authority/v1', authorityId: `B31J:E1:${edition}`, componentId: 'E1', basis: 'CODE_COMPONENT_FLEXIBILITY',
    inPlaneFlexibilityFactor: 2.5, outOfPlaneFlexibilityFactor: 2.5, torsionalFlexibilityFactor: 1,
    source: { standard: 'ASME_B31J', edition, ruleId: 'B31J:FLEX', sourceSemanticHash: 'fnv1a64:2000000000000001', factorResultSemanticHash: 'fnv1a64:2000000000000002' },
    geometryBinding: { bendRadiusM: 1, outerDiameterM: 0.2, wallThicknessM: 0.01, pressurePa: 0, elasticModulusPa: 200e9 },
  };
}
function node(id, x, y, z) { return { id, pointM: { x, y, z }, sourcePortKeys: [`${id}:PORT`] }; }
function ref(name, suffix) { return { ref: name, semanticHash: `fnv1a64:${suffix.repeat(16)}` }; }
