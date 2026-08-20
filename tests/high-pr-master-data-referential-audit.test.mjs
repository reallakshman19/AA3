import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { auditHighPrReferences } from '../scripts/high-pr-master-data-referential-audit.mjs';

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hp-ref-'));
  const files = {
    'method_manifest.csv': 'method_id,qualification_state\nM1,APPROVED\n',
    'material_identity.csv': 'material_id,status\nMAT1,ACTIVE\n',
    'material_property.csv': 'material_id,temperature_c\nMAT1,20\n',
    'pipe_product.csv': 'product_id,material_id,status\nP1,MAT1,ACTIVE\n',
    'corrosion_model.csv': 'corrosion_model_id,status\nC1,ACTIVE\n',
    'cycle_spectrum.csv': 'spectrum_id,class_id,status\nS1,CL1,APPROVED\n',
    'operating_state.csv': 'spectrum_id,state_id,status\nS1,A,ACTIVE\nS1,B,ACTIVE\n',
    'cycle_transition.csv': 'spectrum_id,cycle_id,from_state_id,to_state_id,status\nS1,T1,A,B,APPROVED\n',
    'fatigue_curve.csv': 'fatigue_curve_id,qualification_state\nF1,APPROVED\n',
    'fatigue_curve_point.csv': 'fatigue_curve_id,point_no,n_cycles,sa_mpa\nF1,1,100,200\nF1,2,1000,100\n',
    'component_catalog.csv': 'component_id,status\nCOMP1,ACTIVE\n',
    'sif_stress_index.csv': 'geometry_key\nG1\n',
    'component_qualification.csv': 'qualification_id,component_id,fatigue_envelope_id,b31j_geometry_key,fea_evidence_id,vendor_evidence_id,status\nQ1,COMP1,E1,G1,NONE,NONE,PREQUALIFIED\n',
    'piping_class.csv': 'class_id,corrosion_model_id,spectrum_id,status\nCL1,C1,S1,ACTIVE\n',
    'piping_class_item.csv': 'class_id,component_type,size_from_nps,size_to_nps,component_id,product_id,qualification_id,status\nCL1,STRAIGHT_PIPE,1,1,COMP1,P1,Q1,ACTIVE\n',
    'fatigue_envelope_point.csv': 'envelope_id,qualification_id,governing_component\nE1,Q1,COMP1\n',
    'analysis_mapping.csv': 'mapping_id,material_map_id,load_case_template_id,fatigue_curve_id,status\nA1,MM1,LC1,F1,ACTIVE\n',
    'approval_record.csv': 'object_type,object_id,disposition\nPIPING_CLASS,CL1,APPROVED\n',
    'material_map.csv': 'material_map_id\nMM1\n',
    'load_case_template.csv': 'load_case_template_id\nLC1\n',
  };
  for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), content);
  return dir;
}

function replace(dir, name, before, after) {
  const file = path.join(dir, name);
  const content = fs.readFileSync(file, 'utf8');
  assert(content.includes(before), `${name}: missing replacement source`);
  fs.writeFileSync(file, content.replace(before, after));
}

test('complete linked fixture is complete and contained', () => {
  const dir = fixture();
  const result = auditHighPrReferences(dir);
  assert.equal(result.referentialCompleteness, 'COMPLETE');
  assert.equal(result.failClosedContainment, 'PASS');
  assert.equal(result.unresolvedRecordCount, 0);
});

test('active material without property data fails; blocked material contains it', () => {
  const dir = fixture();
  fs.writeFileSync(path.join(dir, 'material_property.csv'), 'material_id,temperature_c\n');
  let result = auditHighPrReferences(dir);
  assert.equal(result.failClosedContainment, 'FAIL');
  assert(result.unsafeActiveRecords.includes('MATERIAL_IDENTITY:MAT1'));
  replace(dir, 'material_identity.csv', 'MAT1,ACTIVE', 'MAT1,BLOCKED_MISSING_PROPERTIES');
  result = auditHighPrReferences(dir);
  assert.equal(result.referentialCompleteness, 'INCOMPLETE');
  assert.equal(result.failClosedContainment, 'PASS');
});

test('approved fatigue curve without points fails; blocked curve contains it', () => {
  const dir = fixture();
  fs.writeFileSync(path.join(dir, 'fatigue_curve_point.csv'), 'fatigue_curve_id,point_no,n_cycles,sa_mpa\n');
  let result = auditHighPrReferences(dir);
  assert.equal(result.failClosedContainment, 'FAIL');
  assert(result.unsafeActiveRecords.includes('FATIGUE_CURVE:F1'));
  replace(dir, 'fatigue_curve.csv', 'F1,APPROVED', 'F1,BLOCKED_MISSING_POINTS');
  result = auditHighPrReferences(dir);
  assert.equal(result.referentialCompleteness, 'INCOMPLETE');
  assert.equal(result.failClosedContainment, 'PASS');
});

test('component qualification missing external evidence fails until blocked', () => {
  const dir = fixture();
  replace(dir, 'component_qualification.csv', 'E1,G1,NONE,NONE,PREQUALIFIED', 'MISSING,G1,FEA1,VENDOR1,PREQUALIFIED');
  let result = auditHighPrReferences(dir);
  assert.equal(result.failClosedContainment, 'FAIL');
  assert.deepEqual(result.missingReferences.envelopeIds, ['MISSING']);
  assert.deepEqual(result.missingReferences.feaEvidenceIds, ['FEA1']);
  assert.deepEqual(result.missingReferences.vendorEvidenceIds, ['VENDOR1']);
  replace(dir, 'component_qualification.csv', 'PREQUALIFIED', 'BLOCKED_INCOMPLETE_EVIDENCE');
  replace(dir, 'piping_class_item.csv', ',ACTIVE', ',BLOCKED_QUALIFICATION_EVIDENCE');
  replace(dir, 'piping_class.csv', ',ACTIVE', ',BLOCKED_INCOMPLETE_CLASS_EVIDENCE');
  replace(dir, 'approval_record.csv', ',APPROVED', ',BLOCKED_TARGET_INCOMPLETE_OR_UNRESOLVED');
  result = auditHighPrReferences(dir);
  assert.equal(result.referentialCompleteness, 'INCOMPLETE');
  assert.equal(result.failClosedContainment, 'PASS');
});

test('incomplete spectrum cascades to class and must fail closed', () => {
  const dir = fixture();
  fs.writeFileSync(path.join(dir, 'operating_state.csv'), 'spectrum_id,state_id,status\n');
  fs.writeFileSync(path.join(dir, 'cycle_transition.csv'), 'spectrum_id,cycle_id,from_state_id,to_state_id,status\n');
  let result = auditHighPrReferences(dir);
  assert.equal(result.failClosedContainment, 'FAIL');
  assert(result.unsafeActiveRecords.includes('CYCLE_SPECTRUM:S1'));
  assert(result.unsafeActiveRecords.includes('PIPING_CLASS:CL1'));
  replace(dir, 'cycle_spectrum.csv', ',APPROVED', ',BLOCKED_INCOMPLETE_TRANSIENT');
  replace(dir, 'piping_class.csv', ',ACTIVE', ',BLOCKED_INCOMPLETE_CLASS_EVIDENCE');
  replace(dir, 'approval_record.csv', ',APPROVED', ',BLOCKED_TARGET_INCOMPLETE_OR_UNRESOLVED');
  result = auditHighPrReferences(dir);
  assert.equal(result.failClosedContainment, 'PASS');
});

test('missing mapping dependencies fail ACTIVE mapping and pass when quarantined', () => {
  const dir = fixture();
  fs.unlinkSync(path.join(dir, 'material_map.csv'));
  fs.unlinkSync(path.join(dir, 'load_case_template.csv'));
  let result = auditHighPrReferences(dir);
  assert.equal(result.failClosedContainment, 'FAIL');
  assert.deepEqual(result.missingReferences.materialMapIds, ['MM1']);
  assert.deepEqual(result.missingReferences.loadCaseTemplateIds, ['LC1']);
  replace(dir, 'analysis_mapping.csv', ',ACTIVE', ',BLOCKED_MISSING_MAPPING_DEPENDENCY');
  result = auditHighPrReferences(dir);
  assert.equal(result.failClosedContainment, 'PASS');
});

test('unresolved approval target cannot remain APPROVED', () => {
  const dir = fixture();
  fs.writeFileSync(path.join(dir, 'approval_record.csv'), 'object_type,object_id,disposition\nBENCHMARK_SUITE,SUITE1,APPROVED\n');
  let result = auditHighPrReferences(dir);
  assert.equal(result.failClosedContainment, 'FAIL');
  assert(result.unsafeActiveRecords.includes('APPROVAL_RECORD:SUITE1'));
  replace(dir, 'approval_record.csv', ',APPROVED', ',BLOCKED_TARGET_INCOMPLETE_OR_UNRESOLVED');
  result = auditHighPrReferences(dir);
  assert.equal(result.failClosedContainment, 'PASS');
});

test('class-to-spectrum ownership mismatch cannot remain ACTIVE', () => {
  const dir = fixture();
  replace(dir, 'cycle_spectrum.csv', 'S1,CL1,APPROVED', 'S1,OTHER,APPROVED');
  let result = auditHighPrReferences(dir);
  assert.equal(result.failClosedContainment, 'FAIL');
  assert(result.issues.some((issue) => issue.code === 'HP_CLASS_SPECTRUM_OWNERSHIP_MISMATCH'));
  replace(dir, 'piping_class.csv', ',ACTIVE', ',BLOCKED_INCOMPLETE_CLASS_EVIDENCE');
  replace(dir, 'approval_record.csv', ',APPROVED', ',BLOCKED_TARGET_INCOMPLETE_OR_UNRESOLVED');
  result = auditHighPrReferences(dir);
  assert.equal(result.failClosedContainment, 'PASS');
});
