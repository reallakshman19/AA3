import {
  computeInputXmlModelHealthSourceEvidenceHash,
  computeInputXmlModelHealthSourceSemanticHash,
  diagnoseInputXmlTopologyGraph,
  diagnoseInputXmlTopologyProximity,
  requireInputXmlModelHealthSource,
  requireTopologyGraphDiagnostics,
  requireTopologyProximityDiagnostics,
} from '../geometry/model-health/index.js';
import { buildInputXmlFeatureInventory } from './inputxml-feature-inventory.js';
import {
  DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE,
  INPUTXML_MODEL_HEALTH_CAPABILITY_DEPENDENCIES,
  STRICT_INPUTXML_LINEAR_STATIC_PROFILE,
} from './inputxml-model-health-profile.js';
import {
  INPUTXML_LINEAR_MODEL_HEALTH_SCHEMA,
  sealInputXmlLinearModelHealth,
} from './inputxml-linear-model-health-contract.js';
import { collectInputXmlLinearModelHealthFindings } from './inputxml-linear-model-health-findings.js';
import { foldInputXmlLinearModelHealthCapabilities } from './inputxml-linear-model-health-capabilities.js';

export function diagnoseInputXmlLinearModelHealth(sourceBundle, options) {
  if (options === undefined) options = {};
  const accepted = requireInputXmlModelHealthSource(sourceBundle);
  const graph = requireTopologyGraphDiagnostics(
    options.graphReport ?? diagnoseInputXmlTopologyGraph(accepted, options.graph ?? {}),
    accepted,
  );
  const proximity = requireTopologyProximityDiagnostics(
    options.proximityReport ?? diagnoseInputXmlTopologyProximity(accepted, options.proximity ?? {}),
    accepted,
  );
  const inventory = buildInputXmlFeatureInventory(accepted);
  const findings = collectInputXmlLinearModelHealthFindings({
    sourceBundle: accepted,
    graph,
    proximity,
    inventory,
  });
  const capabilities = foldInputXmlLinearModelHealthCapabilities(findings);
  const capabilityStatusById = Object.freeze(Object.fromEntries(
    capabilities.map((row) => [row.capabilityId, row.status]),
  ));
  const sourceSemanticHash = computeInputXmlModelHealthSourceSemanticHash(accepted);
  const sourceEvidenceHash = computeInputXmlModelHealthSourceEvidenceHash(accepted);

  return sealInputXmlLinearModelHealth({
    schema: INPUTXML_LINEAR_MODEL_HEALTH_SCHEMA,
    profileIds: Object.freeze([
      STRICT_INPUTXML_LINEAR_STATIC_PROFILE,
      DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE,
    ]),
    sourceBundleSemanticHash: sourceSemanticHash,
    sourceBundleEvidenceHash: sourceEvidenceHash,
    topologyGraphSemanticHash: graph.semanticHash,
    topologyGraphEvidenceHash: graph.evidenceHash,
    topologyProximitySemanticHash: proximity.semanticHash,
    topologyProximityEvidenceHash: proximity.evidenceHash,
    capabilityDependencies: INPUTXML_MODEL_HEALTH_CAPABILITY_DEPENDENCIES,
    capabilities,
    inventory,
    findings,
    summary: Object.freeze({
      inventoryCount: inventory.length,
      activeInventoryCount: inventory.filter((row) => row.active).length,
      findingCount: findings.length,
      errorFindingCount: findings.filter((row) => row.severity === 'error').length,
      warningFindingCount: findings.filter((row) => row.severity === 'warning').length,
      infoFindingCount: findings.filter((row) => row.severity === 'info').length,
      capabilityStatusById,
      sourceKindCounts: Object.freeze(countBy(inventory, 'sourceKind')),
    }),
    executionAvailability: Object.freeze({
      strictProfilePreparationAvailable: false,
      approximateProfilePreparationAvailable: false,
      strictSolveAuthorized: false,
      approximateSolveAuthorized: false,
      legacyRawTextSolveGovernedByReport: false,
      reasonCodes: Object.freeze([
        'PROFILE_SPECIFIC_PREPARATION_NOT_IMPLEMENTED',
        'LEGACY_RAW_TEXT_SOLVE_NOT_MODEL_HEALTH_GOVERNED',
      ]),
    }),
  });
}

function countBy(rows, key) {
  const result = {};
  for (const row of rows) result[row[key]] = (result[row[key]] ?? 0) + 1;
  return Object.fromEntries(Object.entries(result).sort(([left], [right]) => (
    left < right ? -1 : left > right ? 1 : 0
  )));
}
