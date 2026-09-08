#!/usr/bin/env node
import assert from 'node:assert/strict';
import { canonicalLafeaSha256 } from '../src/workspace/lafea-canonical-sha256.js';
import {
  LAFEA_CONTINUUM_PHYSICAL_PROBE_EVIDENCE_SCHEMA,
} from '../src/workspace/lafea-continuum-physical-probe.js';
import {
  LAFEA_CONTINUUM_PROBE_CONVERGENCE_OBSERVATIONS_SCHEMA,
  createLafeaContinuumProbeConvergenceObservations,
  evaluateLafeaContinuumProbeConvergence,
} from '../src/workspace/lafea-continuum-probe-convergence.js';
import {
  LAFEA_CONTINUUM_CONVERGENCE_STUDY_REQUEST_SCHEMA,
  LAFEA_CONTINUUM_CONVERGENCE_PUBLICATION_POLICY,
  createLafeaContinuumConvergenceLifecycleRegistration,
  createLafeaContinuumConvergenceStudyDefinition,
  createLafeaContinuumConvergenceStudyEvidence,
  deriveLafeaContinuumConvergenceMeshProfile,
} from '../src/workspace/lafea-continuum-convergence-study.js';
import {
  gateLafea3ResultPublication,
  projectLafeaContinuumConvergence,
} from '../src/workspace/lafea-continuum-convergence-publication.js';
import { createLafeaMockMeshProfile } from '../src/workspace/lafea-simulated-source-provider.js';

const SOURCE = hash('1');
const DOMAIN = hash('2');
const GEOMETRY = hash('3');
const baseProfile = createLafeaMockMeshProfile('LAFEA.3');

assert.deepEqual(
  pickPolicy(LAFEA_CONTINUUM_CONVERGENCE_PUBLICATION_POLICY),
  { refinementRatio: 2, gciSafetyFactor: 1.25, nearZeroAbsolute: 1e-12, orderStabilityRelativeTolerance: 0.2 },
  'ordinary publication policy must reuse the frozen existing G4 convergence contract values',
);

const asymptotic = study('ASYMPTOTIC', [26, 14, 11, 10.25], [4, 2, 1, 0.5]);
assert.equal(asymptotic.convergence.classification, 'ASYMPTOTIC');
assert.equal(asymptotic.study.usableForResultPublication, true);
assert.equal(asymptotic.registration.record.status, 'CURRENT');
assert.equal(asymptotic.registration.record.qualification, 'PASS');
assert.equal(asymptotic.registration.record.parentHashes.recoveryHash, asymptotic.study.finalRecoveryHash);
assert.equal(asymptotic.registration.record.parentHashes.recoverySetHash, asymptotic.study.recoverySetHash);
assert.equal(asymptotic.registration.record.parentHashes.convergenceProfileHash, asymptotic.study.convergenceProfileHash);
assert.equal(asymptotic.canonicalExecutionInputCustodyPreserved, true);

const firstProfile = deriveLafeaContinuumConvergenceMeshProfile(
  baseProfile,
  asymptotic.definition,
  asymptotic.definition.convergenceDefinition.levels[0],
);
assert.equal(firstProfile.fields.globalTargetSize, 4);
assert.equal(firstProfile.fields.continuumElement, baseProfile.fields.continuumElement);
assert.notEqual(firstProfile.semanticHash, baseProfile.semanticHash);

assert.throws(
  () => createLafeaContinuumConvergenceStudyDefinition({
    ...request('CALLER-TOLERANCE-ATTEMPT', [4, 2, 1]),
    gciSafetyFactor: 99,
  }),
  (error) => error?.code === 'LAFEA3_CONVERGENCE_STUDY_REQUEST_KEYS_INVALID',
  'caller/UI must not inject publication/convergence tolerance authority',
);

const currentProjection = projectLafeaContinuumConvergence(
  asymptotic.study,
  currentStage(asymptotic.registration.record),
);
assert.equal(currentProjection.state, 'CURRENT_PASS');
assert.equal(currentProjection.usableForResultPublication, true);
const ready = gateLafea3ResultPublication(oneMeshReadiness(), currentProjection);
assert.equal(ready.resultReady, true);
assert.equal(ready.convergenceReady, true);
assert.equal(ready.releaseBinding.releaseQualified, false);

const absent = gateLafea3ResultPublication(
  oneMeshReadiness(),
  { state: 'ABSENT', usableForResultPublication: false },
);
assert.equal(absent.resultReady, false, 'one qualified mesh may not publish Results without convergence');
assert.equal(absent.resultState, 'RESULT_NOT_READY');
assert.equal(absent.convergenceReady, false);
assert.ok(absent.blockingReasons.includes('LAFEA3_CONVERGENCE_NOT_CURRENT_AND_QUALIFIED'));

const oscillatory = study('OSCILLATORY', [11, 9.5, 10.25], [4, 2, 1]);
assert.equal(oscillatory.convergence.classification, 'OSCILLATORY');
assert.equal(oscillatory.study.usableForResultPublication, false);
assert.equal(oscillatory.registration.record.status, 'BLOCKED');
assert.equal(oscillatory.registration.record.qualification, 'BLOCK');
const blockedProjection = projectLafeaContinuumConvergence(
  oscillatory.study,
  currentStage(oscillatory.registration.record),
);
assert.equal(blockedProjection.state, 'CURRENT_BLOCK');
assert.equal(gateLafea3ResultPublication(oneMeshReadiness(), blockedProjection).resultReady, false);

const divergent = study('DIVERGENT', [10, 10.1, 10.4], [4, 2, 1]);
assert.equal(divergent.convergence.classification, 'DIVERGENT');
assert.equal(divergent.study.usableForResultPublication, false);

const singular = study('SINGULAR', [26, 14, 11], [4, 2, 1], true);
assert.equal(singular.convergence.classification, 'SINGULAR_EXCLUDED');
assert.equal(singular.study.usableForResultPublication, false);

const staleProjection = projectLafeaContinuumConvergence(
  asymptotic.study,
  { ...currentStage(asymptotic.registration.record), sourceAuthority: { sourceHash: hash('9') } },
);
assert.equal(staleProjection.state, 'STALE');
assert.ok(staleProjection.reasons.includes('CONVERGENCE_SOURCE_STALE'));

const shellReadiness = { ...oneMeshReadiness(), domainFirstProfileActive: false };
assert.equal(
  gateLafea3ResultPublication(shellReadiness, { state: 'ABSENT' }),
  shellReadiness,
  'LAFEA.4/.5 or other non-domain-first readiness must not be changed by the LAFEA.3 publication gate',
);

assert.equal(asymptotic.study.releaseQualified, false);
assert.equal(asymptotic.convergence.releaseAuthorityGranted, false);

console.log(JSON.stringify({
  check: 'lafea.3-continuum-convergence-route',
  status: 'PASS',
  policyFrozen: true,
  callerToleranceInjectionRejected: true,
  asymptoticPublicationAccepted: true,
  oneMeshPublicationBlockedWithoutConvergence: true,
  oscillatoryPublicationBlocked: true,
  divergentPublicationBlocked: true,
  singularPointwisePublicationBlocked: true,
  staleParentInvalidationProved: true,
  canonicalExecutionInputCustodyPreserved: true,
  nonLafea3PublicationSemanticsUnchanged: true,
  releaseQualified: false,
}));

function study(label, values, hs, singular = false) {
  const definition = createLafeaContinuumConvergenceStudyDefinition(request(label, hs, singular));
  const evidence = values.map((value, index) => probeEvidence(
    definition,
    value,
    index,
    singular,
  ));
  const observations = createLafeaContinuumProbeConvergenceObservations({
    schema: LAFEA_CONTINUUM_PROBE_CONVERGENCE_OBSERVATIONS_SCHEMA,
    studyId: definition.studyId,
    definitionHash: definition.convergenceDefinitionHash,
    levels: evidence.map((row, index) => ({ levelId: `M${index}`, evidence: row })),
  });
  const convergence = evaluateLafeaContinuumProbeConvergence(
    definition.convergenceDefinition,
    observations,
  );
  const levels = evidence.map((row, index) => ({
    levelId: `M${index}`,
    h: hs[index],
    meshProfileHash: `fnv1a64:${String(index + 1).padStart(16, '0')}`,
    meshHash: row.custody.meshHash,
    solverModelHash: hash((index + 4).toString(16)),
    executionHash: row.custody.executionHash,
    canonicalExecutionInputHash: row.custody.canonicalExecutionInputHash,
    recoveryHash: row.custody.recoveryHash,
    probeEvidenceHash: row.semanticHash,
    probeIdentityHash: row.probeIdentityHash,
    quantityIdentityHash: row.quantityIdentityHash,
    authoritativeValue: row.authoritativeValue,
    authoritativeUnits: row.authoritativeUnits,
  }));
  const studyEvidence = createLafeaContinuumConvergenceStudyEvidence({
    definition,
    convergence,
    levels,
    sourceHash: SOURCE,
    analysisDomainHash: DOMAIN,
    analysisGeometryHash: GEOMETRY,
    baseMeshProfileHash: baseProfile.semanticHash,
  });
  const canonicalExecutionInputCustodyPreserved = studyEvidence.levels.every(
    (row, index) => row.canonicalExecutionInputHash
      === evidence[index].custody.canonicalExecutionInputHash,
  );
  assert.equal(
    canonicalExecutionInputCustodyPreserved,
    true,
    'convergence study must retain each probe canonical execution-input identity',
  );
  return {
    definition,
    convergence,
    study: studyEvidence,
    registration: createLafeaContinuumConvergenceLifecycleRegistration(studyEvidence),
    canonicalExecutionInputCustodyPreserved,
  };
}

function request(label, hs, singular = false) {
  return {
    schema: LAFEA_CONTINUUM_CONVERGENCE_STUDY_REQUEST_SCHEMA,
    studyId: `LAFEA3-${label}`,
    probe: {
      schema: 'lafea-continuum-physical-probe/v1',
      probeId: 'TIP-UX',
      physicalCoordinate: { x: 50, y: 20 },
      coordinateFrame: 'GLOBAL_XY',
      loadCaseId: 'L1',
      quantityId: 'STRESS_SIGMA_X',
      representation: 'PHYSICAL_POINT_DIRECT',
      recoveryMethod: 'ELEMENT_LOCAL_DIRECT_DISPLACEMENT_GRADIENT',
      units: 'MPa',
      singularityClassification: singular
        ? 'SINGULAR_EXCLUDED_FROM_POINTWISE_ACCEPTANCE'
        : 'NON_SINGULAR_CONVERGENCE',
    },
    levels: hs.map((h, index) => ({ levelId: `M${index}`, h })),
  };
}

function probeEvidence(definition, value, index, singular) {
  const base = {
    schema: LAFEA_CONTINUUM_PHYSICAL_PROBE_EVIDENCE_SCHEMA,
    status: 'PASS',
    probeIdentityHash: definition.probeIdentityHash,
    quantityIdentityHash: definition.quantityIdentityHash,
    authoritativeUnits: 'MPa',
    authoritativeValue: value,
    pointwiseAcceptanceEligible: !singular,
    custody: {
      meshHash: hash(((index + 1) % 10).toString(16)),
      executionHash: hash(((index + 5) % 10).toString(16)),
      canonicalExecutionInputHash: hash(((index + 6) % 10).toString(16)),
      recoveryHash: hash(((index + 7) % 10).toString(16)),
    },
  };
  return {
    ...base,
    semanticHash: canonicalLafeaSha256({
      schema: 'lafea3-convergence-route-synthetic-observation/v1',
      index,
      observation: base,
    }),
  };
}

function currentStage(convergenceRecord) {
  return {
    sourceAuthority: { sourceHash: SOURCE },
    analysisDomainProjection: { analysisDomainHash: DOMAIN },
    analysisGeometryProjection: { analysisGeometryHash: GEOMETRY },
    lifecycle: { artifacts: { CONVERGENCE: convergenceRecord } },
  };
}
function oneMeshReadiness() {
  return {
    domainFirstProfileActive: true,
    resultReady: true,
    resultState: 'RESULT_READY',
    convergenceApplicable: true,
    convergenceReady: false,
    blockingReasons: [],
    releaseBinding: {
      schema: 'lafea-workbench-release-binding/v1',
      bindingStatus: 'ABSENT',
      releaseQualified: false,
      reasons: ['RELEASE_RECORD_ABSENT'],
    },
    releaseState: 'RELEASE_NOT_QUALIFIED',
    releaseBlockingReasons: ['RELEASE_RECORD_ABSENT'],
  };
}
function pickPolicy(value) {
  return {
    refinementRatio: value.refinementRatio,
    gciSafetyFactor: value.gciSafetyFactor,
    nearZeroAbsolute: value.nearZeroAbsolute,
    orderStabilityRelativeTolerance: value.orderStabilityRelativeTolerance,
  };
}
function hash(hexDigit) { return `sha256:${hexDigit.repeat(64)}`; }
