import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  LFEA_PERSISTENCE_KEYS,
  createLfeaPersistenceAdapter,
  getLfeaBrowserStorage,
} from '../src/lfea/persistence.js';

const storage = createMemoryStorage();
const adapter = createLfeaPersistenceAdapter(storage);
let snapshot = adapter.load();
assert.equal(snapshot.schema, 'lfea-persistence-snapshot/v1');
assert.equal(snapshot.activeView, null);
assert.equal(snapshot.recentSourceMetadata, null);
assert.deepEqual(snapshot.diagnostics, []);
console.log('LFEA-PERSISTENCE-01 PASS empty storage creates no product or engineering authority');

adapter.saveActiveView('history');
adapter.saveRecentSourceMetadata({
  fileName: 'model.xml',
  contentSha256: 'a'.repeat(64),
  sourceUnit: 'mm',
});
snapshot = adapter.load();
assert.equal(snapshot.activeView, 'history');
assert.deepEqual(snapshot.recentSourceMetadata, {
  fileName: 'model.xml', contentSha256: 'a'.repeat(64), sourceUnit: 'mm',
});
assert.deepEqual([...storage.keys()].sort(), Object.values(LFEA_PERSISTENCE_KEYS).sort());
console.log('LFEA-PERSISTENCE-02 PASS allowed UI/recent-source metadata roundtrips only through exact LFEA keys');

const serialized = [...storage.values()].join('\n');
assert.doesNotMatch(serialized, /PIPINGMODEL|preFlight|authorization|execution|recovery|caseExecutions|elementActions/iu);
console.log('LFEA-PERSISTENCE-03 PASS browser persistence contains no source XML, authorization, raw, recovery, or History evidence');

storage.setItem('lafea.settings.anything', JSON.stringify({ engineering: true }));
storage.setItem('workspace.analysis.current', JSON.stringify({ execution: 'MALICIOUS' }));
const isolated = adapter.load();
assert.equal(isolated.activeView, 'history');
assert.equal(isolated.recentSourceMetadata.contentSha256, 'a'.repeat(64));
console.log('LFEA-PERSISTENCE-04 PASS unrelated and LAFEA-owned keys cannot alter LFEA persisted projection');

storage.setItem(LFEA_PERSISTENCE_KEYS.activeView, '{not json');
snapshot = adapter.load();
assert.equal(snapshot.activeView, null);
assert.ok(snapshot.diagnostics.some((row) => row.code === 'STORED_JSON_REJECTED'));
console.log('LFEA-PERSISTENCE-05 PASS corrupt stored JSON fails closed to no preference');

storage.setItem(LFEA_PERSISTENCE_KEYS.recentSourceMetadata, JSON.stringify({
  schema: 'lfea-persistence-record/v1',
  kind: 'RECENT_SOURCE_METADATA',
  value: {
    fileName: 'model.xml', contentSha256: 'b'.repeat(64), sourceUnit: 'mm',
    authorizationSemanticHash: 'fnv1a64:forbidden',
  },
}));
snapshot = adapter.load();
assert.equal(snapshot.recentSourceMetadata, null);
console.log('LFEA-PERSISTENCE-06 PASS extra engineering-looking fields invalidate recent-source metadata rather than being retained');

assert.throws(
  () => adapter.saveRecentSourceMetadata({ fileName: 'model.xml', contentSha256: 'short', sourceUnit: 'mm' }),
  (error) => error?.code === 'LFEA_PERSISTENCE_RECENT_SOURCE_INVALID',
);
assert.throws(
  () => adapter.saveActiveView('../analysis'),
  (error) => error?.code === 'LFEA_PERSISTENCE_ACTIVE_VIEW_INVALID',
);
console.log('LFEA-PERSISTENCE-07 PASS invalid caller values fail closed before storage write');

const unavailable = createLfeaPersistenceAdapter(null);
assert.equal(unavailable.load().activeView, null);
assert.equal(unavailable.saveActiveView('source').status, 'UNAVAILABLE');
assert.equal(unavailable.saveRecentSourceMetadata({
  fileName: 'model.xml', contentSha256: 'c'.repeat(64), sourceUnit: 'mm',
}).status, 'UNAVAILABLE');
const deniedWindow = {};
Object.defineProperty(deniedWindow, 'localStorage', { get() { throw new Error('denied'); } });
assert.equal(getLfeaBrowserStorage(deniedWindow), null);
console.log('LFEA-PERSISTENCE-08 PASS unavailable/denied browser storage cannot block standalone operation');

sourceGuards();
console.log('LFEA-PERSISTENCE-09 PASS direct browser-storage access is isolated to the LFEA adapter and runtime persists metadata only');

console.log(JSON.stringify({
  check: 'lfea-standalone-persistence',
  status: 'PASS',
  exactNamespace: true,
  corruptFailClosed: true,
  engineeringAuthorityPersisted: false,
  lafeaKeyIsolation: true,
}));

function sourceGuards() {
  const lfeaDir = path.resolve('src/lfea');
  for (const name of fs.readdirSync(lfeaDir).filter((entry) => entry.endsWith('.js'))) {
    if (name === 'persistence.js') continue;
    const source = fs.readFileSync(path.join(lfeaDir, name), 'utf8');
    assert.doesNotMatch(source, /localStorage|sessionStorage/u, name);
  }
  const persistence = fs.readFileSync('src/lfea/persistence.js', 'utf8');
  const bootstrap = fs.readFileSync('src/lfea/bootstrap.js', 'utf8');
  const runtime = fs.readFileSync('src/lfea/standalone-runtime.js', 'utf8');
  assert.match(persistence, /lfea\.ui\.activeView\.v1/u);
  assert.match(persistence, /lfea\.source\.recentMetadata\.v1/u);
  assert.match(persistence, /non-authoritative standalone LFEA preferences only/u);
  assert.doesNotMatch(persistence, /lafea\.|workspace\.|analysis\./u);
  assert.match(bootstrap, /createLfeaPersistenceAdapter/u);
  assert.match(bootstrap, /createLfeaStandaloneRuntime/u);
  assert.match(runtime, /saveRecentSourceMetadata/u);
  assert.match(runtime, /fileName: snapshot\.fileName/u);
  assert.match(runtime, /contentSha256: snapshot\.contentSha256/u);
  assert.match(runtime, /sourceUnit: snapshot\.sourceUnit/u);
  assert.doesNotMatch(bootstrap, /localStorage|sessionStorage/u);
}

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(String(key), String(value)); },
    removeItem(key) { values.delete(String(key)); },
    keys() { return values.keys(); },
    values() { return values.values(); },
  };
}
