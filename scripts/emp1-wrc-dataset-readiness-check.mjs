import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gitBlobSha1File } from './emp1-source-custody-lib.mjs';
import { auditWrcDatasetPackage } from './emp1-wrc-dataset-readiness-lib.mjs';

const ROOT = resolve(new URL('..', import.meta.url).pathname, '..');
const manifestPath = resolve(ROOT, 'validation/emp1/wrc537-2013/existing-dataset-manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (manifest.schema !== 'emp1-wrc-existing-dataset-manifest/v1') throw new TypeError('EMP1_WRC_MANIFEST_SCHEMA_INVALID');
if (manifest.repository !== 'reallaksh19/Advanced_Analysis') throw new TypeError('EMP1_WRC_MANIFEST_REPOSITORY_INVALID');
if (manifest.pinnedCommit !== '67317dc9cb47de8897fa7952b86107ab91b1f75c') throw new TypeError('EMP1_WRC_MANIFEST_COMMIT_INVALID');

const identity = [];
for (const row of manifest.artifacts) {
  const filePath = resolve(ROOT, row.path);
  const info = await stat(filePath);
  identity.push({
    id: row.id,
    path: row.path,
    expectedByteCount: row.byteCount,
    actualByteCount: info.size,
    expectedGitBlobSha1: row.gitBlobSha1,
    actualGitBlobSha1: await gitBlobSha1File(filePath, info.size),
  });
}

const artifact = (id) => manifest.artifacts.find((row) => row.id === id)?.path;
const methodText = await readFile(resolve(ROOT, artifact('METHOD_DEFINITION')), 'utf8');
const dataset = JSON.parse(await readFile(resolve(ROOT, artifact('DATASET')), 'utf8'));
const numericalCsv = await readFile(resolve(ROOT, artifact('NUMERICAL_TABLES')), 'utf8');
const audit = auditWrcDatasetPackage({ methodText, dataset, numericalCsv, artifactIdentity: identity });
console.log(JSON.stringify({ manifest: { schema: manifest.schema, pinnedCommit: manifest.pinnedCommit, classification: manifest.classification, authority: manifest.authority }, artifacts: identity, ...audit }, null, 2));
process.exit(audit.status === 'PASS' ? 0 : audit.status === 'BLOCKED' ? 2 : 1);
