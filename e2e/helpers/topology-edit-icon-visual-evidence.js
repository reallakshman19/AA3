/**
 * Pure decision logic for the production icon VISUALLY_RENDERED predicate.
 *
 * The browser side (topology-edit-icon-qualification.js) only harvests raw
 * computed-style/geometry evidence in a single atomic DOM read; every rule that
 * decides whether a glyph is actually painted lives here, in Node, so it can be
 * unit-tested directly instead of only through Chromium. Rules are unchanged
 * from the in-page implementation they were extracted from.
 */

export const MIN_VISIBLE_OPACITY = 0.01;
export const GEOMETRY_SELECTOR = 'path,rect,circle,ellipse,line,polyline,polygon';

export function parseNumber(value, fallback = 0) {
  const parsed = Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizedAlpha(token) {
  const value = String(token ?? '').trim().toLowerCase();
  if (!value) return null;
  if (value.endsWith('%')) {
    const parsed = Number.parseFloat(value.slice(0, -1));
    return Number.isFinite(parsed) ? parsed / 100 : null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function paintHasVisibleAlpha(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized || normalized === 'none' || normalized === 'transparent') return false;

  const slashAlpha = normalized.match(/\/\s*(-?(?:\d+|\d*\.\d+)%?)\s*\)$/);
  if (slashAlpha) {
    const alpha = normalizedAlpha(slashAlpha[1]);
    if (alpha !== null) return alpha > MIN_VISIBLE_OPACITY;
  }

  if (normalized.startsWith('rgba(')) {
    const parts = normalized.slice(5, -1).split(',');
    if (parts.length === 4) {
      const alpha = normalizedAlpha(parts[3]);
      if (alpha !== null) return alpha > MIN_VISIBLE_OPACITY;
    }
  }
  return true;
}

function expandBox(tokens) {
  if (tokens.length === 1) return [tokens[0], tokens[0], tokens[0], tokens[0]];
  if (tokens.length === 2) return [tokens[0], tokens[1], tokens[0], tokens[1]];
  if (tokens.length === 3) return [tokens[0], tokens[1], tokens[2], tokens[1]];
  return tokens;
}

function resolveLength(token, axis) {
  const value = String(token || '').trim().toLowerCase();
  if (value.endsWith('%')) {
    const parsed = Number.parseFloat(value.slice(0, -1));
    return Number.isFinite(parsed) ? axis * parsed / 100 : null;
  }
  if (value.endsWith('px')) {
    const parsed = Number.parseFloat(value.slice(0, -2));
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (/^-?(?:\d+|\d*\.\d+)$/.test(value)) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

const unproven = (raw) => ({ raw, kind: 'UNPROVEN', certifiable: false, fullyClipped: null });

/**
 * URL(), polygon(), path(), geometry-box and unfamiliar clip forms are never
 * accepted as proof of visible production paint; qualification fails closed.
 */
export function certifyClip(record) {
  const rawClipPath = String(record.clipPath || '').trim();
  const clipPath = rawClipPath.toLowerCase();
  const legacyClip = String(record.clip || '').replace(/\s+/gu, '').toLowerCase();
  if (legacyClip === 'rect(0px,0px,0px,0px)' || legacyClip === 'rect(0px 0px 0px 0px)') {
    return {
      raw: rawClipPath || record.clip,
      kind: 'LEGACY_RECT',
      certifiable: true,
      fullyClipped: true,
    };
  }
  if (!clipPath || clipPath === 'none') {
    return { raw: rawClipPath, kind: 'NONE', certifiable: true, fullyClipped: false };
  }

  const width = parseNumber(record.boundsWidth, 0);
  const height = parseNumber(record.boundsHeight, 0);

  const inset = clipPath.match(/^inset\((.*)\)$/u);
  if (inset) {
    const tokens = inset[1].split(/\s+round\s+/u)[0].trim().split(/\s+/u)
      .filter(Boolean);
    if (tokens.length >= 1 && tokens.length <= 4) {
      const [topToken, rightToken, bottomToken, leftToken] = expandBox(tokens);
      const top = resolveLength(topToken, height);
      const right = resolveLength(rightToken, width);
      const bottom = resolveLength(bottomToken, height);
      const left = resolveLength(leftToken, width);
      if ([top, right, bottom, left].every((item) => item !== null)) {
        const visibleWidth = Math.max(0, width - left - right);
        const visibleHeight = Math.max(0, height - top - bottom);
        return {
          raw: rawClipPath,
          kind: 'INSET',
          certifiable: true,
          fullyClipped: visibleWidth <= 0 || visibleHeight <= 0,
          visibleWidth,
          visibleHeight,
        };
      }
    }
    return unproven(rawClipPath);
  }

  const circle = clipPath.match(/^circle\(([^\s)]+)(?:\s+at\s+[^)]*)?\)$/u);
  if (circle) {
    const radius = resolveLength(circle[1], Math.min(width, height));
    if (radius !== null) {
      return {
        raw: rawClipPath, kind: 'CIRCLE', certifiable: true, fullyClipped: radius <= 0, radius,
      };
    }
    return unproven(rawClipPath);
  }

  const ellipse = clipPath.match(/^ellipse\(([^\s)]+)\s+([^\s)]+)(?:\s+at\s+[^)]*)?\)$/u);
  if (ellipse) {
    const radiusX = resolveLength(ellipse[1], width);
    const radiusY = resolveLength(ellipse[2], height);
    if (radiusX !== null && radiusY !== null) {
      return {
        raw: rawClipPath,
        kind: 'ELLIPSE',
        certifiable: true,
        fullyClipped: radiusX <= 0 || radiusY <= 0,
        radiusX,
        radiusY,
      };
    }
    return unproven(rawClipPath);
  }

  return unproven(rawClipPath);
}

/**
 * Walks harvested ancestor records outward from the measured node. `records[0]`
 * is the node itself; the harvester already stops before the boundary element.
 */
export function evaluatePresentationChain(records) {
  let visible = Array.isArray(records) && records.length > 0;
  let effectiveOpacity = 1;
  let hiddenBy = null;
  const clipPaths = [];
  for (let index = 0; visible && index < records.length; index += 1) {
    const record = records[index];
    effectiveOpacity *= parseNumber(record.opacity, 1);
    const clip = certifyClip(record);
    if (clip.kind !== 'NONE') clipPaths.push({ tag: record.tag, ...clip });
    if (record.display === 'none' || record.visibility === 'hidden'
        || record.visibility === 'collapse' || record.contentVisibility === 'hidden'
        || effectiveOpacity <= MIN_VISIBLE_OPACITY || !clip.certifiable || clip.fullyClipped) {
      visible = false;
      hiddenBy = index === 0 ? 'self' : record.tag;
    }
  }
  return { visible, effectiveOpacity, hiddenBy, clipPaths };
}

export function evaluateGeometry(rawGeometry, useColor) {
  if (!Array.isArray(rawGeometry)) {
    return {
      rawGeometryCount: 0, drawableGeometryCount: 0, maxStrokeWidth: 0, geometry: [],
    };
  }
  const useColorVisible = paintHasVisibleAlpha(useColor);
  const geometry = rawGeometry.map((node) => {
    const chain = evaluatePresentationChain(node.chain);
    const fillOpacity = parseNumber(node.fillOpacity, 1);
    const strokeOpacity = parseNumber(node.strokeOpacity, 1);
    const strokeWidth = parseNumber(node.strokeWidth, 0);
    const fillVisible = paintHasVisibleAlpha(node.fill) && fillOpacity > MIN_VISIBLE_OPACITY;
    const strokeVisible = paintHasVisibleAlpha(node.stroke)
      && strokeOpacity > MIN_VISIBLE_OPACITY && strokeWidth > 0;
    const length = parseNumber(node.length, 0);
    const bounds = node.bounds ?? {
      x: 0, y: 0, width: 0, height: 0,
    };
    return {
      tag: node.tag,
      painted: (fillVisible || strokeVisible) && (!node.usesCurrentColor || useColorVisible),
      hasExtent: bounds.width > 0 || bounds.height > 0 || length > 0,
      fill: node.fill,
      fillOpacity,
      stroke: node.stroke,
      strokeOpacity,
      strokeWidth,
      effectiveOpacity: chain.effectiveOpacity,
      sourceVisible: chain.visible,
      hiddenBy: chain.hiddenBy,
      usesCurrentColor: node.usesCurrentColor,
      bounds,
      length,
    };
  });
  const drawable = geometry.filter((item) => (
    item.painted && item.hasExtent && item.sourceVisible
      && item.effectiveOpacity > MIN_VISIBLE_OPACITY
  ));
  return {
    rawGeometryCount: geometry.length,
    drawableGeometryCount: drawable.length,
    maxStrokeWidth: drawable.reduce((max, item) => Math.max(max, item.strokeWidth || 0), 0),
    geometry,
  };
}

/** Assembles the qualification record from one atomic harvest. */
export function computeIconEvidence(raw) {
  const geometry = evaluateGeometry(raw.rawGeometry, raw.useColor);
  const rect = raw.renderedBounds ?? {
    width: 0, height: 0, top: 0, left: 0,
  };
  const bbox = raw.useBounds ?? {
    x: 0, y: 0, width: 0, height: 0,
  };
  const strokePad = geometry.maxStrokeWidth;
  const paintBounds = {
    x: bbox.x - strokePad / 2,
    y: bbox.y - strokePad / 2,
    width: bbox.width + strokePad,
    height: bbox.height + strokePad,
  };
  const presentation = evaluatePresentationChain(raw.useChain);
  const inViewport = rect.width > 0 && rect.height > 0
    && rect.top < raw.viewportHeight && rect.left < raw.viewportWidth
    && rect.top + rect.height > 0 && rect.left + rect.width > 0;

  const viewBox = raw.viewBox;
  const hasViewport = Boolean(viewBox && viewBox.width > 0 && viewBox.height > 0);
  const intersectsViewBox = Boolean(hasViewport
    && paintBounds.width > 0 && paintBounds.height > 0
    && paintBounds.x < viewBox.x + viewBox.width
    && paintBounds.x + paintBounds.width > viewBox.x
    && paintBounds.y < viewBox.y + viewBox.height
    && paintBounds.y + paintBounds.height > viewBox.y);
  const visible = presentation.visible && inViewport && intersectsViewBox
    && geometry.drawableGeometryCount > 0;

  let referenceStatus = 'RESOLVED';
  if (!raw.hasUse) referenceStatus = 'NO_SVG_ICONS';
  else if (raw.actualReference.endsWith('-broken')) referenceStatus = 'BROKEN';
  else if (raw.targetCount !== 1) referenceStatus = 'UNRESOLVED';
  else if (visible) referenceStatus = 'VISUALLY_RENDERED';

  return {
    actualReference: raw.actualReference,
    referenceStatus,
    resolvedTargetId: raw.resolvedTargetId,
    targetCount: raw.targetCount,
    rawGeometryCount: geometry.rawGeometryCount,
    drawableGeometryCount: geometry.drawableGeometryCount,
    drawableGeometry: geometry.geometry,
    renderedBounds: rect,
    useBounds: bbox,
    paintBounds,
    computedVisibility: {
      visible,
      inViewport,
      intersectsViewBox,
      effectiveOpacity: presentation.effectiveOpacity,
      opacityThreshold: MIN_VISIBLE_OPACITY,
      currentColor: raw.useColor,
      hiddenBy: presentation.hiddenBy,
      clipPaths: presentation.clipPaths,
    },
    state: raw.state,
    bindingKey: raw.bindingKey,
    bindingSymbol: raw.bindingSymbol,
    bindingIdentity: raw.bindingIdentity,
    expectedKey: raw.expectedKey,
  };
}
