import {
  computeRecoveryEvidenceHash,
  computeRecoverySemanticHash,
  recoverComponentCodePoint,
  requireResultRecovery,
} from '../core/linear-fea-result-recovery/index.js';
import { semanticHash } from '../core/shared-piping-model/canonical-json.js';
import { deepFreeze } from '../core/shared-piping-model/immutable.js';
import { compileInputXmlExecutionElementAuthorities } from '../core/linear-piping-analysis-consumer/inputxml-linear-execution-elements.js';
import { inputXmlStiffnessFrameElementProfile } from '../core/linear-piping-analysis-consumer/inputxml-linear-stiffness-profile.js';
import { PRODUCTION_CAPABILITY_PROFILE } from '../core/linear-piping-analysis-consumer/production-capability-profile.js';
import { requireLfeaNativeStraightCodeStationAuthority } from './native-b31-code-stations.js';
import { lfeaNativeB31Error } from './native-b31-authority-contract.js';

export const LFEA_NATIVE_B31_CODE_RECOVERY_SCHEMA =
  'lfea-native-b31-code-recovery/v1';

export function buildLfeaNativeB31CaseChains(
  preFlight,
  executionState,
  resultsState,
  b31Authority,
) {
  const raw = requireCurrentRaw(executionState);
  const batch = requireCurrentRecovery(resultsState, raw);
  const stationAuthority = requireLfeaNativeStraightCodeStationAuthority(
    b31Authority.codeStationAuthority,
  );
  const tolerance = batch.recoveryProfile?.codePointConsistencyTolerance?.value;
  if (!Number.isFinite(tolerance) || !(tolerance > 0)) {
    throw lfeaNativeB31Error('LFEA_NATIVE_B31_RECOVERY_TOLERANCE_REQUIRED',
      'B31 code-point recovery requires the explicit retained B-3.4 consistency tolerance.');
  }
  const preparation = preFlight.preparation;
  const physicalById = new Map(preparation.physicalPreparation.physicalCases
    .map((row) => [row.caseId, row]));
  const recoveryById = new Map(batch.caseRecoveries.map((row) => [row.caseId, row]));
  const frameProfile = inputXmlStiffnessFrameElementProfile();
  const chains = raw.caseExecutions.map((rawCase) => {
    const physical = physicalById.get(rawCase.caseId);
    const recovered = recoveryById.get(rawCase.caseId);
    if (!physical || !recovered) {
      throw lfeaNativeB31Error('LFEA_NATIVE_B31_CASE_AUTHORITY_MISSING',
        `Case ${rawCase.caseId} lacks current physical or B-3.4 authority.`);
    }
    const elements = compileInputXmlExecutionElementAuthorities(
      preparation.structuralPreparation,
      frameProfile,
      physical.loadCase,
      {
        sourcePreparation: preparation.sourcePreparation,
        bendFactorAuthority: preparation.stiffnessPreflight.bendFactorAuthority,
        branchFactorAuthority: preparation.stiffnessPreflight.branchFactorAuthority,
        capabilityProfile: PRODUCTION_CAPABILITY_PROFILE,
      },
    );
    if (semanticHash(rawCase.elementLedger) !== semanticHash(elements.elementLedger)) {
      throw lfeaNativeB31Error('LFEA_NATIVE_B31_ELEMENT_LEDGER_MISMATCH',
        `Case ${rawCase.caseId} element authority differs from the retained solve ledger.`);
    }
    const codeRecovery = deriveCodeRecovery(
      recovered.recovery,
      preparation.structuralPreparation.compilation,
      stationAuthority,
      tolerance,
    );
    const frameRows = [
      ...elements.frameElements,
      ...elements.pipingComponents.flatMap((component) =>
        component.elements.map((entry) => entry.frameElement)),
    ];
    return deepFreeze({
      caseId: rawCase.caseId,
      loadCase: physical.loadCase,
      baseRecoverySemanticHash: recovered.recovery.semanticHash,
      codeRecovery,
      frameElementById: Object.freeze(Object.fromEntries(
        frameRows.map((row) => [row.elementId, row]),
      )),
    });
  });
  requireCheckCaseCoverage(chains, b31Authority.checks);
  return Object.freeze(chains);
}

export function lfeaNativeB31PublicationCurrentnessReasons(
  executionState,
  resultsState,
  expected,
) {
  if (expected === null) return [];
  const reasons = [];
  const raw = executionState?.currentness === 'CURRENT' ? executionState.execution : null;
  const recovery = resultsState?.currentness === 'CURRENT' ? resultsState.results : null;
  if (!raw) reasons.push('RAW_EXECUTION_NO_LONGER_CURRENT');
  if (!recovery) reasons.push('B3_4_RECOVERY_NO_LONGER_CURRENT');
  if (raw && raw.semanticHash !== expected.rawExecutionSemanticHash) reasons.push('RAW_EXECUTION_CHANGED');
  if (recovery && recovery.semanticHash !== expected.recoveryBatchSemanticHash) reasons.push('B3_4_RECOVERY_CHANGED');
  return uniqueAscii(reasons);
}

export function lfeaNativeB31PublicationParent(executionState, resultsState, authority) {
  return deepFreeze({
    rawExecutionSemanticHash: executionState.execution.semanticHash,
    recoveryBatchSemanticHash: resultsState.results.semanticHash,
    b31AuthoritySemanticHash: authority.semanticHash,
  });
}

function requireCheckCaseCoverage(chains, checks) {
  const currentCaseIds = new Set(chains.map((row) => row.caseId));
  for (const check of checks) {
    if (!currentCaseIds.has(check.actionSource.caseId)) {
      throw lfeaNativeB31Error('LFEA_NATIVE_B31_CURRENT_CASE_EXECUTION_REQUIRED',
        `B31 check ${check.checkId} requires current execution/recovery for ${check.actionSource.caseId}.`);
    }
  }
}

function deriveCodeRecovery(baseRecoveryRecord, compilation, stationAuthority, tolerance) {
  const baseRecovery = requireResultRecovery(baseRecoveryRecord);
  const actionByElementId = new Map(baseRecovery.elementActions.map((row) => [
    row.elementId,
    { local: row.local, global: row.global },
  ]));
  const modelElementsById = new Map(compilation.model.elements.map((row) => [row.elementId, row]));
  const existingIds = new Set(baseRecovery.componentResultants.map((row) => row.componentId));
  const addedResultants = stationAuthority.components.map((component) => {
    if (existingIds.has(component.componentId)) {
      throw lfeaNativeB31Error('LFEA_NATIVE_B31_COMPONENT_RESULTANT_COLLISION',
        `B31 straight code-station component ${component.componentId} collides with an existing B-3.4 component resultant.`);
    }
    return {
      componentId: component.componentId,
      componentType: component.componentType,
      codePoints: component.stations.map((station) => recoverComponentCodePoint({
        station,
        componentElementIds: [component.elementId],
        modelElementsById,
        actionByElementId,
        nodalLoadByNode: new Map(),
        tolerance,
      })),
    };
  });
  const componentResultants = [
    ...baseRecovery.componentResultants,
    ...addedResultants,
  ].sort((left, right) => compareAscii(left.componentId, right.componentId));
  const draft = {
    ...baseRecovery,
    componentResultants,
    recoveryHash: '',
    semanticHash: '',
    evidenceHash: '',
  };
  draft.semanticHash = computeRecoverySemanticHash(draft);
  draft.recoveryHash = draft.semanticHash;
  draft.evidenceHash = computeRecoveryEvidenceHash(draft);
  const augmentedRecovery = requireResultRecovery(draft);
  const evidence = {
    schema: LFEA_NATIVE_B31_CODE_RECOVERY_SCHEMA,
    parentBaseRecoverySemanticHash: baseRecovery.semanticHash,
    codeStationAuthoritySemanticHash: stationAuthority.semanticHash,
    codePointConsistencyTolerance: tolerance,
    augmentedRecoverySemanticHash: augmentedRecovery.semanticHash,
  };
  return deepFreeze({
    ...evidence,
    augmentedRecovery,
    semanticHash: semanticHash(evidence),
  });
}

function requireCurrentRaw(state) {
  const raw = state?.currentness === 'CURRENT' ? state.execution : null;
  if (!raw || !['QUALIFIED', 'CONDITIONAL'].includes(raw.status)) {
    throw lfeaNativeB31Error('LFEA_NATIVE_B31_CURRENT_RAW_REQUIRED',
      'B31 publication requires current qualified/conditional B-3.3 execution.');
  }
  return raw;
}
function requireCurrentRecovery(state, raw) {
  const batch = state?.currentness === 'CURRENT' ? state.results : null;
  if (!batch || batch.rawExecutionBatchSemanticHash !== raw.semanticHash) {
    throw lfeaNativeB31Error('LFEA_NATIVE_B31_CURRENT_RECOVERY_REQUIRED',
      'B31 publication requires current B-3.4 recovery for the exact raw execution.');
  }
  return batch;
}
function uniqueAscii(values) { return [...new Set(values)].sort(compareAscii); }
function compareAscii(left, right) { return left < right ? -1 : left > right ? 1 : 0; }
