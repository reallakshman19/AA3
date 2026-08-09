#!/usr/bin/env node
import fs from 'node:fs';

const authorityPath = 'benchmarks/LFEA/CAESAR_ACCDB/bm4nl-caesar-settings.authority.json';
const checkerPath = 'scripts/lfea-issue947-caesar-settings-custody-check.mjs';

const authority = JSON.parse(fs.readFileSync(authorityPath, 'utf8'));
const binding = authority.bindings.find((entry) => entry.setting === 'BEND_AXIAL_SHAPE');
if (!binding) throw new Error('BEND_AXIAL_SHAPE authority binding missing.');
if (binding.value !== 'YES') throw new Error(`Expected BEND_AXIAL_SHAPE=YES, got ${String(binding.value)}.`);
if (binding.status !== 'BOUND_MODE_PRESENT_AND_CONVERGED') {
  throw new Error(`Unexpected prior BEND_AXIAL_SHAPE status ${String(binding.status)}.`);
}
binding.status = 'BLOCKING_CAESAR_BEND_AXIAL_SHAPE_OPERATOR_UNMAPPED';
binding.note = [
  'Overall CAESAR setting is YES, but the BM4_NL linearSolve profile does not declare a bendAxialShape operator and the production bend compiler is a chain of corrected straight frame elements.',
  'The earlier closed-form curved-arc convergence evidence proves only ordinary curved-beam/segmented-frame convergence; it does not prove identity to CAESAR axial-shape interpolation.',
  'Direct L19 raw E48 half-bend action evidence remains unresolved on the near half after 8x angular refinement, while the far half converges inside the unchanged 10% action gate.',
  'Independent continuum-arch evidence reproduces the refined ordinary curved-beam limit; public Hexagon documentation establishes the axial-shape displacement mode but does not expose the Version-14 operator equation.',
  'No production coefficient or inferred operator is authorized from BM4_NL residual fit. Full qualification remains blocked until an independently specified CAESAR-equivalent operator is implemented and falsified by whole-model L19 replay.',
].join(' ');
authority.qualificationBlockers ??= [];
const blocker = {
  id: 'CAESAR_BEND_AXIAL_SHAPE_OPERATOR_UNMAPPED',
  setting: 'BEND_AXIAL_SHAPE',
  effectiveValue: 'YES',
  status: 'BLOCKING',
  evidence: {
    authoritativeL19ReplayRun: 31324887225,
    e48RawHalfBendRun: 31327789378,
    e48SubdivisionRun: 31327940476,
    e48MidpointKinematicRun: 31327674577,
    e48ContinuumArchRun: 31328724212,
  },
  falsification: 'Do not infer or tune an axial-shape coefficient from E48. Require an independent equation/source, generic benchmark verification, E48 direct raw-action closure at unchanged limits, and whole-model L19 replay with no new failures.',
};
const existing = authority.qualificationBlockers.findIndex((entry) => entry.id === blocker.id);
if (existing >= 0) authority.qualificationBlockers[existing] = blocker;
else authority.qualificationBlockers.push(blocker);
fs.writeFileSync(authorityPath, `${JSON.stringify(authority, null, 2)}\n`);

let checker = fs.readFileSync(checkerPath, 'utf8');
const oldAssertion = "assert.equal(requiredBindings.get('BEND_AXIAL_SHAPE')?.status, 'BOUND_MODE_PRESENT_AND_CONVERGED');";
const newAssertion = "assert.equal(requiredBindings.get('BEND_AXIAL_SHAPE')?.status, 'BLOCKING_CAESAR_BEND_AXIAL_SHAPE_OPERATOR_UNMAPPED');";
if (!checker.includes(oldAssertion)) throw new Error('Settings checker BEND_AXIAL_SHAPE assertion anchor missing.');
checker = checker.replace(oldAssertion, newAssertion);
const oldFilter = ".filter((entry) => entry.status.startsWith('UNRESOLVED') || entry.status.includes('PENDING_') || entry.status.includes('REQUIRES_') || entry.status === 'DOES_NOT_RESOLVE_SMOOTH90_NOTE3')";
const newFilter = ".filter((entry) => entry.status.startsWith('BLOCKING_') || entry.status.startsWith('UNRESOLVED') || entry.status.includes('PENDING_') || entry.status.includes('REQUIRES_') || entry.status === 'DOES_NOT_RESOLVE_SMOOTH90_NOTE3')";
if (!checker.includes(oldFilter)) throw new Error('Settings checker unresolved-filter anchor missing.');
checker = checker.replace(oldFilter, newFilter);
const profileAnchor = "  assert.equal(profile.linearSolve.b31jSmooth90FlexibilityCorrection.enabled, true);";
const profileGuard = "  assert.equal(Object.hasOwn(profile.linearSolve, 'bendAxialShape'), false, `${profilePath}: BEND_AXIAL_SHAPE=YES is not yet mapped to a qualified linearSolve operator and must not be represented as implemented`);\n" + profileAnchor;
if (!checker.includes(profileAnchor)) throw new Error('Settings checker profile anchor missing.');
checker = checker.replace(profileAnchor, profileGuard);
const resultAnchor = "  unresolved: authority.bindings\n";
const resultReplacement = "  qualificationBlockers: authority.qualificationBlockers ?? [],\n  unresolved: authority.bindings\n";
if (!checker.includes(resultAnchor)) throw new Error('Settings checker result anchor missing.');
checker = checker.replace(resultAnchor, resultReplacement);
fs.writeFileSync(checkerPath, checker);

console.log(JSON.stringify({
  status: 'PATCHED',
  authorityPath,
  checkerPath,
  bendAxialShapeStatus: binding.status,
  qualificationBlocker: blocker.id,
}, null, 2));
