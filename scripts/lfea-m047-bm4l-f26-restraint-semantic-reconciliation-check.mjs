import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  decodeBm4lAccdbRestraintType,
  retainAccdbRestraintTypeId,
} from '../src/core/nonlinear-restraint-friction/caesar-restraint-code-authority.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const evidencePath = path.resolve(
  here,
  '../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-f26-restraint-semantic-reconciliation.json',
);
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));

assert.equal(evidence.schema, 'm047-bm4l-f26-restraint-semantic-reconciliation/v1');
assert.equal(evidence.status, 'PASS_WITH_GAP_MAGNITUDE_SOURCE_SPLIT');
assert.equal(evidence.extraction.status, 'PASS');
assert.equal(evidence.extraction.rowCount, 46);
assert.equal(evidence.extraction.sourceBytesUnchanged, true);
assert.equal(
  evidence.extraction.sourceAccdbSha256,
  '64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8',
);
assert.equal(
  evidence.extraction.rowProjectionSha256,
  '7af58e11640346880910a2bd0a54fcae6b7f8ee418be26fe0165fbc018732bc5',
);

for (const [code, abbreviation, count] of [[1, 'ANC', 1], [3, '+Y', 29], [8, 'LIM', 6], [9, 'GUI', 10]]) {
  const retained = retainAccdbRestraintTypeId(code);
  assert.equal(retained.effectiveTypeId, code);
  assert.equal(retained.mutationApplied, false);
  assert.equal(decodeBm4lAccdbRestraintType(code).abbreviation, abbreviation);
  const mapping = evidence.classMapping.mappings.find((row) => row.accdbResTypeId === code);
  assert.ok(mapping);
  assert.equal(mapping.correctedInputXmlClass, abbreviation);
  assert.equal(mapping.rowCount, count);
  assert.equal(mapping.exactNodeSetMatch, true);
}
assert.equal(evidence.classMapping.allMappingsExact, true);
assert.equal(decodeBm4lAccdbRestraintType(17).family, 'UNSUPPORTED_BM4L_ACCDB_RESTRAINT_TYPE');

assert.equal(evidence.frictionReconciliation.accdbResTypeId, 3);
assert.equal(evidence.frictionReconciliation.class, '+Y');
assert.equal(evidence.frictionReconciliation.positiveFrictionRowCount, 26);
assert.equal(evidence.frictionReconciliation.matchesCorrectedInputXmlFrictionInventory, true);
assert.deepEqual(
  evidence.frictionReconciliation.nonFrictionPlusYNodeIds,
  ['20300', '20640', '21640'],
);

assert.equal(evidence.directionReconciliation.plusYAllGlobalY, true);
assert.equal(evidence.directionReconciliation.positiveGapRows.length, 6);
assert.equal(evidence.directionReconciliation.allPositiveGapDirectionsMatch, true);
assert.equal(
  evidence.directionReconciliation.positiveGapRows.filter((row) => row.frictionNode).length,
  5,
);
assert.equal(
  new Set(evidence.directionReconciliation.positiveGapRows
    .filter((row) => row.frictionNode)
    .map((row) => row.nodeId)).size,
  4,
);

assert.equal(evidence.gapCustody.accdbAllGapFieldsUnsetSentinel, true);
assert.equal(evidence.gapCustody.accdbPositiveGapMagnitudeCount, 0);
assert.equal(evidence.gapCustody.correctedInputXmlPositiveGapMagnitudeCount, 6);
assert.equal(
  evidence.gapCustody.conclusion,
  'ACCDB_CLOSES_CLASS_DIRECTION_FRICTION_BUT_NOT_POSITIVE_GAP_MAGNITUDES',
);
assert.equal(evidence.fileLevelAuthority.restraintDirectionalBehavior, 'BIDIRECTIONAL');
assert.equal(evidence.decision.f26TypeDirectionFrictionMappingClosed, true);
assert.equal(evidence.decision.productionNonlinearMechanicsAuthorized, false);
assert.equal(evidence.decision.l13RescoreAuthorized, false);
assert.equal(
  evidence.decision.nextRequiredStage,
  'F2.7_EXACT_BUILD_ACTIVE_BOUNDARY_CONDITIONS_AND_STATE_HISTORY',
);

console.log(JSON.stringify({
  check: 'm047-bm4l-f26-restraint-semantic-reconciliation',
  status: 'PASS',
  accdbTypeMapping: Object.fromEntries(
    evidence.classMapping.mappings.map((row) => [row.accdbResTypeId, row.correctedInputXmlClass]),
  ),
  rowCount: evidence.extraction.rowCount,
  frictionRows: evidence.frictionReconciliation.positiveFrictionRowCount,
  positiveGapDirectionsMatched: evidence.directionReconciliation.positiveGapRows.length,
  accdbPositiveGapMagnitudes: evidence.gapCustody.accdbPositiveGapMagnitudeCount,
  nextRequiredStage: evidence.decision.nextRequiredStage,
  productionMechanicsAuthorized: evidence.decision.productionNonlinearMechanicsAuthorized,
  l13RescoreAuthorized: evidence.decision.l13RescoreAuthorized,
}, null, 2));
