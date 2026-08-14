/** Hash-bound shell orientation qualification anchored to midsurface evidence. */
import { diagnoseOrientation, ORIENTATION_STATES } from '../core/local-shell/orientation-diagnostics.js';
import { canonicalLafeaAnalysisMesh } from './lafea-analysis-mesh-contract.js';
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA_SHELL_ORIENTATION_QUALIFICATION_V3_SCHEMA = 'lafea-shell-orientation-qualification/v3';

export function qualifyLafeaShellOrientationV3(meshValue, value) {
  const mesh = canonicalLafeaAnalysisMesh(meshValue);
  if (mesh.elements.some((element) => element.elementType !== 'CST_DKT_TRI3_THIN_SHELL_V1')) {
    fail('LAFEA_SHELL_ORIENTATION_V3_ELEMENT_FAMILY_INVALID');
  }
  const midsurfaceEvidenceHash = sha256(value?.midsurfaceEvidenceHash, 'MIDSURFACE_EVIDENCE_HASH');
  const allowDisconnectedPatches = boolean(value?.allowDisconnectedPatches, 'ALLOW_DISCONNECTED_PATCHES');
  const anchors = canonicalAnchors(value?.anchors);
  const knownElementIds = new Set(mesh.elements.map((element) => element.elementId));
  const unknownAnchorIds = anchors.filter((anchor) => !knownElementIds.has(anchor.elementId))
    .map((anchor) => anchor.elementId);
  if (unknownAnchorIds.length) fail('LAFEA_SHELL_ORIENTATION_V3_ANCHOR_ELEMENT_UNKNOWN');
  const diagnosis = diagnoseOrientation(mesh.elements);
  const nodeById = new Map(mesh.nodes.map((node) => [node.nodeId, node]));
  const findings = [];

  if (diagnosis.state === ORIENTATION_STATES.INCONSISTENT_WINDING) {
    findings.push(finding('INCONSISTENT_WINDING', {
      elementsRequiringFlip: diagnosis.elementsRequiringFlip,
      conflicts: diagnosis.conflicts,
    }));
  }
  if (diagnosis.state === ORIENTATION_STATES.DISCONNECTED_PATCHES && !allowDisconnectedPatches) {
    findings.push(finding('DISCONNECTED_PATCHES_NOT_AUTHORIZED', diagnosis.patches));
  }

  const patchResults = diagnosis.patches.map((patch, patchIndex) => {
    const patchAnchors = anchors.filter((anchor) => patch.includes(anchor.elementId));
    if (!patchAnchors.length) {
      findings.push(finding('PATCH_ORIENTATION_ANCHOR_ABSENT', { patchIndex, elementIds: patch }));
      return freeze({ patchIndex, elementIds: patch, anchors: [], status: 'BLOCK' });
    }
    const anchorResults = patchAnchors.map((anchor) => {
      const element = mesh.elements.find((row) => row.elementId === anchor.elementId);
      const normal = triangleUnitNormal(element, nodeById);
      const expected = unit(anchor.expectedNormal);
      const alignment = dot(normal, expected);
      const status = alignment > 0 ? 'PASS' : 'BLOCK';
      if (status === 'BLOCK') {
        findings.push(finding('MIDSURFACE_ORIENTATION_ANCHOR_REVERSED', {
          patchIndex, elementId: anchor.elementId, alignment,
        }));
      }
      return freeze({ elementId: anchor.elementId, alignment, status });
    });
    return freeze({
      patchIndex,
      elementIds: patch,
      anchors: anchorResults,
      status: anchorResults.every((row) => row.status === 'PASS') ? 'PASS' : 'BLOCK',
    });
  });

  const core = freeze({
    schema: LAFEA_SHELL_ORIENTATION_QUALIFICATION_V3_SCHEMA,
    meshIdentity: mesh.meshIdentity,
    midsurfaceEvidenceHash,
    allowDisconnectedPatches,
    orientationFormulaId: diagnosis.formulaId ?? 'LAFEA4.DETERMINISTIC_NORMAL_PROPAGATION/v1',
    diagnosisState: diagnosis.state,
    patchCount: diagnosis.patchCount,
    patchResults: freeze(patchResults),
    findings: freeze(findings),
    qualification: findings.length ? 'BLOCK' : 'PASS',
  });
  return freeze({
    ...core,
    qualificationHash: canonicalLafeaSha256({
      schema: 'lafea-shell-orientation-qualification-hash-input/v3', evidence: core,
    }),
    engineeringAuthority: false,
  });
}

function canonicalAnchors(value) {
  if (!Array.isArray(value) || !value.length) fail('LAFEA_SHELL_ORIENTATION_V3_ANCHORS_INVALID');
  const out = value.map((row) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)
      || JSON.stringify(Object.keys(row).sort()) !== JSON.stringify(['elementId', 'expectedNormal'].sort())) {
      fail('LAFEA_SHELL_ORIENTATION_V3_ANCHOR_KEYS_INVALID');
    }
    if (typeof row.elementId !== 'string' || !row.elementId.trim()) {
      fail('LAFEA_SHELL_ORIENTATION_V3_ANCHOR_ELEMENT_INVALID');
    }
    if (!Array.isArray(row.expectedNormal) || row.expectedNormal.length !== 3
      || row.expectedNormal.some((component) => !Number.isFinite(component))) {
      fail('LAFEA_SHELL_ORIENTATION_V3_ANCHOR_NORMAL_INVALID');
    }
    const expectedNormal = unit(row.expectedNormal);
    return freeze({ elementId: row.elementId.trim(), expectedNormal: freeze(expectedNormal) });
  }).sort((a, b) => a.elementId.localeCompare(b.elementId));
  if (new Set(out.map((row) => row.elementId)).size !== out.length) {
    fail('LAFEA_SHELL_ORIENTATION_V3_ANCHOR_DUPLICATE');
  }
  return freeze(out);
}
function triangleUnitNormal(element, nodeById) {
  const [a, b, c] = element.nodeIds.slice(0, 3).map((nodeId) => nodeById.get(nodeId));
  const ab = [b.x - a.x, b.y - a.y, b.z - a.z];
  const ac = [c.x - a.x, c.y - a.y, c.z - a.z];
  return unit([
    ab[1] * ac[2] - ab[2] * ac[1],
    ab[2] * ac[0] - ab[0] * ac[2],
    ab[0] * ac[1] - ab[1] * ac[0],
  ]);
}
function unit(value) {
  const length = Math.hypot(...value);
  if (!(length > 0)) fail('LAFEA_SHELL_ORIENTATION_V3_ZERO_NORMAL');
  return value.map((component) => component / length);
}
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function finding(code, details) {
  return freeze({ code: `LAFEA_SHELL_ORIENTATION_V3_${code}`, details });
}
function boolean(value, field) {
  if (typeof value !== 'boolean') fail(`LAFEA_SHELL_ORIENTATION_V3_${field}_INVALID`);
  return value;
}
function sha256(value, field) {
  if (typeof value !== 'string' || !/^sha256:[0-9a-f]{64}$/u.test(value)) {
    fail(`LAFEA_SHELL_ORIENTATION_V3_${field}_INVALID`);
  }
  return value;
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze); return Object.freeze(value);
}
