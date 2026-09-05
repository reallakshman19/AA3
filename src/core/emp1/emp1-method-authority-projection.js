export const EMP1_METHOD_AUTHORITY_PROJECTION_SCHEMA =
  'emp1-method-authority-projection/v1';

export const EMP1_METHOD_AUTHORITY_STATE = Object.freeze({
  AUTHORIZED_BOUNDED_ROUTE: 'AUTHORIZED_BOUNDED_ROUTE',
  BLOCKED: 'BLOCKED',
  NOT_ESTABLISHED: 'NOT_ESTABLISHED',
});

const ROUTE_AUTHORITY_SNAPSHOT_SCHEMA = 'emp1-workbench-route-authority-snapshot/v1';

/**
 * Project an already-governed EMP.1 route-authority snapshot into a compact
 * engineering-governance view. This function does not read the WRC registry,
 * calculate route authority, evaluate case applicability, or create hashes.
 */
export function projectEmp1MethodAuthority(routeAuthoritySnapshot) {
  const snapshot = requireSnapshot(routeAuthoritySnapshot);
  const registry = snapshot.registry == null
    ? null
    : requireRegistry(snapshot.registry, snapshot.routeId);

  if (snapshot.productionUseAuthorized && !registry) {
    throw projectionError('EMP1_METHOD_AUTHORITY_AUTHORIZED_REGISTRY_REQUIRED');
  }

  const state = snapshot.productionUseAuthorized
    ? EMP1_METHOD_AUTHORITY_STATE.AUTHORIZED_BOUNDED_ROUTE
    : registry
      ? EMP1_METHOD_AUTHORITY_STATE.BLOCKED
      : EMP1_METHOD_AUTHORITY_STATE.NOT_ESTABLISHED;

  return deepFreeze({
    schema: EMP1_METHOD_AUTHORITY_PROJECTION_SCHEMA,
    productId: 'EMP.1',
    state,
    route: projectRoute(snapshot, registry),
    method: registry ? projectMethod(registry.method) : null,
    scope: registry ? projectScope(registry.scope) : null,
    limitations: registry ? stringArray(registry.limitations) : [],
    remainingBlocked: registry ? stringArray(registry.remainingBlocked) : [],
    applicabilityBoundary: {
      methodScopeReported: Boolean(registry?.scope),
      assessmentApplicabilityEvaluated: false,
      authorityEstablishedByProjection: false,
    },
    provenance: {
      routeAuthoritySnapshotSchema: snapshot.schema,
      routeAuthorityHash: snapshot.semanticHash,
    },
    authorityBoundary: {
      projectionOnly: true,
      consumesExistingRouteAuthority: true,
      createsEngineeringAuthority: false,
      createsMethodAuthority: false,
      createsApplicabilityAuthority: false,
      createsNumericalAuthority: false,
      createsCodeCompliance: false,
      createsReleaseAuthority: false,
    },
  });
}

function projectRoute(snapshot, registry) {
  return Object.freeze({
    routeId: snapshot.routeId,
    productionUseAuthorized: snapshot.productionUseAuthorized,
    routeModuleAuthorized: snapshot.routeModuleAuthorized,
    routeModuleSuspensionReasons: stringArray(snapshot.routeModuleSuspensionReasons),
    registryPresent: Boolean(registry),
    registrySchema: registry?.schema ?? null,
    registryRegistered: registry?.registered === true,
    registryEngineeringUseAuthorized: registry?.engineeringUseAuthorized === true,
    registrySuspensionReasons: registry ? stringArray(registry.suspensionReasons) : [],
  });
}

function projectMethod(value) {
  const method = requireRecord(value, 'EMP1_METHOD_AUTHORITY_METHOD_REQUIRED');
  return Object.freeze({
    identity: nullableString(method.identity),
    edition: nullableString(method.edition),
    sourceDocumentSha256: nullableString(method.sourceDocumentSha256),
    datasetHash: nullableString(method.datasetHash),
    qualificationRecordSha256: nullableString(method.qualificationRecordSha256),
    qualificationRecordRole: nullableString(method.qualificationRecordRole),
    routeRequalificationRequired: method.routeRequalificationRequired === true,
    loadProducerQualificationSha256: nullableString(method.loadProducerQualificationSha256),
  });
}

function projectScope(value) {
  const scope = requireRecord(value, 'EMP1_METHOD_AUTHORITY_SCOPE_REQUIRED');
  return Object.freeze({
    shellFamily: nullableString(scope.shellFamily),
    attachmentShape: nullableString(scope.attachmentShape),
    variant: nullableString(scope.variant),
    gamma: finiteOrNull(scope.gamma),
    betaMinimum: finiteOrNull(scope.betaMinimum),
    betaMaximum: finiteOrNull(scope.betaMaximum),
    differentialPressure: finiteOrNull(scope.differentialPressure),
    canonicalLengthUnit: nullableString(scope.canonicalLengthUnit),
    interpolationAllowed: scope.interpolationAllowed === true,
    crossVariantFallbackAllowed: scope.crossVariantFallbackAllowed === true,
    Kn: finiteOrNull(scope.Kn),
    Kb: finiteOrNull(scope.Kb),
    stressConcentrationMode: nullableString(scope.stressConcentrationMode),
    nonUnityStressConcentrationAuthorized:
      scope.nonUnityStressConcentrationAuthorized === true,
    longitudinalMomentBendingSelection:
      nullableString(scope.longitudinalMomentBendingSelection),
    offAxisLongitudinalMomentMaximumAuthorized:
      scope.offAxisLongitudinalMomentMaximumAuthorized === true,
    attachmentRadiusBasis: nullableString(scope.attachmentRadiusBasis),
    runtimeAttachmentSourceEvidenceRequired:
      scope.runtimeAttachmentSourceEvidenceRequired === true,
    runtimeApplicabilitySourceEvidenceRequired:
      scope.runtimeApplicabilitySourceEvidenceRequired === true,
    stressOutputDomain: nullableString(scope.stressOutputDomain),
    attachmentStressCalculated: scope.attachmentStressCalculated === true,
    nozzleStressCalculated: scope.nozzleStressCalculated === true,
    evaluatedStressLocations: nullableString(scope.evaluatedStressLocations),
    eightPointEnvelopeBasis: nullableString(scope.eightPointEnvelopeBasis),
    absoluteShellMaximumAssured: scope.absoluteShellMaximumAssured === true,
    continuousJunctureSearchPerformed: scope.continuousJunctureSearchPerformed === true,
    arbitraryLoadingExtremaRequiresEngineeringJudgment:
      scope.arbitraryLoadingExtremaRequiresEngineeringJudgment === true,
  });
}

function requireSnapshot(value) {
  const snapshot = requireRecord(value, 'EMP1_METHOD_AUTHORITY_SNAPSHOT_REQUIRED');
  if (snapshot.schema !== ROUTE_AUTHORITY_SNAPSHOT_SCHEMA) {
    throw projectionError('EMP1_METHOD_AUTHORITY_SNAPSHOT_SCHEMA_INVALID');
  }
  requiredString(snapshot.routeId, 'EMP1_METHOD_AUTHORITY_ROUTE_ID_REQUIRED');
  requiredBoolean(
    snapshot.productionUseAuthorized,
    'EMP1_METHOD_AUTHORITY_PRODUCTION_AUTHORITY_REQUIRED',
  );
  requiredBoolean(
    snapshot.routeModuleAuthorized,
    'EMP1_METHOD_AUTHORITY_ROUTE_MODULE_AUTHORITY_REQUIRED',
  );
  requiredString(snapshot.semanticHash, 'EMP1_METHOD_AUTHORITY_SNAPSHOT_HASH_REQUIRED');
  return snapshot;
}

function requireRegistry(value, routeId) {
  const registry = requireRecord(value, 'EMP1_METHOD_AUTHORITY_REGISTRY_REQUIRED');
  if (registry.routeId != null && registry.routeId !== routeId) {
    throw projectionError('EMP1_METHOD_AUTHORITY_ROUTE_ID_MISMATCH');
  }
  requiredBoolean(registry.registered, 'EMP1_METHOD_AUTHORITY_REGISTRATION_STATE_REQUIRED');
  requiredBoolean(
    registry.engineeringUseAuthorized,
    'EMP1_METHOD_AUTHORITY_REGISTRY_AUTHORITY_REQUIRED',
  );
  return registry;
}

function requireRecord(value, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw projectionError(code);
  }
  return value;
}

function requiredString(value, code) {
  if (typeof value !== 'string' || !value.trim()) throw projectionError(code);
  return value;
}

function requiredBoolean(value, code) {
  if (typeof value !== 'boolean') throw projectionError(code);
  return value;
}

function nullableString(value) {
  return typeof value === 'string' && value ? value : null;
}

function finiteOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function stringArray(value) {
  return Array.isArray(value) ? value.map(String) : [];
}

function projectionError(code) {
  const error = new TypeError(code);
  error.code = code;
  return error;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object') return value;
  Object.values(value).forEach(deepFreeze);
  return Object.isFrozen(value) ? value : Object.freeze(value);
}
