const NAV_ITEMS = Object.freeze([
  { id: 'source', label: 'Source', state: 'planned' },
  { id: 'review', label: 'Review', state: 'planned' },
  { id: 'model', label: 'Model', state: 'planned' },
  { id: 'analysis', label: 'Analysis', state: 'active' },
  { id: 'results', label: 'Results', state: 'planned' },
  { id: 'verification', label: 'Verification', state: 'planned' },
  { id: 'history', label: 'History / Issue', state: 'planned' },
]);

/**
 * Render the application-owned shell for standalone LFEA.
 *
 * The shell intentionally contains no LAFEA host and does not reuse the combined
 * Advanced Analysis application shell. Planned navigation entries are inert
 * until their standalone composition slices are connected.
 *
 * @param {Element} rootElement Standalone application root.
 * @param {{applicationVersion?:string|null,buildSha?:string|null}} identity Build identity.
 * @returns {{workbenchRoot:Element,statusRoot:Element}} Mounted shell references.
 */
export function renderLfeaStandaloneLayout(rootElement, identity = {}) {
  if (!rootElement?.ownerDocument) {
    throw new TypeError('Standalone LFEA requires a DOM root element.');
  }

  const documentRef = rootElement.ownerDocument;
  rootElement.replaceChildren();
  rootElement.dataset.application = 'LFEA';
  rootElement.dataset.mode = 'standalone';

  const shell = documentRef.createElement('div');
  shell.className = 'lfea-standalone-shell';
  shell.dataset.role = 'lfea-standalone-shell';

  const header = documentRef.createElement('header');
  header.className = 'lfea-standalone-header';

  const brand = documentRef.createElement('div');
  brand.className = 'lfea-standalone-brand';
  brand.innerHTML = '<strong>LFEA</strong><span>Linear finite element analysis</span>';

  const identityNode = documentRef.createElement('div');
  identityNode.className = 'lfea-standalone-identity';
  identityNode.dataset.role = 'lfea-build-identity';
  identityNode.textContent = formatIdentity(identity);

  header.append(brand, identityNode);

  const nav = documentRef.createElement('nav');
  nav.className = 'lfea-standalone-nav';
  nav.setAttribute('aria-label', 'LFEA workflow');
  NAV_ITEMS.forEach((item) => {
    const node = documentRef.createElement('span');
    node.className = `lfea-standalone-nav-item is-${item.state}`;
    node.dataset.viewId = item.id;
    node.dataset.state = item.state;
    node.textContent = item.label;
    if (item.state === 'active') node.setAttribute('aria-current', 'page');
    nav.append(node);
  });

  const main = documentRef.createElement('main');
  main.className = 'lfea-standalone-main';

  const statusRoot = documentRef.createElement('div');
  statusRoot.className = 'lfea-standalone-status';
  statusRoot.dataset.role = 'lfea-standalone-status';
  statusRoot.setAttribute('role', 'status');
  statusRoot.textContent = 'Standalone LFEA analysis workbench ready.';

  const workbenchRoot = documentRef.createElement('section');
  workbenchRoot.className = 'lfea-standalone-workbench';
  workbenchRoot.dataset.role = 'lfea-consumer-root';
  workbenchRoot.setAttribute('aria-label', 'LFEA analysis workbench');

  main.append(statusRoot, workbenchRoot);
  shell.append(header, nav, main);
  rootElement.append(shell);

  return Object.freeze({ workbenchRoot, statusRoot });
}

export function clearLfeaStandaloneLayout(rootElement) {
  rootElement?.replaceChildren();
  if (rootElement?.dataset) {
    delete rootElement.dataset.application;
    delete rootElement.dataset.mode;
  }
}

function formatIdentity(identity) {
  const version = text(identity.applicationVersion) ?? 'dev';
  const sha = text(identity.buildSha);
  return sha ? `v${version} · ${sha.slice(0, 12)}` : `v${version} · standalone`;
}

function text(value) {
  const result = String(value ?? '').trim();
  return result || null;
}
