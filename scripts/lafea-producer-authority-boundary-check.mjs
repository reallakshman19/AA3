import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const producerPath = path.join(root, 'src/workspace/lafea-shell-mesh-producer.js');
const source = fs.readFileSync(producerPath, 'utf8');

const forbiddenProducerAuthorityFields = Object.freeze([
  'lifecycleAuthority',
  'releaseAuthority',
  'mergeAuthority',
]);

for (const field of forbiddenProducerAuthorityFields) {
  assert.equal(
    source.includes(field),
    false,
    `Shell mesh producer must not assert downstream authority field ${field}`,
  );
}

assert.match(
  source,
  /authority:\s*\{[\s\S]*?authorityRole:\s*LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE/,
  'Downstream governed evidence must remain the authority assignment boundary',
);

process.stdout.write(`${JSON.stringify({
  schema: 'lafea-producer-authority-boundary-check/v1',
  status: 'PASS',
  producer: 'src/workspace/lafea-shell-mesh-producer.js',
  forbiddenProducerAuthorityFields,
  downstreamEvidenceAuthorityRetained: true,
})}\n`);
