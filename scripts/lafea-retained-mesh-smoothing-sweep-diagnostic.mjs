import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const sourcePath = 'src/workspace/lafea-retained-mesh-refinement.js';
const original = readFileSync(sourcePath, 'utf8');
const marker = 'const REFINEMENT_SMOOTHING_ROUNDS = 3;';
if (!original.includes(marker)) throw new Error('DIAGNOSTIC_SMOOTHING_MARKER_NOT_FOUND');

const results = [];
try {
  for (const rounds of [0, 1, 2, 3]) {
    const candidate = original.replace(marker, `const REFINEMENT_SMOOTHING_ROUNDS = ${rounds};`);
    writeFileSync(sourcePath, candidate, 'utf8');
    const run = spawnSync(process.execPath, ['scripts/lafea-retained-mesh-refinement-check.mjs'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    const combined = `${run.stdout ?? ''}\n${run.stderr ?? ''}`;
    const match = combined.match(/"maximumObserved":\s*([0-9.eE+-]+)/u);
    const violationMatch = combined.match(/"violatingAdjacencyCount":\s*(\d+)/u);
    results.push({
      rounds,
      exitCode: run.status,
      maximumObserved: match ? Number(match[1]) : null,
      violatingAdjacencyCount: violationMatch ? Number(violationMatch[1]) : null,
      blocked: combined.includes('LAFEA_ANALYSIS_MESH_V2_REFINEMENT_ADJACENT_SIZE_RATIO_BLOCK'),
    });
  }
} finally {
  writeFileSync(sourcePath, original, 'utf8');
}
console.log(JSON.stringify({ diagnostic: 'LAFEA3_RETAINED_REFINEMENT_SMOOTHING_SWEEP', results }, null, 2));
