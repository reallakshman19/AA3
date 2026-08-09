#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const authorityPath = 'benchmarks/LFEA/CAESAR_ACCDB/bm4nl-caesar-settings.authority.json';
const checkPath = 'scripts/lfea-issue947-caesar-settings-custody-check.mjs';

const authority = JSON.parse(fs.readFileSync(authorityPath, 'utf8'));
if (authority.overall.settings.BEND_LENGTH_ATTACHMENT_PERCENT === undefined) {
  authority.overall.settings.BEND_LENGTH_ATTACHMENT_PERCENT = 1;
}
assert.equal(authority.overall.settings.BEND_LENGTH_ATTACHMENT_PERCENT, 1);

upsertBinding('BEND_AXIAL_SHAPE', {
  authority: 'OVERALL_SETTING',
  target: 'bend formulation',
  status: 'BOUND_MODE_PRESENT_AND_CONVERGED',
  value: 'YES',
  note: 'Closed-form curved-arc strain-energy audit shows the segmented production bend retains the axial deformation mode with worst relative error 0.031728%, inside the existing 1% convergence gate. This does not claim CAESAR internal interpolation identity.',
});
upsertBinding('BEND_LENGTH_ATTACHMENT_PERCENT', {
  authority: 'OVERALL_SETTING',
  target: 'bend exit analysis geometry',
  status: 'BOUND_GEOMETRY_TRIGGER_AUDIT_ONLY',
  value: 1,
  note: 'Hexagon Version 14 defines a minimum n-percent-of-radius attachment when the leaving-element To node falls within that distance of the far weld line. BM4_NL source geometry audit determines applicability; no production node relocation is authorized until exact inserted-element geometry semantics are reproduced.',
});
upsertBinding('APPLY_B31J_SIFS_AND_FLEX', {
  authority: 'OVERALL_SETTING',
  target: 'B31J application',
  status: 'BOUND_B31J_REQUIRED_BY_CODE',
  value: 'DEFAULT',
  note: 'CAESAR II Version 14 Default applies B31J SIFs and flexibilities when required by the selected code. B31.3-2022 is a 2020-or-later edition and therefore requires B31J; for smooth 90-degree B31J bends Version 14 uses 1.3/h rather than legacy B31.3 1.65/h.',
});
upsertBinding('B31J_SMOOTH_90_BEND_FLEXIBILITY', {
  authority: 'CODE_DERIVED_FROM_DEFAULT_CODE_AND_APPLY_B31J_DEFAULT',
  target: 'profile.linearSolve.b31jSmooth90FlexibilityCorrection.enabled',
  status: 'BOUND_TRUE',
  value: true,
  note: 'Pinned BM4_NL has smooth non-miter 90-degree bends with no user K-factor override. Version-14 B31J smooth-90 flexibility therefore uses the 1.3/h rule.',
});
fs.writeFileSync(authorityPath, `${JSON.stringify(authority, null, 2)}\n`);

let check = fs.readFileSync(checkPath, 'utf8');
ensureAfter(
  "assert.equal(authority.overall.settings.FRICT_STIF, 1e6);",
  "assert.equal(authority.overall.settings.BEND_LENGTH_ATTACHMENT_PERCENT, 1);",
);
replaceAssertion(
  "assert.equal(requiredBindings.get('BEND_AXIAL_SHAPE')?.status, 'RECORDED_REQUIRES_FORMULATION_MAPPING');",
  "assert.equal(requiredBindings.get('BEND_AXIAL_SHAPE')?.status, 'BOUND_MODE_PRESENT_AND_CONVERGED');",
);
ensureAfter(
  "assert.equal(requiredBindings.get('BEND_AXIAL_SHAPE')?.status, 'BOUND_MODE_PRESENT_AND_CONVERGED');",
  "assert.equal(requiredBindings.get('BEND_LENGTH_ATTACHMENT_PERCENT')?.status, 'BOUND_GEOMETRY_TRIGGER_AUDIT_ONLY');",
);
replaceAssertion(
  "assert.equal(requiredBindings.get('APPLY_B31J_SIFS_AND_FLEX')?.status, 'DOES_NOT_RESOLVE_SMOOTH90_NOTE3');",
  "assert.equal(requiredBindings.get('APPLY_B31J_SIFS_AND_FLEX')?.status, 'BOUND_B31J_REQUIRED_BY_CODE');",
);
ensureAfter(
  "assert.equal(requiredBindings.get('APPLY_B31J_SIFS_AND_FLEX')?.status, 'BOUND_B31J_REQUIRED_BY_CODE');",
  "assert.equal(requiredBindings.get('B31J_SMOOTH_90_BEND_FLEXIBILITY')?.status, 'BOUND_TRUE');",
);
check = replaceOptional(
  check,
  "  assert.equal(profile.linearSolve.b31jSmooth90FlexibilityCorrection.enabled, false);",
  "  assert.equal(profile.linearSolve.b31jSmooth90FlexibilityCorrection.enabled, true);",
);
assert.ok(check.includes("assert.equal(profile.linearSolve.b31jSmooth90FlexibilityCorrection.enabled, true);"));
check = replaceOptional(
  check,
  "/BM4NL_CAESAR_SETTINGS_AUTHORITY_V1.*DOES_NOT_RESOLVE_SMOOTH90/u",
  "/CAESAR_II_V14.*B31J_REQUIRED.*SMOOTH_90/u",
);
assert.ok(check.includes('/CAESAR_II_V14.*B31J_REQUIRED.*SMOOTH_90/u'));
check = replaceOptional(
  check,
  "`${profilePath}: smooth-90 must remain fail-closed because overall B31J DEFAULT is not Note-3 authority`,",
  "`${profilePath}: B31.3-2022 with Version-14 B31J Default must bind the B31J smooth-90 1.3/h rule`,",
);
fs.writeFileSync(checkPath, check);

console.log(JSON.stringify({
  check: 'lfea-issue947-apply-bend-attachment-settings-custody',
  status: 'PASS',
  idempotent: true,
  bendLengthAttachmentPercent: 1,
  bendAxialShapeStatus: binding('BEND_AXIAL_SHAPE').status,
  b31jDefaultStatus: binding('APPLY_B31J_SIFS_AND_FLEX').status,
  smooth90Status: binding('B31J_SMOOTH_90_BEND_FLEXIBILITY').status,
  productionMechanicsChanged: false,
}, null, 2));

function binding(setting) {
  return authority.bindings.find((entry) => entry.setting === setting);
}
function upsertBinding(setting, values) {
  const existing = binding(setting);
  if (existing) Object.assign(existing, { setting, ...values });
  else authority.bindings.push({ setting, ...values });
}
function replaceAssertion(oldText, newText) {
  if (check.includes(oldText)) check = check.replace(oldText, newText);
  assert.ok(check.includes(newText), `Missing expected custody assertion: ${newText}`);
}
function ensureAfter(anchor, line) {
  if (!check.includes(line)) {
    assert.ok(check.includes(anchor), `Missing insertion anchor: ${anchor}`);
    check = check.replace(anchor, `${anchor}\n${line}`);
  }
}
function replaceOptional(value, oldText, newText) {
  return value.includes(oldText) ? value.replace(oldText, newText) : value;
}
