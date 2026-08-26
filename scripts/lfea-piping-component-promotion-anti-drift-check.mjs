#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  PRODUCTION_CAPABILITY_PROFILE,
  productionComponentLimitation,
} from '../src/core/linear-piping-analysis-consumer/production-capability-profile.js';

const ROOT = path.resolve('src/core/linear-piping-analysis-consumer');
const read = (name) => fs.readFileSync(path.join(ROOT, name), 'utf8');
const files = fs.readdirSync(ROOT)
  .filter((name) => name.endsWith('.js'))
  .sort(compareAscii);
const combined = files.map(read).join('\n');

const preparation = read('inputxml-linear-structural-preparation.js');
const elementAuthorities = read('inputxml-linear-element-authorities.js');
const bendCompiler = read('inputxml-production-bend-components.js');
const branchCompiler = read('inputxml-production-branch-modifiers.js');
const capabilitySource = read('production-capability-profile.js');

// S2 custody: structural bindings must use the conditioned span endpoints. A
// return to source endpoints would make every generated bend chord compile with
// its parent's axis/length while still looking structurally valid.
assert.match(preparation, /startNodeId:\s*String\(segment\.startNodeId\)/u);
assert.match(preparation, /endNodeId:\s*String\(segment\.endNodeId\)/u);
assert.doesNotMatch(preparation, /startNodeId:\s*String\(sourceSegment\.startNodeId\)/u);
assert.doesNotMatch(preparation, /endNodeId:\s*String\(sourceSegment\.endNodeId\)/u);
assert.match(preparation, /retopologiseDeclaredBends/u);
assert.match(preparation, /requireBendRetopologyBindingsResolved/u);
assert.match(preparation, /requireExplainedConditioning/u);

// S3 source truth: enabling the implementation capability must not erase the
// source-specific tangent/arc gate. Unsupported/internal-station bends remain
// approximate even while qualified bends use exact mechanics.
assert.match(capabilitySource, /productionBendSourceEligible/u);
assert.match(capabilitySource,
  /bendExactMechanics[\s\S]*productionBendSourceEligible/u);
assert.equal(
  productionComponentLimitation('BEND', PRODUCTION_CAPABILITY_PROFILE, {
    type: 'BEND', meta: { bendTangentBasis: 'UNQUALIFIED' },
  }),
  'GENERIC_APPROX_BEND_STRAIGHT_CHORD',
);

if (PRODUCTION_CAPABILITY_PROFILE.bendExactMechanics) {
  assert.match(elementAuthorities, /compileInputXmlProductionBendComponents/u);
  assert.match(elementAuthorities, /capability\.bendExactMechanics/u);
  assert.match(bendCompiler, /compilePipingComponent/u);
  assert.match(bendCompiler, /requireAcceptedComponent/u);
  assert.match(bendCompiler, /doubleCountGuard/u);
  assert.match(bendCompiler, /ARC_GEOMETRY_EXCLUDED_V1/u);
  assert.match(bendCompiler, /pressureCorrectionApplied\s*!==\s*false/u);
  assert.match(bendCompiler, /flexibilityOwnership/u);
  assert.doesNotMatch(
    bendCompiler,
    /doubleCountGuard[\s\S]{0,80}(?:skip|ignore|bypass)/iu,
    'Exact bend flexibility must not bypass the double-count ownership guard.',
  );
}

// S6 source truth: only source-eligible TYPE=3 welding tees may clear the
// limitation; TYPE=5 remains approximate until separately qualified.
assert.match(capabilitySource, /Number\(sif\.typeCode\)\s*===\s*3/u);
assert.doesNotMatch(capabilitySource, /Number\(sif\.typeCode\)\s*===\s*5/u);
if (PRODUCTION_CAPABILITY_PROFILE.teeExactMechanics) {
  assert.match(elementAuthorities, /compileInputXmlProductionBranchModifiers/u);
  assert.match(elementAuthorities, /capability\.teeExactMechanics/u);
  assert.match(branchCompiler, /classifyBranchLegs/u);
  assert.match(branchCompiler, /deriveB31JDirectionalBranchEndModifiers/u);
  assert.match(branchCompiler, /BRANCH_BEND_OVERLAP_UNQUALIFIED/u);
  assert.match(branchCompiler, /BRANCH_RUN_SECTION_MISMATCH/u);
  assert.match(elementAuthorities, /INPUTXML_COMPONENT_BRANCH_AUTHORITY_OVERLAP/u);
}

// S4/S5 are deliberately blocked in the current promotion stack. An accidental
// capability flip is a release falsifier until their prerequisite authority
// contracts and independent CAESAR parity are closed in their own stages.
assert.equal(PRODUCTION_CAPABILITY_PROFILE.reducerExactMechanics, false,
  'Reducer exact mechanics cannot be enabled before S4 parity qualification.');
assert.equal(PRODUCTION_CAPABILITY_PROFILE.pressureStiffening, false,
  'Pressure stiffening cannot be enabled before S5 selector/factor qualification.');
assert.equal(PRODUCTION_CAPABILITY_PROFILE.pressureAxialThrust, false,
  'Pressure axial thrust remains a separate unqualified S5 mechanism.');
assert.equal(PRODUCTION_CAPABILITY_PROFILE.pressureBourdon, false,
  'Bourdon cannot be enabled before isolated S5 numerical parity.');

// One-owner element coverage is the integration invariant joining S3 and S6.
assert.match(elementAuthorities, /INPUTXML_COMPONENT_ELEMENT_AUTHORITY_DUPLICATED/u);
assert.match(elementAuthorities, /INPUTXML_ELEMENT_AUTHORITY_COVERAGE_INVALID/u);
assert.match(elementAuthorities, /ledgerIds\.size\s*!==\s*model\.elements\.length/u);

// Production component builders must live in the governed consumer, not only
// in benchmark harnesses or scripts, whenever their capability is advertised.
if (PRODUCTION_CAPABILITY_PROFILE.bendExactMechanics) {
  assert.match(combined, /compileInputXmlProductionBendComponents/u);
}
if (PRODUCTION_CAPABILITY_PROFILE.teeExactMechanics) {
  assert.match(combined, /compileInputXmlProductionBranchModifiers/u);
}

console.log(JSON.stringify({
  check: 'lfea-piping-component-promotion-anti-drift',
  status: 'PASS',
  capabilities: PRODUCTION_CAPABILITY_PROFILE,
}, null, 2));

function compareAscii(left, right) {
  return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0;
}
