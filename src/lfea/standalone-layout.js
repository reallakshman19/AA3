const NAV_ITEMS = Object.freeze([
  { id: 'source', label: 'Source', state: 'available' },
  { id: 'review', label: 'Review', state: 'available' },
  { id: 'model', label: 'Model', state: 'available' },
  { id: 'analysis', label: 'Analysis', state: 'available' },
  { id: 'results', label: 'Results', state: 'available' },
  { id: 'verification', label: 'Verification', state: 'available' },
  { id: 'history', label: 'History', state: 'available' },
  { id: 'compare', label: 'Compare', state: 'available' },
]);

export function renderLfeaStandaloneLayout(rootElement, identity = {}, options = {}) {
  if (!rootElement?.ownerDocument) {
    throw new TypeError('Standalone LFEA requires a DOM root element.');
  }

  const documentRef = rootElement.ownerDocument;
  const onViewActivated = typeof options.onViewActivated === 'function'
    ? options.onViewActivated
    : null;
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
  const brandName = documentRef.createElement('strong');
  brandName.textContent = 'LFEA';
  const brandDescription = documentRef.createElement('span');
  brandDescription.textContent = 'Linear finite element analysis';
  brand.append(brandName, brandDescription);

  const identityNode = documentRef.createElement('div');
  identityNode.className = 'lfea-standalone-identity';
  identityNode.dataset.role = 'lfea-build-identity';
  identityNode.textContent = formatIdentity(identity);
  header.append(brand, identityNode);

  const nav = documentRef.createElement('nav');
  nav.className = 'lfea-standalone-nav';
  nav.setAttribute('aria-label', 'LFEA workflow');

  const viewRoots = new Map();
  const navNodes = new Map();
  const main = documentRef.createElement('main');
  main.className = 'lfea-standalone-main';

  const statusRoot = documentRef.createElement('div');
  statusRoot.className = 'lfea-standalone-status';
  statusRoot.dataset.role = 'lfea-standalone-status';
  statusRoot.setAttribute('role', 'status');
  statusRoot.textContent = 'Import a governed InputXML source to begin.';
  main.append(statusRoot);

  for (const item of NAV_ITEMS) {
    const node = item.state === 'available'
      ? documentRef.createElement('button')
      : documentRef.createElement('span');
    if (node.tagName === 'BUTTON') node.type = 'button';
    node.className = `lfea-standalone-nav-item is-${item.state}`;
    node.dataset.viewId = item.id;
    node.dataset.state = item.state;
    node.textContent = item.label;
    nav.append(node);
    navNodes.set(item.id, node);

    const view = documentRef.createElement('section');
    view.className = 'lfea-standalone-view';
    view.dataset.viewId = item.id;
    view.dataset.state = item.state;
    view.hidden = true;
    main.append(view);
    viewRoots.set(item.id, view);
  }

  const verificationRoot = viewRoots.get('verification');
  const nativeVerificationRoot = documentRef.createElement('div');
  nativeVerificationRoot.className = 'lfea-native-verification-root';
  nativeVerificationRoot.dataset.role = 'lfea-native-verification-root';
  const verificationIntro = documentRef.createElement('p');
  verificationIntro.className = 'lfea-standalone-verification-intro';
  verificationIntro.textContent = 'Independent element-FEA verification workbench below. It does not represent native InputXML piping execution custody.';
  const workbenchRoot = documentRef.createElement('div');
  workbenchRoot.className = 'lfea-standalone-workbench';
  workbenchRoot.dataset.role = 'lfea-consumer-root';
  workbenchRoot.setAttribute('aria-label', 'LFEA verification workbench');
  verificationRoot.append(nativeVerificationRoot, verificationIntro, workbenchRoot);

  let activeViewId = null;
  function activate(viewId) {
    const item = NAV_ITEMS.find((entry) => entry.id === viewId);
    if (!item || item.state !== 'available') {
      const error = new TypeError(`Standalone LFEA view is not available: ${viewId}`);
      error.code = 'LFEA_STANDALONE_VIEW_UNAVAILABLE';
      throw error;
    }
    activeViewId = viewId;
    for (const [id, view] of viewRoots) view.hidden = id !== viewId;
    for (const [id, node] of navNodes) {
      const active = id === viewId;
      node.classList?.toggle('is-active', active);
      if (active) node.setAttribute('aria-current', 'page');
      else node.removeAttribute?.('aria-current');
    }
    onViewActivated?.(activeViewId);
    return activeViewId;
  }

  for (const item of NAV_ITEMS.filter((entry) => entry.state === 'available')) {
    navNodes.get(item.id).addEventListener('click', () => activate(item.id));
  }

  shell.append(header, nav, main);
  rootElement.append(shell);
  activate(validInitialView(options.initialViewId) ? options.initialViewId : 'source');

  return Object.freeze({
    statusRoot,
    sourceRoot: viewRoots.get('source'),
    reviewRoot: viewRoots.get('review'),
    modelRoot: viewRoots.get('model'),
    analysisRoot: viewRoots.get('analysis'),
    resultsRoot: viewRoots.get('results'),
    verificationRoot,
    nativeVerificationRoot,
    historyRoot: viewRoots.get('history'),
    comparisonRoot: viewRoots.get('compare'),
    workbenchRoot,
    activate,
    getActiveView: () => activeViewId,
  });
}

export function clearLfeaStandaloneLayout(rootElement) {
  rootElement?.replaceChildren();
  if (rootElement?.dataset) {
    delete rootElement.dataset.application;
    delete rootElement.dataset.mode;
  }
}

function validInitialView(viewId) {
  return NAV_ITEMS.some((entry) => entry.id === viewId && entry.state === 'available');
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
