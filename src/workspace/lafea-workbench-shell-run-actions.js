/** Authoritative LAFEA.4/.5 workbench run from the governed retained shell mesh. */
import { calculateLocalShell } from '../core/local-shell/index.js';
import { calculateLocalTrunnionFootprint } from '../core/local-trunnion-footprint/index.js';
import { lafeaAnalysisMeshContentHash } from './lafea-analysis-mesh-contract.js';
import { createLafeaLifecycleProducerBatch } from './lafea-lifecycle-producers.js';
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';
import { compileLafeaShellSolverModel } from './lafea-shell-solver-model.js';
import { LAFEA_SHELL_EXECUTION_STATE_SCHEMA } from './lafea-workbench-shell-execution-state.js';

export const LAFEA_SHELL_COMPILED_EXECUTION_ROUTE =
  'SHELL_RETAINED_MESH_COMPILED_SOLVER_MODEL';

const STAGES = Object.freeze(['LAFEA.4', 'LAFEA.5']);

export function createLafeaWorkbenchShellRunActions(context) {
  const c = requireContext(context);

  function run(stageId) {
    try {
      if (!STAGES.includes(stageId)) throw c.storeError('LAFEA_SHELL_RUN_STAGE_NOT_AUTHORIZED');
      const before = c.readStageState(stageId);
      if (before.shellSolverModelProjection?.state !== 'CURRENT_PASS'
        || before.shellSolverModelProjection?.usableForRun !== true
        || before.analysisMeshCustodyProjection?.usableForRun !== true) {
        throw c.storeError(
          before.shellSolverModelProjection?.reasons?.[0]
            ?? 'SHELL_RETAINED_MESH_NOT_BOUND_TO_SOLVER_MODEL',
        );
      }
      const authority = c.source.ensureRunAuthority(
        stageId,
        'RUN_CALCULATION/SHELL_RETAINED_MESH_SOURCE_AUTHORITY',
      );
      const current = c.readStageState(stageId);
      const compiled = compileLafeaShellSolverModel({
        stageId,
        sourceHash: authority.sourceHash,
        source: current.document,
        midsurfaceEvidence: current.retainedShellMidsurfaceEvidence,
        meshEvidence: current.retainedAnalysisMeshEvidenceV2,
      });
      if (compiled.solverModelHash !== current.shellSolverModelProjection?.solverModelHash
        || compiled.solverModelBindingHash
          !== current.shellSolverModelProjection?.solverModelBindingHash
        || compiled.parents.meshHash !== current.analysisMeshCustodyProjection?.meshHash
        || compiled.parents.parentNormalCompanionHash
          !== current.shellSolverModelProjection?.parentNormalCompanionHash
        || compiled.parentNormalCustody.authorizationEffect
          !== current.shellSolverModelProjection?.parentNormalAuthorizationEffect) {
        throw c.storeError('LAFEA_SHELL_RUN_SOLVER_MODEL_BINDING_STALE');
      }

      const outcome = executeCompiledShell(stageId, compiled, current.retainedAnalysisMeshEvidenceV2);
      if (!outcome.accepted) {
        throw c.storeError(
          outcome.result?.diagnostics?.[0]?.code
            ?? 'LAFEA_SHELL_AUTHORITATIVE_CALCULATION_REJECTED',
        );
      }
      const resultHash = canonicalLafeaSha256({
        schema: 'lafea-shell-authoritative-result-hash-input/v1',
        stageId,
        result: outcome.result,
      });
      const executionMeshBindingHash = canonicalLafeaSha256({
        schema: 'lafea-shell-execution-mesh-binding/v1',
        stageId,
        retainedMeshHash: compiled.parents.meshHash,
        parentNormalCompanionHash: compiled.parents.parentNormalCompanionHash,
        parentNormalAuthorizationEffect: compiled.parentNormalCustody.authorizationEffect,
        solverModelHash: compiled.solverModelHash,
        solverModelBindingHash: compiled.solverModelBindingHash,
        executedKernelModelHash: outcome.executedKernelModelHash,
        executionMeshProofHash: outcome.executionMeshProofHash,
      });
      const compiledExecutionHash = canonicalLafeaSha256({
        schema: 'lafea-shell-compiled-execution-hash-input/v1',
        stageId,
        sourceHash: authority.sourceHash,
        analysisDomainHash: compiled.parents.analysisDomainHash,
        analysisGeometryHash: compiled.parents.analysisGeometryHash,
        meshHash: compiled.parents.meshHash,
        meshProfileHash: compiled.parents.meshProfileHash,
        parentNormalCompanionHash: compiled.parents.parentNormalCompanionHash,
        parentNormalAuthorizationEffect: compiled.parentNormalCustody.authorizationEffect,
        solverModelHash: compiled.solverModelHash,
        executionMeshBindingHash,
        resultHash,
      });
      const execution = freeze({
        schema: LAFEA_SHELL_EXECUTION_STATE_SCHEMA,
        stageId,
        status: 'QUALIFIED',
        route: LAFEA_SHELL_COMPILED_EXECUTION_ROUTE,
        sourceHash: authority.sourceHash,
        analysisDomainHash: compiled.parents.analysisDomainHash,
        analysisGeometryHash: compiled.parents.analysisGeometryHash,
        meshHash: compiled.parents.meshHash,
        meshProfileHash: compiled.parents.meshProfileHash,
        parentNormalCompanionHash: compiled.parents.parentNormalCompanionHash,
        parentNormalAuthorizationEffect: compiled.parentNormalCustody.authorizationEffect,
        parentNormalCandidateQualification:
          compiled.parentNormalCustody.companionCandidateQualification,
        solverModelHash: compiled.solverModelHash,
        solverModelBindingHash: compiled.solverModelBindingHash,
        executedKernelModelHash: outcome.executedKernelModelHash,
        executionMeshProofHash: outcome.executionMeshProofHash,
        executionMeshBindingHash,
        compiledExecutionHash,
        source: current.document,
        canonicalInput: compiled.canonicalInput,
        result: outcome.result,
        diagnostics: [],
        releaseQualified: false,
      });
      c.shellExecution.retain(stageId, execution);

      const batch = createLafeaLifecycleProducerBatch({
        stageId,
        sourceAuthority: authority,
        execution,
      });
      for (let index = 0; index < batch.records.length; index += 1) {
        c.invokeRetained('registerLifecycleArtifact', [
          batch.records[index], batch.registrations[index].registrationId,
        ]);
        if (c.getRetainedState().status === 'FAILED') {
          throw c.storeError(
            c.getRetainedState().diagnostics?.[0]?.code
              ?? 'LAFEA_SHELL_LIFECYCLE_REGISTRATION_REJECTED',
          );
        }
      }
      const after = c.readStageState(stageId);
      if (after.execution?.compiledExecutionHash !== compiledExecutionHash
        || after.execution?.meshHash !== compiled.parents.meshHash
        || after.execution?.parentNormalCompanionHash
          !== compiled.parents.parentNormalCompanionHash
        || after.execution?.parentNormalAuthorizationEffect
          !== compiled.parentNormalCustody.authorizationEffect) {
        throw c.storeError('LAFEA_SHELL_EXECUTION_PUBLICATION_DIVERGED');
      }
      c.clearOrchestratorDiagnostic();
    } catch (error) {
      c.shellExecution.clear(stageId);
      c.failOrchestrator(error, 'LAFEA_SHELL_AUTHORITATIVE_RUN_REJECTED');
    }
    return c.publish();
  }

  return Object.freeze({ run });
}

function executeCompiledShell(stageId, compiled, meshEvidence) {
  if (stageId === 'LAFEA.4') {
    const result = calculateLocalShell(compiled.canonicalShellModel);
    const accepted = result?.qualification?.accepted === true;
    if (accepted && result.canonicalModelSemanticHash !== compiled.kernelModelHash) {
      fail('LAFEA4_SHELL_RUN_KERNEL_MODEL_MISMATCH');
    }
    return freeze({
      result,
      accepted,
      executedKernelModelHash: result?.canonicalModelSemanticHash ?? null,
      executionMeshProofHash: canonicalLafeaSha256({
        schema: 'lafea4-shell-execution-mesh-proof/v1',
        retainedMeshHash: meshEvidence.meshHash,
        parentNormalCompanionHash: compiled.parents.parentNormalCompanionHash,
        parentNormalAuthorizationEffect: compiled.parentNormalCustody.authorizationEffect,
        compiledKernelModelHash: compiled.kernelModelHash,
        resultKernelModelHash: result?.canonicalModelSemanticHash ?? null,
        transferEvidence: compiled.transferEvidence,
      }),
    });
  }

  const result = calculateLocalTrunnionFootprint(compiled.canonicalInput);
  const accepted = result?.qualification?.accepted === true;
  if (accepted && result.canonicalWorkflowModelHash !== compiled.kernelModelHash) {
    fail('LAFEA5_SHELL_RUN_WORKFLOW_MODEL_MISMATCH');
  }
  const proof = accepted
    ? proveLafea5ExecutedShellMesh(
      meshEvidence.mesh,
      meshEvidence.meshHash,
      result.generatedShellModel,
    )
    : { proofHash: null };
  return freeze({
    result,
    accepted,
    executedKernelModelHash: result?.canonicalShellModelHash ?? null,
    executionMeshProofHash: proof.proofHash,
  });
}

function proveLafea5ExecutedShellMesh(retainedMesh, retainedMeshHash, generatedShellModel) {
  if (lafeaAnalysisMeshContentHash(retainedMesh) !== retainedMeshHash) {
    fail('LAFEA5_SHELL_RUN_RETAINED_MESH_HASH_MISMATCH');
  }
  if (!generatedShellModel || !Array.isArray(generatedShellModel.nodes)
    || !Array.isArray(generatedShellModel.elements)) {
    fail('LAFEA5_SHELL_RUN_GENERATED_SHELL_MODEL_MISSING');
  }
  if (generatedShellModel.nodes.length !== retainedMesh.nodes.length
    || generatedShellModel.elements.length !== retainedMesh.elements.length) {
    fail('LAFEA5_SHELL_RUN_EXECUTED_MESH_COUNT_MISMATCH');
  }
  const generatedNodeById = new Map(generatedShellModel.nodes.map((row) => [row.nodeId, row]));
  for (const retained of retainedMesh.nodes) {
    const generated = generatedNodeById.get(retained.nodeId);
    if (!generated || canonicalLafeaSha256(generated.position)
      !== canonicalLafeaSha256([retained.x, retained.y, retained.z])) {
      fail('LAFEA5_SHELL_RUN_EXECUTED_NODE_BINDING_MISMATCH');
    }
  }
  const generatedElementById = new Map(generatedShellModel.elements.map((row) => [row.elementId, row]));
  const elementProof = retainedMesh.elements.map((retained) => {
    const generated = generatedElementById.get(retained.elementId);
    const retainedNodeSetHash = canonicalLafeaSha256([...retained.nodeIds].sort());
    const generatedNodeSetHash = generated
      ? canonicalLafeaSha256([...generated.nodeIds].sort())
      : null;
    if (!generated || retainedNodeSetHash !== generatedNodeSetHash) {
      fail('LAFEA5_SHELL_RUN_EXECUTED_ELEMENT_BINDING_MISMATCH');
    }
    return { elementId: retained.elementId, retainedNodeSetHash, generatedNodeSetHash };
  });
  return freeze({
    proofHash: canonicalLafeaSha256({
      schema: 'lafea5-shell-executed-mesh-proof/v1',
      retainedMeshHash,
      generatedShellModelHash: generatedShellModel.semanticHash,
      nodeCount: retainedMesh.nodes.length,
      elementCount: retainedMesh.elements.length,
      elementProof,
    }),
  });
}

function requireContext(value) {
  const functions = [
    'readStageState', 'invokeRetained', 'getRetainedState', 'publish',
    'clearOrchestratorDiagnostic', 'failOrchestrator', 'storeError',
  ];
  if (!value || typeof value !== 'object'
    || functions.some((name) => typeof value[name] !== 'function')
    || !value.source || !value.shellExecution) {
    throw new TypeError('LAFEA_SHELL_RUN_ACTION_CONTEXT_INVALID');
  }
  return value;
}

function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}
