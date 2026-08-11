import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtimeFiles = [
  'src/core/linear-fea-solver/solve.js',
  'src/core/linear-fea-solver/factorization.js',
  'src/core/linear-fea-solver/assembly.js',
  'src/core/linear-fea-solver/qualification.js',
];

for (const file of runtimeFiles) {
  const source = fs.readFileSync(file, 'utf8');
  assert.doesNotMatch(
    source,
    /(?:from\s+|import\s*\()['"]\.\.\/lafea-linear-solve\//u,
    `${file} must not import LAFEA-owned sparse solve primitives.`,
  );
}

const neutralFiles = [
  'src/core/shared-linear-solve/errors.js',
  'src/core/shared-linear-solve/sparse-matrix.js',
  'src/core/shared-linear-solve/sparse-cholesky.js',
  'src/core/shared-linear-solve/sparse-ldlt.js',
  'src/core/shared-linear-solve/bc-elimination.js',
  'src/core/shared-linear-solve/condition-estimate.js',
  'src/core/shared-linear-solve/diagonal-scaling.js',
];
for (const file of neutralFiles) {
  const source = fs.readFileSync(file, 'utf8');
  assert.doesNotMatch(source, /lafea|Lafea/u, `${file} must remain product-neutral.`);
}

const solverSource = fs.readFileSync('src/core/linear-fea-solver/solve.js', 'utf8');
assert.match(solverSource, /shared-linear-solve\/sparse-matrix\.js/u);
assert.match(solverSource, /shared-linear-solve\/sparse-cholesky\.js/u);
assert.match(solverSource, /shared-linear-solve\/sparse-ldlt\.js/u);

console.log(JSON.stringify({
  check: 'lfea-linear-solver-neutral-dependency',
  status: 'PASS',
  lafeaRuntimeImportCount: 0,
  neutralPrimitiveCount: neutralFiles.length,
}));
