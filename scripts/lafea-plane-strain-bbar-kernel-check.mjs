#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  FORMULATIONS,
  MODEL_SCHEMA,
  QUALIFICATION_PROFILE,
  bbarElementElasticEnergy,
  bbarMeanDilatation,
  calculateLocalContinuum,
  createCanonicalLocalContinuumModel,
  q8ElementEvidence,
  recoverBbarPlaneStrainStress,
  t6ElementEvidence,
} from '../src/core/local-continuum/index.js';

const NU_LADDER = [0.30, 0.45, 0.49, 0.499, 0.4999];
const E = 200000;
const THICKNESS = 7;
const FIELD_SET = Object.freeze([
  Object.freeze({ id: 'ISOCHORIC_NORMAL', ex: 0.001, ey: -0.001, gamma: 0 }),
  Object.freeze({ id: 'PURE_SHEAR', ex: 0, ey: 0, gamma: 0.001 }),
  Object.freeze({ id: 'CONSTANT_DILATATION', ex: 0.001, ey: 0.001, gamma: 0 }),
]);

checkLegacyGuardUnchanged();
checkT3BbarRejectedAtExecution();
checkBbarTemperatureRejected();
const affineEvidence = NU_LADDER.flatMap((nu) => [
  checkFamily('T6', nu),
  checkFamily('Q8', nu),
]);

console.log(JSON.stringify({
  schema: 'lafea-plane-strain-bbar-kernel-check/v1',
  status: 'PASS',
  legacyPlaneStrainNu045StillBlocked: true,
  bbarT3CanonicalSourceMayExistAsNonAuthoritativePlaceholder: true,
  bbarT3ProductionAuthorityGranted: false,
  bbarT3ExecutionBlockedBeforeStiffnessAssembly: true,
  bbarTemperatureAuthorityGranted: false,
  poissonRatioLadder: NU_LADDER,
  families: ['T6', 'Q8'],
  affineEvidence,
  releaseAuthorityGranted: false,
}, null, 2));

function checkLegacyGuardUnchanged() {
  assert.throws(
    () => createCanonicalLocalContinuumModel(modelSource({
      formulation: FORMULATIONS.PLANE_STRAIN,
      nu: 0.45,
      elementType: 'T6',
    })),
    (error) => error?.code === 'PLANE_STRAIN_NEAR_INCOMPRESSIBLE_NOT_QUALIFIED',
  );
}

function checkT3BbarRejectedAtExecution() {
  const canonical = createCanonicalLocalContinuumModel(modelSource({
    formulation: FORMULATIONS.PLANE_STRAIN_BBAR,
    nu: 0.49,
    elementType: 'T3',
  }));
  assert.equal(canonical.formulation, FORMULATIONS.PLANE_STRAIN_BBAR);
  const result = calculateLocalContinuum(canonical);
  assert.notEqual(result.qualification.state, 'ACCEPTED');
  assert.equal(result.diagnostics?.[0]?.code, 'PLANE_STRAIN_BBAR_T3_NOT_QUALIFIED');
  assert.equal(result.loadCaseResults, undefined);
}

function checkBbarTemperatureRejected() {
  assert.throws(
    () => createCanonicalLocalContinuumModel(modelSource({
      formulation: FORMULATIONS.PLANE_STRAIN_BBAR,
      nu: 0.49,
      elementType: 'T6',
      thermalStrain: 1e-4,
    })),
    (error) => error?.code === 'PLANE_STRAIN_BBAR_TEMPERATURE_NOT_QUALIFIED',
  );
}

function checkFamily(elementType, nu) {
  const material = Object.freeze({
    materialId: 'M1',
    elasticModulus: E,
    poissonRatio: nu,
    sourceReference: `BBAR-KERNEL#M1/NU-${nu}`,
  });
  const nodes = elementType === 'T6' ? t6Nodes() : q8Nodes();
  const evidence = elementType === 'T6'
    ? t6ElementEvidence(
      `E-${elementType}-${nu}`,
      nodes,
      material,
      FORMULATIONS.PLANE_STRAIN_BBAR,
      THICKNESS,
      QUALIFICATION_PROFILE,
    )
    : q8ElementEvidence(
      `E-${elementType}-${nu}`,
      nodes,
      material,
      FORMULATIONS.PLANE_STRAIN_BBAR,
      THICKNESS,
      QUALIFICATION_PROFILE,
    );
  assert.equal(evidence.stiffnessSymmetry.accepted, true);
  assert.equal(evidence.rigidBodyQualification.accepted, true);
  assert.equal(evidence.affinePatchQualification.accepted, true);
  assert.ok(evidence.bbarEvidence);
  assert.ok(evidence.bbarEvidence.integrationArea > 0);
  assert.ok(evidence.bbarEvidence.bulkModulus > 0);
  assert.ok(evidence.bbarEvidence.shearModulus > 0);
  assert.equal(evidence.bbarEvidence.meanVolumetricRow.length, nodes.length * 2);

  const fields = FIELD_SET.map((field) => checkAffineField(
    nodes,
    evidence,
    material,
    field,
  ));
  return Object.freeze({
    elementType,
    poissonRatio: nu,
    integrationPointCount: evidence.gaussEvidence.length,
    integrationArea: evidence.bbarEvidence.integrationArea,
    shearModulus: evidence.bbarEvidence.shearModulus,
    bulkModulus: evidence.bbarEvidence.bulkModulus,
    fields,
  });
}

function checkAffineField(nodes, evidence, material, field) {
  const u = nodes.flatMap((node) => affineDisplacement(node, field));
  const thetaExpected = field.ex + field.ey;
  const thetaBar = bbarMeanDilatation(evidence.bbarEvidence.meanVolumetricRow, u);
  close(thetaBar, thetaExpected, 1e-10, `${evidence.elementType}/${field.id} mean dilatation`);

  const expectedStress = standardPlaneStrainStress(material, field);
  for (const gp of evidence.gaussEvidence) {
    const strain = matrixVector(gp.B, u);
    close(strain[0], field.ex, 1e-10, `${evidence.elementType}/${field.id}/${gp.pointId} ex`);
    close(strain[1], field.ey, 1e-10, `${evidence.elementType}/${field.id}/${gp.pointId} ey`);
    close(strain[2], field.gamma, 1e-10, `${evidence.elementType}/${field.id}/${gp.pointId} gamma`);
    const stress = recoverBbarPlaneStrainStress(strain, thetaBar, material);
    close(stress.sigmaX, expectedStress.sigmaX, 1e-10, `${evidence.elementType}/${field.id}/${gp.pointId} sx`);
    close(stress.sigmaY, expectedStress.sigmaY, 1e-10, `${evidence.elementType}/${field.id}/${gp.pointId} sy`);
    close(stress.sigmaZ, expectedStress.sigmaZ, 1e-10, `${evidence.elementType}/${field.id}/${gp.pointId} sz`);
    close(stress.tauXY, expectedStress.tauXY, 1e-10, `${evidence.elementType}/${field.id}/${gp.pointId} txy`);
  }

  const energy = bbarElementElasticEnergy(
    evidence.gaussEvidence,
    u,
    evidence.bbarEvidence.meanVolumetricRow,
    material,
    THICKNESS,
  );
  const ku = matrixVector(evidence.localStiffnessMatrix, u);
  const quadratic = 0.5 * dot(u, ku);
  close(
    energy.strainEnergy,
    quadratic,
    1e-10,
    `${evidence.elementType}/${field.id} element energy`,
  );
  assert.ok(energy.deviatoricEnergy >= -1e-12);
  assert.ok(energy.volumetricEnergy >= -1e-12);

  return Object.freeze({
    fieldId: field.id,
    meanDilatation: thetaBar,
    expectedMeanDilatation: thetaExpected,
    strainEnergy: energy.strainEnergy,
    quadraticEnergy: quadratic,
    stress: expectedStress,
  });
}

function affineDisplacement(node, field) {
  // gamma_xy = du/dy + dv/dx. Split engineering shear equally.
  return [
    field.ex * node.x + 0.5 * field.gamma * node.y,
    field.ey * node.y + 0.5 * field.gamma * node.x,
  ];
}

function standardPlaneStrainStress(material, field) {
  const E0 = material.elasticModulus;
  const nu = material.poissonRatio;
  const factor = E0 / ((1 + nu) * (1 - 2 * nu));
  return Object.freeze({
    sigmaX: factor * ((1 - nu) * field.ex + nu * field.ey),
    sigmaY: factor * (nu * field.ex + (1 - nu) * field.ey),
    sigmaZ: factor * nu * (field.ex + field.ey),
    tauXY: E0 / (2 * (1 + nu)) * field.gamma,
  });
}

function modelSource({ formulation, nu, elementType, thermalStrain = null }) {
  const nodes = elementType === 'T3' ? t3SourceNodes()
    : elementType === 'T6' ? t6SourceNodes() : q8SourceNodes();
  return {
    schema: MODEL_SCHEMA,
    modelIdentity: `BBAR-SOURCE-${formulation}-${elementType}-${nu}`,
    modelVersion: '1',
    sourceAncestry: {
      sourceModelIdentity: 'LAFEA3-PS-BBAR-001',
      sourceVersion: 'FROZEN-V1',
      adapterIdentity: 'LAFEA_BBAR_KERNEL_CHECK',
      adapterVersion: '1',
    },
    units: { length: 'mm', force: 'N', stress: 'MPa', modulus: 'MPa' },
    formulation,
    materials: [{
      materialId: 'M1', elasticModulus: E, poissonRatio: nu, sourceReference: 'BBAR-KERNEL#M1',
    }],
    nodes,
    elements: [{
      elementId: 'E1',
      elementType,
      nodeIds: nodes.map((node) => node.nodeId),
      materialId: 'M1',
      thickness: THICKNESS,
      sourceReference: 'BBAR-KERNEL#E1',
    }],
    elementTypePolicy: {
      allowT3Fallback: elementType === 'T3',
      sourceReference: elementType === 'T3'
        ? 'BBAR-KERNEL#T3-CONTROL-ONLY'
        : 'BBAR-KERNEL#HIGH-ORDER-REQUIRED',
    },
    constraints: [],
    loadCases: [{
      loadCaseId: 'LC1',
      nodalForces: [], edgeTractions: [], pressureLoads: [], bodyForces: [],
      temperatureLoads: thermalStrain === null ? [] : [{
        temperatureLoadId: 'TEMP1', elementId: 'E1', thermalStrain,
        sourceReference: 'BBAR-KERNEL#TEMP1',
      }],
      imposedDisplacements: [],
      sourceReference: 'BBAR-KERNEL#LC1',
    }],
    resultRequests: { loadCaseIds: ['LC1'] },
    qualificationProfile: structuredClone(QUALIFICATION_PROFILE),
    limitations: [],
  };
}

function t6Nodes() {
  return [
    { x: 0, y: 0 }, { x: 4, y: 0.5 }, { x: 0.5, y: 3 },
    { x: 2, y: 0.25 }, { x: 2.25, y: 1.75 }, { x: 0.25, y: 1.5 },
  ];
}
function q8Nodes() {
  return [
    { x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4.5, y: 3 }, { x: -0.5, y: 3 },
    { x: 2, y: 0 }, { x: 4.25, y: 1.5 }, { x: 2, y: 3 }, { x: -0.25, y: 1.5 },
  ];
}
function t3SourceNodes() {
  return sourceNodes([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }]);
}
function t6SourceNodes() { return sourceNodes(t6Nodes()); }
function q8SourceNodes() { return sourceNodes(q8Nodes()); }
function sourceNodes(nodes) {
  return nodes.map((node, index) => ({
    nodeId: `N${index + 1}`, ...node, sourceReference: `BBAR-KERNEL#N${index + 1}`,
  }));
}
function matrixVector(matrix, vector) {
  return matrix.map((row) => row.reduce((sum, value, index) => sum + value * vector[index], 0));
}
function dot(left, right) {
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}
function close(actual, expected, relative, label) {
  const scale = Math.max(1, Math.abs(actual), Math.abs(expected));
  assert.ok(
    Number.isFinite(actual) && Math.abs(actual - expected) <= relative * scale,
    `${label}: ${actual} != ${expected}`,
  );
}
