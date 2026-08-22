#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  classifyLoadCalcResultPresentation,
} from '../src/workspace/load-calc-result-presentation.js';

assert.deepEqual(
  classifyLoadCalcResultPresentation({ status: 'CALCULATED' }),
  {
    message: 'Authorized calculation complete.',
    openLoads: true,
  },
);

assert.deepEqual(
  classifyLoadCalcResultPresentation({ status: 'CALCULATED_WITH_EXCEPTIONS' }),
  {
    message: 'Authorized calculation complete with exceptions; review coverage, unallocated load and transfer-moment evidence.',
    openLoads: true,
  },
);

assert.deepEqual(
  classifyLoadCalcResultPresentation({ status: 'FAILED' }),
  {
    message: 'Authorized calculation failed; review blocking failures and equilibrium evidence.',
    openLoads: false,
  },
);

assert.deepEqual(
  classifyLoadCalcResultPresentation({ status: 'BLOCKED' }),
  {
    message: 'Authorized calculation blocked; review the listed inputs.',
    openLoads: false,
  },
);

for (const distribution of [{ status: 'UNEXPECTED' }, {}, null]) {
  const result = classifyLoadCalcResultPresentation(distribution);
  assert.equal(result.openLoads, false);
  assert.equal(
    result.message,
    'Authorized calculation status is unavailable; review the calculation evidence.',
  );
}

console.log(JSON.stringify({
  status: 'PASS',
  calculatedOpensLoads: true,
  partialOpensLoads: true,
  failedOpensLoads: false,
  blockedOpensLoads: false,
  unknownFailsClosed: true,
}, null, 2));
