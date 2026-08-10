import assert from 'node:assert/strict';
import { semanticHash } from '../src/core/shared-piping-model/index.js';
import {
  LFEA_SOURCE_KINDS,
  requireLfeaSource,
  sealLfeaSource,
} from '../src/workspace/lfea-source-intake.js';
import { captureTopologyEditLfeaSource } from '../src/workspace/lfea-topology-edit-source-capture.js';

function stagedJson(canonicalHash = 'fnv1a64:1111111111111111') {
  const material = {
    schema: 'TopologyEditStagedJSON.v1',
    sourceManifestHash: 'source-manifest',
    basis: { datasetId: 'dataset-1', datasetVersion: 7 },
    journalProjection: {
      journalHash: 'journal',
      historyHash: 'history',
      activeLedgerHash: 'active',
      redoLedgerHash: 'redo',
      activeCommandIds: [],
      redoCommandIds: [],
    },
    draftAuthorityHash: 'draft-authority',
    draftCanonicalTopologyHash: canonicalHash,
    exportPolicy: { includeCrosswalk: true, includeSourcePaths: true, fullModelRequired: true },
    canonicalTopology: { nodes: [], edges: [] },
  };
  return { ...material, preparedOutputHash: semanticHash(material) };
}

function preparedExport(canonicalHash) {
  const staged = stagedJson(canonicalHash);
  const material = {
    schema: 'TopologyEditPreparedExport.v1',
    packageHash: 'package',
    draftAuthorityHash: staged.draftAuthorityHash,
    sourceManifestHash: staged.sourceManifestHash,
    journalHash: staged.journalProjection.journalHash,
    activeLedgerHash: staged.journalProjection.activeLedgerHash,
    draftCanonicalTopologyHash: staged.draftCanonicalTopologyHash,
    exportPolicyHash: 'export-policy',
    preparedOutputHash: staged.preparedOutputHash,
    stagedJson: staged,
  };
  return { ...material, preparedExportHash: semanticHash(material) };
}

const prepared = preparedExport();
const liveSource = sealLfeaSource(
  LFEA_SOURCE_KINDS.TOPOLOGY_EDIT_SNAPSHOT,
  prepared,
  { modelVersion: 12 },
);
assert.equal(liveSource.modelVersion, 12);
assert.equal(liveSource.capturedAtSourceVersion, 12);
assert.equal(liveSource.sourceSemanticHash, prepared.draftCanonicalTopologyHash);
assert.equal(liveSource.contentHash, prepared.preparedOutputHash);
assert.ok(Object.isFrozen(liveSource));
assert.ok(Object.isFrozen(liveSource.payload));
requireLfeaSource(liveSource);

prepared.stagedJson.canonicalTopology.nodes.push({ id: 'late-mutation' });
assert.equal(liveSource.payload.stagedJson.canonicalTopology.nodes.length, 0);

const inputXmlA = sealLfeaSource(
  LFEA_SOURCE_KINDS.INPUTXML_FILE,
  { fileName: 'first.inputxml', content: '<InputXML><Node id="1"/></InputXML>' },
);
const inputXmlB = sealLfeaSource(
  LFEA_SOURCE_KINDS.INPUTXML_FILE,
  { fileName: 'renamed.xml', content: '<InputXML><Node id="1"/></InputXML>' },
);
assert.equal(inputXmlA.modelVersion, 0);
assert.equal(inputXmlA.contentHash, inputXmlB.contentHash);
assert.equal(inputXmlA.sourceSemanticHash, inputXmlB.sourceSemanticHash);

const staged = sealLfeaSource(
  LFEA_SOURCE_KINDS.STAGED_JSON_FILE,
  JSON.stringify(liveSource.payload.stagedJson),
  { modelVersion: 12 },
);
assert.equal(staged.sourceSemanticHash, liveSource.sourceSemanticHash);
assert.equal(staged.contentHash, liveSource.contentHash);

const staleVersion = { ...liveSource, modelVersion: 13 };
assert.throws(
  () => requireLfeaSource(staleVersion),
  (error) => error?.code === 'LFEA_SOURCE_STALE',
);
assert.throws(
  () => sealLfeaSource(LFEA_SOURCE_KINDS.TOPOLOGY_EDIT_SNAPSHOT, liveSource.payload, {}),
  (error) => error?.code === 'LFEA_SOURCE_VERSION_INVALID',
);

const capturePrepared = preparedExport('fnv1a64:2222222222222222');
let sessionVersion = 4;
let currentHash = capturePrepared.draftCanonicalTopologyHash;
const lifecycle = {
  session: () => ({
    journal: { get sessionVersion() { return sessionVersion; } },
    currentTopology: () => ({ canonicalTopologyHash: currentHash }),
  }),
  createDraftPackage: () => ({ packageHash: 'draft-package' }),
  prepareExport: () => capturePrepared,
};
const captured = captureTopologyEditLfeaSource(lifecycle);
assert.equal(captured.modelVersion, 4);
assert.equal(captured.sourceSemanticHash, currentHash);

sessionVersion = 9;
const versionMovingLifecycle = {
  ...lifecycle,
  prepareExport: () => {
    sessionVersion = 10;
    return capturePrepared;
  },
};
assert.throws(
  () => captureTopologyEditLfeaSource(versionMovingLifecycle),
  (error) => error?.code === 'LFEA_SOURCE_CAPTURE_VERSION_MOVED',
);

sessionVersion = 11;
currentHash = 'fnv1a64:3333333333333333';
assert.throws(
  () => captureTopologyEditLfeaSource(lifecycle),
  (error) => error?.code === 'LFEA_SOURCE_CAPTURE_TOPOLOGY_MOVED',
);

console.log('lfea-source-intake-check: PASS');
