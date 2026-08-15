#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const constants = read('src/core/local-continuum/constants.js');
const normalization = read('src/core/local-continuum/source-normalization.js');
const bbar = read('src/core/local-continuum/bbar-plane-strain.js');
const t6 = read('src/core/local-continuum/t6-element.js');
const q8 = read('src/core/local-continuum/q8-element.js');
const recovery = read('src/core/local-continuum/recovery.js');
const g4 = read('src/workspace/lafea-continuum-physical-probe.js');
const domain = read('src/workspace/lafea-continuum-analysis-domain.js');
const temperature = read('src/core/local-continuum/temperature-strain-loads.js');
const freezeCheck = read('scripts/lafea-plane-strain-bbar-freeze-check.mjs');
const kernelCheck = read('scripts/lafea-plane-strain-bbar-kernel-check.mjs');
const lameCheck = read('scripts/lafea-plane-strain-bbar-lame-check.mjs');

// Existing displacement-only authority remains byte-semantically distinct.
assert.match(constants, /planeStrainPoissonWarning:\s*0\.40/u);
assert.match(constants, /planeStrainPoissonBlock:\s*0\.45/u);
assert.match(constants, /PLANE_STRAIN_BBAR:\s*'PLANE_STRAIN_BBAR'/u);
assert.match(normalization, /formulation !== FORMULATIONS\.PLANE_STRAIN\) return/u);
assert.match(normalization, /PLANE_STRAIN_NEAR_INCOMPRESSIBLE_NOT_QUALIFIED/u);
assert.match(normalization, /PLANE_STRAIN_BBAR_T3_NOT_QUALIFIED/u);
assert.match(normalization, /PLANE_STRAIN_BBAR_TEMPERATURE_NOT_QUALIFIED/u);
assert.equal(/planeStrainPoissonBlock\s*[:=]\s*(0\.[4-9][6-9]|[1-9])/u.test(constants), false,
  'Legacy plane-strain hard block must not be weakened above 0.45.');

// B-bar mechanics must be mean-dilatation, not tolerance or reduced-integration substitution.
assert.match(bbar, /Bv_bar|meanVolumetricRow/u);
assert.match(bbar, /bulkModulus/u);
assert.match(bbar, /bbarStiffnessMatrix/u);
assert.match(bbar, /recoverBbarPlaneStrainStress/u);
assert.match(bbar, /bbarElementElasticEnergy/u);
assert.equal(/solverTolerance|choleskyPivot|pcgTolerance/u.test(bbar), false,
  'B-bar mechanics must not alter solver tolerances.');

for (const elementSource of [t6, q8]) {
  assert.match(elementSource, /isBbarPlaneStrain\(formulation\)/u);
  assert.match(elementSource, /bbarStiffnessMatrix/u);
  assert.match(elementSource, /bbarEvidence/u);
  assert.match(elementSource, /meanVolumetricRow/u);
}

// Recovery and fixed probes must consume the exact retained mean row used by stiffness.
assert.match(recovery, /element\.bbarEvidence\.meanVolumetricRow/u);
assert.match(recovery, /recoverBbarPlaneStrainStress/u);
assert.match(recovery, /MEAN_DILATATION_BBAR_PHYSICAL_ELASTIC_STRAIN_ENERGY/u);
assert.match(g4, /elementEvidence\.bbarEvidence\.meanVolumetricRow/u);
assert.match(g4, /recoverBbarPlaneStrainStress/u);
assert.match(g4, /LAFEA_G4_PROBE_BBAR_EVIDENCE_MISSING/u);

// Domain-first can carry the identity, while template compilers retain their own allow-lists.
assert.match(domain, /FORMULATIONS\.PLANE_STRAIN_BBAR/u);

// Thermal assembler still exists for standard formulations, but B-bar is source-blocked.
assert.match(temperature, /temperatureEquivalentNodalLoad/u);
assert.match(normalization, /validateFormulationLoadAuthority/u);

// Definitions/oracles must remain frozen and production observations separate.
assert.match(freezeCheck, /FROZEN_BEFORE_PRODUCTION_OBSERVATION/u);
assert.match(freezeCheck, /productionOutputUsedToChooseDefinition/u);
assert.match(kernelCheck, /legacyPlaneStrainNu045StillBlocked:\s*true/u);
assert.match(kernelCheck, /bbarT3ProductionAuthorityGranted:\s*false/u);
assert.match(kernelCheck, /bbarTemperatureAuthorityGranted:\s*false/u);
assert.match(lameCheck, /movingMaximumUsed:\s*false/u);
assert.match(lameCheck, /nodalOrSmoothedStressUsedAsAcceptanceAuthority:\s*false/u);
assert.match(lameCheck, /releaseAuthorityGranted:\s*false/u);

console.log(JSON.stringify({
  schema: 'lafea-plane-strain-bbar-source-guard/v1',
  status: 'PASS',
  legacyPlaneStrainGuardPreserved: true,
  explicitBbarIdentityRequired: true,
  t3BbarAuthorityGranted: false,
  bbarTemperatureAuthorityGranted: false,
  retainedMeanDilatationRecoveryGuarded: true,
  solverToleranceRelaxationDetected: false,
  movingMaximumAcceptanceAllowed: false,
  releaseAuthorityGranted: false,
}));

function read(file) { return fs.readFileSync(file, 'utf8'); }
