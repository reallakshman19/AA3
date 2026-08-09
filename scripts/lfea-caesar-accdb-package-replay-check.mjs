#!/usr/bin/env node
import assert from 'node:assert/strict';
import { requireReplayPackage } from './lfea-caesar-accdb-package-replay.mjs';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';

const sourceIdentity = Object.freeze({
  fileName: 'SYNTHETIC.ACCDB',
  byteLength: 12345,
  lastWriteTimeUtc: '2026-08-09T00:00:00.000Z',
  sha256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
});
const tables = Object.freeze({
  INPUT_CONTROL: Object.freeze({
    columns: Object.freeze(['NUMELT']),
    rows: Object.freeze([Object.freeze({ NUMELT: 0 })]),
  }),
});
const modelIdentity = Object.freeze({ installationTemperatureK: 294.15, tables });
const model = Object.freeze({
  schema: 'caesar-accdb-model-input/v1',
  semanticHash: semanticHash(modelIdentity),
  inventory: Object.freeze({ elementCount: 0 }),
  installationTemperatureK: modelIdentity.installationTemperatureK,
  tables,
});
const base = Object.freeze({
  schema: 'caesar-accdb-benchmark-package/v1',
  benchmarkId: 'SYNTHETIC',
  profile: Object.freeze({ profileId: 'SYNTHETIC-PROFILE' }),
  source: Object.freeze({
    ...sourceIdentity,
    linkedPath: 'D:/evidence/SYNTHETIC.ACCDB',
    provider: 'SYNTHETIC_READ_ONLY',
  }),
  model,
  cases: Object.freeze([]),
  references: Object.freeze({}),
});
const valid = Object.freeze({
  ...base,
  semanticHash: semanticHash({ ...base, source: sourceIdentity }),
});

assert.equal(requireReplayPackage(valid), valid);

const modelTamper = Object.freeze({
  ...valid,
  model: Object.freeze({ ...valid.model, installationTemperatureK: 300 }),
});
assert.throws(
  () => requireReplayPackage(modelTamper),
  /model semantic hash mismatch/u,
);

const packageTamper = Object.freeze({
  ...valid,
  profile: Object.freeze({ profileId: 'TAMPERED-PROFILE' }),
});
assert.throws(
  () => requireReplayPackage(packageTamper),
  /package semantic hash mismatch/u,
);

const relinked = Object.freeze({
  ...valid,
  source: Object.freeze({
    ...valid.source,
    linkedPath: 'E:/another-machine/SYNTHETIC.ACCDB',
    provider: 'ACE_OLEDB_OTHER_MACHINE',
  }),
});
assert.equal(
  requireReplayPackage(relinked).semanticHash,
  valid.semanticHash,
  'Machine-local linked path/provider must not alter the source-identity package hash.',
);

console.log(JSON.stringify({
  check: 'lfea-caesar-accdb-package-replay',
  status: 'PASS',
  modelSemanticHash: valid.model.semanticHash,
  packageSemanticHash: valid.semanticHash,
  sourceSha256: valid.source.sha256,
  tamperDetection: {
    modelIdentity: 'PASS',
    packageIdentity: 'PASS',
    machineLocalRelink: 'PASS',
  },
}, null, 2));
