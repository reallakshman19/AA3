import { lfeaPipelineIconSpriteMarkup } from './lfea-pipeline-icon-sprite.js';

/**
 * Install-once SVG sprite + <use>-based icon builder for the LFEA
 * pipeline shell's own header chrome, following the same install/
 * duplicate-guard shape as
 * viewport-productivity/topology-edit-icon-presentation-runtime.js
 * (a real, working precedent to follow), without sharing code with it --
 * this shell's icon set is small and scoped to its own header only.
 */
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const SPRITE_ROLE = 'lfea-pipeline-icon-sprite';

/** Idempotent: returns the existing sprite if one is already installed under this host, instead of throwing. */
export function installLfeaPipelineIconSprite(host) {
  if (!host) throw new TypeError('installLfeaPipelineIconSprite requires a host element.');
  const documentRef = host.ownerDocument;
  const existing = documentRef.querySelector(`svg[data-role="${SPRITE_ROLE}"]`);
  if (existing) return existing;
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
  sprite.innerHTML = lfeaPipelineIconSpriteMarkup();
  host.prepend(sprite);
  return sprite;
}

/** Builds a <svg><use href="#icon-id"></svg> referencing a symbol from the installed sprite. */
export function lfeaPipelineIcon(documentRef, iconId) {
  const svg = documentRef.createElementNS(SVG_NAMESPACE, 'svg');
  svg.classList.add('lfea-pipeline-icon');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = documentRef.createElementNS(SVG_NAMESPACE, 'use');
  use.setAttribute('href', `#${iconId}`);
  svg.append(use);
  return svg;
}
