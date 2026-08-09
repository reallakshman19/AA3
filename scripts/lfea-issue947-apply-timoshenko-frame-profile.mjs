#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const target = fileURLToPath(new URL(
  '../src/core/fea-benchmarks/caesar-accdb-linear-solve.js',
  import.meta.url,
));
const before = `function frameProfile() {
  return sealFrameElementProfile({
    schema: 'fea-linear-frame-element-profile/v1',
    profileId: 'LINEAR-FRAME-ELEMENT-R1',
    straightPipeFormulation: 'PIPE_FRAME3D_EULER_BERNOULLI_V1',
    shearDeformation: false,
    releaseRule: 'STATIC_CONDENSATION_V1',
    thermalStrainApproximation: 'UNIFORM_TEMPERATURE_ALPHA_DELTA_T_V1',
    releaseSingularityTolerance: { value: 1e-12, source: PROFILE_SOURCE },
    semanticHash: '',
  });
}`;
const after = `function frameProfile() {
  return sealFrameElementProfile({
    schema: 'fea-linear-frame-element-profile/v1',
    profileId: 'LINEAR-FRAME-ELEMENT-R1',
    straightPipeFormulation: 'PIPE_FRAME3D_TIMOSHENKO_V1',
    shearDeformation: true,
    shearCorrectionFactorY: { value: 0.53, source: 'COWPER-1966-THIN-ANNULUS-INPUT' },
    shearCorrectionFactorZ: { value: 0.53, source: 'COWPER-1966-THIN-ANNULUS-INPUT' },
    releaseRule: 'STATIC_CONDENSATION_V1',
    thermalStrainApproximation: 'UNIFORM_TEMPERATURE_ALPHA_DELTA_T_V1',
    releaseSingularityTolerance: { value: 1e-12, source: PROFILE_SOURCE },
    semanticHash: '',
  });
}`;

const text = readFileSync(target, 'utf8');
if (!text.includes(before)) {
  if (text.includes(after)) {
    console.log(JSON.stringify({ patch: 'issue-947-timoshenko-frame-profile', status: 'ALREADY_APPLIED' }, null, 2));
    process.exit(0);
  }
  throw new Error('Expected Euler-Bernoulli ACCDB frame-profile block was not found; refusing a fuzzy source edit.');
}
const occurrences = text.split(before).length - 1;
if (occurrences !== 1) throw new Error(`Expected exactly one ACCDB frame-profile block; found ${occurrences}.`);
writeFileSync(target, text.replace(before, after));
console.log(JSON.stringify({
  patch: 'issue-947-timoshenko-frame-profile',
  status: 'APPLIED',
  target,
  formulation: 'PIPE_FRAME3D_TIMOSHENKO_V1',
  shearCorrectionFactorY: 0.53,
  shearCorrectionFactorZ: 0.53,
  source: 'COWPER-1966-THIN-ANNULUS-INPUT',
}, null, 2));
