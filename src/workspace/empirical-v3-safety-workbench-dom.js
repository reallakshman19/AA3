export function createEmpiricalV3SafetyWorkbenchSection(doc) {
  const section = doc.createElement('section');
  section.className = 'properties-accordion-section empirical-v3-safety';
  section.dataset.role = 'empirical-v3-safety-workbench';
  const header = doc.createElement('header');
  header.className = 'accordion-section-header';
  const title = doc.createElement('span');
  title.className = 'accordion-section-title';
  title.textContent = 'Empirical V3 Safety & Evidence';
  header.append(title);
  const body = doc.createElement('div');
  body.className = 'accordion-section-body';
  const toolbar = doc.createElement('div');
  toolbar.className = 'empirical-v3-safety__toolbar';
  const branchTab = button(doc, 'Branch Basis', 'empirical-v3-branch-basis-tab');
  const safetyTab = button(doc, 'Safety Gate', 'empirical-v3-safety-gate-tab');
  const explainTab = button(doc, 'Explain Calculation', 'empirical-v3-explain-tab');
  branchTab.setAttribute('role', 'tab');
  safetyTab.setAttribute('role', 'tab');
  explainTab.setAttribute('role', 'tab');
  const auditButton = button(doc, 'Download Audit JSON', 'empirical-v3-audit-download');
  const clearButton = button(doc, 'Clear', 'empirical-v3-safety-clear');
  toolbar.append(branchTab, safetyTab, explainTab, auditButton, clearButton);
  const status = doc.createElement('output');
  status.className = 'empirical-v3-safety__status';
  status.setAttribute('aria-live', 'polite');
  const error = doc.createElement('p');
  error.className = 'empirical-v3-safety__error';
  error.hidden = true;
  const content = doc.createElement('div');
  content.className = 'empirical-v3-safety__content';
  const evidence = doc.createElement('aside');
  evidence.className = 'empirical-v3-safety__evidence';
  evidence.hidden = true;
  body.append(toolbar, status, error, content, evidence);
  section.append(header, body);
  return {
    section,
    branchTab,
    safetyTab,
    explainTab,
    auditButton,
    clearButton,
    status,
    error,
    content,
    evidence,
  };
}

function button(doc, label, role) {
  const value = doc.createElement('button');
  value.type = 'button';
  value.textContent = label;
  value.dataset.role = role;
  return value;
}
