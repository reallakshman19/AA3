#!/usr/bin/env node

/**
 * Real-code check for parseAccdbModelHealthSource against the same
 * deterministic fixture accdb-to-canonical-geometry-check.mjs uses,
 * exercising it through the exact contract/consumer functions
 * diagnoseInputXmlLinearPreFea's options.parseSource seam relies on:
 * requireInputXmlModelHealthSource (the structural contract), and the two
 * real downstream consumers of elementRecords[i].fieldEvidence/
 * childFeatures/canonicalStatus (diagnoseInputXmlLinearModelHealth,
 * diagnoseInputXmlLinearPreFeaEngineeringSanity). Regression-guards the
 * rawDelta unit-conversion bug found during development: DELTA_X/Y/Z are
 * declared in ACCDB's raw length unit, but geometry.nodes are always
 * normalized to metres, so the topology closure check needs rawDelta
 * converted to metres too or every element fails closed as
 * TOPOLOGY_ELEMENT_DELTA_CLOSURE_UNRESOLVED.
 */
import assert from 'node:assert/strict';
import { parseAccdbModelHealthSource } from '../src/core/linear-piping-analysis-consumer/accdb-source-binding.js';
import { requireInputXmlModelHealthSource } from '../src/core/geometry/model-health/inputxml-model-health-source-contract.js';
import { diagnoseInputXmlLinearModelHealth } from '../src/core/linear-piping-analysis-consumer/inputxml-linear-model-health.js';
import { diagnoseInputXmlLinearPreFeaEngineeringSanity } from '../src/core/linear-piping-analysis-consumer/inputxml-linear-prefea-engineering-checks.js';
import { buildAccdbFixtureTables, ACCDB_FIXTURE_ELEMENT_COUNT } from './accdb-to-canonical-geometry-fixture.mjs';

const tables = buildAccdbFixtureTables();
const sourceBundle = parseAccdbModelHealthSource(tables, { source: 'accdb-fixture-check', fileName: 'fixture.accdb' });

assert.equal(sourceBundle.sourceKind, 'ACCDB', 'The synthetic PIPINGELEMENT identity must be disclosed via sourceKind, not hidden.');
assert.equal(sourceBundle.elementRecords.length, ACCDB_FIXTURE_ELEMENT_COUNT);
assert.equal(sourceBundle.sourceRecordCount, sourceBundle.elementRecords.length);
assert.equal(sourceBundle.canonicalSegmentCount, sourceBundle.geometry.segments.length);
sourceBundle.elementRecords.forEach((record, index) => {
  assert.equal(record.sourceFeatureId, `PIPINGELEMENT[${index}]`, 'Synthetic identity must follow the PIPINGELEMENT[i] contract exactly.');
});

// 1. The exact structural validator diagnoseInputXmlLinearPreFea's
// parseSource seam calls before doing anything else.
requireInputXmlModelHealthSource(sourceBundle);

const unreconciled = sourceBundle.elementRecords.filter((record) => record.canonicalStatus !== 'RECONCILED');
assert.equal(unreconciled.length, 0, `Expected every element to reconcile to a canonical segment; unresolved: ${JSON.stringify(unreconciled.map((r) => r.sourceFeatureId))}`);

const rigidChildCount = sourceBundle.elementRecords.filter((record) => record.childFeatures.some((f) => f.kind === 'RIGID')).length;
assert.equal(rigidChildCount, 1, 'Expected exactly one element with a RIGID childFeature (element 4, the VALVE).');
const reducerChildCount = sourceBundle.elementRecords.filter((record) => record.childFeatures.some((f) => f.kind === 'REDUCER')).length;
assert.equal(reducerChildCount, 1, 'Expected exactly one element with a REDUCER childFeature (element 5).');
const sifChildCount = sourceBundle.elementRecords.reduce((sum, record) => sum + record.childFeatures.filter((f) => f.kind === 'SIF').length, 0);
// Node 40 carries 2 SIF rows and is touched by 2 elements (3 and 4) -> 4 SIF childFeature records.
assert.equal(sifChildCount, 4, `Expected 4 total SIF childFeatures (2 rows x 2 touching elements), got ${sifChildCount}.`);

// 2. Real functional exercise of the two downstream consumers that read
// fieldEvidence/childFeatures/canonicalStatus. Neither may throw, and the
// topology/coordinate-closure check specifically must not regress to
// TOPOLOGY_ELEMENT_DELTA_CLOSURE_UNRESOLVED (the rawDelta bug).
const modelHealth = diagnoseInputXmlLinearModelHealth(sourceBundle, {});
const topologyCapability = modelHealth.capabilities.find((c) => c.capabilityId === 'TOPOLOGY_ACCEPTANCE');
assert.ok(topologyCapability, 'Expected a TOPOLOGY_ACCEPTANCE capability in modelHealth.capabilities.');
// ownStatus, not status: this fixture deliberately makes SOURCE_ACCEPTANCE
// BLOCK (the EOFF_PTR/CNODE fail-closed cases above), which correctly
// propagates into TOPOLOGY_ACCEPTANCE's dependent status too -- ownStatus
// isolates topology's own closure check from that propagation.
assert.equal(topologyCapability.ownStatus, 'PASS', `Expected TOPOLOGY_ACCEPTANCE's own status to PASS on a self-consistent fixture; findings: ${JSON.stringify(topologyCapability.findingIds)}`);
assert.ok(
  !modelHealth.findings.some((f) => f.code === 'TOPOLOGY_ELEMENT_DELTA_CLOSURE_UNRESOLVED' || f.code === 'TOPOLOGY_ELEMENT_DELTA_CLOSURE_MISMATCH'),
  'Regression: declared element deltas (rawDelta) must be converted to the same unit as node coordinates (metres).',
);

const sanity = diagnoseInputXmlLinearPreFeaEngineeringSanity(sourceBundle);
assert.equal(sanity.summary.checkedElementCount, ACCDB_FIXTURE_ELEMENT_COUNT);

console.log(JSON.stringify({
  check: 'accdb-source-binding',
  status: 'PASS',
  elementRecordCount: sourceBundle.elementRecords.length,
  topologyAcceptanceOwnStatus: topologyCapability.ownStatus,
  engineeringSanityFindings: sanity.summary.findingCount,
}));
