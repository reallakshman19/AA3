export const LAFEA_STAGE17_BROWSER_FIXTURE = '/e2e/fixtures/lafea-stage17-browser-fixture.js';

export async function mountStage17(page, options = {}) {
  await page.goto('/lafea.html');
  return page.evaluate(async ({ fixture, options: opts }) => {
    const api = await import(fixture);
    document.body.innerHTML = '<main id="a17-root"></main>';
    const mounted = api.mountQualifiedLafea3(document.getElementById('a17-root'), opts);
    globalThis.__A17__ = { ...mounted, api };
    const stage = mounted.controller.getState().stages['LAFEA.3'];
    return {
      sourceHash: mounted.authority.sourceHash,
      lifecycleBinding: stage.lifecycleBinding.status,
      profileId: stage.lifecycle.profileId,
      meshState: stage.analysisMeshCustodyProjection.state,
      releaseState: stage.lifecycleReadiness.releaseState,
    };
  }, { fixture: LAFEA_STAGE17_BROWSER_FIXTURE, options });
}

export async function destroyStage17(page) {
  await page.evaluate(() => {
    globalThis.__A17__?.controller?.destroy();
    delete globalThis.__A17__;
  });
}
