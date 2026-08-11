import {
  assertTopologyEditInlineReplacementTarget,
} from '../topology-edit-inline-component-replacement.js';
import {
  deriveTopologyEditChangedScope,
} from '../professional/topology-edit-change-scope.js';
import {
  createTopologyEditOperationPlan,
} from '../professional/topology-edit-operation-plan.js';

export function compileTopologyEditTableCatalogueComponentReplacement(intent, topology) {
  const payload = intent.requestedValue;
  const target = assertTopologyEditInlineReplacementTarget(topology, payload);
  const componentType = payload.catalogueBinding.componentType;
  if (!['FLANGE', 'REDUCER'].includes(componentType)) {
    throw new RangeError(
      'TopologyEditTableEngineeringPlanner: fitting catalogue replacement is limited to FLANGE/REDUCER.',
    );
  }
  const changedScope = deriveTopologyEditChangedScope(topology, {
    basisHash: topology.canonicalTopologyHash,
    nodeIds: [target.from.id, target.to.id],
    edgeIds: [target.edge.id],
  });
  return createTopologyEditOperationPlan({
    operationType: 'COMPOSITE_ENGINEERING_EDIT',
    basisHash: topology.canonicalTopologyHash,
    targetIds: [target.edge.id, target.from.id, target.to.id].sort(),
    parameters: {
      aggregateKind: 'TABLE_CATALOGUE_COMPONENT_REPLACEMENT',
      componentType,
      priorCatalogueRecordHash: intent.priorValue.catalogueRecordHash,
      requestedCatalogueRecordHash: payload.catalogueBinding.recordHash,
      geometryPolicy: 'PRESERVE_ENVELOPE',
    },
    commandIntents: [{ commandType: 'REPLACE_INLINE_COMPONENT', payload }],
    changedScope,
    unresolvedEvidence: [],
  });
}
