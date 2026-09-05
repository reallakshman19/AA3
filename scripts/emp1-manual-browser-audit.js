/*
 * Browser-native manual audit helper for issue #1651 / recovery #1664.
 *
 * Intended usage from Vite localhost DevTools:
 *   await import('/scripts/emp1-manual-browser-audit.js?manual-audit=3');
 *   await runEmp1ManualBrowserAudit({ seedQualificationPressure: true });
 *
 * This helper observes rendered DOM and changes presentation selection only. It
 * never creates automated browser PASS or engineering/source/route/release authority.
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
  'PROHIBITED', 'REQUIRED', 'UNRESOLVED', 'UNINITIALIZED', 'ABSENT',
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
  if (!node || !visible(node)) return null;
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

async function selectTask(workbench, stepId) {
  let analytical = one(workbench, '[data-role="lafea-analytical-calc"]');
  const button = one(analytical,
    `[data-role="emp1-professional-step"][data-emp1-professional-step="${stepId}"]`);
  button?.click();
  await settle();
  return one(workbench, '[data-role="lafea-analytical-calc"]');
}

async function selectMode(analytical, mode) {
  const button = one(analytical,
    `[data-role="emp1-console-mode-tab"][data-emp1-console-mode="${mode}"]`);
  if (button && visible(button)) {
    button.click();
    await settle();
  }
}

async function openEvidenceConsole(analytical) {
  const toggle = one(analytical, '[data-role="emp1-evidence-console-toggle"]');
  if (toggle?.getAttribute('aria-expanded') !== 'true' && visible(toggle)) {
    toggle.click();
    await settle();
  }
}

async function selectEvidence(analytical, surfaceId) {
  await openEvidenceConsole(analytical);
  const tab = one(analytical,
    `[data-role="emp1-evidence-tab"][data-emp1-evidence-view="${surfaceId}"]`);
  tab?.click();
  await settle();
  return tab;
}

function auditPressure(workbench, checks) {
  const group = one(workbench, '.lafea-doc-group-editor[data-input-group="PRESSURE"]');
  addCheck(checks, 'pressure.group.visibleOnLoadsTask', visible(group), 'Pressure group visible on Loads task');
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
  addCheck(checks, 'pressure.pExternal.present', Boolean(pExternal), 'P-EXTERNAL exists once');
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

async function auditLayout(analytical, checks) {
  const primary = one(analytical, '[data-role="emp1-analytical-primary-work"]');
  const basis = one(analytical, '[data-role="emp1-analytical-engineering-basis"]');
  const detail = one(analytical, '[data-role="emp1-analytical-full-width-detail"]');
  const lanes = one(analytical, '[data-role="emp1-analytical-layout-lanes"]');
  const workflow = one(analytical, '[data-role="emp1-workflow"]');
  const modeTabs = qsa(analytical, '[data-role="emp1-console-mode-tab"]');
  const workflowDetails = one(analytical, '[data-role="emp1-workflow-details"]');
  addCheck(checks, 'layout.splitConsole.enabled',
    analytical.dataset.emp1SplitConsole === 'emp1-split-console/v1', analytical.dataset.emp1SplitConsole);
  addCheck(checks, 'layout.taskShell.loadsActive', analytical.dataset.emp1ProfessionalTask === 'LOADS', analytical.dataset.emp1ProfessionalTask);
  addCheck(checks, 'layout.workflow.steps.7',
    qsa(workflow, '[data-role="emp1-professional-step"]').length === 7,
    { count: qsa(workflow, '[data-role="emp1-professional-step"]').length });
  addCheck(checks, 'layout.workflow.details.closed', workflowDetails?.open === false,
    { open: workflowDetails?.open ?? null });

  const visibleInputGroups = qsa(analytical, '.lafea-doc-table-section[data-input-group]')
    .filter(visible).map((node) => node.dataset.inputGroup);
  addCheck(checks, 'layout.loads.inputGroups.exact',
    JSON.stringify(visibleInputGroups) === JSON.stringify(['PRESSURE', 'LOAD_CASES']),
    visibleInputGroups);

  const inspectorSurfaces = qsa(basis, '[data-emp1-inspector-view]');
  const selectedInspector = inspectorSurfaces.filter((node) => !node.hidden);
  addCheck(checks, 'layout.inspector.selectedAtMostOne', selectedInspector.length === 1,
    selectedInspector.map((node) => node.dataset.emp1LayoutSurface));

  const evidence = qsa(detail, '[data-emp1-evidence-view]');
  const selectedEvidence = evidence.filter((node) => !node.hidden);
  addCheck(checks, 'layout.evidence.selectedAtMostOne', selectedEvidence.length === 1,
    selectedEvidence.map((node) => node.dataset.emp1LayoutSurface));
  addCheck(checks, 'layout.evidence.collapsedByDefault', detail.dataset.emp1EvidenceOpen === 'false',
    detail.dataset.emp1EvidenceOpen);
  const hiddenEvidenceHasHeight = evidence
    .filter((node) => !visible(node))
    .some((node) => node.getClientRects().length > 0 || (geometry(node)?.height ?? 0) > 1);
  addCheck(checks, 'layout.evidence.hiddenHeight.zero', !hiddenEvidenceHasHeight,
    evidence.map((node) => ({ id: node.dataset.emp1LayoutSurface, visible: visible(node) })));

  const overflowFree = analytical.scrollWidth <= analytical.clientWidth + 1;
  const shellBounded = analytical.scrollHeight <= analytical.clientHeight + 1;
  addCheck(checks, 'layout.noHorizontalOverflow', overflowFree,
    { scrollWidth: analytical.scrollWidth, clientWidth: analytical.clientWidth });
  addCheck(checks, 'layout.outerShell.bounded', shellBounded,
    { scrollHeight: analytical.scrollHeight, clientHeight: analytical.clientHeight });

  const narrow = window.innerWidth <= 1050;
  const modeObservation = {};
  if (narrow) {
    addCheck(checks, 'layout.narrow.modeTabs.3', modeTabs.length === 3, { count: modeTabs.length });
    await selectMode(analytical, 'WORK');
    modeObservation.work = {
      primary: visible(primary), basis: visible(basis), evidence: visible(detail), lanes: visible(lanes),
    };
    addCheck(checks, 'layout.narrow.workOnly',
      modeObservation.work.primary && !modeObservation.work.basis && !modeObservation.work.evidence,
      modeObservation.work);

    await selectMode(analytical, 'BASIS');
    modeObservation.basis = {
      primary: visible(primary), basis: visible(basis), evidence: visible(detail), lanes: visible(lanes),
    };
    addCheck(checks, 'layout.narrow.basisOnly',
      !modeObservation.basis.primary && modeObservation.basis.basis && !modeObservation.basis.evidence,
      modeObservation.basis);

    await selectMode(analytical, 'EVIDENCE');
    modeObservation.evidence = {
      primary: visible(primary), basis: visible(basis), evidence: visible(detail), lanes: visible(lanes),
    };
    addCheck(checks, 'layout.narrow.evidenceOnly',
      !modeObservation.evidence.lanes && modeObservation.evidence.evidence,
      modeObservation.evidence);
    await selectMode(analytical, 'WORK');
  } else {
    const primaryBox = geometry(primary);
    const basisBox = geometry(basis);
    addCheck(checks, 'layout.desktop.sideBySide',
      primaryBox && basisBox && primaryBox.right <= basisBox.left + 1,
      { primary: primaryBox, basis: basisBox });
    addCheck(checks, 'layout.desktop.sameTop',
      primaryBox && basisBox && Math.abs(primaryBox.top - basisBox.top) <= 1,
      { primary: primaryBox, basis: basisBox });
  }

  const beforeDocument = document.documentElement.scrollHeight;
  const beforeShell = analytical.scrollHeight;
  const sentinel = document.createElement('section');
  sentinel.dataset.emp1LayoutSurface = 'UNSELECTED_HEIGHT_FALSIFIER';
  sentinel.style.height = '5000px';
  detail.append(sentinel);
  const afterDocument = document.documentElement.scrollHeight;
  const afterShell = analytical.scrollHeight;
  sentinel.remove();
  addCheck(checks, 'layout.unselectedEvidence.heightDelta',
    Math.abs(afterDocument - beforeDocument) <= 1 && Math.abs(afterShell - beforeShell) <= 1,
    {
      documentDelta: afterDocument - beforeDocument,
      shellDelta: afterShell - beforeShell,
    });

  const pageDepth = {
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
    viewportRatio: document.documentElement.scrollHeight / document.documentElement.clientHeight,
  };
  addCheck(checks, 'layout.pageDepth.reasonable', pageDepth.viewportRatio < 4, pageDepth);

  return {
    viewport: { width: window.innerWidth, height: window.innerHeight, mode: narrow ? 'NARROW' : 'DESKTOP' },
    activeTask: analytical.dataset.emp1ProfessionalTask,
    selectedInspector: basis?.dataset.emp1InspectorView ?? null,
    selectedEvidence: detail?.dataset.emp1EvidenceView ?? null,
    evidenceOpen: detail?.dataset.emp1EvidenceOpen ?? null,
    consoleMode: analytical.dataset.emp1ConsoleMode,
    visibleInputGroups,
    overflowFree,
    shellBounded,
    pageDepth,
    modeObservation,
  };
}

async function auditRoutes(workbench, checks) {
  const analytical = await selectTask(workbench, 'LOCAL_CORRELATION');
  if (window.innerWidth <= 1050) await selectMode(analytical, 'BASIS');
  const authorityTab = one(analytical,
    '[data-role="emp1-inspector-tab"][data-emp1-inspector-view="boundedCorrelation"]');
  authorityTab?.click();
  await settle();
  const bounded = one(analytical, '[data-role="emp1-c-bounded-evidence"]');
  const tabs = bounded ? qsa(bounded, '[data-role="emp1-c-route-capability-tab"]') : [];
  const panels = bounded ? qsa(bounded, '[data-role="emp1-c-route-capability-panel"]') : [];
  addCheck(checks, 'routes.capabilities.2', tabs.length === 2 && panels.length === 2,
    { tabs: tabs.length, panels: panels.length });
  addCheck(checks, 'routes.visiblePanel.1', panels.filter(visible).length === 1,
    panels.map((panel) => ({ routeId: panel.dataset.routeId, visible: visible(panel) })));
  addCheck(checks, 'routes.authorityStates.preserved',
    panels.some((panel) => panel.dataset.authorized === 'true')
      && panels.some((panel) => panel.dataset.authorized === 'false'),
    panels.map((panel) => ({ routeId: panel.dataset.routeId, authorized: panel.dataset.authorized })));
  return {
    count: panels.length,
    authorityStates: panels.map((panel) => ({
      routeId: panel.dataset.routeId,
      authorized: panel.dataset.authorized,
    })),
  };
}

async function scanAllSplitConsoleViews(analytical) {
  const scans = [];
  const inspectorTabs = qsa(analytical, '[data-role="emp1-inspector-tab"]');
  for (const tab of inspectorTabs) {
    tab.click();
    await settle();
    scans.push({
      view: `inspector:${tab.dataset.emp1InspectorView}`,
      leaks: scanRawTokenLeaks(analytical),
    });
  }

  const authority = one(analytical,
    '[data-role="emp1-inspector-tab"][data-emp1-inspector-view="boundedCorrelation"]');
  authority?.click();
  await settle();
  const routeTabs = qsa(analytical, '[data-role="emp1-c-route-capability-tab"]');
  for (const tab of routeTabs) {
    tab.click();
    await settle();
    scans.push({ view: `route:${tab.dataset.routeId}`, leaks: scanRawTokenLeaks(analytical) });
  }

  if (window.innerWidth <= 1050) await selectMode(analytical, 'EVIDENCE');
  await openEvidenceConsole(analytical);
  const evidenceTabs = qsa(analytical, '[data-role="emp1-evidence-tab"]');
  for (const tab of evidenceTabs) {
    tab.click();
    await settle();
    scans.push({
      view: `evidence:${tab.dataset.emp1EvidenceView}`,
      leaks: scanRawTokenLeaks(analytical),
    });
  }
  return scans;
}

async function auditBenchmark(analytical, checks) {
  if (window.innerWidth <= 1050) await selectMode(analytical, 'EVIDENCE');
  await selectEvidence(analytical, 'benchmarkEvidence');
  const workflow = one(analytical, '[data-role="emp1-workflow"]');
  const panel = one(analytical, '[data-role="emp1-benchmark-evidence-panel"]');
  addCheck(checks, 'benchmark.panel.single',
    qsa(analytical, '[data-role="emp1-benchmark-evidence-panel"]').length === 1,
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
    caux: { statusText, overviewText, authorityText, auditOpen: Boolean(audit?.open), rowCount: rows.length },
    pvElite: { text: pvText, rowCount: pvRows.length },
  };
}

async function runEmp1ManualBrowserAudit(options = {}) {
  const { seedQualificationPressure = false } = options;
  const checks = [];
  const activeViewId = globalThis.AnalysisWorkspace?.getApplicationViewState?.().activeViewId ?? null;
  addCheck(checks, 'app.empirical.active', activeViewId === 'EMPIRICAL', { activeViewId });

  let pressureSeed = { seeded: false, reason: 'not requested' };
  if (seedQualificationPressure) pressureSeed = await seedQualificationPressureIfNeeded();

  const root = document.querySelector('[data-role="empirical-lafea-consumer-root"]');
  const workbench = root && one(root, '[data-role="lafea-workbench"]');
  addCheck(checks, 'app.empirical.root', Boolean(root), 'empirical consumer root exists');
  addCheck(checks, 'app.workbench', Boolean(workbench), 'LAFEA workbench exists');
  let analytical = workbench && one(workbench, '[data-role="lafea-analytical-calc"]');
  addCheck(checks, 'app.analytical', Boolean(analytical), 'EMP.1 analytical surface exists');

  if (workbench && analytical) {
    analytical = await selectTask(workbench, 'LOADS');
    if (window.innerWidth <= 1050) await selectMode(analytical, 'WORK');
  }
  const pressure = workbench ? auditPressure(workbench, checks) : null;
  const layout = analytical ? await auditLayout(analytical, checks) : null;
  const routes = workbench ? await auditRoutes(workbench, checks) : null;

  analytical = workbench && one(workbench, '[data-role="lafea-analytical-calc"]');
  const scans = analytical ? await scanAllSplitConsoleViews(analytical) : [];
  const rawTokenLeaks = scans.flatMap((scan) => scan.leaks.map((leak) => ({ view: scan.view, ...leak })));
  addCheck(checks, 'presentation.rawTokenLeaks.none', rawTokenLeaks.length === 0, rawTokenLeaks);

  const benchmark = analytical ? await auditBenchmark(analytical, checks) : null;
  const failures = checks.filter((entry) => !entry.pass);
  const result = {
    schema: 'emp1-manual-browser-audit/v3',
    issue: 1651,
    recoveryIssue: 1664,
    status: failures.length === 0 ? 'PASS_CURRENT_VIEWPORT_DOM_OBSERVATION' : 'FAIL_CURRENT_VIEWPORT_DOM_OBSERVATION',
    browserAcceptanceComplete: false,
    automatedPlaywrightPassCreated: false,
    pressureSeed,
    checks,
    failures,
    observations: { rawTokenLeaks, pressure, layout, routes, benchmark },
    manualFollowupRequired: [
      'Run once at desktop width (>1050 px) and once at narrow width (<=1050 px).',
      'Desktop: confirm Work and Engineering Inspector stay side-by-side inside the bounded console; outer shell scrollHeight must not exceed clientHeight by more than 1 px.',
      'Narrow: use Work / Basis / Evidence mode tabs and confirm only one pane is visible at a time; do not accept vertical stacking of desktop panes.',
      'Local Correlation: confirm exactly two registered capability tabs remain, only one capability panel is visible, and authorized vs comparison-only authority states remain distinct.',
      'Evidence: confirm the console is collapsed by default on ordinary tasks and opens to one selected evidence view only.',
      'Use keyboard focus on the CAUx disclosure summary: Enter must open; Space must close.',
      'Return desktop JSON, narrow JSON, keyboard observation, and full-page screenshots to the chain custodian.',
    ],
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

globalThis.runEmp1ManualBrowserAudit = runEmp1ManualBrowserAudit;
console.info('EMP1 split-console manual browser audit loaded. Run: await runEmp1ManualBrowserAudit({ seedQualificationPressure: true })');
