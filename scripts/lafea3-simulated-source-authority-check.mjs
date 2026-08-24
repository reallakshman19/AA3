import {
  createLafeaMockDocument,
  createLafeaMockDomainAndGeometryEvidence,
} from '../src/workspace/lafea-simulated-source-provider.js';
import { issueLafeaSourceAuthority } from '../src/workspace/lafea-source-authority.js';
import { requireLafeaStageComposition } from '../src/workspace/lafea-stage-composition-root.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const stageId = 'LAFEA.3';
const imported = await createLafeaMockDocument(stageId);
const composition = requireLafeaStageComposition(stageId);
const normalized = composition.normalizeDocument(imported);
const authority = issueLafeaSourceAuthority(stageId, normalized, 'SIMULATED_SOURCE_AUTHORITY_CHECK');
const repeated = issueLafeaSourceAuthority(stageId, normalized, 'SIMULATED_SOURCE_AUTHORITY_REPLAY');

assert(authority.sourceHash === repeated.sourceHash, 'Canonical source authority is not deterministic.');
assert(/^sha256:[0-9a-f]{64}$/u.test(authority.sourceHash), 'Canonical source authority is not SHA-256.');

const evidence = await createLafeaMockDomainAndGeometryEvidence(stageId, authority.sourceHash);
assert(evidence?.domain?.sourceHash === authority.sourceHash, 'Analysis domain is not bound to canonical source authority.');
assert(evidence?.geometryEvidence?.sourceHash === authority.sourceHash, 'Geometry evidence is not bound to canonical source authority.');
assert(evidence.geometryEvidence.analysisDomainHash === evidence.domain.semanticHash,
  'Geometry evidence is not bound to the exact retained analysis domain.');

const geometryVertexIds = new Set(evidence.geometryEvidence.geometry.vertices.map((row) => row.vertexId));
for (const nodeId of ['N01', 'N02', 'N03', 'N04', 'N08', 'N12', 'N14', 'N13', 'N09', 'N05']) {
  assert(geometryVertexIds.has(nodeId), `Governed Sample geometry is missing source boundary node ${nodeId}.`);
}

const sourceCaseIds = normalized.loadCases.map((row) => row.loadCaseId).sort();
const domainCaseIds = evidence.domain.physicalCases.map((row) => row.caseId).sort();
assert(JSON.stringify(domainCaseIds) === JSON.stringify(sourceCaseIds),
  'Governed Sample physical-case inventory differs from the normalized source.');

const sourceRestraints = normalized.constraints.map((row) => ({
  attachmentId: row.constraintId,
  targetId: row.nodeId,
  dof: row.dof,
  value: row.value,
})).sort(compareById);
const domainRestraints = evidence.domain.attachments
  .filter((row) => row.kind === 'RESTRAINT')
  .map((row) => ({
    attachmentId: row.attachmentId,
    targetId: row.targetId,
    dof: row.payload.ux === true ? 'UX' : row.payload.uy === true ? 'UY' : 'INVALID',
    value: 0,
    caseIds: [...row.physicalCaseIds].sort(),
  })).sort(compareById);
assert(domainRestraints.length === sourceRestraints.length,
  'Governed Sample restraint count differs from the normalized source.');
for (let index = 0; index < sourceRestraints.length; index += 1) {
  const sourceRow = sourceRestraints[index];
  const domainRow = domainRestraints[index];
  assert(domainRow.attachmentId === sourceRow.attachmentId, `Restraint identity mismatch at ${sourceRow.attachmentId}.`);
  assert(domainRow.targetId === sourceRow.targetId, `Restraint target mismatch at ${sourceRow.attachmentId}.`);
  assert(domainRow.dof === sourceRow.dof, `Restraint DOF mismatch at ${sourceRow.attachmentId}.`);
  assert(domainRow.value === sourceRow.value, `Restraint value mismatch at ${sourceRow.attachmentId}.`);
  assert(JSON.stringify(domainRow.caseIds) === JSON.stringify(sourceCaseIds),
    `Restraint ${sourceRow.attachmentId} is not applied to every source load case.`);
}

const sourceForces = normalized.loadCases.flatMap((loadCase) => loadCase.nodalForces.map((row) => ({
  attachmentId: row.loadId,
  caseId: loadCase.loadCaseId,
  targetId: row.nodeId,
  fx: row.fx,
  fy: row.fy,
}))).sort(compareById);
const domainForces = evidence.domain.attachments
  .filter((row) => row.kind === 'CONCENTRATED_LOAD')
  .map((row) => ({
    attachmentId: row.attachmentId,
    caseId: row.physicalCaseIds.length === 1 ? row.physicalCaseIds[0] : 'INVALID',
    targetId: row.targetId,
    fx: row.payload.fx,
    fy: row.payload.fy,
  })).sort(compareById);
assert(JSON.stringify(domainForces) === JSON.stringify(sourceForces),
  'Governed Sample nodal-force attachments differ from the normalized source.');
assert(domainForces.some((row) => row.caseId === 'CASE-B' && row.attachmentId === 'F5'),
  'CASE-B source load F5 did not reach the governed domain.');
assert(domainForces.some((row) => row.caseId === 'CASE-B' && row.attachmentId === 'F6'),
  'CASE-B source load F6 did not reach the governed domain.');

const controllerSource = await (await import('node:fs/promises')).readFile(
  new URL('../src/workspace/lafea-workbench-controller.js', import.meta.url),
  'utf8',
);
assert(!controllerSource.includes("sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"),
  'Controller contains a hardcoded simulated engineering source hash.');
assert(!controllerSource.includes('documentValue.packageHash ||'),
  'Controller still falls back from package identity to engineering source authority.');
assert(controllerSource.includes('issueLafeaSourceAuthority('),
  'Controller does not derive simulated source authority through the production authority function.');

console.log(JSON.stringify({
  status: 'PASS',
  stageId,
  sourceHash: authority.sourceHash,
  domainHash: evidence.domain.semanticHash,
  geometryHash: evidence.geometryEvidence.analysisGeometryHash,
  sourceCaseIds,
  sourceRestraintCount: sourceRestraints.length,
  sourceNodalForceCount: sourceForces.length,
  caseBNodalForceCount: sourceForces.filter((row) => row.caseId === 'CASE-B').length,
}, null, 2));

function compareById(left, right) {
  return left.attachmentId.localeCompare(right.attachmentId);
}
