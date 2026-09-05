/**
 * Presentation-only composition contract for the EMP.1 analytical workbench.
 *
 * The registry classifies already-rendered child surfaces into stable layout
 * regions. It never derives engineering state, calls a calculator, clones a child
 * surface, or decides whether an engineering surface is authoritative.
 */

export const EMP1_ANALYTICAL_LAYOUT_SCHEMA = 'emp1-analytical-layout/v1';

export const EMP1_ANALYTICAL_LAYOUT_REGIONS = Object.freeze({
  WORKFLOW: 'WORKFLOW',
  PRIMARY_WORK: 'PRIMARY_WORK',
  ENGINEERING_BASIS: 'ENGINEERING_BASIS',
  FULL_WIDTH_DETAIL: 'FULL_WIDTH_DETAIL',
});

const REGION_DEFINITIONS = Object.freeze({
  WORKFLOW: Object.freeze({
    role: 'emp1-analytical-workflow-region',
    label: 'Assessment workflow',
  }),
  PRIMARY_WORK: Object.freeze({
    role: 'emp1-analytical-primary-work',
    label: 'Primary engineering work',
  }),
  ENGINEERING_BASIS: Object.freeze({
    role: 'emp1-analytical-engineering-basis',
    label: 'Engineering basis and authority',
  }),
  FULL_WIDTH_DETAIL: Object.freeze({
    role: 'emp1-analytical-full-width-detail',
    label: 'Detailed engineering evidence',
  }),
});

/**
 * The order here is the pre-layout append order at the LEG-003 basis. Region
 * grouping is explicit; nothing is classified by runtime append position.
 */
export const EMP1_ANALYTICAL_SURFACE_ORDER = Object.freeze([
  'workflow',
  'route',
  'source',
  'engineeringEvidence',
  'screeningCustody',
  'correlationAvailability',
  'boundedCorrelation',
  'runConfiguration',
  'transactionSummary',
  'correlationResult',
  'settings',
  'results',
  'lineage',
  'benchmark',
]);

export const EMP1_ANALYTICAL_SURFACE_PLACEMENT = Object.freeze({
  workflow: EMP1_ANALYTICAL_LAYOUT_REGIONS.WORKFLOW,
  route: EMP1_ANALYTICAL_LAYOUT_REGIONS.PRIMARY_WORK,
  source: EMP1_ANALYTICAL_LAYOUT_REGIONS.PRIMARY_WORK,
  engineeringEvidence: EMP1_ANALYTICAL_LAYOUT_REGIONS.ENGINEERING_BASIS,
  screeningCustody: EMP1_ANALYTICAL_LAYOUT_REGIONS.FULL_WIDTH_DETAIL,
  correlationAvailability: EMP1_ANALYTICAL_LAYOUT_REGIONS.ENGINEERING_BASIS,
  boundedCorrelation: EMP1_ANALYTICAL_LAYOUT_REGIONS.ENGINEERING_BASIS,
  runConfiguration: EMP1_ANALYTICAL_LAYOUT_REGIONS.PRIMARY_WORK,
  transactionSummary: EMP1_ANALYTICAL_LAYOUT_REGIONS.ENGINEERING_BASIS,
  correlationResult: EMP1_ANALYTICAL_LAYOUT_REGIONS.FULL_WIDTH_DETAIL,
  settings: EMP1_ANALYTICAL_LAYOUT_REGIONS.PRIMARY_WORK,
  results: EMP1_ANALYTICAL_LAYOUT_REGIONS.FULL_WIDTH_DETAIL,
  lineage: EMP1_ANALYTICAL_LAYOUT_REGIONS.ENGINEERING_BASIS,
  benchmark: EMP1_ANALYTICAL_LAYOUT_REGIONS.FULL_WIDTH_DETAIL,
});

/**
 * Move each supplied, already-rendered surface exactly once into its declared
 * presentation region. Null optional surfaces are simply absent; all declared
 * surface keys must still be supplied so omission cannot silently change layout.
 */
export function composeEmp1AnalyticalLayout(shell, surfaces) {
  if (!shell?.ownerDocument) throw new TypeError('EMP1_ANALYTICAL_LAYOUT_SHELL_REQUIRED');
  exactSurfaceKeys(surfaces);
  if (!nodeLike(surfaces.workflow)) {
    throw new TypeError('EMP1_ANALYTICAL_LAYOUT_WORKFLOW_REQUIRED');
  }

  const present = EMP1_ANALYTICAL_SURFACE_ORDER
    .map((surfaceId) => [surfaceId, surfaces[surfaceId]])
    .filter(([, surface]) => surface != null);
  const unique = new Set();
  present.forEach(([surfaceId, surface]) => {
    if (!nodeLike(surface)) {
      throw new TypeError(`EMP1_ANALYTICAL_LAYOUT_SURFACE_INVALID:${surfaceId}`);
    }
    if (unique.has(surface)) {
      throw new TypeError(`EMP1_ANALYTICAL_LAYOUT_SURFACE_DUPLICATE:${surfaceId}`);
    }
    unique.add(surface);
  });

  const regions = Object.fromEntries(Object.entries(REGION_DEFINITIONS).map(
    ([regionId, definition]) => [regionId, createRegion(shell.ownerDocument, regionId, definition)],
  ));

  present.forEach(([surfaceId, surface]) => {
    const regionId = EMP1_ANALYTICAL_SURFACE_PLACEMENT[surfaceId];
    surface.dataset.emp1LayoutSurface = surfaceId;
    surface.dataset.emp1LayoutRegion = regionId;
    regions[regionId].append(surface);
  });

  const lanes = shell.ownerDocument.createElement('div');
  lanes.className = 'emp1-analytical-layout__lanes';
  lanes.dataset.role = 'emp1-analytical-layout-lanes';
  lanes.append(
    regions[EMP1_ANALYTICAL_LAYOUT_REGIONS.PRIMARY_WORK],
    regions[EMP1_ANALYTICAL_LAYOUT_REGIONS.ENGINEERING_BASIS],
  );

  shell.append(
    regions[EMP1_ANALYTICAL_LAYOUT_REGIONS.WORKFLOW],
    lanes,
    regions[EMP1_ANALYTICAL_LAYOUT_REGIONS.FULL_WIDTH_DETAIL],
  );

  return Object.freeze({
    schema: EMP1_ANALYTICAL_LAYOUT_SCHEMA,
    presentSurfaceCount: present.length,
    regions: Object.freeze({ ...regions }),
    lanes,
  });
}

export function emp1AnalyticalLayoutPlacementManifest() {
  return Object.freeze(EMP1_ANALYTICAL_SURFACE_ORDER.map((surfaceId) => Object.freeze({
    surfaceId,
    regionId: EMP1_ANALYTICAL_SURFACE_PLACEMENT[surfaceId],
  })));
}

function createRegion(documentRef, regionId, definition) {
  const section = documentRef.createElement('section');
  section.className = 'emp1-analytical-layout__region';
  section.dataset.role = definition.role;
  section.dataset.emp1LayoutRegion = regionId;
  section.setAttribute('aria-label', definition.label);
  return section;
}

function exactSurfaceKeys(surfaces) {
  if (!surfaces || typeof surfaces !== 'object' || Array.isArray(surfaces)) {
    throw new TypeError('EMP1_ANALYTICAL_LAYOUT_SURFACES_REQUIRED');
  }
  const expected = [...EMP1_ANALYTICAL_SURFACE_ORDER].sort();
  const actual = Object.keys(surfaces).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new TypeError('EMP1_ANALYTICAL_LAYOUT_SURFACE_KEYS_MISMATCH');
  }
}

function nodeLike(value) {
  return Boolean(value)
    && typeof value === 'object'
    && Number.isInteger(value.nodeType)
    && typeof value.append === 'function';
}
