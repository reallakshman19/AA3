import {
  deriveTopologyEditTableNodePositionCapability,
  deriveTopologyEditTableSupportPlacementCapability,
} from '../topology-edit/table/topology-edit-table-edit-capability.js';
import { planTopologyEditTableDraft } from '../topology-edit/table/topology-edit-table-draft-plan.js';
import { createTopologyEditTableIntent } from '../topology-edit/table/topology-edit-table-intent.js';
import {
  resolveTopologyEditTableValveCatalogueSelection,
} from '../topology-edit/table/topology-edit-table-valve-catalogue.js';

export function stageTopologyEditNodePosition(runtime, canonicalId, endpointInput) {
  return stage(runtime, () => {
    const endpoint = required(endpointInput, 'endpoint').toUpperCase();
    if (!['FROM', 'TO'].includes(endpoint)) {
      throw new RangeError('TopologyEditTableEngineeringRuntime: endpoint must be FROM or TO.');
    }
    const row = exactRow(runtime.projection, canonicalId);
    const topology = runtime.controller.session.currentTopology();
    const capability = deriveTopologyEditTableNodePositionCapability({
      row,
      endpoint,
      projection: runtime.projection,
      canonicalTopology: topology,
    });
    if (capability.status !== 'AVAILABLE') {
      throw new RangeError(`TopologyEditTableEngineeringRuntime: ${capability.reason}`);
    }
    const nodeId = capability.details.nodeId;
    const node = exactNode(topology, nodeId);
    return createTopologyEditTableIntent({
      projection: runtime.projection,
      sessionSnapshot: runtime.controller.session.snapshot(),
      canonicalId,
      intentKind: 'NODE_POSITION',
      requestedValue: {
        endpoint,
        nodeId,
        expectedPosition: node.position,
        position: {
          x: finite(value(runtime, `[data-table-edit-node-x="${endpoint}"]`), `${endpoint} X`),
          y: finite(value(runtime, `[data-table-edit-node-y="${endpoint}"]`), `${endpoint} Y`),
          z: finite(value(runtime, `[data-table-edit-node-z="${endpoint}"]`), `${endpoint} Z`),
        },
      },
      geometryPolicy: {
        movementMode: required(
          value(runtime, `[data-table-edit-node-mode="${endpoint}"]`),
          `${endpoint} movement mode`,
        ),
      },
    });
  });
}

export function stageTopologyEditSupportPlacement(runtime, canonicalId) {
  return stage(runtime, () => {
    const row = exactRow(runtime.projection, canonicalId);
    const topology = runtime.controller.session.currentTopology();
    const capability = deriveTopologyEditTableSupportPlacementCapability({
      row,
      projection: runtime.projection,
      canonicalTopology: topology,
    });
    if (capability.status !== 'NEEDS_INPUT' || !capability.details?.hostEdgeId) {
      throw new RangeError(`TopologyEditTableEngineeringRuntime: ${capability.reason}`);
    }
    return createTopologyEditTableIntent({
      projection: runtime.projection,
      sessionSnapshot: runtime.controller.session.snapshot(),
      canonicalId,
      intentKind: 'SUPPORT_PLACEMENT',
      requestedValue: {
        hostEdgeId: capability.details.hostEdgeId,
        stationMm: nonNegative(value(runtime, '[data-table-edit-support-station]'), 'support station'),
      },
    });
  });
}

export function stageTopologyEditSupportRestraint(runtime, canonicalId) {
  return stage(runtime, () => createTopologyEditTableIntent({
    projection: runtime.projection,
    sessionSnapshot: runtime.controller.session.snapshot(),
    canonicalId,
    intentKind: 'SUPPORT_RESTRAINT',
    requestedValue: {
      family: required(value(runtime, '[data-table-edit-support-family]'), 'support family'),
      direction: value(runtime, '[data-table-edit-support-direction]'),
      gapMm: optionalNonNegative(value(runtime, '[data-table-edit-support-gap]'), 'support gap'),
      travelMm: optionalNonNegative(value(runtime, '[data-table-edit-support-travel]'), 'support travel'),
    },
  }));
}

export function stageTopologyEditValveReplacement(runtime, canonicalId) {
  return stage(runtime, () => {
    const row = exactRow(runtime.projection, canonicalId);
    const selection = resolveTopologyEditTableValveCatalogueSelection({
      catalogue: runtime.controller.professionalRuntime?.catalogue,
      row,
      recordId: value(runtime, '[data-table-edit-valve-catalogue-record]'),
    });
    return createTopologyEditTableIntent({
      projection: runtime.projection,
      sessionSnapshot: runtime.controller.session.snapshot(),
      canonicalId,
      intentKind: 'VALVE_REPLACEMENT',
      requestedValue: {
        catalogueBinding: selection.catalogueBinding,
        direction: 'FROM_TO',
      },
      geometryPolicy: {
        anchor: value(runtime, '[data-table-edit-anchor]'),
        propagation: value(runtime, '[data-table-edit-propagation]'),
      },
    });
  });
}

export function stageTopologyEditTeeReducerRelation(runtime, canonicalId) {
  return stage(runtime, () => {
    const row = exactRow(runtime.projection, canonicalId);
    const branchPortKey = required(value(runtime, '[data-table-edit-tee-branch-port]'), 'branch port');
    const binding = row.identity.portBindings.find((entry) => entry.portKey === branchPortKey);
    if (!binding?.nodeId) {
      throw new RangeError('TopologyEditTableEngineeringRuntime: selected branch port is not an exact row binding.');
    }
    const runNodeIds = row.identity.nodeIds.filter((id) => id !== binding.nodeId).sort();
    if (runNodeIds.length !== 2) {
      throw new RangeError('TopologyEditTableEngineeringRuntime: TEE branch selection must leave exactly two run nodes.');
    }
    return createTopologyEditTableIntent({
      projection: runtime.projection,
      sessionSnapshot: runtime.controller.session.snapshot(),
      canonicalId,
      intentKind: 'TEE_REDUCER_RELATION',
      requestedValue: {
        branchNodeId: binding.nodeId,
        branchPortKey,
        runNodeIds,
        reducerCanonicalId: required(value(runtime, '[data-table-edit-tee-reducer]'), 'reducer'),
        runNominalSizeMm: positive(value(runtime, '[data-table-edit-tee-run-dn]'), 'run DN'),
        teeBranchNominalSizeMm: positive(value(runtime, '[data-table-edit-tee-branch-dn]'), 'TEE branch DN'),
        downstreamNominalSizeMm: positive(value(runtime, '[data-table-edit-tee-downstream-dn]'), 'downstream DN'),
        relationPolicy: 'EXPLICIT_REDUCER',
      },
    });
  });
}

function stage(runtime, intentFactory) {
  try {
    const intent = intentFactory();
    const draft = planTopologyEditTableDraft({
      intents: runtime.intents,
      intent,
      projection: runtime.projection,
      canonicalTopology: runtime.controller.session.currentTopology(),
    });
    runtime.intents = [...draft.intents];
    runtime.batch = draft.batch;
    runtime.batchPlan = draft.batchPlan;
    runtime.staleResult = null;
    runtime.clearCandidate();
    runtime.error = null;
    runtime.message = `${draft.batch.intentCount} table change(s) staged against the exact certified revision.`;
  } catch (error) {
    runtime.error = error instanceof Error ? error.message : String(error);
  }
  runtime.render();
  return true;
}

function exactRow(projection, canonicalId) {
  const rows = (projection?.rows ?? []).filter((row) => row.identity?.canonicalId === canonicalId);
  if (rows.length !== 1) {
    throw new RangeError(`TopologyEditTableEngineeringRuntime: ${canonicalId} resolved ${rows.length} rows.`);
  }
  return rows[0];
}
function exactNode(topology, nodeId) {
  const nodes = (topology?.nodes ?? []).filter((node) => node?.id === nodeId);
  if (nodes.length !== 1) {
    throw new RangeError(`TopologyEditTableEngineeringRuntime: node ${nodeId} resolved ${nodes.length} records.`);
  }
  return nodes[0];
}
function value(runtime, selector) { return runtime.element?.querySelector(selector)?.value ?? ''; }
function required(input, label) {
  const text = String(input ?? '').trim();
  if (!text) throw new TypeError(`TopologyEditTableEngineeringRuntime: ${label} is required.`);
  return text;
}
function finite(input, label) {
  const number = Number(input);
  if (!Number.isFinite(number)) {
    throw new RangeError(`TopologyEditTableEngineeringRuntime: ${label} must be finite.`);
  }
  return number;
}
function nonNegative(input, label) {
  const number = finite(input, label);
  if (number < 0) throw new RangeError(`TopologyEditTableEngineeringRuntime: ${label} must be non-negative.`);
  return number;
}
function positive(input, label) {
  const number = Number(input);
  if (!Number.isFinite(number) || number <= 0) {
    throw new RangeError(`TopologyEditTableEngineeringRuntime: ${label} must be positive.`);
  }
  return number;
}
function optionalNonNegative(input, label) {
  if (String(input ?? '').trim() === '') return null;
  return nonNegative(input, label);
}
