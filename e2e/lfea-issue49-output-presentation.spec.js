import { expect, test } from '@playwright/test';

/**
 * #49 isolated Output display-contract exercise only. Uses unmistakably
 * synthetic row values; it does not analyze BM4_L or grant diagnostic
 * approval. Independent, Owner-approved runs must supply actual E5 proof.
 */
test('issue #49: global I/J element-end rows and CSV mirror a sealed-shaped recovery record', async ({ page }) => {
  await page.goto('/', { timeout: 120000 });
  const observed = await page.evaluate(async () => {
    const path = new URL('src/workspace/lfea-pipeline-results-panel.js', location.href).pathname;
    const { mountLfeaPipelineResultsPanel } = await import(path);
    const root = document.createElement('div');
    root.dataset.role = 'issue49-output-contract-test-only';
    document.body.append(root);
    const downloads = [];
    const panel = mountLfeaPipelineResultsPanel(root, {
      documentRef: document,
      onExportCsv: (text, name) => downloads.push({ text, name }),
    });
    const valuesI = { fx: 1, fy: 2, fz: 3, mx: 4, my: 5, mz: 6 };
    const valuesJ = { fx: -1, fy: -2, fz: -3, mx: -4, my: -5, mz: -6 };
    const baseCase = {
      caseId: 'IXP-W', executionStatus: 'QUALIFIED',
      blockingChecks: [], unilateralSummary: null,
      displacements: [], reactions: [],
    };
    const state = (actions) => ({
      cases: [baseCase], recoveryRefusal: null,
      recovery: { caseRecoveries: [{
        caseId: 'IXP-W', recovery: { elementActions: actions },
      }] },
    });
    panel.setState(state([{ elementId: 'UI-SYNTHETIC.E1', global: { I: valuesI, J: valuesJ } }]));
    root.querySelector('[data-role="lfea-pipeline-results-views"] [data-view="ELEMENT_FORCES"]').click();
    const table = root.querySelector('[data-role="lfea-pipeline-results-table"]');
    const cells = [...table.querySelectorAll('tr')].slice(1)
      .map((tr) => [...tr.querySelectorAll('td')].map((cell) => cell.textContent));
    const label = root.querySelector('[data-role="lfea-pipeline-element-actions-basis"]')?.textContent;
    const button = root.querySelector('[data-action="lfea-pipeline-results-csv"]');
    const enabled = !button.disabled;
    button.click();

    // Remove J from the same fixture: no undefined/blank row or made-up CSV.
    panel.setState(state([{ elementId: 'UI-SYNTHETIC.E1', global: { I: valuesI } }]));
    const withheld = root.querySelector('[data-role="lfea-pipeline-element-actions-unavailable"]')?.textContent;
    const disabledOnMissingEnd = root.querySelector('[data-action="lfea-pipeline-results-csv"]').disabled;
    const downloadCount = downloads.length;
    panel.destroy();
    root.remove();
    return { cells, label, enabled, downloads, withheld, disabledOnMissingEnd, downloadCount };
  });
  expect(observed.cells).toEqual([
    ['UI-SYNTHETIC.E1', 'I', '1.000', '2.000', '3.000', '4.000', '5.000', '6.000'],
    ['UI-SYNTHETIC.E1', 'J', '-1.000', '-2.000', '-3.000', '-4.000', '-5.000', '-6.000'],
  ]);
  expect(observed.label).toContain('global XYZ');
  expect(observed.enabled).toBe(true);
  expect(observed.downloads).toHaveLength(1);
  expect(observed.downloads[0].text.trim().split('\n')).toEqual([
    'Element,End,FX_N,FY_N,FZ_N,MX_Nm,MY_Nm,MZ_Nm',
    'UI-SYNTHETIC.E1,I,1.000,2.000,3.000,4.000,5.000,6.000',
    'UI-SYNTHETIC.E1,J,-1.000,-2.000,-3.000,-4.000,-5.000,-6.000',
  ]);
  expect(observed.withheld).toContain('missing or nonfinite');
  expect(observed.disabledOnMissingEnd).toBe(true);
  expect(observed.downloadCount).toBe(1);
});
