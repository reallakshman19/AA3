/**
 * Disposable Error Check scenario probes. No source, preparation, or governed
 * component-basis state is adopted. A success label requires actual comparison.
 */
function stable(value) { return JSON.stringify(value); }

export function captureScenarioBaseline(owner, readBasis) {
  if (!owner || typeof owner.getWorkbenchSnapshot !== 'function') {
    throw new TypeError('A prepared ACCDB controller with workbench snapshots is required.');
  }
  return Object.freeze({
    snapshot: stable(owner.getWorkbenchSnapshot()),
    preFlight: owner.preFlight,
    tables: owner.tables,
    effectiveTables: owner.effectiveTables,
    overrideSet: owner.overrideSet,
    basis: stable(readBasis()),
  });
}

export function checkScenarioRecovery(owner, baseline, readBasis) {
  if (!baseline) return { name: 'Recovery verification', status: 'NOT_RUN',
    recovered: false, blocker: 'No pre-scenario baseline was captured.' };
  try {
    const current = captureScenarioBaseline(owner, readBasis);
    const same = current.snapshot === baseline.snapshot
      && current.preFlight === baseline.preFlight
      && current.tables === baseline.tables
      && current.effectiveTables === baseline.effectiveTables
      && current.overrideSet === baseline.overrideSet
      && current.basis === baseline.basis;
    return { name: 'Recovery verification', status: same ? 'CLEARED' : 'FAILED',
      recovered: same,
      blocker: same
        ? 'Disposable test cleared: checked live snapshot, preparation, source, overrides and shared component basis unchanged.'
        : 'Recovery NOT VERIFIED: live source, preparation, overrides, snapshot or shared basis changed.' };
  } catch (error) {
    return { name: 'Recovery verification', status: 'FAILED', recovered: false,
      blocker: error instanceof Error ? error.message : String(error) };
  }
}

export function staleTokenScenario(owner, readBasis) {
  const name = 'Stale Override Rejection';
  if (!owner?.tables || typeof owner.previewWorkbenchBatch !== 'function'
      || typeof owner.applyWorkbenchBatch !== 'function'
      || typeof owner.cancelWorkbenchBatch !== 'function') {
    return { name, status: 'NOT_RUN', recovered: false,
      blocker: 'Prepared ACCDB transaction owner with Preview, Cancel and Apply is required.' };
  }
  let before;
  let token;
  try {
    before = captureScenarioBaseline(owner, readBasis);
    const row = owner.effectiveTables?.INPUT_BASIC_ELEMENT_DATA?.rows
      ?.find((r) => Number.isFinite(Number(r.DIAMETER)) && Number(r.DIAMETER) > 0);
    if (!row) throw new TypeError('No supported positive DIAMETER row for disposable preview.');
    const proposal = owner.previewWorkbenchBatch({
      ...owner.getWorkbenchSnapshot(),
      propertyPatches: [{ accdbElementId: String(row.ELEMENTID),
        field: 'DIAMETER', rawValue: Number(row.DIAMETER) + 1 }],
      // Test-only metadata is never committed or used for reviewer acceptance.
      approver: 'DISPOSABLE_TEST_ONLY',
      reason: 'Preview then cancel to test rejected token; no Apply authorized',
    });
    token = proposal.token;
    if (!proposal.changed || !token) throw new TypeError('No detached candidate/token was prepared.');
    owner.cancelWorkbenchBatch(token);
    let rejected = false;
    let message = 'Cancelled token was incorrectly accepted.';
    try { owner.applyWorkbenchBatch(token); }
    catch (error) {
      message = error instanceof Error ? error.message : String(error);
      rejected = /stale|used|unknown|invalid/i.test(message);
    }
    const restored = checkScenarioRecovery(owner, before, readBasis).recovered;
    return { name, status: rejected && restored ? 'BLOCK' : 'FAILED',
      recovered: false, verifiedIsolation: restored,
      blocker: rejected && restored ? `Rejected: ${message}`
        : `Stale-token rejection or no-mutation test failed: ${message}` };
  } catch (error) {
    return { name, status: 'FAILED', recovered: false,
      blocker: `Stale-token probe could not verify rejection: ${error instanceof Error ? error.message : String(error)}` };
  } finally {
    if (token) owner.cancelWorkbenchBatch(token);
  }
}
