/** Refinement transition-zone quality evidence; does not enable refinement execution. */
import { canonicalLafeaSha256 } from './lafea-canonical-sha256.js';

export const LAFEA_MESH_TRANSITION_QUALITY_V3_SCHEMA = 'lafea-mesh-transition-quality/v3';
const KEYS = Object.freeze([
  'schema', 'stageId', 'meshContentHash', 'ancestryHash', 'interpolationPolicyHash',
  'maximumAdjacentSizeRatio', 'sizeRatioWarningThreshold', 'sizeRatioBlockingThreshold',
  'incompatibleInterfaceCount', 'hangingNodeCount', 'maximumShellNormalTransitionDegrees',
  'shellNormalWarningThresholdDegrees', 'shellNormalBlockingThresholdDegrees',
]);

export function qualifyLafeaMeshTransitionQualityV3(value) {
  exact(value, KEYS, 'LAFEA_MESH_TRANSITION_V3_KEYS_INVALID');
  const stageId = enumValue(value.stageId, ['LAFEA.3', 'LAFEA.4', 'LAFEA.5'], 'STAGE_ID');
  const maximumAdjacentSizeRatio = atLeastOne(value.maximumAdjacentSizeRatio, 'MAXIMUM_ADJACENT_SIZE_RATIO');
  const warning = greaterThanOne(value.sizeRatioWarningThreshold, 'SIZE_RATIO_WARNING_THRESHOLD');
  const blocking = greaterThanOne(value.sizeRatioBlockingThreshold, 'SIZE_RATIO_BLOCKING_THRESHOLD');
  if (!(warning < blocking)) fail('LAFEA_MESH_TRANSITION_V3_SIZE_RATIO_THRESHOLD_ORDER_INVALID');
  const shellStage = stageId === 'LAFEA.4' || stageId === 'LAFEA.5';
  const shellNormal = optionalNonNegative(
    value.maximumShellNormalTransitionDegrees,
    'MAXIMUM_SHELL_NORMAL_TRANSITION_DEGREES',
  );
  const shellWarn = optionalNonNegative(
    value.shellNormalWarningThresholdDegrees,
    'SHELL_NORMAL_WARNING_THRESHOLD_DEGREES',
  );
  const shellBlock = optionalNonNegative(
    value.shellNormalBlockingThresholdDegrees,
    'SHELL_NORMAL_BLOCKING_THRESHOLD_DEGREES',
  );
  if (shellStage && (shellNormal === null || shellWarn === null || shellBlock === null)) {
    fail('LAFEA_MESH_TRANSITION_V3_SHELL_NORMAL_POLICY_REQUIRED');
  }
  if (!shellStage && (shellNormal !== null || shellWarn !== null || shellBlock !== null)) {
    fail('LAFEA_MESH_TRANSITION_V3_SHELL_NORMAL_POLICY_NOT_APPLICABLE');
  }
  if (shellStage && !(shellWarn < shellBlock)) {
    fail('LAFEA_MESH_TRANSITION_V3_SHELL_NORMAL_THRESHOLD_ORDER_INVALID');
  }
  const gates = [
    thresholdGate('ADJACENT_SIZE_RATIO', maximumAdjacentSizeRatio, warning, blocking),
    countBlockGate('INTERPOLATION_INCOMPATIBILITY', value.incompatibleInterfaceCount),
    countBlockGate('HANGING_NODES', value.hangingNodeCount),
  ];
  if (shellStage) gates.push(thresholdGate('SHELL_NORMAL_TRANSITION', shellNormal, shellWarn, shellBlock));
  const worst = gates.some((row) => row.status === 'BLOCK')
    ? 'BLOCK'
    : gates.some((row) => row.status === 'WARNING') ? 'WARNING' : 'PASS';
  const core = freeze({
    schema: exactText(value.schema, LAFEA_MESH_TRANSITION_QUALITY_V3_SCHEMA, 'SCHEMA'),
    stageId,
    meshContentHash: sha(value.meshContentHash, 'MESH_CONTENT_HASH'),
    ancestryHash: sha(value.ancestryHash, 'ANCESTRY_HASH'),
    interpolationPolicyHash: sha(value.interpolationPolicyHash, 'INTERPOLATION_POLICY_HASH'),
    maximumAdjacentSizeRatio,
    sizeRatioWarningThreshold: warning,
    sizeRatioBlockingThreshold: blocking,
    incompatibleInterfaceCount: nonNegativeInteger(value.incompatibleInterfaceCount, 'INCOMPATIBLE_INTERFACE_COUNT'),
    hangingNodeCount: nonNegativeInteger(value.hangingNodeCount, 'HANGING_NODE_COUNT'),
    maximumShellNormalTransitionDegrees: shellNormal,
    shellNormalWarningThresholdDegrees: shellWarn,
    shellNormalBlockingThresholdDegrees: shellBlock,
    gates: freeze(gates),
    qualification: worst === 'BLOCK' ? 'BLOCK' : 'PASS',
    hasWarnings: worst === 'WARNING',
  });
  return freeze({
    ...core,
    qualificationHash: canonicalLafeaSha256({
      schema: 'lafea-mesh-transition-quality-hash-input/v3', evidence: core,
    }),
    engineeringAuthority: false,
  });
}
function thresholdGate(metric, value, warning, blocking) {
  const status = value >= blocking ? 'BLOCK' : value >= warning ? 'WARNING' : 'PASS';
  return freeze({ metric, value, warning, blocking, status });
}
function countBlockGate(metric, raw) {
  const value = nonNegativeInteger(raw, metric);
  return freeze({ metric, value, status: value === 0 ? 'PASS' : 'BLOCK' });
}
function exact(value, keys, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) fail(code);
}
function text(value, field) {
  if (typeof value !== 'string' || !value.trim()) fail(`LAFEA_MESH_TRANSITION_V3_${field}_INVALID`);
  return value.trim();
}
function exactText(value, expected, field) {
  if (value !== expected) fail(`LAFEA_MESH_TRANSITION_V3_${field}_INVALID`);
  return value;
}
function sha(value, field) {
  const out = text(value, field);
  if (!/^sha256:[0-9a-f]{64}$/u.test(out)) fail(`LAFEA_MESH_TRANSITION_V3_${field}_INVALID`);
  return out;
}
function atLeastOne(value, field) {
  if (!Number.isFinite(value) || value < 1) fail(`LAFEA_MESH_TRANSITION_V3_${field}_INVALID`);
  return value;
}
function greaterThanOne(value, field) {
  if (!Number.isFinite(value) || value <= 1) fail(`LAFEA_MESH_TRANSITION_V3_${field}_INVALID`);
  return value;
}
function optionalNonNegative(value, field) {
  if (value === null) return null;
  if (!Number.isFinite(value) || value < 0) fail(`LAFEA_MESH_TRANSITION_V3_${field}_INVALID`);
  return value;
}
function nonNegativeInteger(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) fail(`LAFEA_MESH_TRANSITION_V3_${field}_INVALID`);
  return value;
}
function enumValue(value, allowed, field) {
  if (!allowed.includes(value)) fail(`LAFEA_MESH_TRANSITION_V3_${field}_INVALID`);
  return value;
}
function fail(code) { const error = new TypeError(code); error.code = code; throw error; }
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze); return Object.freeze(value);
}
