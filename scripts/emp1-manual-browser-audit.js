/*
 * Browser-native manual audit helper for issue #1651 / recovery #1664.
 *
 * Intended usage from the Vite localhost DevTools console:
 *   await import('/scripts/emp1-manual-browser-audit.js?manual-audit=2');
 *   await runEmp1ManualBrowserAudit({ seedQualificationPressure: true });
 *
 * This helper observes rendered DOM and changes presentation selection only. It
 * does not create automated browser PASS, engineering authority, route authority,
 * code compliance, or release authority. The optional Pressure seed mirrors the
 * existing Playwright qualification setup by importing one retained P-EXTERNAL
 * row through the normal empirical-document import boundary.
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
  return !element.hidden
    && style.display !== 'none'
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

async function selectRecoveryAuditViews(workbench, checks) {
  let analytical = one(workbench, '[data-role="lafea-analytical-calc"]');
  const loads = one(analytical, '[data-role="emp1-professional-step"][data-emp1-professional-step="LOADS"]');
  addCheck(checks, 'taskShell.loads.navigationPresent', Boolean(loads), 'Loads workflow step exists');
  loads?.click();
  await settle();

  analytical = one(workbench, '[data-role="lafea-analytical-calc"]');
  const benchmarkTab = one(analytical,
    '[data-role="emp1-evidence-tab"][data-emp1-evidence-view="benchmarkEvidence"]');
  addCheck(checks, 'taskShell.benchmark.tabPresent', Boolean(benchmarkTab), 'Benchmark evidence tab exists');
  benchmarkTab?.click();
  await settle();
  return one(workbench, '[data-role="lafea-analytical-calc"]');
}

function auditPressure(workbench, checks) {
  const group = one(workbench, '.lafea-doc-group-editor[data-input-group="PRESSURE"]');
  addCheck(checks, 'pressure.group.visibleOnLoadsTask', visible(group), 'Pressure group is visible on Loads task');
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
  const workflow = one(analytical, '[data-role="emp1-workflow"]');
  const workflowDetails = one(analytical, '[data-role="emp1-workflow-details"]');

  for (const [id, node] of Object.entries({ primary, basis, detail, lanes, workflow })) {
    addCheck(checks, `layout.${id}.single`, Boolean(node), `${id} region exists`);
  }
  if (!primary || !basis || !detail || !lanes || !workflow) return null;

  const surfaceManifest = qsa(analytical, '[data-emp1-layout-surface]').map((node) => ({
    surfaceId: node.dataset.emp1LayoutSurface,
    regionId: node.dataset.emp1LayoutRegion,
    visible: visible(node),
    height: geometry(node).height,
  }));
  const surfaceIds = surfaceManifest.map((entry) => entry.surfaceId);
  addCheck(checks, 'layout.surfaceIds.unique', new Set(surfaceIds).size === surfaceIds.length, surfaceManifest);
  addCheck(checks, 'layout.taskShell.enabled', analytical.dataset.emp1TaskShell === 'true', analytical.dataset.emp1TaskShell);
  addCheck(checks, 'layout.taskShell.loadsActive', analytical.dataset.emp1ProfessionalTask === 'LOADS', analytical.dataset.emp1ProfessionalTask);

  const steps = qsa(workflow, '[data-role="emp1-professional-step"]');
  const currentSteps = steps.filter((button) => button.getAttribute('aria-current') === 'step');
  addCheck(checks, 'layout.workflow.steps.7', steps.length === 7, { count: steps.length });
  addCheck(checks, 'layout.workflow.currentStep.1', currentSteps.length === 1, currentSteps.map(text));
  addCheck(checks, 'layout.workflow.details.closed', workflowDetails?.open === false,
    { open: workflowDetails?.open ?? null });

  const visibleInputGroups = qsa(analytical, '.lafea-doc-table-section[data-input-group]')
    .filter(visible)
    .map((node) => node.dataset.inputGroup);
  addCheck(checks, 'layout.loads.inputGroups.exact',
    JSON.stringify(visibleInputGroups) === JSON.stringify(['PRESSURE', 'LOAD_CASES']),
    visibleInputGroups);

  const evidence = qsa(detail, '[data-emp1-evidence-view]');
  const visibleEvidence = evidence.filter(visible);
  addCheck(checks, 'layout.evidence.visibleAtMostOne', visibleEvidence.length === 1,
    visibleEvidence.map((node) => node.dataset.emp1LayoutSurface));
  addCheck(checks, 'layout.evidence.benchmarkSelected',
    visibleEvidence[0]?.dataset.emp1LayoutSurface === 'benchmarkEvidence'
      && detail.dataset.emp1EvidenceView === 'benchmarkEvidence',
    { selected: detail.dataset.emp1EvidenceView ?? null });
  const hiddenEvidenceHasHeight = evidence
    .filter((node) => !visible(node))
    .some((node) => geometry(node).height > 1 || node.getClientRects().length > 0);
  addCheck(checks, 'layout.evidence.hiddenHeight.zero', !hiddenEvidenceHasHeight,
    surfaceManifest.filter((entry) => entry.regionId === 'EVIDENCE_WORKSPACE'));

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
    addCheck(checks, 'layout.narrow.basisBounded', basisBox.height <= Math.min(window.innerHeight * 0.54, 560) + 2,
      { basisHeight: basisBox.height, viewportHeight: window.innerHeight });
    addCheck(checks, 'layout.narrow.evidenceBounded', detailBox.height <= Math.min(window.innerHeight * 0.68, 620) + 2,
      { detailHeight: detailBox.height, viewportHeight: window.innerHeight });
  } else {
    addCheck(checks, 'layout.desktop.sideBySide', primaryBox.right <= basisBox.left + 1,
      { primaryRight: primaryBox.right, basisLeft: basisBox.left });
    addCheck(checks, 'layout.desktop.sameTop', Math.abs(primaryBox.top - basisBox.top) <= 1,
      { primaryTop: primaryBox.top, basisTop: basisBox.top });
    addCheck(checks, 'layout.desktop.basisBounded', basisBox.height <= window.innerHeight + 1,
      { basisHeight: basisBox.height, viewportHeight: window.innerHeight });
    addCheck(checks, 'layout.desktop.evidenceBounded', detailBox.height <= Math.min(window.innerHeight * 0.72, 760) + 2,
      { detailHeight: detailBox.height, viewportHeight: window.innerHeight });
  }
  addCheck(checks, 'layout.noHorizontalOverflow', overflowFree,
    { scrollWidth: analytical.scrollWidth, clientWidth: analytical.clientWidth });
  addCheck(checks, 'layout.detail.fullWidth', detailBox.width >= lanesBox.width - 1,
    { detailWidth: detailBox.width, lanesWidth: lanesBox.width });

  const pageDepth = {
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
    viewportRatio: document.documentElement.scrollHeight / document.documentElement.clientHeight,
  };
  addCheck(checks, 'layout.pageDepth.materiallyReduced', pageDepth.viewportRatio < 6, pageDepth);

  const before = document.documentElement.scrollHeight;
  const sentinel = document.createElement('div');
  sentinel.hidden = true;
  sentinel.style.height = '5000px';
  detail.append(sentinel);
  const after = document.documentElement.scrollHeight;
  sentinel.remove();
  addCheck(checks, 'layout.unselectedEvidence.heightDelta', Math.abs(after - before) <= 1,
    { before, after, delta: after - before });

  return {
    viewport: { width: window.innerWidth, height: window.innerHeight, mode: narrow ? 'NARROW' : 'DESKTOP' },
    activeTask: analytical.dataset.emp1ProfessionalTask,
    selectedEvidence: detail.dataset.emp1EvidenceView,
    visibleInputGroups,
    visibleEvidence: visibleEvidence.map((node) => node.dataset.emp1LayoutSurface),
    primary: primaryBox,
    basis: basisBox,
    detail: detailBox,
    lanes: lanesBox,
    overflowFree,
    pageDepth,
    surfaceManifest,
  };
}

function auditBenchmark(analytical, checks) {
  const workflow = one(analytical, '[data-role="emp1-workflow"]');
  const panel = one(analytical, '[data-role="emp1-benchmark-evidence-panel"]');
  addCheck(checks, 'benchmark.panel.single', qsa(analytical, '[data-role="emp1-benchmark-evidence-panel"]').length === 1,
    { count: qsa(analytical, '[data-role="emp1-benchmark-evidence-panel"]').length });
  addCheck(checks, 'benchmark.panel.evidenceWorkspace',
    panel?.dataset.emp1LayoutSurface === 'benchmarkEvidence'
      && panel?.dataset.emp1LayoutRegion === 'EVIDENCE_WORKSPACE',
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
  addCheck(checks, 'app.empirical.root', Boolean(root), 'empirical consumer root exists');
  addCheck(checks, 'app.workbench', Boolean(workbench), 'LAFEA workbench exists');

  let analytical = workbench && one(workbench, '[data-role="lafea-analytical-calc"]');
  addCheck(checks, 'app.analytical', Boolean(analytical), 'EMP.1 analytical surface exists');
  if (workbench && analytical) analytical = await selectRecoveryAuditViews(workbench, checks);

  const rawTokenLeaks = root ? scanRawTokenLeaks(root) : [];
  addCheck(checks, 'presentation.rawTokenLeaks.none', rawTokenLeaks.length === 0, rawTokenLeaks);

  const pressure = workbench ? auditPressure(workbench, checks) : null;
  const layout = analytical ? auditLayout(analytical, checks) : null;
  const benchmark = analytical ? auditBenchmark(analytical, checks) : null;
  const failures = checks.filter((entry) => !entry.pass);

  const result = {
    schema: 'emp1-manual-browser-audit/v2',
    issue: 1651,
    recoveryIssue: 1664,
    status: failures.length === 0 ? 'PASS_CURRENT_VIEWPORT_DOM_OBSERVATION' : 'FAIL_CURRENT_VIEWPORT_DOM_OBSERVATION',
    browserAcceptanceComplete: false,
    automatedPlaywrightPassCreated: false,
    pressureSeed,
    checks,
    failures,
    observations: { rawTokenLeaks, pressure, layout, benchmark },
    manualFollowupRequired: [
      'Run once at desktop width (>1050 px) and once at narrow width (<=1050 px).',
      'Confirm the full page no longer resembles the prior giant waterfall; the emitted pageDepth.viewportRatio must stay below 6.',
      'Click Geometry, Loads, Load Transfer, Section Screening and Local Correlation and confirm only task-relevant input groups/actions replace the active-task body.',
      'Use keyboard focus on the CAUx disclosure summary: Enter must open; Space must close.',
      'Confirm the engineering-use unauthorized / non-authority wording remains visible after closing disclosure.',
      'Return both JSON results, keyboard observation, and any full-page screenshot to the chain custodian.',
    ],
  };

  console.log(JSON.stringify(result, null, 2));
  return result;
}

globalThis.runEmp1ManualBrowserAudit = runEmp1ManualBrowserAudit;
console.info('EMP1 task-shell manual browser audit loaded. Run: await runEmp1ManualBrowserAudit({ seedQualificationPressure: true })');
