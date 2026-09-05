import {
  EMP1_BENCHMARK_COMPARISON_STATE,
  projectEmp1BenchmarkEvidence,
} from '../core/emp1/emp1-benchmark-evidence-projection.js';
import {
  EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID,
  emp1CBoundedRoute,
} from '../core/emp1/emp1-c-bounded-route-registry.js';
import { EMP1_PVELITE_BENCHMARK_PROGRAMME } from '../core/emp1/emp1-pvelite-benchmark-programme.js';
import cauxBenchmark from '../../validation/emp1/caux2017-wrc01f/caux-pp24-31-benchmark-v1.json' with { type: 'json' };
import cauxComparisonCustody from '../../validation/emp1/caux2017-wrc01f/caux-pp24-31-comparison-custody-v1.json' with { type: 'json' };
import cauxQualification from '../../validation/emp1/caux2017-wrc01f/caux-pp24-31-benchmark-qualification-v3.json' with { type: 'json' };

export const EMP1_BENCHMARK_EVIDENCE_WORKSPACE_SCHEMA =
  'emp1-benchmark-evidence-workspace/v1';

const HISTORICAL_CAUX_LIMITATIONS = new Set([
  'DIRECT_PDF_REOBSERVATION_PENDING',
]);

/**
 * Compose already-retained benchmark evidence for the EMP.1 workspace.
 *
 * This layer validates custody relationships and delegates all comparison math to
 * the governed benchmark projection. It does not execute WRC, choose a tolerance,
 * change expected values, authorize a route, or create semantic hashes.
 */
export function projectEmp1BenchmarkEvidenceWorkspace() {
  const caux = projectCurrentCauxEvidence();
  const pvElite = projectPendingPvEliteEvidence();

  return deepFreeze({
    schema: EMP1_BENCHMARK_EVIDENCE_WORKSPACE_SCHEMA,
    comparators: [caux, pvElite],
    authorityBoundary: {
      presentationOnly: true,
      executesWrcMethod: false,
      selectsTolerance: false,
      mutatesExpectedValues: false,
      createsWrcMethodAuthority: false,
      createsEngineeringUseAuthority: false,
      createsProductionAuthority: false,
      createsCodeComplianceAuthority: false,
      createsReleaseAuthority: false,
    },
  });
}

function projectCurrentCauxEvidence() {
  requireCauxCustodyIdentity();
  const currentRoute = requireCurrentRoute(cauxComparisonCustody.routeRelationship);

  const evidence = projectEmp1BenchmarkEvidence({
    benchmark: cauxBenchmark,
    qualification: cauxQualification,
    comparator: cauxComparisonCustody.benchmark.comparator,
    route: cauxComparisonCustody.routeRelationship,
    referenceAvailable: true,
    caseId: cauxComparisonCustody.benchmark.caseId,
    methodRelationship: cauxComparisonCustody.methodRelationship,
    comparison: {
      quantities: cauxComparisonCustody.comparison.quantities,
      qualificationAvailable:
        cauxComparisonCustody.routeRelationship.comparisonQualificationAvailable,
      toleranceFrozenBeforeEmpObservation:
        cauxComparisonCustody.benchmark.freezeEvidence.toleranceFrozenBeforeEmpObservation,
      governing: {
        referenceLocation:
          cauxComparisonCustody.comparison.summary.governingReferenceLocation,
        emp1Location:
          cauxComparisonCustody.comparison.summary.governingEmp1Location,
      },
    },
    limitations: cauxComparisonCustody.limitations.filter(
      (code) => !HISTORICAL_CAUX_LIMITATIONS.has(code),
    ),
  });

  if (evidence.comparison.state !== EMP1_BENCHMARK_COMPARISON_STATE.COMPARISON_QUALIFIED) {
    throw workspaceError('EMP1_BENCHMARK_CAUX_COMPARISON_NOT_QUALIFIED');
  }
  if (cauxQualification.source?.directPdfPageReobservation !== 'PASS') {
    throw workspaceError('EMP1_BENCHMARK_CAUX_CURRENT_SOURCE_REOBSERVATION_NOT_PASS');
  }

  return {
    comparatorId: 'CAUX',
    evidence,
    currentSourceQualification: {
      qualificationId: cauxQualification.qualificationId,
      qualificationState: cauxQualification.status,
      directPdfPageReobservation: cauxQualification.source.directPdfPageReobservation,
      sourceIdentityVerified: cauxQualification.source.sourceIdentityVerified === true,
      sourceCustodyQualified: cauxQualification.source.sourceCustodyQualified === true,
      rawPdfSha256: cauxQualification.source.rawPdfSha256,
      gammaRadiusBasisForThisBenchmark:
        cauxQualification.source.gammaRadiusBasisForThisBenchmark,
      directObservationRecordState: cauxQualification.directPdfObservation?.status ?? null,
      historicalComparisonObservationState: evidence.sourceEvidence.directObservationState,
      supersedesQualificationId: cauxQualification.supersedesStatusOfQualificationId ?? null,
    },
    executionCustody: {
      state: cauxComparisonCustody.state,
      kind: cauxComparisonCustody.execution.kind,
      provenanceClass: cauxComparisonCustody.execution.provenanceClass,
      repositoryCommit: cauxComparisonCustody.execution.repositoryCommit,
      executedAt: cauxComparisonCustody.execution.executedAt,
      routeAuthoritySnapshotHash: cauxComparisonCustody.routeAuthority.snapshotHash,
    },
    currentRoute: {
      routeId: currentRoute.routeId,
      registered: currentRoute.registered,
      engineeringUseAuthorized: currentRoute.engineeringUseAuthorized,
      comparisonQualificationAvailable: currentRoute.comparisonQualificationAvailable,
      suspensionReasons: [...(currentRoute.suspensionReasons ?? [])],
    },
  };
}

function projectPendingPvEliteEvidence() {
  const route = emp1CBoundedRoute(EMP1_C_WRC537_GAMMA5_ZERO_DP_ROUTE_ID);
  if (!route) throw workspaceError('EMP1_BENCHMARK_PV_ELITE_ROUTE_REQUIRED');
  if (EMP1_PVELITE_BENCHMARK_PROGRAMME.reference.state !== 'REFERENCE_NOT_AVAILABLE') {
    throw workspaceError('EMP1_BENCHMARK_PV_ELITE_REFERENCE_STATE_UNEXPECTED');
  }

  const evidence = projectEmp1BenchmarkEvidence({
    benchmarkId: EMP1_PVELITE_BENCHMARK_PROGRAMME.programmeId,
    comparator: {
      id: EMP1_PVELITE_BENCHMARK_PROGRAMME.comparator.id,
      name: EMP1_PVELITE_BENCHMARK_PROGRAMME.comparator.name,
      version: null,
    },
    route: {
      routeId: route.routeId,
      registered: route.registered,
      engineeringUseAuthorized: route.engineeringUseAuthorized,
      comparisonQualificationAvailable: route.comparisonQualificationAvailable,
    },
    referenceAvailable: false,
    authorityRole: EMP1_PVELITE_BENCHMARK_PROGRAMME.comparator.authorityRole,
    caseId: EMP1_PVELITE_BENCHMARK_PROGRAMME.programmeId,
    methodRelationship: {
      comparisonOnly: true,
      routeIntent: EMP1_PVELITE_BENCHMARK_PROGRAMME.primaryCase.routeIntent,
      interpolationPolicy:
        EMP1_PVELITE_BENCHMARK_PROGRAMME.primaryCase.interpolationPolicy,
    },
    limitations: EMP1_PVELITE_BENCHMARK_PROGRAMME.limitations,
    comparison: { quantities: [] },
  });

  return {
    comparatorId: 'PV_ELITE',
    evidence,
    referenceProgramme: {
      state: EMP1_PVELITE_BENCHMARK_PROGRAMME.reference.state,
      sourceCustodyState:
        EMP1_PVELITE_BENCHMARK_PROGRAMME.reference.sourceCustodyState,
      expectedValuesState:
        EMP1_PVELITE_BENCHMARK_PROGRAMME.reference.expectedValuesState,
      versionState: EMP1_PVELITE_BENCHMARK_PROGRAMME.comparator.versionState,
      toleranceState: EMP1_PVELITE_BENCHMARK_PROGRAMME.tolerancePolicy.state,
      toleranceValue: EMP1_PVELITE_BENCHMARK_PROGRAMME.tolerancePolicy.value,
    },
  };
}

function requireCauxCustodyIdentity() {
  const custodyBenchmark = cauxComparisonCustody.benchmark;
  if (custodyBenchmark.benchmarkId !== cauxBenchmark.benchmarkId) {
    throw workspaceError('EMP1_BENCHMARK_CAUX_BENCHMARK_ID_MISMATCH');
  }
  if (custodyBenchmark.sourceEvidence?.semanticHash !== cauxBenchmark.semanticHash) {
    throw workspaceError('EMP1_BENCHMARK_CAUX_SEMANTIC_HASH_MISMATCH');
  }
  if (custodyBenchmark.sourceEvidence?.sourceHash !== cauxBenchmark.source?.rawPdfSha256
    || cauxQualification.source?.rawPdfSha256 !== cauxBenchmark.source?.rawPdfSha256) {
    throw workspaceError('EMP1_BENCHMARK_CAUX_SOURCE_HASH_MISMATCH');
  }
  if (cauxQualification.benchmark?.semanticHash !== cauxBenchmark.semanticHash) {
    throw workspaceError('EMP1_BENCHMARK_CAUX_QUALIFICATION_HASH_MISMATCH');
  }

  const relationship = cauxComparisonCustody.routeRelationship;
  const snapshot = cauxComparisonCustody.routeAuthority?.snapshot;
  if (!snapshot || snapshot.routeId !== relationship.routeId) {
    throw workspaceError('EMP1_BENCHMARK_CAUX_ROUTE_SNAPSHOT_ID_MISMATCH');
  }
  for (const field of [
    'registered',
    'engineeringUseAuthorized',
    'comparisonQualificationAvailable',
  ]) {
    if (snapshot[field] !== relationship[field]) {
      throw workspaceError(`EMP1_BENCHMARK_CAUX_ROUTE_SNAPSHOT_MISMATCH:${field}`);
    }
  }
}

function requireCurrentRoute(relationship) {
  const route = emp1CBoundedRoute(relationship.routeId);
  if (!route) throw workspaceError('EMP1_BENCHMARK_CAUX_CURRENT_ROUTE_REQUIRED');
  for (const field of [
    'registered',
    'engineeringUseAuthorized',
    'comparisonQualificationAvailable',
  ]) {
    if (route[field] !== relationship[field]) {
      throw workspaceError(`EMP1_BENCHMARK_CAUX_CURRENT_ROUTE_DRIFT:${field}`);
    }
  }
  return route;
}

function workspaceError(code) {
  const error = new TypeError(code);
  error.code = code;
  return error;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
