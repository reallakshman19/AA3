import { semanticHash } from '../shared-primitives/canonical-json.js';
import { EMP1_WRC537_BOUNDED_SOURCE_SHA256 } from './emp1-wrc537-cylindrical-bounded-domain.js';
import { EMP1_WRC537_CYL_TABLE5_EXTREMA_SCOPE } from './emp1-wrc537-cylindrical-table5.js';

export const EMP1_WRC537_LONGITUDINAL_MOMENT_SELECTION_MODES = Object.freeze({
  AXIS_OF_SYMMETRY: 'AXIS_OF_SYMMETRY',
  OFF_AXIS_MAXIMUM: 'OFF_AXIS_MAXIMUM',
});
export const EMP1_WRC537_CONNECTION_FLEXIBILITY = Object.freeze({
  FLEXIBLE_NOZZLE: 'FLEXIBLE_NOZZLE',
  RIGID_OR_OTHER: 'RIGID_OR_OTHER',
  UNRESOLVED: 'UNRESOLVED',
});
export const EMP1_WRC537_TABLE5_EIGHT_POINT_LONGITUDINAL_AUTHORITY_SCHEMA =
  'emp1-wrc537-table5-eight-point-longitudinal-moment-authority/v1';
export const EMP1_WRC537_TABLE5_EIGHT_POINT_LONGITUDINAL_AUTHORITY_ID =
  'WRC537_2013_TABLE5_EIGHT_POINT_AXIS_OF_SYMMETRY_1B_2B';

const SOURCE_LOCATORS = Object.freeze([
  'WRC537_2013_TABLE5_PAGES_41_42',
  'WRC537_2013_SECTION_4_4',
  'WRC537_2013_SECTION_4_3_6',
]);
const RECOVERY_LOCATIONS = Object.freeze([
  ...EMP1_WRC537_CYL_TABLE5_EXTREMA_SCOPE.evaluatedLocations,
]);
const AUTHORITY_KEYS = Object.freeze([
  'schema', 'authorityId', 'sourceDocumentSha256', 'sourceLocators',
  'recoveryDomain', 'selection', 'offAxisMaximum',
  'productionObservationUsedToSetAuthority', 'semanticHash',
]);
const RECOVERY_KEYS = Object.freeze([
  'set', 'count', 'locations', 'continuousJunctureSearchPerformed',
  'absoluteShellMaximumAssured',
]);
const SELECTION_KEYS = Object.freeze([
  'mode', 'circumferentialFigure', 'longitudinalFigure',
  'recoveryMeaning', 'offAxisMaximum',
]);
const OFF_AXIS_KEYS = Object.freeze([
  'authorizedByThisRoute', 'circumferentialFigure', 'longitudinalFigure',
  'requiredSeparateApplicability',
]);

const eightPointAuthorityBase = {
  schema: EMP1_WRC537_TABLE5_EIGHT_POINT_LONGITUDINAL_AUTHORITY_SCHEMA,
  authorityId: EMP1_WRC537_TABLE5_EIGHT_POINT_LONGITUDINAL_AUTHORITY_ID,
  sourceDocumentSha256: EMP1_WRC537_BOUNDED_SOURCE_SHA256,
  sourceLocators: [...SOURCE_LOCATORS],
  recoveryDomain: {
    set: EMP1_WRC537_CYL_TABLE5_EXTREMA_SCOPE.evaluatedLocationSet,
    count: EMP1_WRC537_CYL_TABLE5_EXTREMA_SCOPE.evaluatedLocationCount,
    locations: [...RECOVERY_LOCATIONS],
    continuousJunctureSearchPerformed: false,
    absoluteShellMaximumAssured: false,
  },
  selection: {
    mode: EMP1_WRC537_LONGITUDINAL_MOMENT_SELECTION_MODES.AXIS_OF_SYMMETRY,
    circumferentialFigure: '1B',
    longitudinalFigure: '2B',
    recoveryMeaning: 'TABLE5_EIGHT_POINT_AXIS_OF_SYMMETRY_VALUE',
    offAxisMaximum: false,
  },
  offAxisMaximum: {
    authorizedByThisRoute: false,
    circumferentialFigure: '1B-1',
    longitudinalFigure: '2B-1',
    requiredSeparateApplicability: 'ROUND_FLEXIBLE_NOZZLE_WITH_SOURCE_CUSTODY',
  },
  productionObservationUsedToSetAuthority: false,
};

export const EMP1_WRC537_TABLE5_EIGHT_POINT_LONGITUDINAL_AUTHORITY = deepFreeze({
  ...eightPointAuthorityBase,
  semanticHash: semanticHash(eightPointAuthorityBase),
});

/**
 * WRC537 Table 5 calls for 1B or 1B-1 and 2B or 2B-1 under longitudinal moment.
 * Section 4.4 distinguishes the -1 curves as maximum stresses off the axes of
 * symmetry and limits their stated applicability to a round, flexible nozzle
 * connection. EMP.1's bounded Table-5 route evaluates only the retained eight
 * A/B/C/D shell-juncture locations, so its qualified selection is 1B/2B.
 * Off-axis maximum evaluation remains a separate comparison capability.
 */
export function resolveEmp1Wrc537LongitudinalMomentBendingSelection(value) {
  if (!record(value)) {
    throw selectionError('EMP1_WRC537_LONGITUDINAL_MOMENT_SELECTION_REQUIRED');
  }
  const mode = value.mode;
  if (mode === EMP1_WRC537_LONGITUDINAL_MOMENT_SELECTION_MODES.AXIS_OF_SYMMETRY) {
    return deepFreeze({
      ...EMP1_WRC537_TABLE5_EIGHT_POINT_LONGITUDINAL_AUTHORITY.selection,
      sourceLocator: 'WRC537_2013_TABLE5_AND_SECTION_4_4',
    });
  }
  if (mode === EMP1_WRC537_LONGITUDINAL_MOMENT_SELECTION_MODES.OFF_AXIS_MAXIMUM) {
    if (value.attachmentShape !== 'ROUND') {
      throw selectionError('EMP1_WRC537_OFF_AXIS_MAXIMUM_REQUIRES_ROUND_ATTACHMENT');
    }
    if (value.connectionFlexibility !== EMP1_WRC537_CONNECTION_FLEXIBILITY.FLEXIBLE_NOZZLE) {
      throw selectionError('EMP1_WRC537_OFF_AXIS_MAXIMUM_REQUIRES_FLEXIBLE_NOZZLE');
    }
    if (typeof value.applicabilitySourceRef !== 'string' || !value.applicabilitySourceRef.trim()) {
      throw selectionError('EMP1_WRC537_OFF_AXIS_MAXIMUM_APPLICABILITY_SOURCE_REQUIRED');
    }
    return deepFreeze({
      mode,
      circumferentialFigure: '1B-1',
      longitudinalFigure: '2B-1',
      recoveryMeaning: 'OFF_AXIS_MAXIMUM_VALUE',
      offAxisMaximum: true,
      attachmentShape: 'ROUND',
      connectionFlexibility: EMP1_WRC537_CONNECTION_FLEXIBILITY.FLEXIBLE_NOZZLE,
      applicabilitySourceRef: value.applicabilitySourceRef.trim(),
      sourceLocator: 'WRC537_2013_SECTION_4_4',
      productionAuthorityForTable5EightPointRoute: false,
    });
  }
  throw selectionError(`EMP1_WRC537_LONGITUDINAL_MOMENT_SELECTION_MODE_UNSUPPORTED:${mode}`);
}

export function requireEmp1Wrc537Table5EightPointLongitudinalMomentAuthority(value) {
  if (!record(value)
    || value.schema !== EMP1_WRC537_TABLE5_EIGHT_POINT_LONGITUDINAL_AUTHORITY_SCHEMA
    || value.authorityId !== EMP1_WRC537_TABLE5_EIGHT_POINT_LONGITUDINAL_AUTHORITY_ID) {
    throw selectionError('EMP1_WRC537_TABLE5_EIGHT_POINT_LONGITUDINAL_AUTHORITY_REQUIRED');
  }
  if (!sameKeys(value, AUTHORITY_KEYS)
    || !sameKeys(value.recoveryDomain, RECOVERY_KEYS)
    || !sameKeys(value.selection, SELECTION_KEYS)
    || !sameKeys(value.offAxisMaximum, OFF_AXIS_KEYS)) {
    throw selectionError('EMP1_WRC537_TABLE5_EIGHT_POINT_LONGITUDINAL_AUTHORITY_SHAPE_MISMATCH');
  }
  if (value.sourceDocumentSha256 !== EMP1_WRC537_BOUNDED_SOURCE_SHA256
    || value.productionObservationUsedToSetAuthority !== false
    || JSON.stringify(value.sourceLocators) !== JSON.stringify(SOURCE_LOCATORS)) {
    throw selectionError('EMP1_WRC537_TABLE5_EIGHT_POINT_LONGITUDINAL_SOURCE_AUTHORITY_INVALID');
  }
  if (value.recoveryDomain.set !== EMP1_WRC537_CYL_TABLE5_EXTREMA_SCOPE.evaluatedLocationSet
    || value.recoveryDomain.count !== 8
    || JSON.stringify(value.recoveryDomain.locations) !== JSON.stringify(RECOVERY_LOCATIONS)
    || value.recoveryDomain.continuousJunctureSearchPerformed !== false
    || value.recoveryDomain.absoluteShellMaximumAssured !== false) {
    throw selectionError('EMP1_WRC537_TABLE5_EIGHT_POINT_LONGITUDINAL_RECOVERY_DOMAIN_INVALID');
  }
  if (value.selection.mode !== EMP1_WRC537_LONGITUDINAL_MOMENT_SELECTION_MODES.AXIS_OF_SYMMETRY
    || value.selection.circumferentialFigure !== '1B'
    || value.selection.longitudinalFigure !== '2B'
    || value.selection.recoveryMeaning !== 'TABLE5_EIGHT_POINT_AXIS_OF_SYMMETRY_VALUE'
    || value.selection.offAxisMaximum !== false) {
    throw selectionError('EMP1_WRC537_TABLE5_EIGHT_POINT_LONGITUDINAL_SELECTION_INVALID');
  }
  if (value.offAxisMaximum.authorizedByThisRoute !== false
    || value.offAxisMaximum.circumferentialFigure !== '1B-1'
    || value.offAxisMaximum.longitudinalFigure !== '2B-1'
    || value.offAxisMaximum.requiredSeparateApplicability
      !== 'ROUND_FLEXIBLE_NOZZLE_WITH_SOURCE_CUSTODY') {
    throw selectionError('EMP1_WRC537_TABLE5_EIGHT_POINT_OFF_AXIS_BOUNDARY_INVALID');
  }
  const { semanticHash: retainedHash, ...base } = value;
  if (!retainedHash || retainedHash !== semanticHash(base)) {
    throw selectionError('EMP1_WRC537_TABLE5_EIGHT_POINT_LONGITUDINAL_AUTHORITY_HASH_MISMATCH');
  }
  return deepFreeze(structuredClone(value));
}

function sameKeys(value, expected) {
  if (!record(value)) return false;
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}
function record(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function selectionError(code) {
  const error = new TypeError(code);
  error.code = code;
  return error;
}
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
