/**
 * LAFEA.3-only bridge from the qualified v2 continuum producer to Mesh Workspace v3.
 *
 * The v2 evidence remains the numerical/run authority. The parallel v3 candidate is
 * pre-authority evidence only and can never self-promote to CURRENT_PASS here.
 * Shell stages are rejected at this boundary so LAFEA.4/.5 retained-shell custody
 * cannot enter the continuum-v3 path by accident.
 */
import { produceLafeaAnalysisMeshEvidence } from './lafea-mesh-producer-binding.js';
import {
  buildLafeaContinuumMeshCandidateV3,
  createLafeaContinuumMeshCandidateFailureV3,
} from './lafea-continuum-mesh-v3-production.js';

export const LAFEA_CONTINUUM_MESH_V3_PRODUCER_BRIDGE_ID =
  'LAFEA.3/V2_QUALIFIED_PRODUCER_TO_V3_PRE_AUTHORITY_V1';

export function produceLafea3AnalysisMeshEvidenceWithV3Candidate(stage, configuration) {
  if (stage?.stageId !== 'LAFEA.3') {
    fail('LAFEA_CONTINUUM_MESH_V3_PRODUCER_BRIDGE_STAGE_INVALID');
  }
  const meshProfile = configuration?.meshProfile;
  if (!meshProfile) {
    fail('LAFEA_CONTINUUM_MESH_V3_PRODUCER_BRIDGE_PROFILE_REQUIRED');
  }

  const produced = produceLafeaAnalysisMeshEvidence(stage, configuration);
  let candidateV3;
  try {
    candidateV3 = buildLafeaContinuumMeshCandidateV3({
      stage,
      meshProfile,
      produced,
    });
  } catch (error) {
    candidateV3 = createLafeaContinuumMeshCandidateFailureV3(stage, error);
  }

  return Object.freeze({
    ...produced,
    candidateV3,
    v3BridgeId: LAFEA_CONTINUUM_MESH_V3_PRODUCER_BRIDGE_ID,
    v2RunAuthorityPreserved: true,
    v3ExecutionAuthorized: false,
  });
}

function fail(code) {
  const error = new TypeError(code);
  error.code = code;
  throw error;
}
