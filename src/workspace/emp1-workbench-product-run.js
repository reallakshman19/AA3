import { semanticHash } from '../core/shared-primitives/canonical-json.js';
import {
  createEmp1RetainedFoundationLayer,
  createEmp1RetainedSectionScreeningLayer,
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
  normalizeEmp1AttachmentGeometry,
  normalizeEmp1WorkbenchRunInput,
  reconcileEmp1WorkbenchChangeClasses,
} from './emp1-workbench-run-state.js';

export {
  EMP1_WORKBENCH_ATTACHMENT_DIAMETER_BASIS,
  EMP1_WORKBENCH_ATTACHMENT_PHYSICAL_LOCATION,
  EMP1_WORKBENCH_BOUNDED_ROUTE_REQUEST_SCHEMA,
  EMP1_WORKBENCH_EXECUTION_CURRENTNESS,
  EMP1_WORKBENCH_PRODUCT_EXECUTION_SCHEMA,
  EMP1_WORKBENCH_RUN_INPUT_SCHEMA,
  classifyEmp1WorkbenchExecutionCurrentness,
  emp1WorkbenchRunInputHash,
  normalizeEmp1WorkbenchRunInput,
  projectEmp1WorkbenchRunReadiness,
} from './emp1-workbench-run-state.js';

/**
 * Product-owned EMP.1 transaction over the retained A/B engines and the
 * governed bounded-C preparation path.
 *
 * The caller may select retained identities and author one typed attachment
 * source binding. Pipe OD, assessment thickness, WRC reference coordinates,
 * axes, gamma/beta and Kn/Kb remain derived authority.
 *
 * When the gamma=5 production route is suspended, this function still proves
 * the A -> B -> prepared-C custody chain but it does not invoke the production
 * WRC route. The retained localCorrelation layer is then an explicit BLOCKED
 * artifact, not a numerical WRC engineering result.
 */
export async function executeEmp1WorkbenchProduct(options = {}) {
  const aDocument = requireRecord(options.aDocument, 'EMP1_WORKBENCH_A_DOCUMENT_REQUIRED');
  const bDocument = requireRecord(options.bDocument, 'EMP1_WORKBENCH_B_DOCUMENT_REQUIRED');
  const runInput = normalizeEmp1WorkbenchRunInput(options.runInput);
  const inputHashes = emp1WorkbenchInputHashes({ aDocument, bDocument, runInput });
  const previous = normalizePrevious(options.previous);
  const changeClasses = reconcileEmp1WorkbenchChangeClasses(
    options.changeClasses,
    previous?.inputHashes,
    inputHashes,
  );
  const productSource = buildProductSource(runInput);
  const sourceHash = semanticHash({
    schema: 'emp1-workbench-source-binding/v3',
    inputHashes,
    productSource,
  });
  const qualification = emp1Wrc537Gamma5ZeroDpOrchestrationQualification();
  const routeAuthority = currentProductionRouteAuthority();
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
        sourceBindingSemanticHash: semanticHash(attachment),
        productionObservationUsedToSetAuthority: false,
      });
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
    invocations,
    result,
    stageExecutions: {
      loadTransfer: result.loadTransfer?.execution ?? previous?.stageExecutions?.loadTransfer ?? null,
      sectionScreening: result.sectionScreening?.execution ?? previous?.stageExecutions?.sectionScreening ?? null,
    },
    authority: {
      boundedLocalRoutePrepared,
      boundedLocalRouteExecuted,
      routeModuleAuthorized: routeAuthority.routeModuleAuthorized,
      routeRegistryRegistered: routeAuthority.routeRegistryRegistered,
      routeRegistryEngineeringUseAuthorized: routeAuthority.routeRegistryEngineeringUseAuthorized,
      routeSuspensionReasons,
      globalEmp1CRouteAuthority: false,
      codeComplianceProduced: false,
      releaseQualified: false,
    },
  });
}

function currentProductionRouteAuthority() {
  const registry = emp1CBoundedRoute(EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID);
  const routeModuleAuthorized = EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED === true;
  const routeRegistryRegistered = registry?.registered === true;
  const routeRegistryEngineeringUseAuthorized = registry?.engineeringUseAuthorized === true;
  const productionUseAuthorized = routeModuleAuthorized
    && routeRegistryRegistered
    && routeRegistryEngineeringUseAuthorized;
  const reasons = new Set([
    ...EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENSION_REASONS,
    ...(registry?.suspensionReasons ?? []),
  ]);
  if (!registry) reasons.add('EMP1_C_BOUNDED_ROUTE_REGISTRY_ENTRY_REQUIRED');
  else {
    if (!routeRegistryRegistered) reasons.add('EMP1_C_BOUNDED_ROUTE_NOT_REGISTERED');
    if (!routeRegistryEngineeringUseAuthorized) {
      reasons.add('EMP1_C_BOUNDED_ROUTE_ENGINEERING_USE_NOT_AUTHORIZED');
    }
  }
  if (!routeModuleAuthorized) reasons.add('EMP1_C_BOUNDED_ROUTE_EXECUTOR_NOT_AUTHORIZED');
  return deepFreeze({
    productionUseAuthorized,
    routeModuleAuthorized,
    routeRegistryRegistered,
    routeRegistryEngineeringUseAuthorized,
    reasons: [...reasons],
  });
}

function suspendedLocalCorrelation(preparedSource, routeAuthority) {
  const preparedSourceCustody = preparedSource?.localMethod?.wrcSourceCustody ?? null;
  const reasons = Object.freeze([
    'EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_SUSPENDED',
    ...routeAuthority.reasons,
  ]);
  const payload = {
    schema: 'emp1-workbench-suspended-local-correlation/v1',
    state: 'BLOCKED',
    decision: null,
    reasons,
    engineeringUseAuthorized: false,
    productionRouteAuthority: false,
    globalEmp1CRouteAuthority: false,
    routeSuspensionReasons: routeAuthority.reasons,
    preparedSourceCustody,
  };
  return deepFreeze({ ...payload, resultHash: semanticHash(payload) });
}

function buildProductSource(runInput) {
  return deepFreeze({
    schema: 'emp1-workbench-orchestration-source/v3',
    sourceId: 'EMP1-WORKBENCH-TRANSACTION',
    localMethod: {
      requested: true,
      routeRequest: structuredClone(runInput.localMethod.routeRequest),
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
