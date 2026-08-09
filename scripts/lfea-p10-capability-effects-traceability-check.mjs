#!/usr/bin/env node
import assert from 'node:assert/strict';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import { makeFinding } from '../src/core/linear-piping-analysis-consumer/inputxml-linear-prefea-contract.js';
import { collectFindings } from '../src/core/linear-piping-analysis-consumer/inputxml-linear-prefea-findings.js';

const upstreamCapabilityEffects = Object.freeze({
  STRICT_LINEAR_STATIC: Object.freeze({
    disposition: 'CONDITIONAL',
    limitationCode: 'P10_STRICT_LIMITATION',
  }),
  OPERATING_CASE_STRICT: Object.freeze({
    disposition: 'BLOCK',
    limitationCode: 'P10_OPERATING_BLOCK',
  }),
});

const sourceFinding = Object.freeze({
  code: 'P10_TRACEABILITY_FIXTURE',
  category: 'RESTRAINT',
  severity: 'warning',
  disposition: 'CONDITIONAL',
  message: 'P-10 traceability fixture.',
  technicalBasis: 'The upstream model-health finding carries per-capability disposition and limitation evidence.',
  evidence: Object.freeze({
    inventoryId: 'P10-INV-001',
    sourceRecordSemanticHash: 'p10-source-record-hash',
  }),
  remediation: 'Review the disclosed capability effects.',
  capabilityEffects: upstreamCapabilityEffects,
  sourceFeatureIds: Object.freeze(['P10-SF-001']),
  sourcePaths: Object.freeze(['/PIPINGMODEL/PIPINGELEMENT[1]/RESTRAINT[1]']),
  canonicalEntityIds: Object.freeze(['P10-NODE-10']),
  physicalCaseIds: Object.freeze(['P10-W']),
  approximationEligible: true,
  authorizationRequired: true,
});

const current = normalize(sourceFinding);
assert.deepEqual(current.capabilityEffects, ['OPERATING_CASE_STRICT', 'STRICT_LINEAR_STATIC']);
assert.deepEqual(current.evidence, {
  inventoryId: 'P10-INV-001',
  sourceRecordSemanticHash: 'p10-source-record-hash',
  upstreamCapabilityEffects: {
    OPERATING_CASE_STRICT: {
      disposition: 'BLOCK',
      limitationCode: 'P10_OPERATING_BLOCK',
    },
    STRICT_LINEAR_STATIC: {
      disposition: 'CONDITIONAL',
      limitationCode: 'P10_STRICT_LIMITATION',
    },
  },
});
assert.equal(Object.isFrozen(current.evidence), true);
assert.equal(Object.isFrozen(current.evidence.upstreamCapabilityEffects), true);

const legacy = makeFinding({
  code: sourceFinding.code,
  category: sourceFinding.category,
  severity: 'WARNING',
  disposition: sourceFinding.disposition,
  capabilityEffects: Object.keys(upstreamCapabilityEffects),
  sourceFeatureIds: sourceFinding.sourceFeatureIds,
  sourcePaths: sourceFinding.sourcePaths,
  canonicalEntityIds: sourceFinding.canonicalEntityIds,
  physicalCaseIds: sourceFinding.physicalCaseIds,
  message: sourceFinding.message,
  technicalBasis: sourceFinding.technicalBasis,
  evidence: sourceFinding.evidence,
  remediation: sourceFinding.remediation,
  approximationEligible: true,
  authorizationRequired: true,
});

assert.notEqual(current.findingId, legacy.findingId,
  'Preserving upstream capability effects must intentionally change finding identity.');
assert.notEqual(semanticHash(current), semanticHash(legacy),
  'Preserving upstream capability effects must intentionally change the finding semantic hash.');

const reversed = normalize({
  ...sourceFinding,
  evidence: Object.freeze({
    sourceRecordSemanticHash: 'p10-source-record-hash',
    inventoryId: 'P10-INV-001',
  }),
  capabilityEffects: Object.freeze({
    OPERATING_CASE_STRICT: upstreamCapabilityEffects.OPERATING_CASE_STRICT,
    STRICT_LINEAR_STATIC: upstreamCapabilityEffects.STRICT_LINEAR_STATIC,
  }),
});
assert.equal(reversed.findingId, current.findingId,
  'Capability-effect insertion order must not change finding identity.');
assert.equal(semanticHash(reversed), semanticHash(current),
  'Capability-effect insertion order must not change semantic evidence.');

console.log(JSON.stringify({
  status: 'PASS',
  legacyFindingId: legacy.findingId,
  currentFindingId: current.findingId,
  legacyFindingSemanticHash: semanticHash(legacy),
  currentFindingSemanticHash: semanticHash(current),
  capabilityEffects: current.capabilityEffects,
  upstreamCapabilityEffects: current.evidence.upstreamCapabilityEffects,
}, null, 2));

function normalize(row) {
  const rows = collectFindings({
    sourceBundle: Object.freeze({ geometry: Object.freeze({ diagnostics: Object.freeze([]) }) }),
    topology: Object.freeze({ findings: Object.freeze([]) }),
    proximity: Object.freeze({ findings: Object.freeze([]) }),
    representability: Object.freeze({
      findings: Object.freeze([Object.freeze(row)]),
      capabilities: Object.freeze([]),
    }),
    engineeringSanity: Object.freeze({ findings: Object.freeze([]) }),
  });
  assert.equal(rows.length, 1);
  return rows[0];
}
