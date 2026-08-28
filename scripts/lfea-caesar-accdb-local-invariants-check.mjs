import assert from 'node:assert/strict';
import { buildCaesarAccdbLocalInvariantDiagnostics } from '../src/core/fea-benchmarks/caesar-accdb-local-invariants.js';

const displacement = Array(12).fill(0);
displacement[0] = 100;
displacement[1] = 10;
const equivalent = Array(12).fill(0);
equivalent[0] = 60;
const initial = Array(12).fill(0);
initial[0] = 39.9999;
const recovered = displacement.map((value, index) => value - equivalent[index] - initial[index]);

function actualWith(qGlobal) {
  return {
    schema: 'lfea-accdb-benchmark-actual/v1',
    sourceAccdbSha256: 'synthetic',
    mechanics: {
      schema: 'lfea-accdb-linear-solve-evidence/v1',
      cases: {
        L3: {
          recoveryLedger: [{
            elementId: 'ACCDB.E1',
            sourceElementId: '1',
            nodeI: '10',
            nodeJ: '20',
            jointDisplacement12: displacement,
            globalElasticAction: displacement,
            equivalentLoadGlobal: equivalent,
            initialStrainLoadGlobal: initial,
            qGlobal,
            transformedLocalQGlobal: recovered,
          }],
        },
      },
    },
  };
}

const good = buildCaesarAccdbLocalInvariantDiagnostics(actualWith(recovered));
assert.equal(good.summary.rowCount, 12);
assert.equal(good.summary.closureStatus, 'PASS');
assert.equal(good.summary.maximumQIdentityRelativeResidual, 0);
const cancellationRow = good.rows.find((row) => row.dof === 'UX' && row.end === 'I');
assert.equal(cancellationRow.conditioningClass, 'CANCELLATION_SENSITIVE');
assert.ok(cancellationRow.conditioning > 1e6);
const stableRow = good.rows.find((row) => row.dof === 'UY' && row.end === 'I');
assert.equal(stableRow.conditioningClass, 'STABLE');

const corrupted = [...recovered];
corrupted[0] += 1;
const bad = buildCaesarAccdbLocalInvariantDiagnostics(actualWith(corrupted));
assert.equal(bad.summary.closureStatus, 'FAIL');
assert.equal(bad.summary.closureFailureCount, 1);

process.stdout.write('PASS lfea-caesar-accdb-local-invariants-check\n');
