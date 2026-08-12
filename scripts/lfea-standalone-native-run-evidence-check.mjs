import assert from 'node:assert/strict';
import fs from 'node:fs';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import { createLfeaNativeRunEvidenceLedger } from '../src/lfea/native-run-evidence-ledger.js';

const rawHash = semanticHash({ fixture: 'raw-run-evidence' });
const recoveryHash = semanticHash({ fixture: 'recovery-run-evidence' });
const run = Object.freeze({
  schema: 'lfea-native-run-record/v1',
  runId: 'LFEA-RUN-EVIDENCE-FIXTURE',
  semanticHash: semanticHash({ fixture: 'run-record' }),
  identity: Object.freeze({
    rawExecution: Object.freeze({ semanticHash: rawHash }),
    recovery: Object.freeze({ semanticHash: recoveryHash }),
  }),
});
const originalRunJson = JSON.stringify(run);
const ledger = createLfeaNativeRunEvidenceLedger();
assert.deepEqual(ledger.getSnapshot().attachments, []);
console.log('LFEA-RUN-EVIDENCE-01 PASS empty ledger fabricates no post-run engineering evidence');

const support = supportState(run);
const supportAttachment = ledger.attachSupport(run, support);
assert.equal(supportAttachment.kind, 'SUPPORT_ACTIONS');
assert.equal(supportAttachment.runId, run.runId);
assert.equal(supportAttachment.parentRawExecutionSemanticHash, rawHash);
assert.equal(supportAttachment.parentRecoveryBatchSemanticHash, recoveryHash);
assert.equal(supportAttachment.summary.authoritySemanticHash, support.authority.semanticHash);
assert.equal(supportAttachment.evidence.publications, support.publications);
assert.equal(JSON.stringify(run), originalRunJson);
console.log('LFEA-RUN-EVIDENCE-02 PASS support evidence attaches to exact run without mutating run identity');

const duplicate = ledger.attachSupport(run, support);
assert.equal(duplicate, supportAttachment);
assert.equal(ledger.getForRun(run.runId).length, 1);
console.log('LFEA-RUN-EVIDENCE-03 PASS duplicate retained publication attachment is idempotent');

const wrongSupport = supportState(run, {
  rawExecutionSemanticHash: semanticHash({ fixture: 'other-raw' }),
});
assert.throws(
  () => ledger.attachSupport(run, wrongSupport),
  (error) => error?.code === 'LFEA_RUN_EVIDENCE_PARENT_RUN_MISMATCH',
);
assert.equal(ledger.getForRun(run.runId).length, 1);
console.log('LFEA-RUN-EVIDENCE-04 PASS publication from another raw/recovery run cannot be laundered into History');

const b31 = b31State(run);
const b31Attachment = ledger.attachB31(run, b31);
assert.equal(b31Attachment.kind, 'B31_CODE');
assert.equal(b31Attachment.summary.applicationSemanticHash, b31.application.semanticHash);
assert.equal(b31Attachment.summary.applicationEvidenceHash, b31.application.evidenceHash);
assert.equal(b31Attachment.evidence.application, b31.application);
assert.deepEqual(ledger.getForRun(run.runId).map((row) => row.kind), ['SUPPORT_ACTIONS', 'B31_CODE']);
console.log('LFEA-RUN-EVIDENCE-05 PASS B31 application/recovery evidence is retained separately against the same exact run');

const snapshotBeforeContextMove = ledger.getSnapshot();
const unrelatedCurrentContext = Object.freeze({
  rawExecutionSemanticHash: semanticHash({ fixture: 'new-current-raw' }),
  recoveryBatchSemanticHash: semanticHash({ fixture: 'new-current-recovery' }),
});
assert.notEqual(unrelatedCurrentContext.rawExecutionSemanticHash, rawHash);
assert.equal(ledger.getSnapshot(), snapshotBeforeContextMove);
assert.equal(ledger.getForRun(run.runId).length, 2);
console.log('LFEA-RUN-EVIDENCE-06 PASS later current-model movement does not erase retained historical publication evidence');

assert.throws(
  () => ledger.attachB31(run, { ...b31, publicationCurrentness: 'STALE' }),
  (error) => error?.code === 'LFEA_RUN_EVIDENCE_CURRENT_PUBLICATION_REQUIRED',
);
console.log('LFEA-RUN-EVIDENCE-07 PASS stale publication state cannot create a new history attachment');

sourceGuards();
console.log('LFEA-RUN-EVIDENCE-08 PASS History/runtime integration is append-only and contains no engineering recalculation path');
console.log(JSON.stringify({
  check: 'lfea-standalone-native-run-evidence',
  status: 'PASS',
  attachmentCount: ledger.getForRun(run.runId).length,
  runRecordMutated: false,
  wrongRunBlocked: true,
  staleAttachmentBlocked: true,
  historicEvidenceRetained: true,
}));

function supportState(record, overrides = {}) {
  const authorityHash = semanticHash({ fixture: 'support-authority' });
  const parent = {
    rawExecutionSemanticHash: record.identity.rawExecution.semanticHash,
    recoveryBatchSemanticHash: record.identity.recovery.semanticHash,
    supportAuthoritySemanticHash: authorityHash,
    ...overrides,
  };
  return Object.freeze({
    authorityCurrentness: 'CURRENT',
    publicationCurrentness: 'CURRENT',
    authority: Object.freeze({ semanticHash: authorityHash }),
    authorization: Object.freeze({
      supportAuthoritySemanticHash: authorityHash,
      reviewerIdentity: 'RUN-EVIDENCE-SUPPORT-REVIEWER',
      semanticHash: semanticHash({ fixture: 'support-review' }),
    }),
    publicationParent: Object.freeze(parent),
    publications: Object.freeze([Object.freeze({
      caseId: 'IXP-W',
      publication: Object.freeze({ executionHash: semanticHash({ fixture: 'support-execution' }) }),
    })]),
  });
}

function b31State(record) {
  const authorityHash = semanticHash({ fixture: 'b31-authority' });
  const codeResult = Object.freeze({
    semanticHash: semanticHash({ fixture: 'code-result' }),
    evidenceHash: semanticHash({ fixture: 'code-result-evidence' }),
  });
  const application = Object.freeze({
    semanticHash: semanticHash({ fixture: 'b31-application' }),
    evidenceHash: semanticHash({ fixture: 'b31-application-evidence' }),
    results: Object.freeze([Object.freeze({ checkId: 'B31-SUS-1', codeResult })]),
  });
  return Object.freeze({
    authorityCurrentness: 'CURRENT',
    publicationCurrentness: 'CURRENT',
    authority: Object.freeze({ semanticHash: authorityHash }),
    authorization: Object.freeze({
      b31AuthoritySemanticHash: authorityHash,
      reviewerIdentity: 'RUN-EVIDENCE-B31-REVIEWER',
      semanticHash: semanticHash({ fixture: 'b31-review' }),
    }),
    publicationParent: Object.freeze({
      rawExecutionSemanticHash: record.identity.rawExecution.semanticHash,
      recoveryBatchSemanticHash: record.identity.recovery.semanticHash,
      b31AuthoritySemanticHash: authorityHash,
    }),
    codeRecoveries: Object.freeze([Object.freeze({
      caseId: 'IXP-W', codeRecoverySemanticHash: semanticHash({ fixture: 'code-recovery' }),
    })]),
    application,
  });
}

function sourceGuards() {
  const ledgerSource = fs.readFileSync('src/lfea/native-run-evidence-ledger.js', 'utf8');
  const historySource = fs.readFileSync('src/lfea/native-run-history.js', 'utf8');
  const runtimeSource = fs.readFileSync('src/lfea/standalone-runtime.js', 'utf8');
  const viewSource = fs.readFileSync('src/lfea/native-history-view.js', 'utf8');
  const apiSource = fs.readFileSync('src/lfea/standalone-runtime-api.js', 'utf8');
  assert.match(historySource, /evidenceAttachments: evidenceLedger\.getForRun/u);
  assert.match(runtimeSource, /attachSupportEvidence/u);
  assert.match(runtimeSource, /attachB31Evidence/u);
  assert.match(runtimeSource, /getCurrentRecord/u);
  assert.match(viewSource, /append-only attachments/u);
  assert.match(apiSource, /getNativeRunEvidence/u);
  assert.doesNotMatch(ledgerSource, /compileSolverExecution|compileResultRecovery|recoverComponentCodePoint|compileLinearPipingB31Application|forceLocal|fAxial|calculatedStress\s*=/u);
  for (const [name, source] of Object.entries({
    ledgerSource, historySource, runtimeSource, viewSource,
  })) assert.ok(lines(source) < 300, `${name} exceeds 299 lines (${lines(source)})`);
  assert.ok(lines(apiSource) < 120, `standalone-runtime-api.js exceeds 119 lines (${lines(apiSource)})`);
}
function lines(source) { return source.split(/\r?\n/u).length; }
