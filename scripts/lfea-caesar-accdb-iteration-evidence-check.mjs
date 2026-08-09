import assert from 'node:assert/strict';
import {
  buildCaesarAccdbIterationEvidence,
  compareCaesarAccdbIterationEvidence,
} from '../src/core/fea-benchmarks/caesar-accdb-iteration-evidence.js';

const LOCKED_ACCDB = 'a'.repeat(64);
const BASE_SHA = '1'.repeat(40);
const CANDIDATE_SHA = '2'.repeat(40);
const BEND_POINTERS = Object.freeze(Array.from({ length: 12 }, (_unused, index) => index + 1));

const baselineReport = report({
  restraintActual: 120,
  restraintStatus: 'FAIL',
  restraintRelativeError: 0.2,
  endActionActual: 70,
  endActionStatus: 'FAIL',
  endActionRelativeError: 0.4,
});

const baseline = buildCaesarAccdbIterationEvidence({
  report: baselineReport,
  issueId: 'M047',
  iterationId: 'M047-I000',
  expectedSourceAccdbSha256: LOCKED_ACCDB,
  expectedBendPointerCount: 12,
  baseCommitSha: BASE_SHA,
  candidateCommitSha: BASE_SHA,
  hypothesis: 'Freeze the real-data baseline before changing mechanics.',
  predictedSignature: ['No mechanics change.'],
  changedPaths: [],
  mechanicsDelta: 'None; baseline only.',
  verdict: 'BASELINE',
  decisionReason: 'Baseline record.',
});

assert.equal(baseline.metrics.L19.restraints.failingComponentCount, 1);
assert.equal(baseline.metrics.L19.displacement.failingComponentCount, 0);
assert.equal(baseline.metrics.L19.sourceEndActions.failingComponentCount, 1);
assert.equal(baseline.metrics.L19.equilibrium.failingComponentCount, 0);
assert.equal(baseline.metrics.L19.equilibrium.maximumAbsoluteForceResidualN, 0);
assert.equal(baseline.metrics.L19.equilibrium.maximumAbsoluteMomentResidualNm, 0);
assert.equal(baseline.invariants.bendCoverage, true);
assert.equal(baseline.invariants.nodalEquilibrium, true);
assert.equal(baseline.invariants.executionHashesPresent, true);
assert.equal(baseline.improvements, null);

const instrumentation = buildCaesarAccdbIterationEvidence({
  report: baselineReport,
  parentEvidence: baseline,
  issueId: 'M047',
  iterationId: 'M047-I001',
  expectedSourceAccdbSha256: LOCKED_ACCDB,
  expectedBendPointerCount: 12,
  baseCommitSha: BASE_SHA,
  candidateCommitSha: CANDIDATE_SHA,
  hypothesis: 'Evidence-only instrumentation must not change numerical results.',
  predictedSignature: [
    'All benchmark metric deltas are exactly zero.',
    'No failure identity is resolved or introduced.',
  ],
  changedPaths: ['src/core/fea-benchmarks/caesar-accdb-iteration-evidence.js'],
  mechanicsDelta: 'No stiffness, load, solve or recovery behavior changed.',
  verdict: 'INSTRUMENTATION',
  decisionReason: 'Instrumentation is transparent to benchmark results.',
});

for (const family of ['restraints', 'displacement', 'sourceEndActions']) {
  assert.equal(instrumentation.improvements.metrics.cases.L19[family].failingComponentDelta, 0);
  assert.equal(instrumentation.improvements.failures.cases.L19[family].resolvedCount, 0);
  assert.equal(instrumentation.improvements.failures.cases.L19[family].introducedCount, 0);
}
assert.equal(instrumentation.improvements.metrics.cases.L19.equilibrium.failingComponentDelta, 0);
assert.equal(instrumentation.improvements.failures.cases.L19.equilibrium.resolvedCount, 0);
assert.equal(instrumentation.improvements.failures.cases.L19.equilibrium.introducedCount, 0);

const improvedReport = report({
  restraintActual: 108,
  restraintStatus: 'PASS',
  restraintRelativeError: 0.08,
  endActionActual: 52,
  endActionStatus: 'PASS',
  endActionRelativeError: 0.04,
});
const improved = buildCaesarAccdbIterationEvidence({
  report: improvedReport,
  parentEvidence: baseline,
  issueId: 'M047',
  iterationId: 'M047-I002',
  expectedSourceAccdbSha256: LOCKED_ACCDB,
  expectedBendPointerCount: 12,
  baseCommitSha: BASE_SHA,
  candidateCommitSha: CANDIDATE_SHA,
  hypothesis: 'Synthetic mechanics correction resolves the target failures.',
  predictedSignature: ['One restraint and one source end-action failure resolve.'],
  changedPaths: ['synthetic/example.js'],
  mechanicsDelta: 'Synthetic check fixture only.',
  verdict: 'ACCEPT',
  decisionReason: 'Synthetic evidence demonstrates improvement accounting.',
});

assert.equal(improved.improvements.metrics.cases.L19.restraints.failingComponentDelta, -1);
assert.equal(improved.improvements.metrics.cases.L19.sourceEndActions.failingComponentDelta, -1);
assert.equal(improved.improvements.failures.cases.L19.restraints.resolvedCount, 1);
assert.equal(improved.improvements.failures.cases.L19.restraints.introducedCount, 0);
assert.equal(improved.improvements.failures.cases.L19.sourceEndActions.resolvedCount, 1);
assert.equal(improved.invariants.nodalEquilibrium, true);

const compared = compareCaesarAccdbIterationEvidence(baseline, improved);
assert.deepEqual(compared, improved.improvements);

const replay = buildCaesarAccdbIterationEvidence({
  report: baselineReport,
  issueId: 'M047',
  iterationId: 'M047-I000',
  expectedSourceAccdbSha256: LOCKED_ACCDB,
  expectedBendPointerCount: 12,
  baseCommitSha: BASE_SHA,
  candidateCommitSha: BASE_SHA,
  hypothesis: 'Freeze the real-data baseline before changing mechanics.',
  predictedSignature: ['No mechanics change.'],
  changedPaths: [],
  mechanicsDelta: 'None; baseline only.',
  verdict: 'BASELINE',
  decisionReason: 'Baseline record.',
});
assert.equal(replay.semanticHash, baseline.semanticHash);
assert.deepEqual(replay, baseline);

assert.throws(() => buildCaesarAccdbIterationEvidence({
  report: { ...baselineReport, source: { ...baselineReport.source, sha256: 'b'.repeat(64) } },
  issueId: 'M047',
  iterationId: 'M047-I003',
  expectedSourceAccdbSha256: LOCKED_ACCDB,
  expectedBendPointerCount: 12,
  baseCommitSha: BASE_SHA,
  hypothesis: 'Source mismatch must fail closed.',
  predictedSignature: ['The evidence builder rejects the run.'],
  changedPaths: [],
  mechanicsDelta: 'None.',
  verdict: 'REJECT',
  decisionReason: 'Wrong source.',
}), /does not match locked ACCDB/u);

process.stdout.write('lfea-caesar-accdb-iteration-evidence-check: PASS\n');

function report({
  restraintActual,
  restraintStatus,
  restraintRelativeError,
  endActionActual,
  endActionStatus,
  endActionRelativeError,
}) {
  const forceIdentity = 'NODE:20090:FORCE:UY';
  const momentIdentity = 'NODE:20090:MOMENT:RX';
  const incidentForceIdentity = 'NODE:20090:INCIDENT_GLOBAL_FORCE:UY';
  const incidentMomentIdentity = 'NODE:20090:INCIDENT_GLOBAL_MOMENT:RX';
  const displacementIdentity = 'NODE:20090:DISPLACEMENT:UY';
  const endActionIdentity = 'ELEMENT:INPUT_ELEMENT:4:GLOBAL_END_FORCE_TO:FY';
  const rows = [
    comparisonRow({
      identity: forceIdentity,
      entityKind: 'NODE',
      entityId: '20090',
      quantity: 'FORCE',
      component: 'UY',
      referenceValue: 100,
      actualValue: restraintActual,
      absoluteError: Math.abs(restraintActual - 100),
      relativeError: restraintRelativeError,
      acceptanceLimit: 10,
      status: restraintStatus,
    }),
    comparisonRow({
      identity: momentIdentity,
      entityKind: 'NODE',
      entityId: '20090',
      quantity: 'MOMENT',
      component: 'RX',
      referenceValue: 5,
      actualValue: 5,
      absoluteError: 0,
      relativeError: 0,
      acceptanceLimit: 0.5,
      status: 'PASS',
    }),
    comparisonRow({
      identity: incidentForceIdentity,
      entityKind: 'NODE',
      entityId: '20090',
      quantity: 'INCIDENT_GLOBAL_FORCE',
      component: 'UY',
      referenceValue: 100,
      actualValue: restraintActual,
      absoluteError: Math.abs(restraintActual - 100),
      relativeError: restraintRelativeError,
      acceptanceLimit: 10,
      status: restraintStatus,
    }),
    comparisonRow({
      identity: incidentMomentIdentity,
      entityKind: 'NODE',
      entityId: '20090',
      quantity: 'INCIDENT_GLOBAL_MOMENT',
      component: 'RX',
      referenceValue: 5,
      actualValue: 5,
      absoluteError: 0,
      relativeError: 0,
      acceptanceLimit: 0.5,
      status: 'PASS',
    }),
    comparisonRow({
      identity: displacementIdentity,
      entityKind: 'NODE',
      entityId: '20090',
      quantity: 'DISPLACEMENT',
      component: 'UY',
      referenceValue: 0.001,
      actualValue: 0.00105,
      absoluteError: 0.00005,
      relativeError: 0.05,
      acceptanceLimit: 0.0001,
      status: 'PASS',
    }),
    comparisonRow({
      identity: endActionIdentity,
      entityKind: 'ELEMENT',
      entityId: 'INPUT_ELEMENT:4',
      quantity: 'GLOBAL_END_FORCE_TO',
      component: 'FY',
      referenceValue: 50,
      actualValue: endActionActual,
      absoluteError: Math.abs(endActionActual - 50),
      relativeError: endActionRelativeError,
      acceptanceLimit: 5,
      status: endActionStatus,
    }),
  ];
  return {
    schema: 'lfea-caesar-accdb-benchmark-report/v1',
    benchmarkId: 'BM4_NL',
    profileId: 'BM4NL-L19-L20-LINEAR-SOLVE-V2',
    status: 'FAIL',
    source: { sha256: LOCKED_ACCDB },
    packageSemanticHash: 'package-hash',
    model: {
      semanticHash: 'model-hash',
      installationTemperatureK: 294.15,
      inventory: { bendPointerCount: 12 },
    },
    tolerances: {
      FORCE: { absolute: 0, relative: 0.1, scaleFloor: 50 },
      MOMENT: { absolute: 0, relative: 0.1, scaleFloor: 5 },
    },
    cases: [{
      caseId: 'L19',
      equilibrium: {
        status: 'PASS',
        rows: [
          { nodeId: '20090', component: 'UY', limit: 0.1 },
          { nodeId: '20090', component: 'RX', limit: 0.1 },
        ],
      },
    }],
    qualification: {
      reportBasisHash: 'report-basis-hash',
      cases: [{
        caseId: 'L19',
        status: rows.some((row) => row.status === 'FAIL') ? 'FAIL' : 'PASS',
        executionSemanticHash: 'execution-semantic-hash',
        executionEvidenceHash: 'execution-evidence-hash',
        comparison: { rows },
      }],
    },
    mechanics: {
      profile: { bourdonPressureEffects: { mode: 'TRANSLATION_AND_ROTATION', source: 'fixture' } },
      cases: {
        L19: {
          bendPointerCount: 12,
          bendPointers: BEND_POINTERS,
        },
      },
    },
  };
}

function comparisonRow(input) {
  return {
    caseId: 'L19',
    unit: input.quantity.includes('MOMENT') ? 'N*m'
      : input.quantity.includes('DISPLACEMENT') ? 'm' : 'N',
    tolerance: { absolute: 0, relative: 0.1, scaleFloor: 0 },
    note: input.status === 'PASS' ? null : 'fixture failure',
    ...input,
  };
}
