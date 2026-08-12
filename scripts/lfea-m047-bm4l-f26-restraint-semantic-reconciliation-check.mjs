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

assert.equal(evidence.schema, 'm047-bm4l-f26-restraint-semantic-reconciliation/v2');
assert.equal(evidence.status, 'PASS_DIRECT_ACCDB_LOOKUP_WITH_SOURCE_DOMAIN_CROSSWALK');
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
assert.equal(evidence.directAccdbLookupAuthority.bm4lAndBm4NlLookupIdenticalForActiveIds, true);

for (const [code, accdbType, inputXmlClass, count] of [
  [1, 'ANC', 'ANC', 1],
  [3, 'Y', '+Y', 29],
  [8, 'GUI', 'LIM', 6],
  [9, 'LIM', 'GUI', 10],
]) {
  const retained = retainAccdbRestraintTypeId(code);
  assert.equal(retained.effectiveTypeId, code);
  assert.equal(retained.mutationApplied, false);
  assert.equal(decodeBm4lAccdbRestraintType(code).abbreviation, accdbType);

  const direct = evidence.directAccdbLookupAuthority.activeMappings
    .find((row) => row.accdbResTypeId === code);
  assert.ok(direct);
  assert.equal(direct.accdbType, accdbType);
  assert.equal(direct.rowCount, count);

  const crosswalk = evidence.rowSetCrosswalk.mappings
    .find((row) => row.accdbResTypeId === code);
  assert.ok(crosswalk);
  assert.equal(crosswalk.accdbType, accdbType);
  assert.equal(crosswalk.correctedInputXmlClass, inputXmlClass);
  assert.equal(crosswalk.rowCount, count);
  assert.equal(crosswalk.exactNodeSetMatch, true);
}
assert.equal(evidence.rowSetCrosswalk.allNodeSetsExact, true);
assert.equal(evidence.rowSetCrosswalk.allLabelsEquivalent, false);
assert.equal(decodeBm4lAccdbRestraintType(17).family, 'UNSUPPORTED_BM4L_ACCDB_RESTRAINT_TYPE');

assert.equal(evidence.frictionReconciliation.accdbResTypeId, 3);
assert.equal(evidence.frictionReconciliation.accdbType, 'Y');
assert.equal(evidence.frictionReconciliation.correctedInputXmlClass, '+Y');
assert.equal(evidence.frictionReconciliation.positiveFrictionRowCount, 26);
assert.equal(evidence.frictionReconciliation.exactNodeSetMatch, true);
assert.deepEqual(evidence.frictionReconciliation.nonFrictionNodeIds, ['20300', '20640', '21640']);

assert.equal(evidence.directionAndGapCrosswalk.accdbType3AllGlobalY, true);
assert.equal(evidence.directionAndGapCrosswalk.positiveGapRows.length, 6);
assert.equal(evidence.directionAndGapCrosswalk.allPositiveGapDirectionsMatch, true);
assert.equal(
  evidence.directionAndGapCrosswalk.positiveGapRows.filter((row) => row.frictionNode).length,
  5,
);
assert.equal(
  new Set(evidence.directionAndGapCrosswalk.positiveGapRows
    .filter((row) => row.frictionNode)
    .map((row) => row.nodeId)).size,
  4,
);

assert.equal(evidence.gapCustody.accdbAllGapFieldsUnsetSentinel, true);
assert.equal(evidence.gapCustody.accdbPositiveGapMagnitudeCount, 0);
assert.equal(evidence.gapCustody.correctedInputXmlPositiveGapMagnitudeCount, 6);
assert.equal(
  evidence.gapCustody.conclusion,
  'ACCDB_PUBLISHES_TYPE_DIRECTION_FRICTION_BUT_NOT_POSITIVE_GAP_MAGNITUDES',
);
assert.equal(evidence.fileLevelAuthority.restraintDirectionalBehavior, 'BIDIRECTIONAL');
assert.equal(evidence.withdrawnInference.status, 'WITHDRAWN');
assert.equal(evidence.decision.directAccdbTypeLookupClosed, true);
assert.equal(evidence.decision.crossDomainRowSetsReconciled, true);
assert.equal(evidence.decision.crossDomainClassLabelsMustRemainSeparate, true);
assert.equal(evidence.decision.productionNonlinearMechanicsAuthorized, false);
assert.equal(evidence.decision.l13RescoreAuthorized, false);
assert.equal(
  evidence.decision.nextRequiredStage,
  'F2.7_EXACT_BUILD_ACTIVE_BOUNDARY_CONDITIONS_AND_STATE_HISTORY',
);

console.log(JSON.stringify({
  check: 'm047-bm4l-f26-restraint-semantic-reconciliation',
  status: 'PASS',
  directAccdbTypes: Object.fromEntries(
    evidence.directAccdbLookupAuthority.activeMappings
      .map((row) => [row.accdbResTypeId, row.accdbType]),
  ),
  correctedInputXmlCrosswalk: Object.fromEntries(
    evidence.rowSetCrosswalk.mappings
      .map((row) => [row.accdbResTypeId, row.correctedInputXmlClass]),
  ),
  rowCount: evidence.extraction.rowCount,
  frictionRows: evidence.frictionReconciliation.positiveFrictionRowCount,
  positiveGapDirectionsMatched: evidence.directionAndGapCrosswalk.positiveGapRows.length,
  accdbPositiveGapMagnitudes: evidence.gapCustody.accdbPositiveGapMagnitudeCount,
  withdrawnInference: evidence.withdrawnInference.claim,
  nextRequiredStage: evidence.decision.nextRequiredStage,
  productionMechanicsAuthorized: evidence.decision.productionNonlinearMechanicsAuthorized,
  l13RescoreAuthorized: evidence.decision.l13RescoreAuthorized,
}, null, 2));
