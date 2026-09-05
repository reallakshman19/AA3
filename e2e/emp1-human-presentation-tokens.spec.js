import { expect, test } from '@playwright/test';

const ENGINEER_FACING_ROLES = [
  'emp1-workflow',
  'emp1-benchmark-evidence-panel',
  'emp1-c-bounded-evidence',
  'emp1-c-result-evidence',
  'emp1-a-engineering-custody',
  'emp1-b-engineering-custody',
];

const RAW_BOUNDARY_SELECTOR = [
  '[data-emp1-raw-technical="true"]',
  '[data-lafea-raw-json="true"]',
].join(',');

const SIMPLE_MACHINE_CODES = [
  'PROHIBITED',
  'REQUIRED',
  'UNRESOLVED',
  'UNINITIALIZED',
  'ABSENT',
];

test('EMP.1 engineer-facing surfaces do not expose machine-state tokens across selectable evidence views', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1058 });
  await page.goto('/');
  await page.locator('[data-application-nav="EMPIRICAL"]').click();
  await expect.poll(() => page.evaluate(
    () => globalThis.AnalysisWorkspace?.getApplicationViewState?.().activeViewId ?? null,
  )).toBe('EMPIRICAL');

  const root = page.locator('[data-role="empirical-lafea-consumer-root"]');
  const workbench = root.locator('[data-role="lafea-workbench"]');
  const mock = workbench.locator('[data-role="lafea-mock"]');
  if (await mock.isVisible()) await mock.click();

  await expect(root.locator('[data-role="emp1-workflow"]')).toBeVisible();
  await expect(root.locator('[data-role="emp1-c-bounded-evidence"]')).toBeVisible();
  await expect(root.locator('[data-role="emp1-evidence-tab"]')).toHaveCount(await root.locator('[data-role="emp1-evidence-tab"]').count());

  const benchmarkTab = root.locator(
    '[data-role="emp1-evidence-tab"][data-emp1-evidence-view="benchmarkEvidence"]',
  );
  await expect(benchmarkTab).toHaveCount(1);
  await benchmarkTab.click();
  await expect(root.locator('[data-role="emp1-benchmark-evidence-panel"]')).toBeVisible();
  await expect(root.locator('[data-role="emp1-benchmark-reference-unavailable"]'))
    .toContainText('PV Elite · Reference not available');
  await expect(root).toContainText('Source report has not been retained');
  await expect(root).toContainText(
    'Tolerance has not been established; freeze its basis before observing EMP.1 results',
  );
  await expect(root.locator('[data-role="emp1-c-bounded-evidence"]')).toContainText('WRC 537 (2013)');
  await expect(root.locator('[data-role="emp1-c-bounded-evidence"]')).toContainText('Not permitted');

  const evidenceTabs = root.locator('[data-role="emp1-evidence-tab"]');
  const evidenceCount = await evidenceTabs.count();
  expect(evidenceCount).toBeGreaterThanOrEqual(5);
  const scans = [];

  for (let index = 0; index < evidenceCount; index += 1) {
    const tab = evidenceTabs.nth(index);
    const evidenceView = await tab.getAttribute('data-emp1-evidence-view');
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    const leaks = await scanVisibleLeaks(page);
    scans.push({ evidenceView, leaks });
  }

  const leaks = scans.flatMap((scan) => scan.leaks.map((leak) => ({
    evidenceView: scan.evidenceView,
    ...leak,
  })));
  expect(leaks, JSON.stringify(leaks, null, 2)).toEqual([]);

  const technical = root.locator(
    '[data-role="emp1-c-bounded-evidence"] [data-emp1-raw-technical="true"]',
  ).first();
  await expect(technical).toBeVisible();
  await technical.locator('summary').click();
  await expect(technical).toContainText('EMP1.C.WRC537.CYLINDRICAL.ORIGINAL.GAMMA5.ZERO_DP');
  await expect(technical).toContainText('WRC537_2013_CYLINDRICAL_ORIGINAL_GAMMA5_TABLE5_ZERO_DP');
});

async function scanVisibleLeaks(page) {
  return page.evaluate(({ roles, rawBoundarySelector, simpleCodes }) => {
    const machineUnderscore = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/gu;
    const machineDotted = /\b[A-Z][A-Z0-9]*(?:\.[A-Z0-9]+){2,}\b/gu;
    const simpleMachineCodes = new Set(simpleCodes);
    const found = [];

    const isVisible = (element) => {
      const style = getComputedStyle(element);
      return !element.hidden
        && style.display !== 'none'
        && style.visibility !== 'hidden'
        && element.getClientRects().length > 0;
    };

    for (const role of roles) {
      const surfaces = document.querySelectorAll(`[data-role="${role}"]`);
      for (const surface of surfaces) {
        const walker = document.createTreeWalker(surface, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode();
        while (node) {
          const parent = node.parentElement;
          const text = node.textContent?.trim() ?? '';
          if (parent && text && isVisible(parent) && !parent.closest(rawBoundarySelector)) {
            const underscore = [...text.matchAll(machineUnderscore)].map((match) => match[0]);
            const dotted = [...text.matchAll(machineDotted)].map((match) => match[0]);
            const simple = text.split(/\s+/u).filter((token) => simpleMachineCodes.has(token));
            if (underscore.length || dotted.length || simple.length) {
              found.push({ role, text, underscore, dotted, simple });
            }
          }
          node = walker.nextNode();
        }
      }
    }
    return found;
  }, {
    roles: ENGINEER_FACING_ROLES,
    rawBoundarySelector: RAW_BOUNDARY_SELECTOR,
    simpleCodes: SIMPLE_MACHINE_CODES,
  });
}
