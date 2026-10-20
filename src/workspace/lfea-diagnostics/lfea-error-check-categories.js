/**
 * Piping-engineering categories, triage definitions and limitation kinds
 * for the LFEA common Error Check presentation.
 */

export const LFEA_ERROR_CHECK_PRESENTATION_SCHEMA = 'lfea-error-check-presentation/v1';

export const LFEA_ERROR_CHECK_TRIAGE = Object.freeze([
  Object.freeze({
    triageId: 'BLOCKING',
    title: 'Must be fixed before running',
    lead: 'These stop the analysis. Each one is something the tool will not assume on your behalf.',
    dispositions: Object.freeze(['BLOCK']),
    clearedText: 'Nothing is blocking this model.',
  }),
  Object.freeze({
    triageId: 'NEEDS_ACCEPTANCE',
    title: 'Needs your acceptance',
    lead: 'The model runs, but each of these is a simplification you are accepting. Check the ones that affect the result you care about.',
    dispositions: Object.freeze(['CONDITIONAL']),
    clearedText: 'Nothing needs accepting.',
  }),
  Object.freeze({
    triageId: 'INFORMATIONAL',
    title: 'For information',
    lead: 'Nothing here stops the run or needs signing off. Worth a scan for anything that looks wrong.',
    dispositions: Object.freeze(['ADVISORY', 'PASS']),
    clearedText: 'No informational notes.',
  }),
]);

export const TRIAGE_BY_DISPOSITION = new Map(
  LFEA_ERROR_CHECK_TRIAGE.flatMap((entry) => entry.dispositions.map((d) => [d, entry])),
);

export const LFEA_LIMITATION_KIND = Object.freeze({
  RESULT_AFFECTING: 'RESULT_AFFECTING',
  PROCESS_NOTE: 'PROCESS_NOTE',
});

export const LFEA_COMPONENT_FACTOR_AUTHORITY_CODES = Object.freeze(new Set([
  'BEND_FACTOR_EDITION_AUTHORITY_UNRESOLVED',
  'BRANCH_FACTOR_EDITION_AUTHORITY_UNRESOLVED',
]));

export function lfeaLimitationKind(code, disposition) {
  if (disposition !== 'CONDITIONAL') return null;
  const text = String(code ?? '');
  if (text.endsWith('_PREPARATION_REQUIRED') || text === 'CAPABILITY_REQUIRES_CONDITIONAL_AUTHORIZATION') {
    return LFEA_LIMITATION_KIND.PROCESS_NOTE;
  }
  return LFEA_LIMITATION_KIND.RESULT_AFFECTING;
}

export const LFEA_ERROR_CHECK_CATEGORIES = Object.freeze([
  Object.freeze({
    categoryId: 'SOURCE_AND_UNITS',
    title: 'Source & Units',
    governedCategories: Object.freeze(['SOURCE', 'SCHEMA', 'UNIT']),
  }),
  Object.freeze({
    categoryId: 'GEOMETRY_AND_TOPOLOGY',
    title: 'Geometry & Topology',
    governedCategories: Object.freeze(['GEOMETRY', 'TOPOLOGY']),
  }),
  Object.freeze({
    categoryId: 'ELEMENTS_AND_PROPERTIES',
    title: 'Elements & Properties',
    governedCategories: Object.freeze(['COMPONENT', 'MATERIAL', 'SECTION', 'RIGID']),
  }),
  Object.freeze({
    categoryId: 'RESTRAINTS_AND_SUPPORTS',
    title: 'Restraints & Supports',
    governedCategories: Object.freeze(['RESTRAINT', 'CONSTRAINT']),
  }),
  Object.freeze({
    categoryId: 'LOADS_PRESSURE_THERMAL',
    title: 'Loads, Pressure & Thermal',
    governedCategories: Object.freeze(['LOAD', 'PRESSURE', 'THERMAL', 'PHYSICAL_CASE']),
  }),
  Object.freeze({
    categoryId: 'REPRESENTABILITY_AND_APPROXIMATIONS',
    title: 'Representability & Approximations',
    governedCategories: Object.freeze(['MECHANISM', 'STIFFNESS', 'CONDITIONING', 'UNSUPPORTED_FEATURE']),
  }),
  Object.freeze({
    categoryId: 'READINESS_AND_AUTHORIZATION',
    title: 'Readiness & Authorization',
    governedCategories: Object.freeze(['AUTHORIZATION', 'STALE_EVIDENCE', 'TAMPER']),
  }),
  Object.freeze({
    categoryId: 'OTHER_UNCLASSIFIED',
    title: 'Other / Unclassified',
    governedCategories: Object.freeze([]),
  }),
]);

export const CATEGORY_BY_GOVERNED = new Map(
  LFEA_ERROR_CHECK_CATEGORIES
    .filter((entry) => entry.categoryId !== 'OTHER_UNCLASSIFIED')
    .flatMap((entry) => entry.governedCategories.map((category) => [category, entry])),
);

export const CATEGORY_BY_ID = new Map(LFEA_ERROR_CHECK_CATEGORIES.map((entry) => [entry.categoryId, entry]));
export const DISPOSITIONS = Object.freeze(['PASS', 'ADVISORY', 'CONDITIONAL', 'BLOCK']);
