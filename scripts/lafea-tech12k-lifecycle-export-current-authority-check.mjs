#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  projectLafeaWorkbenchLifecycleExportAuthority,
  validateLafeaWorkbenchLifecycleExportAuthority,
} from '../src/workspace/lafea-workbench-lifecycle-export-authority.js';
import {
  LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_RECORD,
} from '../src/workspace/lafea4-parent-normal-production-activation.js';
import {
  LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_BLOCK_CODE,
} from '../src/workspace/lafea4-parent-normal-production-gate.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
assert.equal(LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_RECORD, null);

const executionHash = `sha256:${'3'.repeat(64)}`;
const current = stage({ executionHash, resultReady: true });
const stale = stage({ executionHash, resultReady: false });

const currentAuthority = projectLafeaWorkbenchLifecycleExportAuthority(current);
validateLafeaWorkbenchLifecycleExportAuthority(currentAuthority);
assert.equal(currentAuthority.governedRoute, true);
assert.equal(currentAuthority.retainedEvidence.executionStatus, 'QUALIFIED');
assert.equal(currentAuthority.retainedEvidence.lifecycleExecutionArtifactStatus, 'CURRENT');
assert.equal(currentAuthority.retainedEvidence.lifecycleExecutionArtifactQualification, 'PASS');
assert.equal(currentAuthority.currentAuthority.currentResultAccepted, true);
assert.equal(currentAuthority.currentAuthority.resultReady, true);

const staleAuthority = projectLafeaWorkbenchLifecycleExportAuthority(stale);
validateLafeaWorkbenchLifecycleExportAuthority(staleAuthority);
assert.equal(staleAuthority.retainedEvidence.executionStatus, 'QUALIFIED');
assert.equal(staleAuthority.retainedEvidence.executionIdentity, executionHash);
assert.equal(staleAuthority.retainedEvidence.lifecycleExecutionArtifactStatus, 'CURRENT');
assert.equal(staleAuthority.retainedEvidence.lifecycleExecutionArtifactQualification, 'PASS');
assert.equal(staleAuthority.retainedEvidence.lifecycleExecutionArtifactHash, executionHash);
assert.equal(staleAuthority.currentAuthority.currentResultAccepted, false);
assert.equal(staleAuthority.currentAuthority.resultReady, false);
assert.deepEqual(staleAuthority.currentAuthority.blockingReasons, [
  LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_BLOCK_CODE,
]);
assert.equal(
  staleAuthority.interpretation.lifecycleArtifactStatusIsRetainedEvidenceOnly,
  true,
);
assert.equal(
  staleAuthority.interpretation.retainedExecutionQualificationGrantsCurrentAuthority,
  false,
);
assert.equal(staleAuthority.interpretation.exportGrantsCurrentResultAuthority, false);
assert.equal(staleAuthority.interpretation.exportGrantsCurrentReleaseAuthority, false);

const invalid = structuredClone(staleAuthority);
invalid.currentAuthority.currentResultAccepted = true;
assert.throws(
  () => validateLafeaWorkbenchLifecycleExportAuthority(invalid),
  /LAFEA_LIFECYCLE_EXPORT_RESULT_AUTHORITY_INCONSISTENT/u,
);

const evidenceActions = fs.readFileSync(
  path.join(repoRoot, 'src/workspace/lafea-workbench-evidence-actions.js'),
  'utf8',
);
assert.ok(evidenceActions.includes(
  "currentAuthority: projectLafeaWorkbenchLifecycleExportAuthority(stage)",
));
assert.ok(evidenceActions.includes("schema: 'lafea-workbench-lifecycle-export/v2'"));

const definition = JSON.parse(fs.readFileSync(
  path.join(
    repoRoot,
    'validation/lafea4-refinement/parent-normal-lifecycle-export-current-authority-v1.json',
  ),
  'utf8',
));
assert.equal(definition.currentTrustRoot, 'NULL');
assert.equal(definition.retainedLifecycleLedgerMutationAllowed, false);
assert.equal(definition.exportGrantsEngineeringAuthority, false);

console.log(JSON.stringify({
  check: 'lafea-tech12k-lifecycle-export-current-authority',
  status: 'PASS',
  currentTrustRoot: 'NULL',
  retainedExecutionStatus: staleAuthority.retainedEvidence.executionStatus,
  retainedLifecycleExecutionStatus:
    staleAuthority.retainedEvidence.lifecycleExecutionArtifactStatus,
  retainedLifecycleExecutionQualification:
    staleAuthority.retainedEvidence.lifecycleExecutionArtifactQualification,
  staleCurrentResultAccepted: staleAuthority.currentAuthority.currentResultAccepted,
  staleBlockingReasons: staleAuthority.currentAuthority.blockingReasons,
  retainedLedgerMutated: false,
  exportGrantsCurrentResultAuthority: false,
  exportGrantsCurrentReleaseAuthority: false,
}, null, 2));

function stage({ executionHash: hash, resultReady }) {
  return {
    stageId: 'LAFEA.4',
    shellMidsurfaceProfileActive: true,
    domainFirstProfileActive: false,
    execution: {
      status: 'QUALIFIED',
      route: 'SHELL_RETAINED_MESH_COMPILED_SOLVER_MODEL',
      compiledExecutionHash: hash,
      result: { loadCaseResults: [] },
    },
    lifecycle: {
      artifacts: {
        EXECUTION: {
          status: 'CURRENT',
          qualification: 'PASS',
          artifactHash: hash,
        },
      },
    },
    retainedTemplateReleaseRecord: {
      semanticHash: `sha256:${'4'.repeat(64)}`,
      authorityState: 'HISTORIC_TEST_RECORD',
    },
    lifecycleReadiness: {
      calculationState: resultReady
        ? 'CALCULATION_ACCEPTED_BY_STAGE_CONTRACT'
        : 'CALCULATION_NOT_ACCEPTED_BY_STAGE_CONTRACT',
      resultReady,
      releaseState: 'RELEASE_NOT_QUALIFIED',
      releaseBinding: {
        bindingStatus: resultReady ? 'CURRENT' : 'STALE',
        releaseQualified: false,
      },
      blockingReasons: resultReady
        ? []
        : [LAFEA4_PARENT_NORMAL_PRODUCTION_GATE_BLOCK_CODE],
      releaseBlockingReasons: resultReady
        ? []
        : ['RELEASE_GOVERNED_RESULT_NOT_CURRENT'],
    },
  };
}
