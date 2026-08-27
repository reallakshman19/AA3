import { semanticHash } from '../../core/shared-piping-model/canonical-json.js';
import { clonePlain, freezeDeep, isRecord, stringValue } from '../dataset-utils.js';
import { upgradeProjectDataProfile } from './project-data-contract.js';
import { NON_FEA_COMPONENT_MASS_POLICY_SCHEMA } from './non-fea-component-mass-policy.js';
import { NON_FEA_FLUID_FILL_POLICY_SCHEMA } from './non-fea-fluid-fill-policy.js';

export const NON_FEA_PRODUCT_DEFAULT_PROFILE_SCHEMA = 'non-fea-product-default-profile/v1';
export const NON_FEA_PRODUCT_DEFAULT_PROVIDER_SCHEMA = 'non-fea-product-default-provider/v1';

export const LOAD_CALC_STANDARD_DEFAULTS_V1 = freezeDeep({
  schema: NON_FEA_PRODUCT_DEFAULT_PROFILE_SCHEMA,
  profileId: 'LOAD_CALC_STANDARD_DEFAULTS_V1',
  version: 6,
  defaults: [
    productDefault('PD-LENGTH-UNIT', 'sourcesAndUnits.lengthUnit', 'mm', 'unit',
      'Canonical Load Calc product length unit when project/source unit authority is absent.'),
    productDefault('PD-SOURCE-UP-AXIS', 'sourcesAndUnits.sourceUpAxis', 'Z', 'axis',
      'Z-up screening default when source/project up-axis authority is absent.'),
    productDefault('PD-PORT-MATCH-TOLERANCE', 'topology.portMatchToleranceMm', 0, 'mm',
      'Exact-port-only topology default. Zero tolerance cannot invent an approximate connection.'),
    productDefault('PD-SUPPORT-SITE-GROUPING-TOLERANCE', 'topology.supportSiteGroupingToleranceMm', 0, 'mm',
      'Exact-coordinate-only support-site grouping default. Zero tolerance cannot merge distinct support locations.'),
    productDefault('PD-AUTO-CARRIER-COINCIDENCE-TOLERANCE', 'topology.autoCarrierCoincidenceToleranceMm', 0, 'mm',
      'Exact-endpoint-only AUTO-carrier coincidence default. Zero tolerance cannot suppress a noncoincident physical edge.'),
    productDefault('PD-ROUTE-JOINING-RULES', 'topology.routeJoiningRules', {
      partition: 'branch-scoped-connected-components',
      chainage: 'exact-port-topology',
      sourceOrderAllowed: false,
      degreeAboveTwo: 'BLOCKED',
    }, 'policy',
    'Conservative branch-scoped exact-port routing; source order cannot invent connectivity and unresolved degree>2 ownership remains fail-closed.'),
    productDefault('PD-SUPPORT-CAPABILITY-FALLBACK', 'topology.supportTypeCapabilities', {
      DEFAULT: { vertical: false },
    }, 'policy',
    'Unknown/unmapped support types are non-bearing by default; no vertical reaction authority is invented.'),
    productDefault('PD-GRAVITY', 'loadCalculation.gravityMPerS2', 9.80665, 'm/s²',
      'Standard gravity used by the built-in Load Calc screening profile.'),
    productDefault('PD-LOAD-FACTOR', 'loadCalculation.loadFactor', 1, 'ratio',
      'Unfactored screening load default.'),
    productDefault('PD-GRAVITY-METHOD', 'loadCalculation.gravityMethod', 'AUTO', 'method-request',
      'Select the highest-fidelity qualified gravity method; fall back only where the governed AUTO policy permits it.'),
    productDefault('PD-EQUILIBRIUM-TOLERANCES', 'loadCalculation.equilibriumTolerances', {
      forceN: 1e-6,
      momentNmm: 1e-3,
    }, 'numerical-policy',
    'Tight floating-point closure tolerances for force and first-moment accounting; not an engineering load allowable.'),
    productDefault('PD-ACTIVE-CASES', 'loadCalculation.activeLoadCases', ['EMPTY', 'OPE', 'HYD'], 'set',
      'Canonical built-in Load Calc case set.'),
    productDefault('PD-COMPONENT-MASS-COMPOSITION', 'loadCalculation.componentMassCompositionPolicy', {
      schema: NON_FEA_COMPONENT_MASS_POLICY_SCHEMA,
      defaultMode: 'COMPONENT_EXPLICIT_POINT_MASS',
    }, 'policy',
    'One explicit point-mass dry-metal primitive per non-pipe component. Derived geometric and equivalent-length modes require dedicated mechanics and are not silently substituted.'),
    productDefault('PD-FORCE-OUTPUT-CONVENTION', 'loadCalculation.forceOutputConvention',
      'POSITIVE_REACTION_OPPOSES_SOURCE_AXIS_GRAVITY', 'convention',
      'Current scalar gravity convention: positive published support reaction opposes source-axis gravity.'),
    productDefault('PD-MOMENT-OUTPUT-CONVENTION', 'loadCalculation.momentOutputConvention',
      'SIGNED_ROUTE_CHAINAGE_FIRST_MOMENT_NMM', 'convention',
      'Current route statics convention: signed first moments are reported in N·mm about each route chainage origin.'),
    productDefault('PD-ANALYSIS-BASIS', 'loadCalculation.analysisBasis',
      'ROUTE_CHAINAGE_1D_STATIC_GRAVITY', 'analysis-basis',
      'Current empirical gravity mechanics use one-dimensional route-chainage statics.'),
    productDefault('PD-RESULT-SIGN-CONVENTION', 'loadCalculation.resultSignConvention',
      'SOURCE_UP_POSITIVE_SUPPORT_REACTION', 'convention',
      'Current scalar-gravity result sign basis: positive support reaction opposes gravity along the governed source up-axis.'),
    productDefault('PD-FLUID-FILL-POLICY', 'thermoMechanicalBasis.fluidPhaseAndFillState', {
      schema: NON_FEA_FLUID_FILL_POLICY_SCHEMA,
      cases: {
        EMPTY: { state: 'EMPTY', fillFraction: 0, phase: 'EMPTY' },
        OPE: { state: 'FULL', fillFraction: 1, phase: 'UNSPECIFIED' },
        HYD: { state: 'LIQUID_FULL', fillFraction: 1, phase: 'LIQUID' },
      },
    }, 'policy',
    'Canonical screening content policy: EMPTY is dry, OPE is full-bore using the resolved operating density, and HYD is liquid-full using the resolved hydro density. Any project/source policy shadows this Product default.'),
    productDefault('PD-CORROSION-ALLOWANCE', 'thermoMechanicalBasis.corrosionAllowancesMm', { DEFAULT: 0 }, 'mm',
      'Zero corrosion allowance only when no project/source corrosion authority exists.'),
    productDefault('PD-ELASTIC-THERMAL', 'thermoMechanicalBasis.materialElasticProperties', {
      DEFAULT: { elasticModulusPa: 2.0e11, thermalExpansionPerK: 12.0e-6 },
    }, 'material-policy',
    'Generic steel screening elastic/thermal properties; visible assumption, never source evidence.'),
    productDefault('PD-RESTRAINT-PRELOAD', 'restraintPolicy.restraintPreloadsN', { DEFAULT: 0 }, 'N',
      'Zero preload screening default when no restraint preload authority exists.'),
    productDefault('PD-FRICTION', 'restraintPolicy.frictionCoefficients', { DEFAULT: 0 }, 'ratio',
      'Frictionless screening default when no project/source friction authority exists.'),
  ],
});

/**
 * Builds an ephemeral effective Project Data profile. Legacy profiles are first
 * additively upgraded with missing Phase-2 evidence slots; existing values are
 * never repaired or overwritten. Product defaults then fill only empty slots.
 */
export function createNonFeaProductDefaultProvider({ profile, defaultProfile = LOAD_CALC_STANDARD_DEFAULTS_V1 } = {}) {
  requireProjectProfile(profile);
  requireDefaultProfile(defaultProfile);
  const normalizedProfile = upgradeProjectDataProfile(profile);
  const effectiveProfile = clonePlain(normalizedProfile);
  const usageRows = [];
  const shadowedRows = [];
  const profileHash = semanticHash(defaultProfile);

  defaultProfile.defaults.forEach((row) => {
    const entry = readPath(effectiveProfile, row.projectDataPath);
    if (!isEvidenceValue(entry)) throw new TypeError(`Product default target is not a Project Data evidence field: ${row.projectDataPath}.`);
    if (!isEmpty(entry.value)) { shadowedRows.push(shadowed(row, entry)); return; }
    writePath(effectiveProfile, row.projectDataPath, {
      value: clonePlain(row.value),
      evidence: {
        source: 'Load Calc built-in product default',
        authority: 'PRODUCT_DEFAULT',
        defaultId: row.defaultId,
        basis: row.basis,
        defaultSemanticHash: row.semanticHash,
        profileId: defaultProfile.profileId,
        profileVersion: defaultProfile.version,
        productDefaultProfileSemanticHash: profileHash,
      },
      approved: true,
    });
    usageRows.push(freezeDeep({
      defaultId: row.defaultId,
      projectDataPath: row.projectDataPath,
      value: clonePlain(row.value),
      unit: row.unit,
      basis: row.basis,
      authority: 'PRODUCT_DEFAULT',
      defaultSemanticHash: row.semanticHash,
    }));
  });

  const frozenProfile = freezeDeep(effectiveProfile);
  const base = {
    schema: NON_FEA_PRODUCT_DEFAULT_PROVIDER_SCHEMA,
    profileId: defaultProfile.profileId,
    profileVersion: defaultProfile.version,
    sourceProjectDataSemanticHash: semanticHash(profile),
    upgradedProjectDataSemanticHash: semanticHash(normalizedProfile),
    productDefaultProfileSemanticHash: profileHash,
    effectiveProjectDataProfileSemanticHash: semanticHash(frozenProfile),
    usageRows: usageRows.sort(byPath),
    shadowedRows: shadowedRows.sort(byPath),
    effectiveProfile: frozenProfile,
  };
  return freezeDeep({ ...base, semanticHash: semanticHash(base) });
}

export function isProductDefaultEvidence(entry) {
  return isEvidenceValue(entry)
    && stringValue(entry.evidence?.authority) === 'PRODUCT_DEFAULT'
    && Boolean(stringValue(entry.evidence?.defaultId))
    && Boolean(stringValue(entry.evidence?.defaultSemanticHash));
}
function productDefault(defaultId, projectDataPath, value, unit, basis) { const base = { defaultId, projectDataPath, value, unit, basis }; return freezeDeep({ ...base, semanticHash: semanticHash(base) }); }
function shadowed(row, entry) { return freezeDeep({ defaultId: row.defaultId, projectDataPath: row.projectDataPath, defaultSemanticHash: row.semanticHash, status: 'SHADOWED_BY_HIGHER_AUTHORITY', existingAuthority: stringValue(entry.evidence?.authority) || 'PROJECT_DATA', existingSource: stringValue(entry.evidence?.source) || null }); }
function requireProjectProfile(profile) { if (!isRecord(profile) || profile.schema !== 'project-data-profile/v1') throw new TypeError('Product-default provider requires project-data-profile/v1.'); }
function requireDefaultProfile(profile) {
  if (!isRecord(profile) || profile.schema !== NON_FEA_PRODUCT_DEFAULT_PROFILE_SCHEMA || !stringValue(profile.profileId) || !Number.isInteger(profile.version) || profile.version < 1 || !Array.isArray(profile.defaults)) throw new TypeError(`Expected ${NON_FEA_PRODUCT_DEFAULT_PROFILE_SCHEMA}.`);
  const ids = new Set(), paths = new Set();
  profile.defaults.forEach((row) => {
    if (!isRecord(row) || !stringValue(row.defaultId) || !stringValue(row.projectDataPath) || !stringValue(row.unit) || !stringValue(row.basis) || !Object.hasOwn(row, 'value')) throw new TypeError('Product default rows require ID, Project Data path, value, unit and basis.');
    const expectedHash = semanticHash({ defaultId: row.defaultId, projectDataPath: row.projectDataPath, value: row.value, unit: row.unit, basis: row.basis });
    if (row.semanticHash !== expectedHash) throw new TypeError(`Product default semantic hash mismatch: ${row.defaultId}.`);
    if (ids.has(row.defaultId)) throw new TypeError(`Duplicate product default ID: ${row.defaultId}.`);
    if (paths.has(row.projectDataPath)) throw new TypeError(`Duplicate product default path: ${row.projectDataPath}.`);
    ids.add(row.defaultId); paths.add(row.projectDataPath);
  });
}
function isEvidenceValue(value) { return isRecord(value) && Object.hasOwn(value, 'value') && Object.hasOwn(value, 'evidence') && typeof value.approved === 'boolean'; }
function isEmpty(value) { if (value === null || value === undefined || value === '') return true; if (Array.isArray(value)) return value.length === 0; return isRecord(value) && Object.keys(value).length === 0; }
function readPath(value, path) { return path.split('.').reduce((current, key) => current?.[key], value); }
function writePath(value, path, entry) { const [groupKey, fieldKey] = path.split('.'); if (!isRecord(value[groupKey]) || !Object.hasOwn(value[groupKey], fieldKey)) throw new RangeError(`Unknown Project Data field: ${path}.`); value[groupKey][fieldKey] = entry; }
function byPath(left, right) { return left.projectDataPath.localeCompare(right.projectDataPath); }
