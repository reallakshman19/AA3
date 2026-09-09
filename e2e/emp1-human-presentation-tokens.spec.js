import { expect, test } from '@playwright/test';

const ENGINEER_FACING_ROLES = [
  'emp1-workflow',
  'emp1-benchmark-evidence-panel',
  'emp1-c-bounded-evidence',
  'emp1-c-result-evidence',
  'emp1-a-engineering-custody',
  'emp1-b-engineering-custody',
];

const TASKS = [
  'BASIS_SOURCE',
  'GEOMETRY',
  'LOADS',
  'LOAD_TRANSFER',
  'SECTION_SCREENING',
  'LOCAL_CORRELATION',
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

  const scans = [];
  const workflowDetails = root.locator('[data-role="emp1-workflow-details"]');
  await expect(workflowDetails).toHaveCount(1);
  await expect(workflowDetails).not.toHaveAttribute('open', '');
  await workflowDetails.locator(':scope > summary').click();
  await expect(workflowDetails).toHaveAttribute('open', '');
  scans.push({ view: 'workflow:readiness-review-custody', leaks: await scanVisibleLeaks(page) });
  await workflowDetails.locator(':scope > summary').click();

  // Inspector availability is task-contextual. Visit every inspector tab that is
  // actually selectable for every professional task rather than clicking hidden
  // tabs from one unrelated task.
  for (const taskId of TASKS) {
    let analytical = root.locator('[data-role="lafea-analytical-calc"]');
    await analytical.locator(
      `[data-role="emp1-professional-step"][data-emp1-professional-step="${taskId}"]`,
    ).click();
    analytical = root.locator('[data-role="lafea-analytical-calc"]');
    await expect(analytical).toHaveAttribute('data-emp1-professional-task', taskId);

    const inspectorTabs = analytical.locator('[data-role="emp1-inspector-tab"]:visible');
    const inspectorCount = await inspectorTabs.count();
    expect(inspectorCount).toBeGreaterThanOrEqual(1);
    for (let index = 0; index < inspectorCount; index += 1) {
      const tab = inspectorTabs.nth(index);
      const inspectorView = await tab.getAttribute('data-emp1-inspector-view');
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      scans.push({ view: `task:${taskId}:inspector:${inspectorView}`, leaks: await scanVisibleLeaks(page) });
    }

    if (taskId === 'LOCAL_CORRELATION') {
      const authorityTab = analytical.locator(
        '[data-role="emp1-inspector-tab"][data-emp1-inspector-view="boundedCorrelation"]',
      );
      await authorityTab.click();
      const bounded = analytical.locator('[data-role="emp1-c-bounded-evidence"]');
      await expect(bounded).toBeVisible();
      await expect(bounded).toContainText('WRC 537 (2013)');
      await expect(bounded).toContainText('Not permitted');
      const routeTabs = bounded.locator('[data-role="emp1-c-route-capability-tab"]');
      await expect(routeTabs).toHaveCount(2);
      const routeCount = await routeTabs.count();
      for (let index = 0; index < routeCount; index += 1) {
        const tab = routeTabs.nth(index);
        const routeId = await tab.getAttribute('data-route-id');
        await tab.click();
        await expect(tab).toHaveAttribute('aria-selected', 'true');
        await expect(bounded.locator('[data-role="emp1-c-route-capability-panel"]:visible')).toHaveCount(1);
        scans.push({ view: `route:${routeId}`, leaks: await scanVisibleLeaks(page) });
      }
    }
  }

  // Review & Evidence is an evidence-only presentation task on desktop. Visit
  // every retained evidence view from that explicit context.
  let analytical = root.locator('[data-role="lafea-analytical-calc"]');
  await analytical.locator(
    '[data-role="emp1-professional-step"][data-emp1-professional-step="REVIEW_EVIDENCE"]',
  ).click();
  analytical = root.locator('[data-role="lafea-analytical-calc"]');
  await expect(analytical).toHaveAttribute('data-emp1-professional-task', 'REVIEW_EVIDENCE');
  await expect(analytical).toHaveAttribute('data-emp1-console-mode', 'EVIDENCE');

  const evidenceToggle = analytical.locator('[data-role="emp1-evidence-console-toggle"]');
  await expect(evidenceToggle).toHaveAttribute('aria-expanded', 'true');
  const evidenceTabs = analytical.locator('[data-role="emp1-evidence-tab"]');
  const evidenceCount = await evidenceTabs.count();
  expect(evidenceCount).toBeGreaterThanOrEqual(5);
  for (let index = 0; index < evidenceCount; index += 1) {
    const tab = evidenceTabs.nth(index);
    const evidenceView = await tab.getAttribute('data-emp1-evidence-view');
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    scans.push({ view: `evidence:${evidenceView}`, leaks: await scanVisibleLeaks(page) });
  }

  const benchmarkTab = analytical.locator(
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

  // Technical identifiers remain reachable behind an explicit human-readable
  // route disclosure, and the raw machine IDs remain confined to the raw boundary.
  analytical = root.locator('[data-role="lafea-analytical-calc"]');
  await analytical.locator(
    '[data-role="emp1-professional-step"][data-emp1-professional-step="LOCAL_CORRELATION"]',
  ).click();
  analytical = root.locator('[data-role="lafea-analytical-calc"]');
  const authorityTab = analytical.locator(
    '[data-role="emp1-inspector-tab"][data-emp1-inspector-view="boundedCorrelation"]',
  );
  await authorityTab.click();
  const bounded = analytical.locator('[data-role="emp1-c-bounded-evidence"]');
  await bounded.locator('[data-role="emp1-c-route-capability-tab"]').first().click();
  const routeDetail = bounded.locator('[data-role="emp1-c-route-detail"]:visible');
  await expect(routeDetail).toBeVisible();
  await expect(routeDetail).not.toHaveAttribute('open', '');
  await routeDetail.locator('summary').first().click();
  await expect(routeDetail).toHaveAttribute('open', '');
  const technical = routeDetail.locator('[data-emp1-raw-technical="true"]').first();
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
          const value = node.textContent?.trim() ?? '';
          if (parent && value && isVisible(parent) && !parent.closest(rawBoundarySelector)) {
            const underscore = [...value.matchAll(machineUnderscore)].map((match) => match[0]);
            const dotted = [...value.matchAll(machineDotted)].map((match) => match[0]);
            const simple = value.split(/\s+/u).filter((token) => simpleMachineCodes.has(token));
            if (underscore.length || dotted.length || simple.length) {
              found.push({ role, text: value, underscore, dotted, simple });
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
