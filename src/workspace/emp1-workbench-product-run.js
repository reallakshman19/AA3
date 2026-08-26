import { semanticHash } from '../core/shared-primitives/canonical-json.js';
import {
  createEmp1RetainedFoundationLayer,
  createEmp1RetainedSectionScreeningLayer,
  createEmp1Wrc537ApplicabilitySourceAuthority,
  createEmp1Wrc537AttachmentSourceAuthority,
  emp1Wrc537Gamma5ZeroDpOrchestrationQualification,
  prepareEmp1Wrc537Gamma5ZeroDpLocalSource,
  refreshEmp1BSourceEvidence,
  runEmp1,
  runEmp1Wrc537Gamma5ZeroDpLocalCorrelation,
} from '../core/emp1/index.js';
import {
  EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID,
  emp1CBoundedRoute,
} from '../core/emp1/emp1-c-bounded-route-registry.js';
import {
  EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED,
  EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENSION_REASONS,
} from '../core/emp1/emp1-wrc537-gamma5-zero-dp-route.js';
import { executeLafeaStage } from './lafea-workbench-model.js';
import {
  EMP1_WORKBENCH_PRODUCT_EXECUTION_SCHEMA,
  emp1WorkbenchInputHashes,
  normalizeEmp1ApplicabilityGeometry,
  normalizeEmp1AttachmentGeometry,
  normalizeEmp1WorkbenchRunInput,
  reconcileEmp1WorkbenchChangeClasses,
} from './emp1-workbench-run-state.js';

export const EMP1_WORKBENCH_ROUTE_AUTHORITY_SNAPSHOT_SCHEMA =
  'emp1-workbench-route-authority-snapshot/v1';
export const EMP1_WORKBENCH_RETAINED_C_EVIDENCE_SCHEMA =
  'emp1-workbench-retained-c-evidence/v1';

export {
  EMP1_WORKBENCH_ATTACHMENT_DIAMETER_BASIS,
  EMP1_WORKBENCH_ATTACHMENT_PHYSICAL_LOCATION,
  EMP1_WORKBENCH_ATTACHMENT_STATION_BASIS,
  EMP1_WORKBENCH_BOUNDED_ROUTE_REQUEST_SCHEMA,
  EMP1_WORKBENCH_CYLINDER_LENGTH_BASIS,
  EMP1_WORKBENCH_EXECUTION_CURRENTNESS,
  EMP1_WORKBENCH_PRODUCT_EXECUTION_SCHEMA,
  EMP1_WORKBENCH_ROUTE_AUTHORITY_CHANGED,
  EMP1_WORKBENCH_RUN_INPUT_SCHEMA,
  classifyEmp1WorkbenchExecutionCurrentness,
  emp1WorkbenchRunInputHash,
  normalizeEmp1WorkbenchRunInput,
  projectEmp1WorkbenchRunReadiness,
  projectEmp1WorkbenchCState,
} from './emp1-workbench-run-state.js';

/**
 * Product-owned EMP.1 transaction over the retained A/B engines and the
 * governed bounded-C preparation path.
 *
 * The caller may select retained identities and author typed engineering-source
 * bindings for attachment OD and WRC §4.5 cylinder geometry. Pipe OD,
 * assessment thickness, WRC reference coordinates, axes, gamma/beta, Kn/Kb and
 * nearest-end distance remain derived authority.
 *
 * Older v3 source state may still normalize for recovery, but execution is
 * fail-closed until the typed §4.5 geometry binding is present. This prevents a
 * prepared-C artifact from silently omitting applicability authority before a
 * future route reauthorization.
 */
export async function executeEmp1WorkbenchProduct(options = {}) {
  const aDocument = requireRecord(options.aDocument, 'EMP1_WORKBENCH_A_DOCUMENT_REQUIRED');
  const bDocument = requireRecord(options.bDocument, 'EMP1_WORKBENCH_B_DOCUMENT_REQUIRED');
  const runInput = normalizeEmp1WorkbenchRunInput(options.runInput);
  if (!runInput.localMethod.applicabilityGeometry) {
    throw workbenchError('EMP1_WORKBENCH_APPLICABILITY_GEOMETRY_REQUIRED');
  }
  const inputHashes = emp1WorkbenchInputHashes({ aDocument, bDocument, runInput });
  const previous = normalizePrevious(options.previous);
  const routeAuthority = currentEmp1WorkbenchRouteAuthority();
  const inputChangeClasses = reconcileEmp1WorkbenchChangeClasses(
    options.changeClasses,
    previous?.inputHashes,
    inputHashes,
  );
  const changeClasses = reconcileRouteAuthorityChangeClass(
    inputChangeClasses,
    previous?.authority?.routeAuthoritySnapshot,
    routeAuthority.snapshot,
  );
  const applicabilitySourceAuthority = requireApplicabilityGeometryForExecution(
    runInput.localMethod.applicabilityGeometry,
    aDocument,
    bDocument,
  );
  const productSource = buildProductSource(runInput, applicabilitySourceAuthority);
  const sourceHash = semanticHash({
    schema: 'emp1-workbench-source-binding/v4',
    inputHashes,
    productSource,
  });
  const qualification = emp1Wrc537Gamma5ZeroDpOrchestrationQualification();
  const invocations = {
    loadTransfer: 0,
    sectionScreening: 0,
    localPreparation: 0,
    localCorrelation: 0,
  };

  const adapters = {
    runLoadTransfer: () => {
      invocations.loadTransfer += 1;
      const execution = qualifiedStageExecution('LAFEA.1', aDocument);
      const retained = createEmp1RetainedFoundationLayer(execution.result);
      return deepFreeze({ ...retained, execution });
    },
    runSectionScreening: ({ loadTransfer }) => {
      invocations.sectionScreening += 1;
      const aExecution = requireLayerExecution(loadTransfer, 'LAFEA.1');
      const refreshed = refreshEmp1BSourceEvidence({
        aDocument,
        aExecution,
        bDocument,
      });
      const execution = qualifiedStageExecution('LAFEA.2', refreshed);
      const attachment = requireAttachmentGeometryForExecution(
        runInput.localMethod.attachmentGeometry,
        execution,
      );
      const attachmentSourceAuthority = createEmp1Wrc537AttachmentSourceAuthority({
        geometryIdentity: attachment.geometryIdentity,
        outsideDiameter: attachment.attachmentDiameter,
        diameterBasis: attachment.diameterBasis,
        physicalLocation: attachment.physicalLocation,
        unit: attachment.unit,
        sourceReference: attachment.sourceReference,
        productionObservationUsedToSetAuthority: false,
      });
      if (attachmentSourceAuthority.sourceBindingSemanticHash !== semanticHash(attachment)) {
        throw workbenchError('EMP1_WORKBENCH_ATTACHMENT_SOURCE_BINDING_HASH_MISMATCH');
      }
      const retained = createEmp1RetainedSectionScreeningLayer({
        screeningRequest: execution.canonicalInput,
        screeningResult: execution.result,
        attachmentSourceAuthority,
      });
      return deepFreeze({ ...retained, execution });
    },
    prepareLocalCorrelationSource: (context) => {
      invocations.localPreparation += 1;
      return prepareEmp1Wrc537Gamma5ZeroDpLocalSource(context);
    },
    runLocalCorrelation: (context) => {
      if (!routeAuthority.productionUseAuthorized) {
        return suspendedLocalCorrelation(context.source, routeAuthority);
      }
      invocations.localCorrelation += 1;
      return runEmp1Wrc537Gamma5ZeroDpLocalCorrelation(context);
    },
  };

  const result = await runEmp1({
    source: productSource,
    sourceHash,
    previous: previous?.result,
    changeClasses,
    methodQualification: qualification.methodQualification,
    benchmarkQualification: qualification.benchmarkQualification,
    adapters,
  });
  const boundedLocalRouteExecuted = result.localCorrelation?.productionRouteAuthority === true;
  const boundedLocalRoutePrepared = Boolean(
    result.localCorrelation?.sourceCustody
      || result.localCorrelation?.preparedSourceCustody,
  );
  const routeSuspensionReasons = result.localCorrelation?.state === 'BLOCKED'
    ? [...(result.localCorrelation.routeSuspensionReasons ?? [])]
    : [];
  const retainedLocalCorrelationHistory = retainHistoricalLocalCorrelation(previous);

  return deepFreeze({
    schema: EMP1_WORKBENCH_PRODUCT_EXECUTION_SCHEMA,
    productId: 'EMP.1',
    status: boundedLocalRouteExecuted
      ? 'CALCULATED'
      : boundedLocalRoutePrepared
        ? 'PREPARED_C_BLOCKED'
        : 'BLOCKED',
    decision: result.assessment.decision,
    sourceHash,
    inputHashes,
    changeClasses,
    runInput,
    applicabilitySourceAuthority,
    invocations,
    result,
    retainedLocalCorrelationHistory,
    stageExecutions: {
      loadTransfer: result.loadTransfer?.execution ?? previous?.stageExecutions?.loadTransfer ?? null,
      sectionScreening: result.sectionScreening?.execution ?? previous?.stageExecutions?.sectionScreening ?? null,
    },
    authority: {
      boundedLocalRoutePrepared,
      boundedLocalRouteExecuted,
      applicabilitySourceAuthorityPrepared: true,
      applicabilitySourceAuthoritySemanticHash: applicabilitySourceAuthority.semanticHash,
      routeModuleAuthorized: routeAuthority.routeModuleAuthorized,
      routeRegistryRegistered: routeAuthority.routeRegistryRegistered,
      routeRegistryEngineeringUseAuthorized: routeAuthority.routeRegistryEngineeringUseAuthorized,
      routeSuspensionReasons,
      routeAuthorityHash: routeAuthority.routeAuthorityHash,
      routeAuthoritySnapshot: routeAuthority.snapshot,
      globalEmp1CRouteAuthority: false,
      codeComplianceProduced: false,
      releaseQualified: false,
    },
  });
}

/**
 * Return the live bounded-route authority and a deterministic semantic snapshot.
 * The snapshot intentionally contains no timestamp or UI text. It binds the
 * route module state and the retained registry method/scope/qualification data
 * that can change whether an otherwise identical C result remains reportable.
 */
export function currentEmp1WorkbenchRouteAuthority() {
  const registry = emp1CBoundedRoute(EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID);
  const routeModuleAuthorized = EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED === true;
  const routeRegistryRegistered = registry?.registered === true;
  const routeRegistryEngineeringUseAuthorized = registry?.engineeringUseAuthorized === true;
  const productionUseAuthorized = routeModuleAuthorized
    && routeRegistryRegistered
    && routeRegistryEngineeringUseAuthorized;
  const reasons = uniqueSorted([
    ...EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENSION_REASONS,
    ...(registry?.suspensionReasons ?? []),
    ...(!registry ? ['EMP1_C_BOUNDED_ROUTE_REGISTRY_ENTRY_REQUIRED'] : []),
    ...(registry && !routeRegistryRegistered ? ['EMP1_C_BOUNDED_ROUTE_NOT_REGISTERED'] : []),
    ...(registry && !routeRegistryEngineeringUseAuthorized
      ? ['EMP1_C_BOUNDED_ROUTE_ENGINEERING_USE_NOT_AUTHORIZED']
      : []),
    ...(!routeModuleAuthorized ? ['EMP1_C_BOUNDED_ROUTE_EXECUTOR_NOT_AUTHORIZED'] : []),
  ]);
  const semanticPayload = {
    schema: EMP1_WORKBENCH_ROUTE_AUTHORITY_SNAPSHOT_SCHEMA,
    routeId: EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID,
    productionUseAuthorized,
    routeModuleAuthorized,
    routeModuleSuspensionReasons: uniqueSorted(
      EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENSION_REASONS,
    ),
    registry: registry ? {
      schema: registry.schema ?? null,
      routeId: registry.routeId ?? null,
      registered: routeRegistryRegistered,
      engineeringUseAuthorized: routeRegistryEngineeringUseAuthorized,
      suspensionReasons: uniqueSorted(registry.suspensionReasons ?? []),
      method: structuredClone(registry.method ?? null),
      scope: structuredClone(registry.scope ?? null),
      limitations: [...(registry.limitations ?? [])],
      remainingBlocked: [...(registry.remainingBlocked ?? [])],
    } : null,
  };
  const snapshot = deepFreeze({
    ...semanticPayload,
    semanticHash: semanticHash(semanticPayload),
  });
  return deepFreeze({
    productionUseAuthorized,
    routeModuleAuthorized,
    routeRegistryRegistered,
    routeRegistryEngineeringUseAuthorized,
    reasons,
    routeAuthorityHash: snapshot.semanticHash,
    snapshot,
  });
}

function reconcileRouteAuthorityChangeClass(changeClasses, previousSnapshot, currentSnapshot) {
  const classes = new Set(changeClasses ?? []);
  if (previousSnapshot != null
    && previousSnapshot?.semanticHash !== currentSnapshot?.semanticHash) {
    classes.add('ROUTE_AUTHORITY');
  }
  if (previousSnapshot == null && currentSnapshot != null && classes.size === 0) {
    classes.add('ROUTE_AUTHORITY');
  }
  return deepFreeze([...classes]);
}

function retainHistoricalLocalCorrelation(previous) {
  const retained = Array.isArray(previous?.retainedLocalCorrelationHistory)
    ? previous.retainedLocalCorrelationHistory.map((item) => structuredClone(item))
    : [];
  if (previous?.authority?.boundedLocalRouteExecuted === true
    && previous?.result?.localCorrelation) {
    const payload = {
      schema: EMP1_WORKBENCH_RETAINED_C_EVIDENCE_SCHEMA,
      sourceHash: previous.sourceHash ?? null,
      inputHashes: structuredClone(previous.inputHashes ?? null),
      routeAuthorityHash: previous.authority.routeAuthorityHash
        ?? previous.authority.routeAuthoritySnapshot?.semanticHash
        ?? null,
      authoritySnapshot: structuredClone(previous.authority.routeAuthoritySnapshot ?? null),
      localCorrelation: structuredClone(previous.result.localCorrelation),
    };
    const evidenceHash = semanticHash(payload);
    if (!retained.some((item) => item.evidenceHash === evidenceHash)) {
      retained.push({ ...payload, evidenceHash });
    }
  }
  return deepFreeze(retained);
}

function suspendedLocalCorrelation(preparedSource, routeAuthority) {
  const preparedSourceCustody = preparedSource?.localMethod?.wrcSourceCustody ?? null;
  const preparedApplicabilitySourceAuthority =
    preparedSource?.localMethod?.applicabilitySourceAuthority ?? null;
  const reasons = Object.freeze([
    'EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENDED',
    ...routeAuthority.reasons,
  ]);
  const payload = {
    schema: 'emp1-workbench-suspended-local-correlation/v2',
    state: 'BLOCKED',
    decision: null,
    reasons,
    engineeringUseAuthorized: false,
    productionRouteAuthority: false,
    globalEmp1CRouteAuthority: false,
    routeAuthorityHash: routeAuthority.routeAuthorityHash,
    routeSuspensionReasons: routeAuthority.reasons,
    preparedSourceCustody,
    preparedApplicabilitySourceAuthority,
  };
  return deepFreeze({ ...payload, resultHash: semanticHash(payload) });
}

function buildProductSource(runInput, applicabilitySourceAuthority) {
  return deepFreeze({
    schema: 'emp1-workbench-orchestration-source/v4',
    sourceId: 'EMP1-WORKBENCH-TRANSACTION',
    localMethod: {
      requested: true,
      routeRequest: structuredClone(runInput.localMethod.routeRequest),
      applicabilitySourceAuthority: structuredClone(applicabilitySourceAuthority),
    },
  });
}

function normalizePrevious(value) {
  if (value == null) return null;
  if (value.schema !== EMP1_WORKBENCH_PRODUCT_EXECUTION_SCHEMA
    || !value.result || !value.inputHashes) {
    throw workbenchError('EMP1_WORKBENCH_PREVIOUS_EXECUTION_INVALID');
  }
  return value;
}

function requireAttachmentGeometryForExecution(value, execution) {
  const attachment = normalizeEmp1AttachmentGeometry(value);
  const canonicalLengthUnit = execution.canonicalInput?.sourceEvidence
    ?.foundationModel?.units?.canonical?.length;
  if (typeof canonicalLengthUnit !== 'string' || !canonicalLengthUnit) {
    throw workbenchError('EMP1_WORKBENCH_CANONICAL_LENGTH_UNIT_REQUIRED');
  }
  if (attachment.unit !== canonicalLengthUnit) {
    throw workbenchError('EMP1_WORKBENCH_ATTACHMENT_UNIT_NOT_CANONICAL');
  }
  return attachment;
}

function requireApplicabilityGeometryForExecution(value, aDocument, bDocument) {
  const geometry = normalizeEmp1ApplicabilityGeometry(value);
  const canonicalLengthUnit = aDocument?.units?.canonical?.length
    ?? bDocument?.units?.canonical?.length;
  if (typeof canonicalLengthUnit !== 'string' || !canonicalLengthUnit) {
    throw workbenchError('EMP1_WORKBENCH_CANONICAL_LENGTH_UNIT_REQUIRED');
  }
  if (geometry.unit !== canonicalLengthUnit) {
    throw workbenchError('EMP1_WORKBENCH_APPLICABILITY_UNIT_NOT_CANONICAL');
  }
  const authority = createEmp1Wrc537ApplicabilitySourceAuthority({
    ...geometry,
    productionObservationUsedToSetAuthority: false,
  });
  if (authority.sourceBindingSemanticHash !== semanticHash(geometry)) {
    throw workbenchError('EMP1_WORKBENCH_APPLICABILITY_SOURCE_BINDING_HASH_MISMATCH');
  }
  return authority;
}

function qualifiedStageExecution(stageId, document) {
  const execution = executeLafeaStage(stageId, document);
  if (execution.status !== 'QUALIFIED') {
    const code = execution.diagnostics?.[0]?.code ?? 'LAFEA_CALCULATION_NOT_QUALIFIED';
    throw workbenchError(`EMP1_WORKBENCH_${stageId.replace('.', '_')}_${code}`);
  }
  return execution;
}

function requireLayerExecution(layer, stageId) {
  if (layer?.execution?.stageId !== stageId || layer.execution.status !== 'QUALIFIED') {
    throw workbenchError(`EMP1_WORKBENCH_${stageId.replace('.', '_')}_EXECUTION_REQUIRED`);
  }
  return layer.execution;
}
function uniqueSorted(values) {
  return [...new Set((values ?? []).filter((value) => typeof value === 'string'))].sort();
}
function requireRecord(value, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw workbenchError(code);
  return value;
}
function workbenchError(code) { const error = new TypeError(code); error.code = code; return error; }
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}