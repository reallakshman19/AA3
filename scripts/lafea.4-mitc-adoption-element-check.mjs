import assert from 'node:assert/strict';
import { createCanonicalLocalShellModel } from '../src/core/local-shell/canonical-model.js';
import { CANONICAL_UNITS } from '../src/core/local-shell/constants.js';
import {
  buildExperimentalMitcElementEvidence,
} from '../src/core/local-shell/mitc-adoption-element.js';
import {
  createExperimentalMitcAdoptionModel,
  MITC3_TOPOLOGY,
  MITC4_TOPOLOGY,
  MITC_ADOPTION_MODEL_SCHEMA,
  MITC_ADOPTION_ROUTE_STATUS,
} from '../src/core/local-shell/mitc-adoption-model.js';
import { MITC3_FORMULATION } from '../src/core/local-shell/mitc3-element.js';
import { MITC4_FORMULATION } from '../src/core/local-shell/mitc4-element.js';
import { flatNode, qualificationProfile, triangleSource } from './lafea.4-fixtures.mjs';

const material = Object.freeze({
  materialId: 'MAT',
  elasticModulus: 200000,
  poissonRatio: 0.3,
  sourceReference: 'MAT-SRC',
});

const mitcQualification = Object.freeze({
  quadPlanarity: Object.freeze({ absolute: 1e-9, relative: 1e-8 }),
  rigidBodyEnergy: Object.freeze({ absolute: 1e-9, relative: 1e-9 }),
});

// MITC4: a production-shaped 3D shell source must reach the existing
// formulation owner without changing route authority. The adapter owns only
// canonical topology/geometry/basis/evidence; mitc4-element.js remains the
// stiffness and 5/6 shear-correction authority.
{
  const source = adoptionSource({
    modelIdentity: 'MITC4-ADOPTION-SQUARE',
    nodes: [
      flatNode('A', 0, 0),
      flatNode('B', 100, 0),
      flatNode('C', 100, 50),
      flatNode('D', 0, 50),
    ],
    elements: [{
      elementId: 'Q1',
      formulation: MITC4_FORMULATION,
      topology: MITC4_TOPOLOGY,
      nodeIds: ['A', 'B', 'C', 'D'],
      materialId: 'MAT',
      thickness: 2,
      sourceReference: 'Q1-SRC',
    }],
  });
  const model = createExperimentalMitcAdoptionModel(source);
  const [element] = buildExperimentalMitcElementEvidence(model);

  assert.equal(model.routeStatus, MITC_ADOPTION_ROUTE_STATUS);
  assert.equal(model.contributesToLafea4ProductionQualification, false);
  assert.equal(element.routeStatus, MITC_ADOPTION_ROUTE_STATUS);
  assert.equal(element.contributesToLafea4ProductionQualification, false);
  assert.equal(element.formulation, MITC4_FORMULATION);
  assert.equal(element.topology, MITC4_TOPOLOGY);
  assert.deepEqual(element.nodeIds, ['A', 'B', 'C', 'D']);
  assert.equal(element.localDofOrdering.length, 20);
  assert.equal(element.globalDofOrdering.length, 20);
  assert.equal(element.localStiffness.length, 20);
  assert.equal(element.globalStiffness.length, 20);
  assert.equal(element.integrationEvidence.length, 4);
  assert.equal(element.shearCorrectionFactor, 5 / 6);
  assert.equal(element.planarityQualification.accepted, true);
  assert.equal(element.nodalBasisTransformation.rigidReproduction.accepted, true);
  assert.equal(element.qualification.localStiffnessSymmetry.accepted, true);
  assert.equal(element.qualification.globalStiffnessSymmetry.accepted, true);
  assert.equal(element.qualification.rigidBodyEnergy.accepted, true);
  assert.ok(element.formulaIds.some((id) => id.includes('MITC4_TIED_TRANSVERSE_SHEAR')));

  console.log('✅ MITC4 adoption boundary retains explicit nonproduction authority, QUAD4 topology, basis covariance and formulation-owned stiffness evidence.');
}

// MITC4 basis covariance: rotating one node's tangent-coordinate basis must
// not break the generalized N-node transformation or rigid-body qualification.
{
  const angle = Math.PI / 6;
  const nodes = [
    flatNode('A', 0, 0),
    flatNode('B', 100, 0),
    {
      ...flatNode('C', 100, 50),
      rotationBasis1: [Math.cos(angle), Math.sin(angle), 0],
      rotationBasis2: [-Math.sin(angle), Math.cos(angle), 0],
    },
    flatNode('D', 0, 50),
  ];
  const model = createExperimentalMitcAdoptionModel(adoptionSource({
    modelIdentity: 'MITC4-ADOPTION-ROTATED-BASIS',
    nodes,
    elements: [{
      elementId: 'Q1',
      formulation: MITC4_FORMULATION,
      topology: MITC4_TOPOLOGY,
      nodeIds: ['A', 'B', 'C', 'D'],
      materialId: 'MAT',
      thickness: 2,
      sourceReference: 'Q1-SRC',
    }],
  }));
  const [element] = buildExperimentalMitcElementEvidence(model);
  assert.equal(element.nodalBasisTransformation.rigidReproduction.accepted, true);
  assert.equal(element.qualification.rigidBodyEnergy.accepted, true);
  console.log('✅ MITC4 adoption boundary remains rigid-body correct with a rotated nodal tangent basis.');
}

// MITC3 is an explicit, distinguishable fallback topology. It is never
// inferred from a failed QUAD4 request.
{
  const model = createExperimentalMitcAdoptionModel(adoptionSource({
    modelIdentity: 'MITC3-ADOPTION-TRIANGLE',
    nodes: [flatNode('A', 0, 0), flatNode('B', 100, 0), flatNode('C', 0, 50)],
    elements: [{
      elementId: 'T1',
      formulation: MITC3_FORMULATION,
      topology: MITC3_TOPOLOGY,
      nodeIds: ['A', 'B', 'C'],
      materialId: 'MAT',
      thickness: 2,
      sourceReference: 'T1-SRC',
    }],
  }));
  const [element] = buildExperimentalMitcElementEvidence(model);
  assert.equal(element.formulation, MITC3_FORMULATION);
  assert.equal(element.topology, MITC3_TOPOLOGY);
  assert.equal(element.localDofOrdering.length, 15);
  assert.equal(element.globalDofOrdering.length, 15);
  assert.equal(element.integrationEvidence.length, 3);
  assert.equal(element.shearCorrectionFactor, 5 / 6);
  assert.equal(element.planarityQualification, null);
  assert.equal(element.qualification.localStiffnessSymmetry.accepted, true);
  assert.equal(element.qualification.globalStiffnessSymmetry.accepted, true);
  assert.equal(element.qualification.rigidBodyEnergy.accepted, true);
  console.log('✅ MITC3 adoption evidence is explicit TRI3 fallback evidence, not silent MITC4 substitution.');
}

// Topology/formulation authority fails closed before stiffness construction.
assert.throws(
  () => createExperimentalMitcAdoptionModel(adoptionSource({
    modelIdentity: 'BAD-MITC4-TOPOLOGY',
    nodes: [flatNode('A', 0, 0), flatNode('B', 100, 0), flatNode('C', 100, 50), flatNode('D', 0, 50)],
    elements: [{
      elementId: 'BAD', formulation: MITC4_FORMULATION, topology: MITC3_TOPOLOGY,
      nodeIds: ['A', 'B', 'C', 'D'], materialId: 'MAT', thickness: 2, sourceReference: 'BAD-SRC',
    }],
  })),
  /requires topology QUAD4/,
);
assert.throws(
  () => createExperimentalMitcAdoptionModel(adoptionSource({
    modelIdentity: 'BAD-ROUTE-AUTHORITY',
    contributesToLafea4ProductionQualification: true,
    nodes: [flatNode('A', 0, 0), flatNode('B', 100, 0), flatNode('C', 0, 50)],
    elements: [{
      elementId: 'T1', formulation: MITC3_FORMULATION, topology: MITC3_TOPOLOGY,
      nodeIds: ['A', 'B', 'C'], materialId: 'MAT', thickness: 2, sourceReference: 'T1-SRC',
    }],
  })),
  /must not contribute to LAFEA\.4 production qualification/,
);

// Planar-quad V1 policy is explicit: a materially warped facet is rejected
// rather than averaged into a fictitious flat MITC4 element.
assert.throws(
  () => createExperimentalMitcAdoptionModel(adoptionSource({
    modelIdentity: 'WARPED-MITC4',
    nodes: [
      flatNode('A', 0, 0), flatNode('B', 100, 0),
      { ...flatNode('C', 100, 50), position: [100, 50, 10] },
      flatNode('D', 0, 50),
    ],
    elements: [{
      elementId: 'Q1', formulation: MITC4_FORMULATION, topology: MITC4_TOPOLOGY,
      nodeIds: ['A', 'B', 'C', 'D'], materialId: 'MAT', thickness: 2, sourceReference: 'Q1-SRC',
    }],
  })),
  /not sufficiently planar/,
);

// Existing local-shell-model/v1 remains TRI3 CST/DKT only; the adoption
// package is deliberately a separate schema rather than a silent v1 rewrite.
{
  const legacy = triangleSource();
  assert.doesNotThrow(() => createCanonicalLocalShellModel(legacy));
  const quadLegacy = triangleSource((source) => {
    source.nodes.push(flatNode('D', 100, 50));
    source.elements[0].nodeIds = ['A', 'B', 'D', 'C'];
  });
  assert.throws(() => createCanonicalLocalShellModel(quadLegacy), /three unique node IDs/);
  console.log('✅ local-shell-model/v1 remains the unchanged CST/DKT TRI3 authority boundary.');
}

console.log('\n✅ LAFEA.4 experimental MITC adoption element boundary check passed.');

function adoptionSource(overrides) {
  return {
    schema: MITC_ADOPTION_MODEL_SCHEMA,
    modelIdentity: overrides.modelIdentity,
    modelVersion: '1',
    sourceAncestry: ['fixture/local-shell-mitc-adoption/v1'],
    units: { ...CANONICAL_UNITS },
    materials: [{ ...material }],
    nodes: overrides.nodes,
    elements: overrides.elements,
    qualificationProfile: qualificationProfile(),
    mitcQualification: structuredClone(mitcQualification),
    routeStatus: MITC_ADOPTION_ROUTE_STATUS,
    contributesToLafea4ProductionQualification:
      overrides.contributesToLafea4ProductionQualification ?? false,
  };
}
