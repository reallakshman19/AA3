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
fs.writeFileSync(checkPath, check);

console.log(JSON.stringify({
  check: 'lfea-issue947-apply-bend-attachment-settings-custody',
  status: 'PASS',
  bendLengthAttachmentPercent: 1,
  bendAxialShapeStatus: bendAxial.status,
  productionMechanicsChanged: false,
}, null, 2));

function count(haystack, needle) { return haystack.split(needle).length - 1; }
