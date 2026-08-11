export function mountLfeaNativeVerificationView(root, options = {}) {
  if (!root?.ownerDocument) throw new TypeError('Native Verification root is required.');
  const onCreateDossier = typeof options.onCreateDossier === 'function' ? options.onCreateDossier : null;

  function update(verification, dossier) {
    const doc = root.ownerDocument;
    const section = doc.createElement('section');
    section.className = 'lfea-native-verification';
    section.dataset.status = verification?.status ?? 'BLOCKED';
    section.append(header(doc, verification));
    if (verification?.status !== 'CURRENT') {
      section.append(codeList(doc, 'Verification blocked because', verification?.reasonCodes ?? []));
      root.replaceChildren(section);
      return;
    }
    section.append(identityTable(doc, verification));
    section.append(caseEvidence(doc, verification.cases));
    section.append(publicationLimitations(doc, verification.publicationReadiness));
    section.append(dossierPanel(doc, verification, dossier, onCreateDossier));
    root.replaceChildren(section);
  }

  return Object.freeze({ update, destroy: () => root.replaceChildren() });
}

function header(doc, verification) {
  const wrapper = doc.createElement('div');
  wrapper.className = 'lfea-native-verification-header';
  const title = doc.createElement('h2');
  title.textContent = 'Native piping Verification';
  const note = paragraph(doc,
    'This surface reports retained solver/recovery evidence exactly as sealed. It does not recalculate residuals, equilibrium, condition estimates, support actions, or code stress.');
  const badge = doc.createElement('strong');
  badge.textContent = verification?.status ?? 'BLOCKED';
  wrapper.append(title, badge, note);
  return wrapper;
}

function identityTable(doc, verification) {
  return facts(doc, [
    ['Current run', verification.runId],
    ['Source SHA-256', verification.source.contentSha256],
    ['Source bundle', verification.source.sourceBundleSemanticHash],
    ['Pre-flight', verification.authority.preFlightSemanticHash],
    ['Preparation', verification.authority.preparationSemanticHash],
    ['Authorization', verification.authority.authorizationSemanticHash],
    ['Model', verification.authority.modelSemanticHash],
    ['Stiffness', verification.authority.stiffnessStateHash],
    ['Load', verification.authority.loadStateHash],
    ['Analysis profile', verification.authority.requestedProfileId],
    ['Raw execution batch', verification.authority.rawExecutionBatchId],
    ['Recovery batch', verification.authority.recoveryBatchId],
    ['Recovery profile', verification.authority.recoveryProfileSemanticHash],
    ['Application', verification.application.application],
    ['Application version', verification.application.applicationVersion],
    ['Build SHA', verification.application.buildSha],
    ['Build time', verification.application.buildTime],
  ]);
}

function caseEvidence(doc, cases) {
  const section = doc.createElement('section');
  section.className = 'lfea-native-verification-cases';
  const heading = doc.createElement('h3');
  heading.textContent = 'Retained case evidence';
  section.append(heading);
  for (const row of cases) {
    const block = doc.createElement('article');
    block.className = 'lfea-native-verification-case';
    const title = doc.createElement('h4');
    title.textContent = `${row.caseId} · ${row.caseRole}`;
    block.append(title, facts(doc, [
      ['Physical case', row.physicalLoadCaseHash],
      ['Frame-element profile', row.frameElementProfileSemanticHash],
      ['Solver profile', row.solverProfileSemanticHash],
      ['Execution status', row.execution.status],
      ['Execution hash', row.execution.executionHash],
      ['Execution evidence', row.execution.executionEvidenceHash],
      ['Assembly hash', row.execution.assemblySemanticHash],
      ['Assembly evidence', row.execution.assemblyEvidenceHash],
      ['Factor backend', row.execution.factorization.backend],
      ['Factorization hash', row.execution.factorization.factorizationHash],
      ['Factorization evidence', row.execution.factorization.evidenceHash],
      ['Condition estimate', row.execution.factorization.conditionEstimate],
      ['Residual ∞-norm', row.execution.diagnostics.residualNormInf],
      ['Force equilibrium norm', row.execution.diagnostics.forceEquilibriumNorm],
      ['Moment equilibrium norm', row.execution.diagnostics.momentEquilibriumNorm],
      ['Energy balance relative error', row.execution.diagnostics.energyBalanceRelativeError],
      ['Recovery hash', row.recovery.recoveryHash],
      ['Recovery semantic hash', row.recovery.recoverySemanticHash],
      ['Recovery evidence', row.recovery.recoveryEvidenceHash],
    ]));
    section.append(block);
  }
  return section;
}

function publicationLimitations(doc, readiness) {
  const section = doc.createElement('section');
  section.className = 'lfea-native-verification-limitations';
  const heading = doc.createElement('h3');
  heading.textContent = 'Downstream publication limitations';
  section.append(heading);
  if (!readiness) {
    section.append(paragraph(doc, 'Publication readiness evidence is unavailable.'));
    return section;
  }
  section.append(facts(doc, [
    ['Support actions', readiness.supportActions.status],
    ['B31 code application', readiness.b31Code.status],
  ]));
  section.append(codeList(doc, 'Support-action blockers', readiness.supportActions.reasonCodes));
  section.append(codeList(doc, 'B31 blockers', readiness.b31Code.reasonCodes));
  return section;
}

function dossierPanel(doc, verification, dossier, onCreateDossier) {
  const section = doc.createElement('section');
  section.className = 'lfea-native-dossier';
  const heading = doc.createElement('h3');
  heading.textContent = 'Evidence dossier';
  const button = doc.createElement('button');
  button.type = 'button';
  button.dataset.role = 'lfea-create-evidence-dossier';
  button.textContent = 'Create current evidence dossier';
  button.disabled = verification.status !== 'CURRENT';
  button.addEventListener('click', () => onCreateDossier?.());
  section.append(heading, paragraph(doc,
    'The dossier records current retained evidence only. It does not grant engineering issue or project release authority.'), button);
  if (dossier) {
    section.append(facts(doc, [
      ['Dossier status', dossier.dossierStatus],
      ['Engineering issue eligible', dossier.engineeringIssueEligible ? 'YES' : 'NO'],
      ['Dossier semantic hash', dossier.semanticHash],
    ]));
    section.append(codeList(doc, 'Dossier limitations', dossier.limitationCodes));
  }
  return section;
}

function facts(doc, rows) {
  const table = doc.createElement('table');
  table.className = 'lfea-journey-table';
  for (const [label, value] of rows) {
    const tr = doc.createElement('tr');
    const th = doc.createElement('th'); th.scope = 'row'; th.textContent = label;
    const td = doc.createElement('td'); td.textContent = display(value);
    tr.append(th, td); table.append(tr);
  }
  return table;
}

function codeList(doc, label, values) {
  const wrapper = doc.createElement('div');
  const heading = doc.createElement('h4'); heading.textContent = label;
  const list = doc.createElement('ul');
  for (const value of values ?? []) { const li = doc.createElement('li'); const code = doc.createElement('code'); code.textContent = value; li.append(code); list.append(li); }
  wrapper.append(heading, list); return wrapper;
}
function paragraph(doc, value) { const p = doc.createElement('p'); p.className = 'lfea-journey-copy'; p.textContent = value; return p; }
function display(value) { return value === null || value === undefined || value === '' ? '—' : String(value); }
