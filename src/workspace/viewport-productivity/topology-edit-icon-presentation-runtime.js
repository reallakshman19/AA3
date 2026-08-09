import { topologyEditRequiredIconEntries } from './topology-edit-icon-manifest.js';
import {
  TOPOLOGY_EDIT_ICON_SYMBOLS,
  topologyEditIconSpriteMarkup,
} from './topology-edit-icon-sprite.js';
import './topology-edit-icon-presentation.css';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const SPRITE_ROLE = 'topology-edit-icon-sprite';

/** Presentation-only manifest-to-control binding for production 3D Edit icons. */
export class TopologyEditIconPresentationRuntime {
  constructor() {
    this.host = null;
    this.sprite = null;
    this.bindings = [];
  }

  mount(host) {
    this.destroy();
    if (!host) throw new TypeError('TopologyEditIconPresentationRuntime requires a host element.');
    this.host = host;
    try {
      this.sprite = installSprite(host);
      for (const entry of topologyEditRequiredIconEntries()) this.bindEntry(entry);
      publishEvidence(host, this.bindings.length);
      return this;
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  destroy() {
    for (const { control, icon } of this.bindings) {
      icon.remove();
      delete control.dataset.topologyEditIconKey;
      delete control.dataset.topologyEditIconSymbol;
    }
    this.bindings = [];
    this.sprite?.remove();
    this.sprite = null;
    if (this.host) clearEvidence(this.host);
    this.host = null;
  }

  bindEntry(entry) {
    const matches = [...this.host.querySelectorAll(entry.selector)];
    if (matches.length !== 1) {
      throw new Error(
        `TOPOLOGY_EDIT_ICON_CONTROL_CARDINALITY_MISMATCH:${entry.key}:${matches.length}`,
      );
    }
    const control = matches[0];
    if (control.querySelector(':scope > svg[data-topology-edit-icon-key]')) {
      throw new Error(`TOPOLOGY_EDIT_ICON_CONTROL_DUPLICATE:${entry.key}`);
    }
    const icon = buildIcon(control.ownerDocument, entry);
    control.prepend(icon);
    control.dataset.topologyEditIconKey = entry.key;
    control.dataset.topologyEditIconSymbol = entry.symbolId;
    this.bindings.push({ entry, control, icon });
  }
}

function installSprite(host) {
  const documentRef = host.ownerDocument;
  const existing = [...documentRef.querySelectorAll(`svg[data-role="${SPRITE_ROLE}"]`)];
  if (existing.length) {
    throw new Error(`TOPOLOGY_EDIT_ICON_SPRITE_DUPLICATE:${existing.length}`);
  }
  const sprite = documentRef.createElementNS(SVG_NAMESPACE, 'svg');
  sprite.dataset.role = SPRITE_ROLE;
  sprite.setAttribute('aria-hidden', 'true');
  sprite.setAttribute('focusable', 'false');
  sprite.setAttribute('width', '0');
  sprite.setAttribute('height', '0');
  sprite.style.position = 'absolute';
  sprite.style.inlineSize = '0';
  sprite.style.blockSize = '0';
  sprite.style.overflow = 'hidden';
  sprite.innerHTML = topologyEditIconSpriteMarkup();
  host.prepend(sprite);
  return sprite;
}

function buildIcon(documentRef, entry) {
  const svg = documentRef.createElementNS(SVG_NAMESPACE, 'svg');
  svg.classList.add('topology-edit-control-icon');
  svg.dataset.topologyEditIconKey = entry.key;
  svg.dataset.topologyEditIconSymbol = entry.symbolId;
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('viewBox', '0 0 16 16');
  const use = documentRef.createElementNS(SVG_NAMESPACE, 'use');
  use.setAttribute('href', `#${entry.symbolId}`);
  svg.append(use);
  return svg;
}

function publishEvidence(host, bindingCount) {
  host.dataset.topologyEditIconManifestCount = String(topologyEditRequiredIconEntries().length);
  host.dataset.topologyEditIconBindingCount = String(bindingCount);
  host.dataset.topologyEditIconSymbolCount = String(TOPOLOGY_EDIT_ICON_SYMBOLS.length);
  host.dataset.topologyEditIconPresentationStatus = bindingCount === topologyEditRequiredIconEntries().length
    ? 'BOUND'
    : 'INCOMPLETE';
}

function clearEvidence(host) {
  delete host.dataset.topologyEditIconManifestCount;
  delete host.dataset.topologyEditIconBindingCount;
  delete host.dataset.topologyEditIconSymbolCount;
  delete host.dataset.topologyEditIconPresentationStatus;
}
