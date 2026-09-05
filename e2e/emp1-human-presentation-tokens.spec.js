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

test('EMP.1 engineer-facing surfaces do not expose machine-state tokens across split-console views', async ({ page }) => {
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
  await expect(root.locator('[data-role="emp1-console-mode-tabs"]')).toHaveCount(1);

  // Compact workflow detail remains part of the token audit even though it is
  // collapsed by default.
  const workflowDetails = root.locator('[data-role="emp1-workflow-details"]');
  await expect(workflowDetails).toHaveCount(1);
  await expect(workflowDetails).not.toHaveAttribute('open', '');
  await workflowDetails.locator('summary').click();
  await expect(workflowDetails).toHaveAttribute('open', '');

  // Local Correlation makes the Authority inspector the task-default view.
  await root.getByRole('button', { name: /^6 Local Correlation/u }).click();
  const bounded = root.locator('[data-role="emp1-c-bounded-evidence"]');
  await expect(bounded).toBeVisible();
  await expect(bounded).toContainText('WRC 537 (2013)');
  await expect(bounded).toContainText('Not permitted');

  const scans = [];

  // Every inspector domain must be scanned because split-console selection now
  // intentionally removes unselected authority/custody surfaces from layout.
  const inspectorTabs = root.locator('[data-role="emp1-inspector-tab"]');
  const inspectorCount = await inspectorTabs.count();
  expect(inspectorCount).toBeGreaterThanOrEqual(3);
  for (let index = 0; index < inspectorCount; index += 1) {
    const tab = inspectorTabs.nth(index);
    const inspectorView = await tab.getAttribute('data-emp1-inspector-view');
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    scans.push({ view: `inspector:${inspectorView}`, leaks: await scanVisibleLeaks(page) });
  }

  // Restore Authority and audit both retained route capabilities separately.
  const authorityTab = root.locator(
    '[data-role="emp1-inspector-tab"][data-emp1-inspector-view="boundedCorrelation"]',
  );
  await authorityTab.click();
  const routeTabs = bounded.locator('[data-role="emp1-c-route-capability-tab"]');
  await expect(routeTabs).toHaveCount(2);
  for (let index = 0; index < await routeTabs.count(); index += 1) {
    const tab = routeTabs.nth(index);
    const routeId = await tab.getAttribute('data-route-id');
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(bounded.locator('[data-role="emp1-c-route-capability-panel"]:visible')).toHaveCount(1);
    scans.push({ view: `route:${routeId}`, leaks: await scanVisibleLeaks(page) });
  }

  // Evidence is collapsed by default; open the bounded console and enumerate
  // every retained selectable evidence view so progressive disclosure cannot
  // weaken the original raw-token regression boundary.
  const evidenceToggle = root.locator('[data-role="emp1-evidence-console-toggle"]');
  await evidenceToggle.click();
  await expect(evidenceToggle).toHaveAttribute('aria-expanded', 'true');
  const evidenceTabs = root.locator('[data-role="emp1-evidence-tab"]');
  const evidenceCount = await evidenceTabs.count();
  expect(evidenceCount).toBeGreaterThanOrEqual(5);
  for (let index = 0; index < evidenceCount; index += 1) {
    const tab = evidenceTabs.nth(index);
    const evidenceView = await tab.getAttribute('data-emp1-evidence-view');
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    scans.push({ view: `evidence:${evidenceView}`, leaks: await scanVisibleLeaks(page) });
  }

  const benchmarkTab = root.locator(
    '[data-role="emp1-evidence-tab"][data-emp1-evidence-view="benchmarkEvidence"]',
  );
  await benchmarkTab.click();
  await expect(root.locator('[data-role="emp1-benchmark-evidence-panel"]')).toBeVisible();
  await expect(root.locator('[data-role="emp1-benchmark-reference-unavailable"]'))
    .toContainText('PV Elite · Reference not available');
  await expect(root).toContainText('Source report has not been retained');
  await expect(root).toContainText(
    'Tolerance has not been established; freeze its basis before observing EMP.1 results',
  );

  const leaks = scans.flatMap((scan) => scan.leaks.map((leak) => ({
    view: scan.view,
    ...leak,
  })));
  expect(leaks, JSON.stringify(leaks, null, 2)).toEqual([]);

  // Technical IDs remain available only inside the explicit raw boundary.
  await authorityTab.click();
  const authorizedRouteTab = bounded.locator('[data-role="emp1-c-route-capability-tab"][aria-selected="true"]');
  if (!await authorizedRouteTab.isVisible()) {
    await bounded.locator('[data-role="emp1-c-route-capability-tab"]').first().click();
  }
  const technical = bounded.locator('[data-emp1-raw-technical="true"]:visible').first();
  await expect(technical).toBeVisible();
  await technical.locator('summary').click();
  await expect(technical).toContainText('EMP1.C.WRC537.CYLINDRICAL.ORIGINAL');
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
