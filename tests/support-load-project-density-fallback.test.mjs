import assert from 'node:assert/strict';
import test from 'node:test';
import profile from '../project-data/1885s-project-data-profile.json' with { type: 'json' };

import {
  resolveProjectDataDensity,
} from '../src/workspace/engineering-loads/support-load-distribution-v3.js';
import {
  createConfiguredDefaultUsageLedger,
} from '../src/workspace/project-data/non-fea-field-registry.js';

test('project density resolution prefers exact evidence and audits configured fallback use', () => {
  assert.deepEqual(
    resolveProjectDataDensity({ LINE_A: 825, DEFAULT: 1000 }, 'LINE_A'),
    {
      densityKgPerM3: 825,
      selector: 'LINE_A',
      authority: 'EXACT_SCOPED_VALUE',
      fallbackUsed: false,
    },
  );
  assert.deepEqual(
    resolveProjectDataDensity({ DEFAULT: 1000 }, 'LINE_B'),
    {
      densityKgPerM3: 1000,
      selector: 'DEFAULT',
      authority: 'PROJECT_CONFIGURED_DEFAULT',
      fallbackUsed: true,
    },
  );
  assert.equal(resolveProjectDataDensity({}, 'LINE_C'), null);
});

test('1885S density defaults are declared and produce reportable usage rows', () => {
  const ledger = createConfiguredDefaultUsageLedger(profile, [
    {
      defaultId: '1885S_HYDRO_WATER_DENSITY',
      fieldId: 'HYDRO_FLUID_DENSITY',
      methodId: 'WEIGHT_AND_GRAVITY',
      targetId: 'HYD:PIPE-1:HYDRO_FLUID_DENSITY',
      reason: 'No exact hydro density was available for PIPE-1.',
    },
    {
      defaultId: '1885S_INSULATION_BULK_DENSITY',
      fieldId: 'INSULATION_DENSITY',
      methodId: 'WEIGHT_AND_GRAVITY',
      targetId: 'OPE:PIPE-1:INSULATION_DENSITY',
      reason: 'No exact insulation-code density was available for PIPE-1.',
    },
  ]);
  assert.equal(ledger.rows.length, 2);
  assert.deepEqual(ledger.rows.map((row) => row.fieldId), [
    'HYDRO_FLUID_DENSITY',
    'INSULATION_DENSITY',
  ]);
});
