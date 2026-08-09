import { semanticHash } from '../shared-piping-model/canonical-json.js';
import { deepFreeze } from '../shared-piping-model/immutable.js';

export const CAESAR_ACCDB_ITERATION_EVIDENCE_SCHEMA =
  'lfea-caesar-accdb-iteration-evidence/v1';

const VERDICTS = Object.freeze([
  'BASELINE',
  'INSTRUMENTATION',
  'ACCEPT',
  'REJECT',
  'INCONCLUSIVE',
]);

const METRIC_FAMILIES = Object.freeze({
  restraints: (row) => row.entityKind === 'NODE' && ['FORCE', 'MOMENT'].includes(row.quantity),
  displacement: (row) => row.entityKind === 'NODE' && ['DISPLACEMENT', 'ROTATION'].includes(row.quantity),
  sourceEndActions: (row) => row.entityKind === 'ELEMENT' && row.quantity.startsWith('GLOBAL_END_'),
});

/**
 * Build one immutable, deterministic engineering-iteration record from an
 * ACCDB benchmark report. This function is deliberately downstream of solve
 * and recovery: it must never participate in stiffness, load, solve or result
 * generation.
 */
export function buildCaesarAccdbIterationEvidence(input) {
  const report = requireReport(input?.report);
  const issueId = nonempty(input?.issueId, 'issueId');
  const iterationId = iterationIdentifier(input?.iterationId, issueId);
  const verdict = enumValue(input?.verdict, VERDICTS, 'verdict');
  const expectedSourceAccdbSha256 = sha256(
    input?.expectedSourceAccdbSha256,
    'expectedSourceAccdbSha256',
  );
  const baseCommitSha = gitSha(input?.baseCommitSha, 'baseCommitSha');
  const candidateCommitSha = nullableGitSha(input?.candidateCommitSha, 'candidateCommitSha');
  const hypothesis = nonempty(input?.hypothesis, 'hypothesis');
  const predictedSignature = stringArray(input?.predictedSignature, 'predictedSignature');
  const changedPaths = stringArray(input?.changedPaths ?? [], 'changedPaths');
  const mechanicsDelta = nonempty(input?.mechanicsDelta, 'mechanicsDelta');
  const decisionReason = nonempty(input?.decisionReason, 'decisionReason');
  const expectedBendPointerCount = positiveInteger(
    input?.expectedBendPointerCount ?? report.model?.inventory?.bendPointerCount,
    'expectedBendPointerCount',
  );

  if (report.source?.sha256 !== expectedSourceAccdbSha256) {
    throw new TypeError(
      `Iteration ${iterationId} source hash ${String(report.source?.sha256)} does not match locked ACCDB ${expectedSourceAccdbSha256}.`,
    );
  }
  if (!report.qualification || !Array.isArray(report.qualification.cases)) {
    throw new TypeError('Iteration evidence requires a qualified actual-result report.');
  }

  const current = buildMetrics(report, expectedBendPointerCount);
  const parent = normalizeParent(input?.parentEvidence, {
    issueId,
    iterationId,
    expectedSourceAccdbSha256,
  });
  const improvements = parent === null
    ? null
    : compareMetrics(parent.metrics, current.metrics);

  const profileSemanticHash = semanticHash({
    profileId: report.profileId,
    installationTemperatureK: report.model?.installationTemperatureK ?? null,
    tolerances: report.tolerances,
    linearSolve: report.mechanics?.profile ?? null,
  });
  const base = {
    schema: CAESAR_ACCDB_ITERATION_EVIDENCE_SCHEMA,
    issueId,
    iterationId,
    parentIterationId: parent?.iterationId ?? null,
    benchmarkId: report.benchmarkId,
    profileId: report.profileId,
    profileSemanticHash,
    source: {
      accdbSha256: report.source.sha256,
      packageSemanticHash: report.packageSemanticHash,
      modelSemanticHash: report.model?.semanticHash ?? null,
      reportBasisHash: report.qualification.reportBasisHash ?? null,
    },
    git: {
      baseCommitSha,
      candidateCommitSha,
      changedPaths,
    },
    experiment: {
      hypothesis,
      predictedSignature,
      mechanicsDelta,
    },
    metrics: current.metrics,
    failureIdentities: current.failureIdentities,
    invariants: current.invariants,
    improvements,
    decision: {
      verdict,
      reason: decisionReason,
    },
  };
  return deepFreeze({ ...base, semanticHash: semanticHash(base) });
}

/** Compare two previously materialized iteration metric records. */
export function compareCaesarAccdbIterationEvidence(parentEvidence, currentEvidence) {
  const parent = requireIterationEvidence(parentEvidence, 'parentEvidence');
  const current = requireIterationEvidence(currentEvidence, 'currentEvidence');
  if (parent.issueId !== current.issueId) throw new TypeError('Iteration issue identity changed.');
  if (parent.benchmarkId !== current.benchmarkId) throw new TypeError('Iteration benchmark identity changed.');
  if (parent.source.accdbSha256 !== current.source.accdbSha256) {
    throw new TypeError('Iteration ACCDB source hash changed.');
  }
  return deepFreeze(compareMetrics(parent.metrics, current.metrics));
}

function buildMetrics(report, expectedBendPointerCount) {
  const metrics = {};
  const failureIdentities = {};
  const invariants = {
    lockedSourceHash: true,
    qualificationPresent: true,
    executionHashesPresent: true,
    bendCoverage: true,
    nodalEquilibrium: true,
    cases: {},
  };

  for (const qualifiedCase of report.qualification.cases) {
    const caseId = String(qualifiedCase.caseId);
    const rows = qualifiedCase.comparison?.rows ?? [];
    const caseMetrics = {
      qualificationStatus: qualifiedCase.status,
      executionSemanticHash: qualifiedCase.executionSemanticHash ?? null,
      executionEvidenceHash: qualifiedCase.executionEvidenceHash ?? null,
    };
    const caseFailures = {};
    for (const [family, predicate] of Object.entries(METRIC_FAMILIES)) {
      const familyRows = rows.filter((row) => predicate(row) && ['PASS', 'FAIL'].includes(row.status));
      const failures = familyRows.filter((row) => row.status === 'FAIL');
      caseMetrics[family] = metricSummary(familyRows, failures);
      caseFailures[family] = failures.map((row) => row.identity).sort(compareText);
    }

    const equilibrium = actualEquilibrium(rows, referenceEquilibrium(report, caseId));
    caseMetrics.equilibrium = equilibrium.summary;
    caseFailures.equilibrium = equilibrium.failures;

    const mechanics = report.mechanics?.cases?.[caseId] ?? null;
    const bendPointers = [...new Set((mechanics?.bendPointers ?? []).map(Number))].sort((a, b) => a - b);
    const bendCoveragePass = Number(mechanics?.bendPointerCount) === expectedBendPointerCount
      && bendPointers.length === expectedBendPointerCount;
    const executionHashesPresent = nonemptyOrNull(caseMetrics.executionSemanticHash) !== null
      && nonemptyOrNull(caseMetrics.executionEvidenceHash) !== null;

    invariants.cases[caseId] = {
      bendCoverage: {
        status: bendCoveragePass ? 'PASS' : 'FAIL',
        expectedCount: expectedBendPointerCount,
        actualCount: Number(mechanics?.bendPointerCount ?? 0),
        pointers: bendPointers,
      },
      nodalEquilibrium: {
        status: equilibrium.summary.failedComponentCount === 0 ? 'PASS' : 'FAIL',
        maximumAbsoluteForceResidualN: equilibrium.summary.maximumAbsoluteForceResidualN,
        maximumAbsoluteMomentResidualNm: equilibrium.summary.maximumAbsoluteMomentResidualNm,
      },
      executionHashes: {
        status: executionHashesPresent ? 'PASS' : 'FAIL',
      },
    };
    if (!bendCoveragePass) invariants.bendCoverage = false;
    if (!executionHashesPresent) invariants.executionHashesPresent = false;
    if (equilibrium.summary.failedComponentCount !== 0) invariants.nodalEquilibrium = false;

    metrics[caseId] = caseMetrics;
    failureIdentities[caseId] = caseFailures;
  }

  return deepFreeze({ metrics, failureIdentities, invariants });
}

function metricSummary(rows, failures) {
  const entityIds = [...new Set(rows.map((row) => row.entityId))];
  const failedEntityIds = [...new Set(failures.map((row) => row.entityId))];
  const relativeErrors = rows
    .map((row) => Number(row.relativeError))
    .filter(Number.isFinite);
  const acceptanceRatios = rows
    .map((row) => Number(row.acceptanceLimit) > 0
      ? Number(row.absoluteError) / Number(row.acceptanceLimit)
      : null)
    .filter(Number.isFinite);
  return {
    comparedComponentCount: rows.length,
    comparedEntityCount: entityIds.length,
    failingComponentCount: failures.length,
    failingEntityCount: failedEntityIds.length,
    maximumPercentError: relativeErrors.length === 0 ? null : 100 * Math.max(...relativeErrors),
    maximumAcceptanceRatio: acceptanceRatios.length === 0 ? null : Math.max(...acceptanceRatios),
  };
}

/**
 * Reconstruct actual-side source-node equilibrium from comparison rows.
 * BM4_NL L19/L20 contain no applied point-force primitive, so the invariant is
 * incident element action - force-on-support reaction = 0 component-wise.
 */
function actualEquilibrium(rows, reference) {
  const actualByIdentity = new Map(rows.map((row) => [
    [row.entityKind, row.entityId, row.quantity, row.component].join(':'),
    row.actualValue,
  ]));
  const incident = rows.filter((row) => row.entityKind === 'NODE'
    && ['INCIDENT_GLOBAL_FORCE', 'INCIDENT_GLOBAL_MOMENT'].includes(row.quantity)
    && row.actualValue !== null);
  const tolerance = equilibriumTolerance(reference);
  const ledger = incident.map((row) => {
    const reactionQuantity = row.quantity === 'INCIDENT_GLOBAL_FORCE' ? 'FORCE' : 'MOMENT';
    const reactionIdentity = ['NODE', row.entityId, reactionQuantity, row.component].join(':');
    const reaction = Number(actualByIdentity.get(reactionIdentity) ?? 0);
    const residual = Number(row.actualValue) - reaction;
    const limit = row.quantity === 'INCIDENT_GLOBAL_FORCE' ? tolerance.forceN : tolerance.momentNm;
    return {
      nodeId: row.entityId,
      component: row.component,
      incidentAction: Number(row.actualValue),
      supportReaction: reaction,
      externalNodalLoad: 0,
      residual,
      limit,
      status: Math.abs(residual) <= limit ? 'PASS' : 'FAIL',
    };
  }).sort((left, right) => compareText(`${left.nodeId}:${left.component}`, `${right.nodeId}:${right.component}`));
  const forceRows = ledger.filter((row) => row.component.startsWith('U'));
  const momentRows = ledger.filter((row) => row.component.startsWith('R'));
  const failures = ledger.filter((row) => row.status === 'FAIL');
  return {
    summary: {
      comparedComponentCount: ledger.length,
      failingComponentCount: failures.length,
      maximumAbsoluteForceResidualN: maximumAbsolute(forceRows.map((row) => row.residual)),
      maximumAbsoluteMomentResidualNm: maximumAbsolute(momentRows.map((row) => row.residual)),
      forceToleranceN: tolerance.forceN,
      momentToleranceNm: tolerance.momentNm,
    },
    failures: failures.map((row) => `${row.nodeId}:${row.component}`).sort(compareText),
  };
}

function equilibriumTolerance(reference) {
  const rows = reference?.rows ?? [];
  const forceLimits = rows.filter((row) => String(row.component).startsWith('U')).map((row) => Number(row.limit));
  const momentLimits = rows.filter((row) => String(row.component).startsWith('R')).map((row) => Number(row.limit));
  const forceN = maximumFinite(forceLimits);
  const momentNm = maximumFinite(momentLimits);
  if (forceN === null || momentNm === null) {
    throw new TypeError('Reference equilibrium tolerance is unavailable for actual-side closure reconstruction.');
  }
  return { forceN, momentNm };
}

function referenceEquilibrium(report, caseId) {
  return report.cases?.find((row) => String(row.caseId) === caseId)?.equilibrium ?? null;
}

function compareMetrics(parent, current) {
  const caseIds = [...new Set([...Object.keys(parent), ...Object.keys(current)])].sort(compareText);
  const cases = {};
  for (const caseId of caseIds) {
    const before = parent[caseId];
    const after = current[caseId];
    if (!before || !after) throw new TypeError(`Iteration metric case set changed at ${caseId}.`);
    const row = {};
    for (const family of Object.keys(METRIC_FAMILIES)) {
      row[family] = {
        failingComponentDelta: after[family].failingComponentCount - before[family].failingComponentCount,
        failingEntityDelta: after[family].failingEntityCount - before[family].failingEntityCount,
        maximumPercentErrorDelta: nullableDelta(
          before[family].maximumPercentError,
          after[family].maximumPercentError,
        ),
        maximumAcceptanceRatioDelta: nullableDelta(
          before[family].maximumAcceptanceRatio,
          after[family].maximumAcceptanceRatio,
        ),
      };
    }
    row.equilibrium = {
      failingComponentDelta: after.equilibrium.failingComponentCount - before.equilibrium.failingComponentCount,
      maximumAbsoluteForceResidualNDelta:
        after.equilibrium.maximumAbsoluteForceResidualN - before.equilibrium.maximumAbsoluteForceResidualN,
      maximumAbsoluteMomentResidualNmDelta:
        after.equilibrium.maximumAbsoluteMomentResidualNm - before.equilibrium.maximumAbsoluteMomentResidualNm,
    };
    cases[caseId] = row;
  }
  return { cases };
}

function normalizeParent(value, expected) {
  if (value === undefined || value === null) return null;
  const parent = requireIterationEvidence(value, 'parentEvidence');
  if (parent.issueId !== expected.issueId) throw new TypeError('Parent iteration belongs to another issue.');
  if (parent.iterationId === expected.iterationId) throw new TypeError('Iteration cannot be its own parent.');
  if (parent.source.accdbSha256 !== expected.expectedSourceAccdbSha256) {
    throw new TypeError('Parent iteration is bound to another ACCDB source hash.');
  }
  return parent;
}

function requireIterationEvidence(value, field) {
  if (!value || value.schema !== CAESAR_ACCDB_ITERATION_EVIDENCE_SCHEMA) {
    throw new TypeError(`${field} must use ${CAESAR_ACCDB_ITERATION_EVIDENCE_SCHEMA}.`);
  }
  return value;
}

function requireReport(value) {
  if (!value || value.schema !== 'lfea-caesar-accdb-benchmark-report/v1') {
    throw new TypeError('A CAESAR ACCDB benchmark report is required.');
  }
  return value;
}

function iterationIdentifier(value, issueId) {
  const text = nonempty(value, 'iterationId');
  const escaped = issueId.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  if (!new RegExp(`^${escaped}-I\\d{3}$`, 'u').test(text)) {
    throw new TypeError(`iterationId must use ${issueId}-I###.`);
  }
  return text;
}

function nonempty(value, field) {
  const text = String(value ?? '').trim();
  if (text === '') throw new TypeError(`${field} is required.`);
  return text;
}

function nonemptyOrNull(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
}

function stringArray(value, field) {
  if (!Array.isArray(value)) throw new TypeError(`${field} must be an array.`);
  return Object.freeze(value.map((entry, index) => nonempty(entry, `${field}[${index}]`)));
}

function enumValue(value, allowed, field) {
  const text = nonempty(value, field).toUpperCase();
  if (!allowed.includes(text)) throw new TypeError(`${field} must be one of ${allowed.join(', ')}.`);
  return text;
}

function sha256(value, field) {
  const text = nonempty(value, field).toLowerCase();
  if (!/^[a-f0-9]{64}$/u.test(text)) throw new TypeError(`${field} must be a lowercase SHA-256.`);
  return text;
}

function gitSha(value, field) {
  const text = nonempty(value, field).toLowerCase();
  if (!/^[a-f0-9]{40}$/u.test(text)) throw new TypeError(`${field} must be a 40-character Git SHA.`);
  return text;
}

function nullableGitSha(value, field) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  return gitSha(value, field);
}

function positiveInteger(value, field) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new TypeError(`${field} must be a positive integer.`);
  return number;
}

function nullableDelta(before, after) {
  if (!Number.isFinite(before) || !Number.isFinite(after)) return null;
  return after - before;
}

function maximumAbsolute(values) {
  return values.length === 0 ? 0 : Math.max(...values.map((value) => Math.abs(Number(value))));
}

function maximumFinite(values) {
  const finite = values.filter(Number.isFinite);
  return finite.length === 0 ? null : Math.max(...finite);
}

function compareText(left, right) {
  return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0;
}
