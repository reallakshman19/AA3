import { createTopologyEditTableBatch } from '../topology-edit/table/topology-edit-table-batch.js';
import { planTopologyEditTableBatch } from '../topology-edit/table/topology-edit-table-batch-planner.js';
import {
  deriveTopologyEditTableNodePositionCapability,
} from '../topology-edit/table/topology-edit-table-edit-capability.js';
import { createTopologyEditTableIntent } from '../topology-edit/table/topology-edit-table-intent.js';
import {
  deriveTopologyEditTableTeeReducerCapability,
  resolveTopologyEditTableTeeReducerSelection,
  topologyEditTableTeeReducerCandidateLabel,
  topologyEditTableTeeReducerCandidates,
} from '../topology-edit/table/topology-edit-table-tee-reducer.js';
import {
  resolveTopologyEditTableValveCatalogueSelection,
} from '../topology-edit/table/topology-edit-table-valve-catalogue.js';

const TEE_EDITOR_INPUT = [
  '[data-table-edit-tee-branch-port]',
  '[data-table-edit-tee-reducer]',
  '[data-table-edit-tee-run-dn]',
  '[data-table-edit-tee-branch-dn]',
  '[data-table-edit-tee-downstream-dn]',
].join(',');

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
    const draft = teeDraft(runtime.element);
    const selection = resolveTopologyEditTableTeeReducerSelection({
      projection: runtime.projection,
      row,
      branchPortKey: draft.branchPortKey,
      reducerCanonicalId: draft.reducerCanonicalId,
      runNominalSizeMm: draft.runNominalSizeMm,
      teeBranchNominalSizeMm: draft.teeBranchNominalSizeMm,
      downstreamNominalSizeMm: draft.downstreamNominalSizeMm,
    });
    return createTopologyEditTableIntent({
      projection: runtime.projection,
      sessionSnapshot: runtime.controller.session.snapshot(),
      canonicalId,
      intentKind: 'TEE_REDUCER_RELATION',
      requestedValue: {
        branchNodeId: selection.branchNodeId,
        branchPortKey: selection.branchPortKey,
        runNodeIds: selection.runNodeIds,
        reducerCanonicalId: selection.reducerCanonicalId,
        runNominalSizeMm: selection.runNominalSizeMm,
        teeBranchNominalSizeMm: selection.teeBranchNominalSizeMm,
        downstreamNominalSizeMm: selection.downstreamNominalSizeMm,
        relationPolicy: 'EXPLICIT_REDUCER',
      },
    });
  });
}

export function handleTopologyEditTableEngineeringInput(runtime, event) {
  const target = event.target;
  if (!target?.matches?.(TEE_EDITOR_INPUT) || !runtime.element?.contains(target)) return false;
  const section = target.closest?.('[data-table-editor-id]');
  const canonicalId = section?.dataset?.tableEditorId;
  if (!section || !canonicalId) return false;
  const row = exactRow(runtime.projection, canonicalId);
  if (target.matches('[data-table-edit-tee-branch-port]')) {
    syncReducerOptions(section, runtime.projection, row, '');
  }
  syncTeeCapability(section, runtime.projection, row);
  return true;
}

function syncReducerOptions(section, projection, row, selectedReducerId) {
  const branchPortKey = section.querySelector('[data-table-edit-tee-branch-port]')?.value ?? '';
  const select = section.querySelector('[data-table-edit-tee-reducer]');
  if (!select) return;
  const candidates = branchPortKey
    ? topologyEditTableTeeReducerCandidates({ projection, row, branchPortKey }) : [];
  const prompt = branchPortKey
    ? (candidates.length ? 'Choose directly connected reducer…' : 'No compatible reducer at selected branch')
    : 'Choose branch port first…';
  const document = select.ownerDocument;
  const options = [domOption(document, '', prompt), ...candidates.map((candidate) => domOption(
    document,
    candidate.reducerCanonicalId,
    topologyEditTableTeeReducerCandidateLabel(candidate),
  ))];
  select.replaceChildren(...options);
  select.disabled = !(branchPortKey && candidates.length);
  if (candidates.some((candidate) => candidate.reducerCanonicalId === selectedReducerId)) {
    select.value = selectedReducerId;
  }
}

function syncTeeCapability(section, projection, row) {
  const draft = teeDraft(section);
  const capability = deriveTopologyEditTableTeeReducerCapability({ projection, row, ...draft });
  const stageButton = section.querySelector('[data-table-action="stage-tee-reducer-relation"]');
  if (stageButton) {
    stageButton.disabled = capability.status !== 'AVAILABLE';
    stageButton.title = capability.reason;
  }
  const status = section.querySelector('[data-table-tee-capability]');
  if (status) {
    status.dataset.tableCapabilityStatus = capability.status;
    status.textContent = capability.status === 'AVAILABLE'
      ? 'Certified branch/reducer relation' : capability.reason;
  }
  return capability;
}

function teeDraft(root) {
  return {
    branchPortKey: root?.querySelector('[data-table-edit-tee-branch-port]')?.value ?? '',
    reducerCanonicalId: root?.querySelector('[data-table-edit-tee-reducer]')?.value ?? '',
    runNominalSizeMm: root?.querySelector('[data-table-edit-tee-run-dn]')?.value ?? '',
    teeBranchNominalSizeMm: root?.querySelector('[data-table-edit-tee-branch-dn]')?.value ?? '',
    downstreamNominalSizeMm: root?.querySelector('[data-table-edit-tee-downstream-dn]')?.value ?? '',
  };
}
function domOption(document, valueInput, label) {
  const option = document.createElement('option');
  option.value = valueInput;
  option.textContent = label;
  return option;
}

function stage(runtime, intentFactory) {
  try {
    const intent = intentFactory();
    const canonicalId = intent.target.canonicalId;
    const intents = [
      ...runtime.intents.filter((row) => row.target.canonicalId !== canonicalId),
      intent,
    ];
    const batch = createTopologyEditTableBatch({ intents });
    const batchPlan = planTopologyEditTableBatch({
      batch,
      projection: runtime.projection,
      canonicalTopology: runtime.controller.session.currentTopology(),
    });
    runtime.intents = intents;
    runtime.batch = batch;
    runtime.batchPlan = batchPlan;
    runtime.staleResult = null;
    runtime.clearCandidate();
    runtime.error = null;
    runtime.message = `${batch.intentCount} table change(s) staged against the exact certified revision.`;
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
