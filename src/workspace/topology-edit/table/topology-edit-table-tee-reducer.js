import { deepFreeze, stringValue } from '../../../core/shared-piping-model/index.js';
import { assertTopologyEditTableProjection } from './topology-edit-table-projection.js';

const EPSILON_MM = 1e-9;

export function topologyEditTableTeeBranchBindings(row) {
  if (!isTeeRow(row)) return [];
  const nodeIds = new Set(row.identity.nodeIds ?? []);
  const groups = new Map();
  for (const binding of row.identity.portBindings ?? []) {
    if (!binding?.portKey || !binding?.nodeId || !nodeIds.has(binding.nodeId)) continue;
    if (!groups.has(binding.portKey)) groups.set(binding.portKey, []);
    groups.get(binding.portKey).push(binding);
  }
  return deepFreeze([...groups.entries()]
    .filter(([, bindings]) => bindings.length === 1)
    .map(([, bindings]) => ({ ...bindings[0] }))
    .sort((left, right) => left.portKey.localeCompare(right.portKey)));
}

export function topologyEditTableTeeReducerCandidates({
  projection: projectionInput,
  row,
  branchPortKey,
} = {}) {
  const projection = assertTopologyEditTableProjection(projectionInput);
  const branch = exactBranchBinding(row, branchPortKey);
  if (!branch) return [];
  const candidates = projection.rows.flatMap((candidate) => {
    const resolved = reducerCandidate(candidate, branch);
    return resolved ? [resolved] : [];
  }).sort((left, right) => left.reducerCanonicalId.localeCompare(right.reducerCanonicalId));
  return deepFreeze(candidates);
}

export function deriveTopologyEditTableTeeReducerCapability({
  projection,
  row,
  branchPortKey,
  reducerCanonicalId,
  runNominalSizeMm,
  teeBranchNominalSizeMm,
  downstreamNominalSizeMm,
} = {}) {
  if (!isTeeRow(row)) return unavailable('Exact canonical TEE junction row is required.');
  const branch = exactBranchBinding(row, branchPortKey);
  if (!branch) return unavailable('Select one exact TEE branch port binding.');
  const runNodeIds = (row.identity.nodeIds ?? []).filter((id) => id !== branch.nodeId).sort();
  if (runNodeIds.length !== 2) {
    return unavailable('Selected branch must leave exactly two canonical TEE run nodes.');
  }
  const candidates = topologyEditTableTeeReducerCandidates({ projection, row, branchPortKey });
  const reducerId = stringValue(reducerCanonicalId);
  if (!reducerId) return unavailable('Select one directly connected certified reducer.');
  const matches = candidates.filter((candidate) => candidate.reducerCanonicalId === reducerId);
  if (matches.length !== 1) {
    return unavailable('Selected reducer is not an exact compatible candidate for this branch.');
  }
  const runDn = positive(runNominalSizeMm);
  const branchDn = positive(teeBranchNominalSizeMm);
  const downstreamDn = positive(downstreamNominalSizeMm);
  if (runDn === null || branchDn === null || downstreamDn === null) {
    return unavailable('Run, TEE branch, and downstream DN must all be positive and finite.');
  }
  const candidate = matches[0];
  if (!nearlyEqual(branchDn, candidate.branchNominalSizeMm)) {
    return unavailable('TEE branch DN does not match the reducer branch-side nominal size.');
  }
  if (!nearlyEqual(downstreamDn, candidate.downstreamNominalSizeMm)) {
    return unavailable('Downstream DN does not match the reducer downstream nominal size.');
  }
  return deepFreeze({
    status: 'AVAILABLE',
    reason: 'Exact branch/reducer topology and catalogue relationship is representable.',
    details: {
      branchPortKey: branch.portKey,
      branchNodeId: branch.nodeId,
      runNodeIds,
      reducerCanonicalId: candidate.reducerCanonicalId,
      reducerTargetRevision: candidate.reducerTargetRevision,
      reducerRecordId: candidate.reducerRecordId,
      reducerRecordHash: candidate.reducerRecordHash,
      branchEndpoint: candidate.branchEndpoint,
      runNominalSizeMm: runDn,
      teeBranchNominalSizeMm: branchDn,
      downstreamNominalSizeMm: downstreamDn,
    },
  });
}

export function resolveTopologyEditTableTeeReducerSelection(input = {}) {
  const capability = deriveTopologyEditTableTeeReducerCapability(input);
  if (capability.status !== 'AVAILABLE') {
    throw new RangeError(`TopologyEditTableTeeReducer: ${capability.reason}`);
  }
  return capability.details;
}

export function topologyEditTableTeeReducerCandidateLabel(candidate) {
  if (!candidate) return '';
  const identity = candidate.tag || candidate.reducerCanonicalId;
  return `${identity} · ${candidate.reducerCanonicalId} · ${candidate.branchEndpoint} · DN ${candidate.branchNominalSizeMm} → ${candidate.downstreamNominalSizeMm}`;
}

function reducerCandidate(row, branch) {
  if (row?.elementType !== 'REDUCER' || row.identity?.canonicalKind !== 'EDGE') return null;
  if (row.custody?.catalogueAuthority !== 'EXACT' || !exactCatalogue(row.custody?.catalogue)) return null;
  const from = endpointBinding(row, 'FROM');
  const to = endpointBinding(row, 'TO');
  if (!from || !to || from.nodeId === to.nodeId) return null;
  const branchMatches = [from, to].filter((binding) => binding.nodeId === branch.nodeId);
  if (branchMatches.length !== 1) return null;
  const dnIn = positive(row.fields?.dnInMm);
  const dnOut = positive(row.fields?.dnOutMm);
  if (dnIn === null || dnOut === null || nearlyEqual(dnIn, dnOut)) return null;
  const branchEndpoint = branchMatches[0].endpoint;
  const branchDn = branchEndpoint === 'FROM' ? dnIn : dnOut;
  const downstreamDn = branchEndpoint === 'FROM' ? dnOut : dnIn;
  if (branchDn <= downstreamDn + EPSILON_MM) return null;
  return {
    reducerCanonicalId: row.identity.canonicalId,
    reducerTargetRevision: row.targetRevision,
    tag: stringValue(row.fields?.tag) || null,
    branchPortKey: branch.portKey,
    branchNodeId: branch.nodeId,
    branchEndpoint,
    branchNominalSizeMm: branchDn,
    downstreamNominalSizeMm: downstreamDn,
    reducerRecordId: row.custody.catalogue.recordId,
    reducerRecordHash: row.custody.catalogue.recordHash,
  };
}

function exactBranchBinding(row, branchPortKey) {
  const key = stringValue(branchPortKey);
  if (!key) return null;
  const matches = topologyEditTableTeeBranchBindings(row).filter((binding) => binding.portKey === key);
  return matches.length === 1 ? matches[0] : null;
}
function endpointBinding(row, endpoint) {
  const matches = (row.identity?.portBindings ?? []).filter((binding) => (
    binding?.endpoint === endpoint && binding?.nodeId
  ));
  return matches.length === 1 ? matches[0] : null;
}
function exactCatalogue(value) {
  return Boolean(value && ['catalogueHash', 'sourceHash', 'recordId', 'recordHash']
    .every((key) => stringValue(value[key])));
}
function isTeeRow(row) {
  return row?.elementType === 'TEE' && row.identity?.canonicalKind === 'JUNCTION';
}
function unavailable(reason) {
  return deepFreeze({ status: 'UNREPRESENTABLE', reason, details: null });
}
function positive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}
function nearlyEqual(left, right) { return Math.abs(Number(left) - Number(right)) <= EPSILON_MM; }
