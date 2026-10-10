import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const fixturePath = fileURLToPath(new URL('../benchmarks/LFEA/BM4/BM4_L/BM4_L.ACCDB', import.meta.url));

test.describe('BM4_L authentic repository shortcut vs independent manual import', () => {
  test.setTimeout(300000);
  test.skip(!fs.existsSync(fixturePath), 'The committed original BM4_L.ACCDB is required.');

  test('separate clean browser contexts produce the same governed import', async ({ browser }) => {
    const results = [];
    const contexts = [];
    try {
      for (const method of ['manual', 'reference']) {
        const context = await browser.newContext();
        contexts.push(context);
        const page = await context.newPage();
        const pageErrors = [];
        let fileChooserCount = 0;
        const accdbRequests = [];
        page.on('pageerror', (error) => pageErrors.push(error.message));
        page.on('filechooser', () => { fileChooserCount += 1; });
        page.on('request', (request) => {
          if (/BM4_L[^/]*\.ACCDB(?:\?|$)/iu.test(request.url())) accdbRequests.push(request.url());
        });
        await page.goto('/', { timeout: 120000 });
        await page.getByRole('navigation', { name: 'Application views' })
          .getByRole('button', { name: 'LFEA', exact: true }).click();

        const referenceButton = page.locator('[data-action="lfea-source-acquisition-reference-bm4l"]');
        await expect(referenceButton).toBeVisible();
        expect(accdbRequests).toHaveLength(0);
        if (method === 'manual') {
          await page.locator('[data-role="lfea-pipeline-accdb-source-file"]').setInputFiles(fixturePath);
        } else {
          await referenceButton.click();
        }

        await expect(page.locator('[data-role="lfea-pipeline-accdb-status"]'))
          .toContainText('96 element(s), 97 node(s)', { timeout: 120000 });
        await expect(page.locator('[data-host-group="SOURCE"]')).toHaveAttribute('data-active-source', 'ACCDB');
        const panel = page.locator('[data-role="lfea-pipeline-accdb-input-panel"]');
        await expect(panel.locator('[data-role="lfea-pipeline-accdb-error"]')).toBeHidden();
        await expect(panel).toHaveAttribute('data-requested-profile', 'DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_V1');

        const session = await page.evaluate(() => {
          const source = globalThis.AnalysisWorkspace?.getLfeaEngineeringSessionState?.()?.source;
          const pre = source?.preFlight;
          if (!source || !pre) throw new Error('Missing governed LFEA source/pre-flight');
          return {
            sourceKind: source.kind,
            sourceFile: source.fileName,
            sourceIdentity: source.identityKey,
            providerIdentity: source.providerIdentityKey,
            preparationOwner: source.preparationOwner,
            requestedProfile: source.requestedProfileId,
            requestedCases: source.requestedCaseIds,
            overrides: source.provenance?.overrideCount ?? 0,
            semanticHash: pre.semanticHash,
            intakeContentHash: pre.intake?.contentSha256,
            preflightStatus: pre.status,
            preflightSolveAuthorized: pre.solveAuthorized,
            preflightProfile: pre.intake?.requestedProfileId,
            preflightCaseIds: pre.preparation?.requestedCaseIds,
            findings: (pre.preparation?.findings ?? [])
              .map((f) => [f.code, f.disposition, f.severity])
              .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
          };
        });
        expect(session.sourceKind).toBe('ACCDB');
        expect(session.sourceFile).toBe('BM4_L.ACCDB');
        expect(session.overrides).toBe(0);
        expect(session.sourceIdentity).toBeTruthy();
        expect(session.preflightSolveAuthorized).toBe(false);

        const rawSource = await panel.locator('[data-role="lfea-pipeline-accdb-source-view"] table')
          .first().locator('tr').evaluateAll((rows) => Object.fromEntries(rows.map((row) => [
            row.querySelector('th')?.textContent?.trim(),
            row.querySelector('td')?.textContent?.trim(),
          ])));
        expect(rawSource.Elements).toBe('96');
        expect(rawSource.Nodes).toBe('97');
        expect(rawSource.File).toBe('BM4_L.ACCDB');

        const health = await panel.locator('[data-role="lfea-pipeline-accdb-finding-groups"] > li')
          .evaluateAll((rows) => rows.map((row) => [row.dataset.code, row.dataset.severity, row.dataset.count]).sort(
            (a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)),
          ));
        expect(health.length).toBeGreaterThan(0);
        await expect(page.locator('[data-role="lfea-pipeline-step"][data-step-id="LOAD_CASE"]'))
          .toHaveAttribute('data-step-status', 'BLOCKED');

        await page.locator('[data-role="lfea-pipeline-step"][data-step-id="ERROR_CHECK"]').click();
        const errorCheck = page.locator('[data-role="lfea-common-error-check-panel"]');
        await expect(errorCheck).toBeVisible();
        const blockingCodes = await errorCheck
          .locator('[data-role="lfea-common-error-check-finding-group"][data-disposition="BLOCK"]')
          .evaluateAll((rows) => rows.map((row) => row.dataset.groupCode).sort());
        expect(blockingCodes).toContain('BEND_FACTOR_EDITION_AUTHORITY_UNRESOLVED');
        await expect(page.locator('[data-role="lfea-pipeline-step"][data-step-id="RUN"]'))
          .toHaveAttribute('data-step-status', 'BLOCKED');

        results.push({ method, session, rawSource, health, blockingCodes, pageErrors, fileChooserCount, accdbRequests });
      }

      expect(results[0].pageErrors).toEqual([]);
      expect(results[1].pageErrors).toEqual([]);
      expect(results[0].session).toEqual(results[1].session);
      expect(results[0].rawSource).toEqual(results[1].rawSource);
      expect(results[0].health).toEqual(results[1].health);
      expect(results[0].blockingCodes).toEqual(results[1].blockingCodes);
      expect(results[1].fileChooserCount).toBe(0);
      expect(results[1].accdbRequests).toHaveLength(1);
      expect(results[0].accdbRequests).toHaveLength(0);
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
    }
  });
});
