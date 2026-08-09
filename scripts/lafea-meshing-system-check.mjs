// scripts/lafea-meshing-system-check.mjs

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LAFEA_MESH_GENERATION_INTENT_SCHEMA,
  createLafeaMeshGenerationIntent,
} from '../src/workspace/lafea-mesh-generation-intent.js';
import {
  REQUIRED_CANVAS_TESTS,
  assertRequiredTestsRegistered,
} from './lafea-required-test-registry.mjs';

// LAFEA-CANVAS-T19 now qualifies the governed mesh-generation intent used by
// the bound producer path. The former canvas-only LafeaMeshingCommand.v1 had no
// production caller and is deliberately retired rather than maintained as a
// second, weaker source of mesh-request truth.
const validInput = {
  schema: LAFEA_MESH_GENERATION_INTENT_SCHEMA,
  stageId: 'LAFEA.3',
  sourceHash: sha('1'),
  canonicalModelHash: sha('2'),
  analysisGeometryHash: sha('3'),
  meshProfileHash: sha('4'),
  targetElementLength: 10,
  lengthUnit: 'mm',
  elementFamily: 'T6',
  curvatureToleranceDegrees: 15,
  growthLimit: 1.5,
  maximumNodes: 10000,
  maximumElements: 8000,
  maximumEstimatedDofs: 20000,
  refinementEntityIds: ['N2', 'N1'],
};
const intent = createLafeaMeshGenerationIntent(validInput);

assert.equal(intent.schema, LAFEA_MESH_GENERATION_INTENT_SCHEMA);
assert.equal(intent.stageId, 'LAFEA.3');
assert.equal(intent.status, 'EXECUTABLE_INTENT');
assert.equal(intent.executionAuthorized, true);
assert.equal(intent.producesMesh, true);
assert.ok(intent.producerRef?.startsWith('LAFEA_CORE_MESHER/'));
assert.deepEqual(intent.refinementEntityIds, ['N1', 'N2']);
assert.ok(Object.isFrozen(intent));

// Intent construction owns a canonical copy of refinement identities.
validInput.refinementEntityIds.push('N3');
assert.deepEqual(intent.refinementEntityIds, ['N1', 'N2']);
validInput.refinementEntityIds.pop();

// Shell stages remain truthful: request construction is possible but cannot
// self-authorize while P2-8 has no qualified automatic shell producer.
const shellIntent = createLafeaMeshGenerationIntent({
  ...validInput,
  stageId: 'LAFEA.4',
  elementFamily: 'CST_DKT_TRI3_THIN_SHELL_V1',
  maximumEstimatedDofs: 50000,
});
assert.equal(shellIntent.status, 'UNEXECUTABLE_INTENT');
assert.equal(shellIntent.executionAuthorized, false);
assert.equal(shellIntent.producerRef, null);
assert.equal(shellIntent.producesMesh, false);
assert.equal(shellIntent.reason, 'QUALIFIED_MESH_PRODUCER_NOT_AVAILABLE');

assert.throws(() => createLafeaMeshGenerationIntent({
  ...validInput,
  sourceHash: '',
}), (error) => error.code === 'LAFEA_MESH_GENERATION_SOURCEHASH_INVALID');

assert.throws(() => createLafeaMeshGenerationIntent({
  ...validInput,
  elementFamily: 'CST_DKT_TRI3_THIN_SHELL_V1',
}), (error) => error.code === 'LAFEA_MESH_GENERATION_ELEMENT_FAMILY_NOT_AUTHORIZED');

// Anti-drift: there must be no canvas-private meshing command contract left in
// production source. A future mesh request must extend the governed intent/
// plan/producer chain rather than resurrecting a parallel command schema.
const canvasRoot = fileURLToPath(new URL('../src/workspace/lafea-canvas/', import.meta.url));
for (const file of sourceFiles(canvasRoot)) {
  const source = fs.readFileSync(file, 'utf8');
  assert.equal(source.includes('LafeaMeshingCommand.v1'), false, file);
  assert.equal(source.includes('createMeshingCommand'), false, file);
  assert.equal(source.includes('meshingCommand:'), false, file);
}
assert.equal(fs.existsSync(path.join(canvasRoot, 'meshing-intent.js')), false);

assertRequiredTestsRegistered(
  ['LAFEA-CANVAS-T19'],
  REQUIRED_CANVAS_TESTS.slice(18, 19),
);
console.log('LAFEA meshing-system check PASS (T19 governed intent; legacy canvas command retired)');

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(target);
    return entry.isFile() && /\.(?:js|mjs)$/u.test(entry.name) ? [target] : [];
  });
}

function sha(character) { return `sha256:${character.repeat(64)}`; }
