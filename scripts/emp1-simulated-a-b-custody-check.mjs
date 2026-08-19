import assert from 'node:assert/strict';
import { semanticHash } from '../src/core/shared-primitives/canonical-json.js';
import {
  EMP1_B_SOURCE_CUSTODY_STATES,
  classifyEmp1BSourceCustody,
  evaluateEmp1BSourceRefresh,
} from '../src/core/emp1/emp1-a-to-b-refresh.js';
import {
  executeLafeaStage,
  normalizeLafeaStageDocument,
} from '../src/workspace/lafea-workbench-model.js';
import { createLafeaMockDocument } from '../src/workspace/lafea-simulated-source-provider.js';

const rawA = await createLafeaMockDocument('LAFEA.1');
const rawB = await createLafeaMockDocument('LAFEA.2');
const aDocument = normalizeLafeaStageDocument('LAFEA.1', rawA);
const bDocument = normalizeLafeaStageDocument('LAFEA.2', rawB);
const aExecution = executeLafeaStage('LAFEA.1', aDocument);

assert.equal(aExecution.status, 'QUALIFIED');
assert.ok(aExecution.result);
assert.ok(aExecution.canonicalInput);
assert.equal(typeof aExecution.canonicalInput.semanticHash, 'string');

const custody = classifyEmp1BSourceCustody({ aDocument, aExecution, bDocument });
const refresh = evaluateEmp1BSourceRefresh({ aDocument, aExecution, bDocument });

const audit = {
  schema: 'emp1-simulated-a-b-custody-check/v1',
  aEditableDocumentHash: semanticHash(aDocument),
  aCanonicalModelHash: semanticHash(aExecution.canonicalInput),
  bFoundationModelHash: semanticHash(bDocument.sourceEvidence.foundationModel),
  aResultHash: semanticHash(aExecution.result),
  bFoundationResultHash: semanticHash(bDocument.sourceEvidence.foundationResult),
  sameCanonicalFoundationModel:
    semanticHash(aExecution.canonicalInput) === semanticHash(bDocument.sourceEvidence.foundationModel),
  sameFoundationResult: semanticHash(aExecution.result) === semanticHash(bDocument.sourceEvidence.foundationResult),
  custody,
  refresh: {
    status: refresh.status,
    code: refresh.code,
    message: refresh.message,
  },
};
console.log(JSON.stringify(audit, null, 2));

assert.equal(custody.state, EMP1_B_SOURCE_CUSTODY_STATES.CURRENT,
  `Simulated EMP.1.B evidence must be the same deterministic canonical A evidence. Refresh diagnostic: ${refresh.code ?? 'none'} ${refresh.message ?? ''}`);
assert.equal(custody.canRefresh, false);
assert.equal(audit.sameCanonicalFoundationModel, true);
assert.equal(audit.sameFoundationResult, true);
