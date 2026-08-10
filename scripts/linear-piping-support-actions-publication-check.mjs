#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  compileLinearPipingInterfaceSet,
  recoverLinearPipingInterfaceLoads,
  sealInterfaceProfile,
} from '../src/core/linear-piping-interface/index.js';
import {
  deriveLinearPipingParentSet,
  runLinearPipingAnalysis,
} from '../src/core/linear-piping-analysis-consumer/index.js';
import {
  buildRestraintCapabilityModel,
  buildSupportAttachmentModel,
} from '../src/core/support-restraints/index.js';
import { createLinearPipingSupportActionsPublication } from '../src/workspace/linear-piping-support-actions-publication.js';
import {
  cantileverCompilation,
  frameElements,
  solverProfile,
  tipLoadCase,
} from './lfea-b3.3-solver-fixtures.mjs';
import { recoveryProfile } from './lfea-b3.4-recovery-fixtures.mjs';
import {
  exactTopology,
  pipeComponent,
  point,
  sharedFixture,
  supportEvidence,
  supportRecord,
} from './w10.3-support-restraint-fixtures.mjs';

const SOURCE_HASH = 'fnv1a64:1234567890abcdef';
const MODEL_VERSION = 41;
const TOLERANCE = 1e-10;
const ACTION_TOLERANCE = 1e-9;

function close(actual, expected) {
  assert.ok(
    Math.abs(actual - expected) <= ACTION_TOLERANCE,
    `Expected ${actual} to equal ${expected} within ${ACTION_TOLERANCE}.`,
  );
}

function supportAuthorities() {
  const evidence = supportEvidence({
    componentReferences: 'PIPINGELEMENT-14',
    supportTypes: 'ANCHOR',
    vertical: 'FIXED',
    lateral: 'FIXED',
    longitudinal: 'FIXED',
    rotational: 'FIXED',
  });
  const shared = sharedFixture({
    components: [pipeComponent('PIPINGELEMENT-14', point(0), point(2400))],
    supports: [supportRecord('SUP-ANCHOR-01', point(0), {
      sourceType: 'ANCHOR',
      supportEvidence: evidence,
    })],
  });
  const attachmentModel = buildSupportAttachmentModel(shared, exactTopology(shared));
  return {
    attachmentModel,
    restraintModel: buildRestraintCapabilityModel(attachmentModel),
  };
}

function interfaceProfile() {
  return sealInterfaceProfile({
    schema: 'linear-piping-interface-profile/v1',
    profileId: 'LINEAR-PIPING-SUPPORT-ACTIONS-R1',
    basisTolerance: { value: 1e-12, source: 'SUPPORT-ACTIONS-PUBLICATION-CHECK' },
    positionTolerance: { value: 1e-12, source: 'SUPPORT-ACTIONS-PUBLICATION-CHECK' },
    offsetTolerance: { value: 1e-12, source: 'SUPPORT-ACTIONS-PUBLICATION-CHECK' },
    semanticHash: '',
  });
}

function definition(compilation, authorities, vertical = false) {
  const node = compilation.model.nodes.find((row) => row.nodeId === 'N-000120');
  const attachment = authorities.attachmentModel.attachments[0];
  const restraint = authorities.restraintModel.restraints[0];
  const dofMappings = compilation.model.constraints
    .filter((row) => row.nodeId === node.nodeId)
    .map((row) => ({
      dof: row.dof,
      behavior: row.behavior,
      constraintId: row.constraintId,
      stiffness: row.stiffness ?? null,
    }));
  return {
    interfaceId: 'IF-ANCHOR-01',
    interfaceKind: 'ANCHOR',
    nodeId: node.nodeId,
    sourceEntityId: 'PIPINGELEMENT-14',
    supportBinding: {
      supportKey: attachment.supportKey,
      attachmentId: attachment.attachmentId,
      restraintId: restraint.restraintId,
    },
    basis: vertical ? {
      origin: node.position,
      e1: { x: 0, y: 0, z: 1 },
      e2: { x: 1, y: 0, z: 0 },
      e3: { x: 0, y: 1, z: 0 },
    } : {
      origin: node.position,
      e1: { x: 0, y: 1, z: 0 },
      e2: { x: -1, y: 0, z: 0 },
      e3: { x: 0, y: 0, z: 1 },
    },
    referencePointGlobal: vertical ? { x: 0, y: 0, z: 0.2 } : { x: 0, y: 0.2, z: 0 },
    leverReferenceToNodeLocal: { x: -0.2, y: 0, z: 0 },
    dofMappings,
    reportingSignConvention: 'FORCE_ON_INTERFACE_FROM_PIPE',
    sourceEvidence: {
      sourceId: 'SUPPORT-ACTIONS-PUBLICATION-CHECK',
      sourceRevision: '01',
      sourceSemanticHash: 'fnv1a64:abababababababab',
    },
    allowableProfileHash: null,
  };
}

function interfaceSet(compilation, authorities, vertical = false) {
  return compileLinearPipingInterfaceSet({
    compilation,
    supportAttachmentModel: authorities.attachmentModel,
    restraintCapabilityModel: authorities.restraintModel,
    definitions: [definition(compilation, authorities, vertical)],
    profile: interfaceProfile(),
  });
}

function runAnalysis(compilation, loadCase) {
  const parentInput = {
    compilation,
    loadCase,
    frameElements: frameElements(),
    pipingComponents: [],
    solverProfile: solverProfile(),
    recoveryProfile: recoveryProfile(),
  };
  return runLinearPipingAnalysis({
    schema: 'linear-piping-analysis-request/v1',
    analysisIdentity: 'PIPE-SUPPORT-ACTIONS-PUBLICATION-CHECK',
    analysisRevision: 1,
    ...parentInput,
    expectedParents: deriveLinearPipingParentSet(parentInput),
  }, { factorizationCache: null });
}

function recover(set, analysisResult, loadCase) {
  return recoverLinearPipingInterfaceLoads({ interfaceSet: set, analysisResult, loadCase });
}

const compilation = cantileverCompilation();
const authorities = supportAuthorities();
const loadCase = tipLoadCase(compilation);
const analysisResult = runAnalysis(compilation, loadCase);
const horizontalSet = interfaceSet(compilation, authorities, false);
const horizontalRecovery = recover(horizontalSet, analysisResult, loadCase);
const horizontal = createLinearPipingSupportActionsPublication({
  sourceSemanticHash: SOURCE_HASH,
  modelVersion: MODEL_VERSION,
  interfaceSet: horizontalSet,
  interfaceRecovery: horizontalRecovery,
  upGlobal: { x: 0, y: 0, z: 1 },
  parallelTolerance: TOLERANCE,
});

assert.equal(horizontal.schema, 'lfea-support-actions-published/v1');
assert.equal(horizontal.sourceSemanticHash, SOURCE_HASH);
assert.equal(horizontal.modelVersion, MODEL_VERSION);
assert.equal(horizontal.analysisResultSemanticHash, horizontalRecovery.analysisResultSemanticHash);
assert.equal(horizontal.executionHash, horizontalRecovery.executionHash);
assert.equal(horizontal.loadCaseId, horizontalRecovery.loadCaseId);
assert.equal(horizontal.physicalLoadCaseHash, horizontalRecovery.physicalLoadCaseHash);
assert.deepEqual(horizontal.units, { force: 'N' });
assert.equal(horizontal.actions.length, 1);
assert.equal(horizontal.actions[0].entityId, 'SUP-ANCHOR-01');
assert.equal(horizontal.actions[0].interfaceId, 'IF-ANCHOR-01');
assert.equal(horizontal.actions[0].triadStatus, 'RESOLVED');
close(horizontal.actions[0].fAxial, 1500);
close(horizontal.actions[0].fLateral, 0);
close(horizontal.actions[0].fVertical, -900);
assert.ok(Object.isFrozen(horizontal));
assert.ok(Object.isFrozen(horizontal.actions[0]));

const verticalSet = interfaceSet(compilation, authorities, true);
const verticalRecovery = recover(verticalSet, analysisResult, loadCase);
const vertical = createLinearPipingSupportActionsPublication({
  sourceSemanticHash: SOURCE_HASH,
  modelVersion: MODEL_VERSION,
  interfaceSet: verticalSet,
  interfaceRecovery: verticalRecovery,
  upGlobal: { x: 0, y: 0, z: 1 },
  parallelTolerance: TOLERANCE,
});
assert.equal(vertical.actions[0].entityId, 'SUP-ANCHOR-01');
assert.equal(vertical.actions[0].triadStatus, 'BLOCKED_AXIS_DEGENERATE');
assert.equal(vertical.actions[0].triadReason, 'AXIAL_PARALLEL_TO_VERTICAL');
close(vertical.actions[0].fAxial, -900);
assert.equal(vertical.actions[0].fLateral, null);
assert.equal(vertical.actions[0].fVertical, null);

assert.throws(
  () => createLinearPipingSupportActionsPublication({
    sourceSemanticHash: SOURCE_HASH,
    modelVersion: MODEL_VERSION,
    interfaceSet: verticalSet,
    interfaceRecovery: horizontalRecovery,
    upGlobal: { x: 0, y: 0, z: 1 },
    parallelTolerance: TOLERANCE,
  }),
  (error) => error?.code === 'LFEA_SUPPORT_ACTIONS_INTERFACE_SET_STALE',
);
assert.throws(
  () => createLinearPipingSupportActionsPublication({
    sourceSemanticHash: SOURCE_HASH,
    modelVersion: MODEL_VERSION,
    interfaceSet: horizontalSet,
    interfaceRecovery: horizontalRecovery,
    upGlobal: undefined,
    parallelTolerance: TOLERANCE,
  }),
);
assert.throws(
  () => createLinearPipingSupportActionsPublication({
    sourceSemanticHash: SOURCE_HASH,
    modelVersion: -1,
    interfaceSet: horizontalSet,
    interfaceRecovery: horizontalRecovery,
    upGlobal: { x: 0, y: 0, z: 1 },
    parallelTolerance: TOLERANCE,
  }),
  (error) => error?.code === 'LFEA_SUPPORT_ACTIONS_INPUT_INVALID',
);

console.log('linear-piping-support-actions-publication-check: PASS');
