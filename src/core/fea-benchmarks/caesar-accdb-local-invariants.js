const DOFS = Object.freeze(['UX', 'UY', 'UZ', 'RX', 'RY', 'RZ']);
const DEFAULT_OPTIONS = Object.freeze({
  closureRelativeLimit: 1e-10,
  conditioningWarning: 20,
  physicalFloor: 1e-12,
});

/**
 * Build diagnostic-only source/element recovery invariants from an ACCDB linear-solve actual package.
 * These diagnostics never replace or alter governed benchmark comparison status.
 */
export function buildCaesarAccdbLocalInvariantDiagnostics(actual, options = {}) {
  requireActual(actual);
  const resolved = resolveOptions(options);
  const rows = [];
  const cases = {};
  for (const caseId of Object.keys(actual.mechanics.cases).sort(compareText)) {
    const evidence = actual.mechanics.cases[caseId];
    if (!Array.isArray(evidence.recoveryLedger)) {
      throw new TypeError(`ACCDB local invariants require mechanics.cases.${caseId}.recoveryLedger.`);
    }
    const caseRows = evidence.recoveryLedger
      .slice()
      .sort(compareRecoveryEntries)
      .flatMap((entry) => recoveryRows(caseId, entry, resolved));
    rows.push(...caseRows);
    cases[caseId] = summarizeRows(caseRows);
  }
  return Object.freeze({
    schema: 'lfea-accdb-local-invariants/v1',
    sourceAccdbSha256: actual.sourceAccdbSha256,
    diagnosticOnly: true,
    governedComparatorStatusUnaffected: true,
    primaryClosureRule: 'Q_GLOBAL_EQUALS_GLOBAL_ELASTIC_MINUS_EQUIVALENT_MINUS_INITIAL_V1',
    alternateLocalRecoveryRule: 'TRANSFORMED_LOCAL_Q_IS_DIAGNOSTIC_ONLY_V1',
    options: resolved,
    summary: summarizeRows(rows),
    cases: Object.freeze(cases),
    sourceSummaries: Object.freeze(summarizeSources(rows)),
    rows: Object.freeze(rows),
  });
}

function recoveryRows(caseId, entry, options) {
  const elementId = requireText(entry.elementId, 'recoveryLedger.elementId');
  const sourceElementId = requireText(entry.sourceElementId, `${elementId}.sourceElementId`);
  const displacement = requireVector(entry.jointDisplacement12, 12, `${elementId}.jointDisplacement12`);
  const recordedElastic = requireVector(entry.globalElasticAction, 12, `${elementId}.globalElasticAction`);
  const equivalent = requireVector(entry.equivalentLoadGlobal, 12, `${elementId}.equivalentLoadGlobal`);
  const initial = requireVector(entry.initialStrainLoadGlobal, 12, `${elementId}.initialStrainLoadGlobal`);
  const recovered = requireVector(entry.qGlobal, 12, `${elementId}.qGlobal`);
  const transformedLocal = requireVector(
    entry.transformedLocalQGlobal,
    12,
    `${elementId}.transformedLocalQGlobal`,
  );
  return Array.from({ length: 12 }, (_unused, index) => {
    const endIndex = index < 6 ? index : index - 6;
    const end = index < 6 ? 'I' : 'J';
    const dof = DOFS[endIndex];
    const quantity = dof.startsWith('U') ? 'FORCE' : 'MOMENT';
    const component = `${quantity === 'FORCE' ? 'F' : 'M'}${dof.at(-1)}`;
    const unit = quantity === 'FORCE' ? 'N' : 'N*m';
    const predictedRecovered = recordedElastic[index] - equivalent[index] - initial[index];
    const qIdentityResidual = recovered[index] - predictedRecovered;
    const qIdentityScale = Math.max(
      Math.abs(recordedElastic[index])
        + Math.abs(equivalent[index])
        + Math.abs(initial[index])
        + Math.abs(recovered[index]),
      options.physicalFloor,
    );
    const qIdentityRelativeResidual = Math.abs(qIdentityResidual) / qIdentityScale;
    const localToGlobalResidual = recovered[index] - transformedLocal[index];
    const localToGlobalScale = Math.max(
      Math.abs(recovered[index]) + Math.abs(transformedLocal[index]),
      options.physicalFloor,
    );
    const localToGlobalRelativeResidual = Math.abs(localToGlobalResidual) / localToGlobalScale;
    const conditioningNumerator = Math.abs(recordedElastic[index])
      + Math.abs(equivalent[index])
      + Math.abs(initial[index]);
    const conditioning = conditioningNumerator
      / Math.max(Math.abs(recovered[index]), options.physicalFloor);
    return Object.freeze({
      caseId,
      sourceElementId,
      elementId,
      end,
      dof,
      quantity,
      component,
      unit,
      displacement: displacement[index],
      recordedElasticAction: recordedElastic[index],
      equivalentLoad: equivalent[index],
      initialStrainLoad: initial[index],
      recoveredAction: recovered[index],
      qIdentityResidual,
      qIdentityRelativeResidual,
      closureStatus: qIdentityRelativeResidual <= options.closureRelativeLimit ? 'PASS' : 'FAIL',
      transformedLocalRecoveredAction: transformedLocal[index],
      localToGlobalResidual,
      localToGlobalRelativeResidual,
      conditioning,
      conditioningClass: conditioning >= options.conditioningWarning
        ? 'CANCELLATION_SENSITIVE'
        : 'STABLE',
    });
  });
}

function summarizeRows(rows) {
  const failures = rows.filter((row) => row.closureStatus === 'FAIL');
  const cancellationSensitive = rows.filter((row) => row.conditioningClass === 'CANCELLATION_SENSITIVE');
  const forces = rows.filter((row) => row.quantity === 'FORCE');
  const moments = rows.filter((row) => row.quantity === 'MOMENT');
  return Object.freeze({
    rowCount: rows.length,
    closureStatus: failures.length === 0 ? 'PASS' : 'FAIL',
    closureFailureCount: failures.length,
    cancellationSensitiveCount: cancellationSensitive.length,
    maximumQIdentityRelativeResidual: maximum(rows.map((row) => row.qIdentityRelativeResidual)),
    maximumAbsoluteQIdentityResidualForceN: maximum(forces.map((row) => Math.abs(row.qIdentityResidual))),
    maximumAbsoluteQIdentityResidualMomentNm: maximum(moments.map((row) => Math.abs(row.qIdentityResidual))),
    maximumAbsoluteLocalToGlobalResidualForceN: maximum(forces.map((row) => Math.abs(row.localToGlobalResidual))),
    maximumAbsoluteLocalToGlobalResidualMomentNm: maximum(moments.map((row) => Math.abs(row.localToGlobalResidual))),
    maximumConditioning: maximum(rows.map((row) => row.conditioning)),
  });
}

function summarizeSources(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const key = `${row.caseId}:${row.sourceElementId}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }
  return [...grouped]
    .sort(([left], [right]) => compareText(left, right))
    .map(([_key, sourceRows]) => Object.freeze({
      caseId: sourceRows[0].caseId,
      sourceElementId: sourceRows[0].sourceElementId,
      analysisElementIds: Object.freeze([...new Set(sourceRows.map((row) => row.elementId))].sort(compareText)),
      ...summarizeRows(sourceRows),
    }));
}

function resolveOptions(options) {
  const value = {
    closureRelativeLimit: options.closureRelativeLimit ?? DEFAULT_OPTIONS.closureRelativeLimit,
    conditioningWarning: options.conditioningWarning ?? DEFAULT_OPTIONS.conditioningWarning,
    physicalFloor: options.physicalFloor ?? DEFAULT_OPTIONS.physicalFloor,
  };
  for (const [key, entry] of Object.entries(value)) {
    if (!Number.isFinite(entry) || !(entry > 0)) {
      throw new TypeError(`ACCDB local invariant option ${key} must be finite and > 0.`);
    }
  }
  return Object.freeze(value);
}

function requireActual(actual) {
  if (!actual || actual.schema !== 'lfea-accdb-benchmark-actual/v1') {
    throw new TypeError('ACCDB local invariants require lfea-accdb-benchmark-actual/v1.');
  }
  if (!actual.mechanics || actual.mechanics.schema !== 'lfea-accdb-linear-solve-evidence/v1') {
    throw new TypeError('ACCDB local invariants require lfea-accdb-linear-solve-evidence/v1 mechanics.');
  }
  if (!actual.mechanics.cases || typeof actual.mechanics.cases !== 'object') {
    throw new TypeError('ACCDB local invariants require mechanics.cases.');
  }
}

function requireText(value, label) {
  const text = String(value ?? '');
  if (text.length === 0) throw new TypeError(`${label} is required.`);
  return text;
}

function requireVector(value, length, label) {
  if (!Array.isArray(value) || value.length !== length || value.some((entry) => !Number.isFinite(entry))) {
    throw new TypeError(`${label} must contain ${length} finite values.`);
  }
  return value;
}

function compareRecoveryEntries(left, right) {
  return compareText(left.sourceElementId, right.sourceElementId)
    || compareText(left.elementId, right.elementId);
}

function compareText(left, right) {
  return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0;
}

function maximum(values) {
  return values.length === 0 ? 0 : Math.max(...values);
}
