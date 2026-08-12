import { semanticHash } from '../core/shared-piping-model/canonical-json.js';
import { deepFreeze } from '../core/shared-piping-model/immutable.js';
import { lfeaNativeB31Error } from './native-b31-authority-contract.js';

export const LFEA_NATIVE_B31_CODE_STATION_SCHEMA =
  'lfea-native-b31-code-station-authority/v1';

/**
 * Build code-only station authority for exact straight-pipe spans already
 * represented by one governed B-3.1 frame element. This record owns no
 * stiffness, flexibility, SIF or code equation; it only binds physical code
 * points to exact existing element ends.
 */
export function createLfeaNativeStraightCodeStationAuthority(preFlight, checks) {
  const structural = preFlight.preparation.structuralPreparation;
  const compilation = structural.compilation;
  const bindingByElement = new Map(structural.segmentBindings
    .map((row) => [row.elementId, row]));
  const modelElementById = new Map(compilation.model.elements
    .map((row) => [row.elementId, row]));
  const nodeById = new Map(compilation.model.nodes.map((row) => [row.nodeId, row]));
  const targetIds = [...new Set(checks.map((row) => row.elementId))].sort(compareAscii);
  const components = targetIds.map((elementId) => {
    const binding = bindingByElement.get(elementId);
    const element = modelElementById.get(elementId);
    if (!binding || !element) {
      throw lfeaNativeB31Error(
        'LFEA_NATIVE_B31_TARGET_ELEMENT_MISSING',
        `B31 target element ${elementId} is absent from current structural authority.`,
      );
    }
    requireExactStraightBinding(binding);
    const nodeI = requireNode(nodeById, element.nodeI, elementId);
    const nodeJ = requireNode(nodeById, element.nodeJ, elementId);
    return deepFreeze({
      componentId: elementId,
      sourceFeatureId: binding.sourceFeatureId,
      sourceSegmentId: binding.segmentId,
      componentType: 'STRAIGHT_PIPE',
      elementId,
      materialStateId: element.materialStateId,
      sectionStateId: element.sectionStateId,
      materialResolutionSemanticHash: binding.materialResolutionSemanticHash,
      analysisSectionSemanticHash: binding.analysisSectionSemanticHash,
      stations: Object.freeze([
        station(elementId, 'I', element.nodeI, nodeI.position),
        station(elementId, 'J', element.nodeJ, nodeJ.position),
      ]),
    });
  });
  for (const check of checks) {
    if (check.stressFactorSet.componentId !== check.elementId) {
      throw lfeaNativeB31Error(
        'LFEA_NATIVE_B31_FACTOR_COMPONENT_MISMATCH',
        `Stress factor set ${check.stressFactorSet.factorSetId} does not belong to target ${check.elementId}.`,
      );
    }
  }
  const base = {
    schema: LFEA_NATIVE_B31_CODE_STATION_SCHEMA,
    parentSourceBundleSemanticHash: preFlight.preparation.sourceBundleSemanticHash,
    parentModelSemanticHash: preFlight.preparation.modelSemanticHash,
    parentCompilationSemanticHash: compilation.semanticHash,
    components: Object.freeze(components),
  };
  return deepFreeze({ ...base, semanticHash: semanticHash(base) });
}

export function requireLfeaNativeStraightCodeStationAuthority(record) {
  if (!record || record.schema !== LFEA_NATIVE_B31_CODE_STATION_SCHEMA
    || !Array.isArray(record.components) || record.components.length === 0) {
    throw lfeaNativeB31Error(
      'LFEA_NATIVE_B31_CODE_STATION_AUTHORITY_INVALID',
      'A non-empty straight-pipe code-station authority is required.',
    );
  }
  const { semanticHash: retainedHash, ...base } = record;
  if (retainedHash !== semanticHash(base)) {
    throw lfeaNativeB31Error(
      'LFEA_NATIVE_B31_CODE_STATION_HASH_MISMATCH',
      'Straight-pipe code-station authority semantic hash is stale.',
    );
  }
  return record;
}

export function codeStationFor(authority, elementId, end) {
  const accepted = requireLfeaNativeStraightCodeStationAuthority(authority);
  const component = accepted.components.find((row) => row.elementId === elementId);
  const stationRow = component?.stations.find((row) => row.end === end);
  if (!component || !stationRow) {
    throw lfeaNativeB31Error(
      'LFEA_NATIVE_B31_CODE_STATION_MISSING',
      `Straight-pipe code station ${elementId}:${end} is not governed.`,
    );
  }
  return deepFreeze({ component, station: stationRow });
}

function requireExactStraightBinding(binding) {
  if (binding.componentKind !== 'STRAIGHT_PIPE'
    || binding.representabilityDisposition !== 'IMPLEMENTED_EXACTLY'
    || binding.limitationCode !== null) {
    throw lfeaNativeB31Error(
      'LFEA_NATIVE_B31_TARGET_NOT_EXACT_STRAIGHT_PIPE',
      `Element ${binding.elementId} is not an exact straight-pipe B31 target.`,
    );
  }
}
function requireNode(index, nodeId, elementId) {
  const node = index.get(nodeId);
  if (!node) {
    throw lfeaNativeB31Error(
      'LFEA_NATIVE_B31_TARGET_NODE_MISSING',
      `Element ${elementId} code-station node ${nodeId} is missing.`,
    );
  }
  return node;
}
function station(elementId, end, nodeId, position) {
  return deepFreeze({
    stationId: `${elementId}.${end}`,
    kind: `STRAIGHT_PIPE_END_${end}`,
    nodeId,
    position: Object.freeze([position.x, position.y, position.z]),
    arcFraction: null,
    end,
  });
}
function compareAscii(left, right) { return left < right ? -1 : left > right ? 1 : 0; }
