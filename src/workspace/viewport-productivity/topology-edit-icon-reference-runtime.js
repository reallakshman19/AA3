/**
 * Presentation-only repair boundary for runtime-injected 3D Edit SVG icons.
 *
 * The topology editor's engineering command, selection, journal, and renderer
 * authorities do not depend on this runtime. It only normalizes local SVG
 * fragment references that were observed in the live DOM with an erroneous
 * `-broken` suffix (for example `#icon-undo-broken`).
 */
const BROKEN_FRAGMENT_SUFFIX = '-broken';
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink';

export class TopologyEditIconReferenceRuntime {
  constructor() {
    this.host = null;
    this.observer = null;
    this.repairedReferenceCount = 0;
  }

  mount(host) {
    this.destroy();
    if (!host) throw new TypeError('TopologyEditIconReferenceRuntime requires a host element.');
    this.host = host;
    this.repairCurrentReferences();

    const MutationObserverCtor = host.ownerDocument?.defaultView?.MutationObserver
      ?? globalThis.MutationObserver;
    if (typeof MutationObserverCtor !== 'function') return this;

    this.observer = new MutationObserverCtor(() => this.repairCurrentReferences());
    this.observer.observe(host, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['href', 'xlink:href'],
    });
    return this;
  }

  destroy() {
    this.observer?.disconnect();
    this.observer = null;
    if (this.host) clearEvidence(this.host);
    this.host = null;
    this.repairedReferenceCount = 0;
  }

  repairCurrentReferences() {
    if (!this.host) return iconReferenceEvidence([], 0, null);
    const uses = [...this.host.querySelectorAll('svg use, use')];
    uses.forEach((useElement) => {
      const reference = useReference(useElement);
      const normalized = normalizeBrokenIconReference(reference);
      if (normalized === reference) return;
      writeUseReference(useElement, normalized);
      this.repairedReferenceCount += 1;
    });
    const evidence = iconReferenceEvidence(
      uses,
      this.repairedReferenceCount,
      this.host.ownerDocument,
    );
    publishEvidence(this.host, evidence);
    return evidence;
  }
}

export function normalizeBrokenIconReference(reference) {
  if (typeof reference !== 'string') return reference;
  if (!reference.startsWith('#') || !reference.endsWith(BROKEN_FRAGMENT_SUFFIX)) return reference;
  return reference.slice(0, -BROKEN_FRAGMENT_SUFFIX.length);
}

function useReference(useElement) {
  return useElement.getAttribute('href')
    ?? useElement.getAttributeNS?.(XLINK_NAMESPACE, 'href')
    ?? useElement.getAttribute('xlink:href')
    ?? '';
}

function writeUseReference(useElement, reference) {
  if (useElement.hasAttribute('href')) useElement.setAttribute('href', reference);
  if (useElement.hasAttributeNS?.(XLINK_NAMESPACE, 'href')) {
    useElement.setAttributeNS(XLINK_NAMESPACE, 'xlink:href', reference);
  }
  if (!useElement.hasAttribute('href')
    && !useElement.hasAttributeNS?.(XLINK_NAMESPACE, 'href')) {
    useElement.setAttribute('href', reference);
  }
}

function iconReferenceEvidence(useElements, repairedReferenceCount, documentRef) {
  const references = useElements.map((useElement) => useReference(useElement)).filter(Boolean);
  const brokenReferenceCount = references.filter((reference) => (
    reference.startsWith('#') && reference.endsWith(BROKEN_FRAGMENT_SUFFIX)
  )).length;
  const unresolvedReferenceCount = documentRef
    ? references.filter((reference) => (
      reference.startsWith('#') && !documentRef.getElementById(reference.slice(1))
    )).length
    : 0;
  return Object.freeze({
    referenceCount: references.length,
    repairedReferenceCount,
    brokenReferenceCount,
    unresolvedReferenceCount,
    status: brokenReferenceCount > 0
      ? 'BROKEN'
      : unresolvedReferenceCount > 0
        ? 'UNRESOLVED'
        : references.length > 0
          ? 'RESOLVED'
          : 'NO_SVG_ICONS',
  });
}

function publishEvidence(host, evidence) {
  host.dataset.topologyEditIconReferenceCount = String(evidence.referenceCount);
  host.dataset.topologyEditIconRepairedReferenceCount = String(evidence.repairedReferenceCount);
  host.dataset.topologyEditIconBrokenReferenceCount = String(evidence.brokenReferenceCount);
  host.dataset.topologyEditIconUnresolvedReferenceCount = String(evidence.unresolvedReferenceCount);
  host.dataset.topologyEditIconReferenceStatus = evidence.status;
}

function clearEvidence(host) {
  delete host.dataset.topologyEditIconReferenceCount;
  delete host.dataset.topologyEditIconRepairedReferenceCount;
  delete host.dataset.topologyEditIconBrokenReferenceCount;
  delete host.dataset.topologyEditIconUnresolvedReferenceCount;
  delete host.dataset.topologyEditIconReferenceStatus;
}
