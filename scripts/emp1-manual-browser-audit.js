/*
 * Browser-native manual audit helper for issue #1651.
 *
 * Intended usage from the Vite localhost DevTools console:
 *   await import('/scripts/emp1-manual-browser-audit.js?manual-audit=1');
 *   await runEmp1ManualBrowserAudit({ seedQualificationPressure: true });
 *
 * This helper observes rendered DOM only. It does not create automated browser
 * PASS, engineering authority, route authority, code compliance, or release
 * authority. The optional Pressure seed mirrors the existing Playwright
 * qualification setup by importing one retained P-EXTERNAL row through the
 * normal empirical-document import boundary.
 */

const ENGINEER_FACING_ROLES = Object.freeze([
  'emp1-workflow',
  'emp1-benchmark-evidence-panel',
  'emp1-c-bounded-evidence',
  'emp1-c-result-evidence',
  'emp1-a-engineering-custody',
  'emp1-b-engineering-custody',
]);

const RAW_BOUNDARY_SELECTOR = [
  '[data-emp1-raw-technical="true"]',
  '[data-lafea-raw-json="true"]',
].join(',');

const SIMPLE_MACHINE_CODES = Object.freeze([
  'PROHIBITED',
  'REQUIRED',
  'UNRESOLVED',
  'UNINITIALIZED',
  'ABSENT',
]);

const qsa = (root, selector) => [...root.querySelectorAll(selector)];
const one = (root, selector) => root.querySelector(selector);
const text = (node) => node?.textContent?.replace(/\s+/gu, ' ').trim() ?? '';

const visible = (element) => {
  if (!(element instanceof Element)) return false;
  const style = getComputedStyle(element);
  return style.display !== 'none'
    && style.visibility !== 'hidden'
    && element.getClientRects().length > 0;
};

const settle = () => new Promise((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(resolve));
});

function addCheck(checks, id, pass, detail) {
  checks.push({ id, pass: Boolean(pass), detail });
}

function geometry(node) {
  const rect = node.getBoundingClientRect();
  return {
    left: rect.left,
    right: rect.right,
    top: rect.top,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

function scanRawTokenLeaks(root) {
  const machineUnderscore = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/gu;
  const machineDotted = /\b[A-Z][A-Z0-9]*(?:\.[A-Z0-9]+){2,}\b/gu;
  const simpleMachineCodes = new Set(SIMPLE_MACHINE_CODES);
  const found = [];

  for (const role of ENGINEER_FACING_ROLES) {
    for (const surface of qsa(root, `[data-role="${role}"]`)) {
      const walker = document.createTreeWalker(surface, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        const parent = node.parentElement;
        const value = node.textContent?.trim() ?? '';
        if (parent && value && visible(parent) && !parent.closest(RAW_BOUNDARY_SELECTOR)) {
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
}

async function seedQualificationPressureIfNeeded() {
  const workspace = globalThis.AnalysisWorkspace;
  if (!workspace?.getEmpiricalWorkbenchState || !workspace?.importEmpiricalDocument) {
    throw new Error('EMP1_MANUAL_AUDIT_WORKSPACE_API_UNAVAILABLE');
  }

  const state = workspace.getEmpiricalWorkbenchState();
  const stage = state?.stages?.['LAFEA.1'];
  if (!stage?.document?.pressureDefinitions) {
    throw new Error('EMP1_MANUAL_AUDIT_LAFEA1_DOCUMENT_UNAVAILABLE');
  }

  if (stage.document.pressureDefinitions.some((row) => row.identity === 'P-EXTERNAL')) {
    return { seeded: false, reason: 'P-EXTERNAL already present' };
  }

  const documentValue = structuredClone(stage.document);
  const basis = documentValue.pressureDefinitions.find((row) => row.identity === 'P-CLOSED');
  if (!basis) throw new Error('EMP1_MANUAL_AUDIT_P_CLOSED_BASIS_REQUIRED');

  const external = structuredClone(basis);
  external.identity = 'P-EXTERNAL';
  external.internalPressure = {
    ...external.internalPressure,
    value: 0,
    sourceRef: 'SOURCE-PIPE-MODEL@7#pressure.P-EXTERNAL.internal',
  };
  external.externalPressure = {
    ...external.externalPressure,
    value: 1,
    sourceRef: 'SOURCE-PIPE-MODEL@7#pressure.P-EXTERNAL.external',
  };
  documentValue.pressureDefinitions.push(external);
  workspace.importEmpiricalDocument(documentValue, 'LAFEA.1');
  await settle();
  return { seeded: true, reason: 'P-EXTERNAL added through importEmpiricalDocument' };
}

function auditPressure(workbench, checks) {
  const group = one(workbench, '.lafea-doc-group-editor[data-input-group="PRESSURE"]');
  addCheck(checks, 'pressure.group.visible', visible(group), 'Pressure group is rendered');
  if (!group) return null;

  const rows = qsa(group, 'tr[data-matrix-group="LAFEA.1.pressure"]');
  const governed = qsa(group, '[data-role="lafea-governed-input"]');
  const internalInputs = qsa(group,
    '[data-role="lafea-governed-input"][data-descriptor-id="LAFEA.1.pressure.internal"]');
  const externalInputs = qsa(group,
    '[data-role="lafea-governed-input"][data-descriptor-id="LAFEA.1.pressure.external"]');
  const headers = qsa(group, 'th').map(text);

  addCheck(checks, 'pressure.headers.internal', headers.includes('Internal'), headers);
  addCheck(checks, 'pressure.headers.external', headers.includes('External'), headers);
  addCheck(checks, 'pressure.rows.5', rows.length === 5, { count: rows.length });
  addCheck(checks, 'pressure.governedCells.10', governed.length === 10, { count: governed.length });
  addCheck(checks, 'pressure.internalInputs.5', internalInputs.length === 5, { count: internalInputs.length });
  addCheck(checks, 'pressure.externalInputs.5', externalInputs.length === 5, { count: externalInputs.length });

  const pExternal = one(group,
    'tr[data-matrix-group="LAFEA.1.pressure"][data-row-id="P-EXTERNAL"]');
  const internal = pExternal && one(pExternal,
    '[data-role="lafea-governed-input"][data-descriptor-id="LAFEA.1.pressure.internal"][data-entity-id="P-EXTERNAL"]');
  const external = pExternal && one(pExternal,
    '[data-role="lafea-governed-input"][data-descriptor-id="LAFEA.1.pressure.external"][data-entity-id="P-EXTERNAL"]');
  const internalCell = pExternal && one(pExternal, '[data-matrix-column="INTERNAL"]');
  const externalCell = pExternal && one(pExternal, '[data-matrix-column="EXTERNAL"]');

  addCheck(checks, 'pressure.pExternal.present', Boolean(pExternal), 'P-EXTERNAL row exists once');
  addCheck(checks, 'pressure.pExternal.internal.0', internal?.value === '0', { value: internal?.value ?? null });
  addCheck(checks, 'pressure.pExternal.external.1', external?.value === '1', { value: external?.value ?? null });
  addCheck(checks, 'pressure.pExternal.internal.source',
    internalCell?.dataset.sourceRef === 'SOURCE-PIPE-MODEL@7#pressure.P-EXTERNAL.internal',
    { sourceRef: internalCell?.dataset.sourceRef ?? null });
  addCheck(checks, 'pressure.pExternal.external.source',
    externalCell?.dataset.sourceRef === 'SOURCE-PIPE-MODEL@7#pressure.P-EXTERNAL.external',
    { sourceRef: externalCell?.dataset.sourceRef ?? null });

  return { rowCount: rows.length, governedCellCount: governed.length, headers };
}

function auditLayout(analytical, checks) {
  const primary = one(analytical, '[data-role="emp1-analytical-primary-work"]');
  const basis = one(analytical, '[data-role="emp1-analytical-engineering-basis"]');
  const detail = one(analytical, '[data-role="emp1-analytical-full-width-detail"]');
  const lanes = one(analytical, '[data-role="emp1-analytical-layout-lanes"]');

  for (const [id, node] of Object.entries({ primary, basis, detail, lanes })) {
    addCheck(checks, `layout.${id}.single`, Boolean(node), `${id} region exists`);
  }
  if (!primary || !basis || !detail || !lanes) return null;

  const surfaceManifest = qsa(analytical, '[data-emp1-layout-surface]').map((node) => ({
    surfaceId: node.dataset.emp1LayoutSurface,
    regionId: node.dataset.emp1LayoutRegion,
  }));
  const surfaceIds = surfaceManifest.map((entry) => entry.surfaceId);
  addCheck(checks, 'layout.surfaceIds.unique', new Set(surfaceIds).size === surfaceIds.length, surfaceManifest);

  const primaryBox = geometry(primary);
  const basisBox = geometry(basis);
  const detailBox = geometry(detail);
  const lanesBox = geometry(lanes);
  const narrow = window.innerWidth <= 1050;
  const overflowFree = analytical.scrollWidth <= analytical.clientWidth + 1;

  if (narrow) {
    addCheck(checks, 'layout.narrow.sameLeft', Math.abs(primaryBox.left - basisBox.left) <= 1,
      { primary: primaryBox.left, basis: basisBox.left });
    addCheck(checks, 'layout.narrow.sameWidth', Math.abs(primaryBox.width - basisBox.width) <= 1,
      { primary: primaryBox.width, basis: basisBox.width });
    addCheck(checks, 'layout.narrow.stacked', basisBox.top >= primaryBox.bottom - 1,
      { primaryBottom: primaryBox.bottom, basisTop: basisBox.top });
  } else {
    addCheck(checks, 'layout.desktop.sideBySide', primaryBox.right <= basisBox.left + 1,
      { primaryRight: primaryBox.right, basisLeft: basisBox.left });
    addCheck(checks, 'layout.desktop.sameTop', Math.abs(primaryBox.top - basisBox.top) <= 1,
      { primaryTop: primaryBox.top, basisTop: basisBox.top });
  }
  addCheck(checks, 'layout.noHorizontalOverflow', overflowFree,
    { scrollWidth: analytical.scrollWidth, clientWidth: analytical.clientWidth });
  addCheck(checks, 'layout.detail.fullWidth', detailBox.width >= lanesBox.width - 1,
    { detailWidth: detailBox.width, lanesWidth: lanesBox.width });

  return {
    viewport: { width: window.innerWidth, height: window.innerHeight, mode: narrow ? 'NARROW' : 'DESKTOP' },
    primary: primaryBox,
    basis: basisBox,
    detail: detailBox,
    lanes: lanesBox,
    overflowFree,
    surfaceManifest,
  };
}

function auditBenchmark(analytical, checks) {
  const workflow = one(analytical, '[data-role="emp1-workflow"]');
  const panel = one(analytical, '[data-role="emp1-benchmark-evidence-panel"]');
  addCheck(checks, 'benchmark.panel.single', qsa(analytical, '[data-role="emp1-benchmark-evidence-panel"]').length === 1,
    { count: qsa(analytical, '[data-role="emp1-benchmark-evidence-panel"]').length });
  addCheck(checks, 'benchmark.panel.fullWidthDetail',
    panel?.dataset.emp1LayoutSurface === 'benchmarkEvidence'
      && panel?.dataset.emp1LayoutRegion === 'FULL_WIDTH_DETAIL',
    { surface: panel?.dataset.emp1LayoutSurface ?? null, region: panel?.dataset.emp1LayoutRegion ?? null });
  addCheck(checks, 'benchmark.notInsideWorkflow',
    workflow ? workflow.querySelectorAll('[data-role="emp1-benchmark-evidence-panel"]').length === 0 : false,
    'Benchmark Evidence must not be a workflow child');
  if (!panel) return null;

  const comparators = qsa(panel, '[data-role="emp1-benchmark-comparator"]');
  addCheck(checks, 'benchmark.comparators.2', comparators.length === 2, { count: comparators.length });

  const caux = one(panel, '[data-role="emp1-benchmark-comparator"][data-comparator-id="CAUX"]');
  const cauxStatus = caux && one(caux, '[data-role="emp1-benchmark-comparison-status"]');
  const overview = caux && one(caux, '[data-role="emp1-benchmark-caux-overview"]');
  const authority = caux && one(caux, '[data-role="emp1-benchmark-table-authority-statement"]');
  const audit = caux && one(caux, '[data-role="emp1-benchmark-caux-audit-details"]');
  const rows = caux ? qsa(caux, '[data-role="emp1-benchmark-comparison-row"]') : [];
  const statusText = text(cauxStatus);
  const overviewText = text(overview);
  const authorityText = text(authority);

  addCheck(checks, 'benchmark.caux.status.visible', visible(cauxStatus), statusText);
  addCheck(checks, 'benchmark.caux.status.comparisonQualified', statusText.includes('Comparison qualified'), statusText);
  addCheck(checks, 'benchmark.caux.status.engineeringUseUnauthorized',
    statusText.includes('Engineering use not authorized')
      && cauxStatus?.dataset.engineeringUseAuthorized === 'false',
    { text: statusText, engineeringUseAuthorized: cauxStatus?.dataset.engineeringUseAuthorized ?? null });
  addCheck(checks, 'benchmark.caux.overview.8of8', overviewText.includes('8 / 8 within frozen tolerance'), overviewText);
  addCheck(checks, 'benchmark.caux.overview.cuWorstRelative', /2\.0355862\s*%\s*·\s*Cu/u.test(overviewText), overviewText);
  addCheck(checks, 'benchmark.caux.overview.duAgreement',
    overviewText.includes('Du reference / Du EMP.1 · Agreement: Yes'), overviewText);
  addCheck(checks, 'benchmark.caux.authority.visible', visible(authority), authorityText);
  addCheck(checks, 'benchmark.caux.authority.nonMethod', authorityText.includes('not WRC method authority'), authorityText);
  addCheck(checks, 'benchmark.caux.rows.8', rows.length === 8, { count: rows.length });

  const pvElite = one(panel, '[data-role="emp1-benchmark-comparator"][data-comparator-id="PV_ELITE"]');
  const pvUnavailable = pvElite && one(pvElite, '[data-role="emp1-benchmark-reference-unavailable"]');
  const pvText = text(pvElite);
  const pvRows = pvElite ? qsa(pvElite, '[data-role="emp1-benchmark-comparison-row"]') : [];
  addCheck(checks, 'benchmark.pvElite.unavailable.visible', visible(pvUnavailable), text(pvUnavailable));
  addCheck(checks, 'benchmark.pvElite.noInference',
    pvText.includes('No reference values or tolerance are inferred.'), pvText);
  addCheck(checks, 'benchmark.pvElite.rows.0', pvRows.length === 0, { count: pvRows.length });

  return {
    comparatorCount: comparators.length,
    caux: {
      statusText,
      overviewText,
      authorityText,
      auditOpen: Boolean(audit?.open),
      rowCount: rows.length,
    },
    pvElite: { text: pvText, rowCount: pvRows.length },
  };
}

async function runEmp1ManualBrowserAudit(options = {}) {
  const { seedQualificationPressure = false } = options;
  const checks = [];
  const activeViewId = globalThis.AnalysisWorkspace?.getApplicationViewState?.().activeViewId ?? null;
  addCheck(checks, 'app.empirical.active', activeViewId === 'EMPIRICAL', { activeViewId });

  let pressureSeed = { seeded: false, reason: 'not requested' };
  if (seedQualificationPressure) {
    pressureSeed = await seedQualificationPressureIfNeeded();
  }

  const root = document.querySelector('[data-role="empirical-lafea-consumer-root"]');
  const workbench = root && one(root, '[data-role="lafea-workbench"]');
  const analytical = workbench && one(workbench, '[data-role="lafea-analytical-calc"]');
  addCheck(checks, 'app.empirical.root', Boolean(root), 'empirical consumer root exists');
  addCheck(checks, 'app.workbench', Boolean(workbench), 'LAFEA workbench exists');
  addCheck(checks, 'app.analytical', Boolean(analytical), 'EMP.1 analytical surface exists');

  const rawTokenLeaks = root ? scanRawTokenLeaks(root) : [];
  addCheck(checks, 'presentation.rawTokenLeaks.none', rawTokenLeaks.length === 0, rawTokenLeaks);

  const pressure = workbench ? auditPressure(workbench, checks) : null;
  const layout = analytical ? auditLayout(analytical, checks) : null;
  const benchmark = analytical ? auditBenchmark(analytical, checks) : null;
  const failures = checks.filter((entry) => !entry.pass);

  const result = {
    schema: 'emp1-manual-browser-audit/v1',
    issue: 1651,
    status: failures.length === 0 ? 'PASS_CURRENT_VIEWPORT_DOM_OBSERVATION' : 'FAIL_CURRENT_VIEWPORT_DOM_OBSERVATION',
    browserAcceptanceComplete: false,
    automatedPlaywrightPassCreated: false,
    pressureSeed,
    checks,
    failures,
    observations: { rawTokenLeaks, pressure, layout, benchmark },
    manualFollowupRequired: [
      'Run once at desktop width (>1050 px) and once at narrow width (<=1050 px).',
      'Use keyboard focus on the CAUx disclosure summary: Enter must open; Space must close.',
      'Confirm the engineering-use unauthorized / non-authority wording remains visible after closing disclosure.',
      'Return both JSON results and the keyboard observation to the chain custodian.',
    ],
  };

  console.log(JSON.stringify(result, null, 2));
  return result;
}

globalThis.runEmp1ManualBrowserAudit = runEmp1ManualBrowserAudit;
console.info('EMP1 manual browser audit loaded. Run: await runEmp1ManualBrowserAudit({ seedQualificationPressure: true })');
