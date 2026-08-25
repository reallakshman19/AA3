import { expect, test } from '@playwright/test';

const GROUPING_FIXTURE = {
  schema: 'inputxml-managed-stage/v1',
  packageHash: 'NON-FEA-CAUSE-GROUPING',
  unit: 'mm',
  objects: [
    {
      id: 'PIPES', name: 'Pipes', type: 'BRANCH',
      children: [
        pipe('PIPE-A', [0, 0, 0], [1000, 0, 0], {
          unitPipeWeightKgPerM: 10,
          opeFluidWeightKgPerM: 2,
        }),
        pipe('PIPE-B', [1000, 0, 0], [2000, 0, 0], {}),
      ],
    },
    {
      id: 'SUPPORTS', name: 'Supports', type: 'GROUP',
      children: [
        support('SUP-START', [0, 0, 0], 'PIPE-A:port:start'),
        support('SUP-END', [2000, 0, 0], 'PIPE-B:port:end'),
      ],
    },
  ],
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { globalThis.__WORKSPACE_VIEWPORT_BACKEND__ = 'canvas2d'; });
});

test('renders real shared, single-scope, and gate-rollup cause states', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-role="dataset-file"]').setInputFiles({
    name: 'non-fea-cause-grouping.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(GROUPING_FIXTURE)),
  });

  await page.getByRole('navigation', { name: 'Application views' })
    .getByRole('button', { name: 'Edit, Topo fix and Load Calc', exact: true }).click();

  const consumer = page.locator('[data-role="load-calc-consumer"]');
  await openLoadCalcTab(consumer, 'preflight');

  const inputCheck = page.locator('[data-role="non-fea-input-check"]');
  await expect(inputCheck).toHaveAttribute('data-state', 'BLOCKED');

  const shared = inputCheck.locator('[data-root-cause-code="MASS_COVERAGE_INCOMPLETE"]');
  await expect(shared).toBeVisible();
  await expect(shared).toHaveAttribute('data-cause-kind', 'shared');
  await expect(shared).toContainText('SHARED CAUSE');

  const single = inputCheck.locator('[data-root-cause-code="MASTER_NOT_READY"]');
  await expect(single).toBeVisible();
  await expect(single).toHaveAttribute('data-cause-kind', 'single');
  await expect(single).toContainText('SINGLE CAUSE');
  await expect(single.getByRole('button', { name: 'Open Import Masters' })).toBeVisible();

  const rollup = inputCheck.locator('[data-rollup="true"][data-cause-kind="rollup"]')
    .filter({ hasText: 'F_METHOD_READINESS' });
  await expect(rollup).toBeVisible();
  await expect(rollup).toContainText('GATE ROLLUP');

  const legend = inputCheck.locator('[aria-label="Blocker grouping legend"]');
  await expect(legend.locator('[data-cause-kind="shared"]')).toContainText('SHARED CAUSE');
  await expect(legend.locator('[data-cause-kind="single"]')).toContainText('SINGLE CAUSE');
  await expect(legend.locator('[data-cause-kind="rollup"]')).toContainText('GATE ROLLUP');

  await expect(consumer.locator('[data-load-calc-run]')).toBeDisabled();
});

async function openLoadCalcTab(consumer, tabId) {
  const primary = consumer.locator('.empirical-load-calc__workflow').locator(`[data-load-calc-tab="${tabId}"]`);
  if (await primary.count()) {
    await primary.click();
    return;
  }
  const advanced = consumer.locator('.empirical-load-calc__advanced');
  if (await advanced.getAttribute('open') === null) await advanced.locator('summary').click();
  await advanced.locator('.empirical-load-calc__tabs').locator(`[data-load-calc-tab="${tabId}"]`).click();
}

function pipe(id, startPoint, endPoint, massEvidence) {
  const sourceAttributes = {
    LINE_ID: 'LINE-NON-FEA',
    SYSTEM_ID: 'SYS-NON-FEA',
    INSULATION_THICKNESS_MM: 0,
    FLUID_WT_HYD_KG_M: 3,
    EI_N_M2: 2000000,
  };
  if (Number.isFinite(massEvidence.unitPipeWeightKgPerM)) {
    sourceAttributes.UNIT_PIPE_WEIGHT_KG_PER_M = massEvidence.unitPipeWeightKgPerM;
  }
  if (Number.isFinite(massEvidence.opeFluidWeightKgPerM)) {
    sourceAttributes.FLUID_WT_OPE_KG_M = massEvidence.opeFluidWeightKgPerM;
  }
  return {
    id, name: id, type: 'PIPE', sourcePath: `/MODEL/PIPES/${id}`,
    sourceAttributes,
    nativeParams: { startPoint, endPoint },
  };
}

function support(id, position, attachedPortId) {
  return {
    id, name: id, type: 'SUPPORT', sourcePath: `/MODEL/SUPPORTS/${id}`,
    sourceAttributes: {
      LINE_ID: 'LINE-NON-FEA', SYSTEM_ID: 'SYS-NON-FEA',
      POS: { x: position[0], y: position[1], z: position[2] },
      ATTACHED_PORT_ID: attachedPortId,
      SUPPORT_TYPE: 'ANCHOR',
      VERTICAL_CAPABILITY: 'RESTRAINED',
    },
  };
}
