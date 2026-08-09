#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const authorityPath = 'benchmarks/LFEA/CAESAR_ACCDB/bm4nl-caesar-settings.authority.json';
const checkPath = 'scripts/lfea-issue947-caesar-settings-custody-check.mjs';

const authority = JSON.parse(fs.readFileSync(authorityPath, 'utf8'));
assert.equal(authority.overall.settings.BEND_LENGTH_ATTACHMENT_PERCENT, undefined);
authority.overall.settings.BEND_LENGTH_ATTACHMENT_PERCENT = 1;

const bendAxial = authority.bindings.find((entry) => entry.setting === 'BEND_AXIAL_SHAPE');
assert.ok(bendAxial);
bendAxial.status = 'BOUND_MODE_PRESENT_AND_CONVERGED';
bendAxial.note = 'Closed-form curved-arc strain-energy audit shows the segmented production bend retains the axial deformation mode with worst relative error 0.031728%, inside the existing 1% convergence gate. This does not claim CAESAR internal interpolation identity.';
const index = authority.bindings.findIndex((entry) => entry.setting === 'BEND_AXIAL_SHAPE');
authority.bindings.splice(index + 1, 0, {
  setting: 'BEND_LENGTH_ATTACHMENT_PERCENT',
  authority: 'OVERALL_SETTING',
  target: 'bend exit analysis geometry',
  status: 'BOUND_GEOMETRY_TRIGGER_AUDIT_ONLY',
  value: 1,
  note: 'Hexagon Version 14 defines a minimum n-percent-of-radius attachment when the leaving-element To node falls within that distance of the far weld line. BM4_NL source geometry audit determines applicability; no production node relocation is authorized until exact inserted-element geometry semantics are reproduced.'
});

const b31j = authority.bindings.find((entry) => entry.setting === 'APPLY_B31J_SIFS_AND_FLEX');
assert.ok(b31j);
b31j.status = 'BOUND_B31J_REQUIRED_BY_CODE';
b31j.note = 'CAESAR II Version 14 Default applies B31J SIFs and flexibilities when required by the selected code. B31.3-2022 is a 2020-or-later edition and therefore requires B31J; for smooth 90-degree B31J bends Version 14 uses 1.3/h rather than legacy B31.3 1.65/h.';
authority.bindings.splice(authority.bindings.indexOf(b31j) + 1, 0, {
  setting: 'B31J_SMOOTH_90_BEND_FLEXIBILITY',
  authority: 'CODE_DERIVED_FROM_DEFAULT_CODE_AND_APPLY_B31J_DEFAULT',
  target: 'profile.linearSolve.b31jSmooth90FlexibilityCorrection.enabled',
  status: 'BOUND_TRUE',
  value: true,
  note: 'Pinned BM4_NL has smooth non-miter 90-degree bends with no user K-factor override. Version-14 B31J smooth-90 flexibility therefore uses the 1.3/h rule.'
});
fs.writeFileSync(authorityPath, `${JSON.stringify(authority, null, 2)}\n`);

let check = fs.readFileSync(checkPath, 'utf8');
const scalarAnchor = "assert.equal(authority.overall.settings.FRICT_STIF, 1e6);";
assert.equal(count(check, scalarAnchor), 1);
check = check.replace(scalarAnchor, `${scalarAnchor}\nassert.equal(authority.overall.settings.BEND_LENGTH_ATTACHMENT_PERCENT, 1);`);
const bindingAnchor = "assert.equal(requiredBindings.get('BEND_AXIAL_SHAPE')?.status, 'RECORDED_REQUIRES_FORMULATION_MAPPING');";
assert.equal(count(check, bindingAnchor), 1);
check = check.replace(bindingAnchor,
  "assert.equal(requiredBindings.get('BEND_AXIAL_SHAPE')?.status, 'BOUND_MODE_PRESENT_AND_CONVERGED');\n"
  + "assert.equal(requiredBindings.get('BEND_LENGTH_ATTACHMENT_PERCENT')?.status, 'BOUND_GEOMETRY_TRIGGER_AUDIT_ONLY');");
const b31jAnchor = "assert.equal(requiredBindings.get('APPLY_B31J_SIFS_AND_FLEX')?.status, 'DOES_NOT_RESOLVE_SMOOTH90_NOTE3');";
assert.equal(count(check, b31jAnchor), 1);
check = check.replace(b31jAnchor,
  "assert.equal(requiredBindings.get('APPLY_B31J_SIFS_AND_FLEX')?.status, 'BOUND_B31J_REQUIRED_BY_CODE');\n"
  + "assert.equal(requiredBindings.get('B31J_SMOOTH_90_BEND_FLEXIBILITY')?.status, 'BOUND_TRUE');");
const smoothFalse = "  assert.equal(profile.linearSolve.b31jSmooth90FlexibilityCorrection.enabled, false);";
assert.equal(count(check, smoothFalse), 1);
check = check.replace(smoothFalse, "  assert.equal(profile.linearSolve.b31jSmooth90FlexibilityCorrection.enabled, true);");
const sourcePatternOld = "/BM4NL_CAESAR_SETTINGS_AUTHORITY_V1.*DOES_NOT_RESOLVE_SMOOTH90/u";
assert.equal(count(check, sourcePatternOld), 1);
check = check.replace(sourcePatternOld, "/CAESAR_II_V14.*B31J_REQUIRED.*SMOOTH_90/u");
const messageOld = "`${profilePath}: smooth-90 must remain fail-closed because overall B31J DEFAULT is not Note-3 authority`,";
assert.equal(count(check, messageOld), 1);
check = check.replace(messageOld, "`${profilePath}: B31.3-2022 with Version-14 B31J Default must bind the B31J smooth-90 1.3/h rule`,");
fs.writeFileSync(checkPath, check);

console.log(JSON.stringify({
  check: 'lfea-issue947-apply-bend-attachment-settings-custody',
  status: 'PASS',
  bendLengthAttachmentPercent: 1,
  bendAxialShapeStatus: bendAxial.status,
  b31jDefaultStatus: b31j.status,
  smooth90Status: 'BOUND_TRUE',
  productionMechanicsChanged: false,
}, null, 2));

function count(haystack, needle) { return haystack.split(needle).length - 1; }
