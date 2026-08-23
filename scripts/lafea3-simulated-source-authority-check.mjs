import { createLafeaMockDocument, createLafeaMockDomainAndGeometryEvidence } from '../src/workspace/advanced-mock-data.js';
import { issueLafeaSourceAuthority } from '../src/workspace/lafea-source-authority.js';
import { requireLafeaStageComposition } from '../src/workspace/lafea-stage-composition-root.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const stageId = 'LAFEA.3';
const imported = createLafeaMockDocument(stageId);
const composition = requireLafeaStageComposition(stageId);
const normalized = composition.normalizeDocument(imported);
const authority = issueLafeaSourceAuthority(stageId, normalized, 'SIMULATED_SOURCE_AUTHORITY_CHECK');
const repeated = issueLafeaSourceAuthority(stageId, normalized, 'SIMULATED_SOURCE_AUTHORITY_REPLAY');

assert(authority.sourceHash === repeated.sourceHash, 'Canonical source authority is not deterministic.');
assert(/^sha256:[0-9a-f]{64}$/u.test(authority.sourceHash), 'Canonical source authority is not SHA-256.');

const evidence = createLafeaMockDomainAndGeometryEvidence(stageId, authority.sourceHash);
assert(evidence?.domain?.sourceHash === authority.sourceHash, 'Analysis domain is not bound to canonical source authority.');
assert(evidence?.geometryEvidence?.sourceHash === authority.sourceHash, 'Geometry evidence is not bound to canonical source authority.');

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
}, null, 2));
