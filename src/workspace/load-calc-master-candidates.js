import {
  buildPipingClassIndex,
  findBestPipingClassRow,
} from '../calc-workspace/cii-standalone-port/core/piping-class-resolver.js';
import { createNonFeaEnrichmentProposal } from '../core/non-fea-enrichment/index.js';
import { projectDataValue } from './project-data/project-data-contract.js';

/**
 * Builds Load Calc enrichment proposals from already-approved Master Data.
 *
 * This is deliberately a Load Calc-local module rather than a change to the
 * shared piping model. Selector matching in the core master-candidate builder
 * requires a bore and piping class on the component itself, and the shared
 * model carries neither: its component identity is only
 * {lineId, branchId, systemId, zoneId} and it has no bore concept at all.
 * Adding those to the shared contract would touch every downstream consumer
 * (LFEA, LAFEA, topology), so instead the two identifiers are recovered here,
 * for this workflow only, from evidence that already exists:
 *
 *   bore          <- the source entity's own ABORE/LBORE attribute
 *   piping class  <- the Line List row for the component's lineId
 *   wall thickness<- the Piping Class master, via the existing scored resolver
 *   outer diameter<- the standard DN table below
 *   material density <- Project Data materialDensitiesKgPerM3
 *
 * Everything produced is a PROPOSAL requiring explicit acceptance. Nothing is
 * written to enrichment authority here, and no value is accepted on the
 * operator's behalf: piping-class resolution is a scored approximate match and
 * routinely reports needsReview, which is surfaced per proposal rather than
 * hidden.
 */

/**
 * DN -> outer diameter in millimetres. Inverted from the OD_TO_DN pairs in
 * cii-standalone-port/core/staged-geometry-authority.js; kept as a local copy
 * because that module owns the opposite direction only. The two tables must be
 * kept in step by hand.
 */
const DN_TO_OD_MM = Object.freeze({
  6: 10.3, 8: 13.7, 10: 17.1, 15: 21.3, 20: 26.7, 25: 33.4, 32: 42.2, 40: 48.3,
  50: 60.3, 65: 73.0, 80: 88.9, 100: 114.3, 125: 141.3, 150: 168.3, 200: 219.1,
  250: 273.0, 300: 323.8, 350: 355.6, 400: 406.4, 450: 457.2, 500: 508.0,
  600: 609.6, 700: 711.0, 750: 762.0,
});

const PIPE_TYPE = 'PIPE';

export function buildLoadCalcMasterEnrichmentProposals({ dataset, masters, projectProfile } = {}) {
  const sourceModel = dataset?.sharedModel;
  if (!sourceModel) throw new TypeError('Load Calc master candidates require an active dataset shared model.');

  const rawByEntityId = new Map((dataset.entities || []).map((entity) => [entity.entityId, entity]));
  const lineRowByKey = new Map(
    (masters?.lineList?.normalizedRows || []).map((row) => [String(row.lineKey), row]),
  );
  const pipingClassRows = masters?.pipingClass?.normalizedRows || [];
  const pipingClassIndex = buildPipingClassIndex(pipingClassRows, {});
  const densities = projectDataValue(projectProfile, 'loadCalculation.materialDensitiesKgPerM3') || {};

  const proposals = [];
  const blockers = [];
  const reviewRequired = [];
  let pipeCount = 0;

  (sourceModel.components || []).forEach((component) => {
    if (String(component.type || '').toUpperCase() !== PIPE_TYPE) return;
    pipeCount += 1;
    const targetId = component.componentKey || component.sourceEntityId;
    const boreMm = boreFromSourceEntity(rawByEntityId.get(component.sourceEntityId));
    if (boreMm === null) {
      blockers.push(issue('LOAD_CALC_MASTER_BORE_UNRESOLVED', targetId,
        'No ABORE/LBORE bore attribute on the source entity.'));
      return;
    }
    const lineRow = lineRowByKey.get(String(component.identity?.lineId || ''));
    if (!lineRow) {
      blockers.push(issue('LOAD_CALC_MASTER_LINE_UNRESOLVED', targetId,
        `Line ${component.identity?.lineId || 'NOT_AVAILABLE'} has no Line List row.`));
      return;
    }
    const requestedClass = lineRow.pipingClass;
    if (!requestedClass) {
      blockers.push(issue('LOAD_CALC_MASTER_CLASS_UNRESOLVED', targetId,
        `Line List row ${lineRow.lineKey} declares no piping class.`));
      return;
    }
    const match = findBestPipingClassRow({
      pipingClass: requestedClass,
      boreMm,
      componentType: PIPE_TYPE,
      rating: '',
      schedule: '',
      pipingClassIndex,
    });
    if (!match.row) {
      blockers.push(issue('LOAD_CALC_MASTER_CLASS_ROW_UNMATCHED', targetId,
        `Piping class ${requestedClass} at DN${boreMm} did not resolve to a master row.`));
      return;
    }
    const wallThicknessMm = finite(match.row.wallThickness ?? match.row['Wall thickness']);
    const outerDiameterMm = finite(DN_TO_OD_MM[boreMm]);
    const densityKgM3 = finite(densities[String(lineRow.material || '')] ?? densities.DEFAULT);

    const context = {
      targetId, boreMm, requestedClass, match, lineRow, componentKey: component.componentKey,
    };
    if (wallThicknessMm === null) {
      blockers.push(issue('LOAD_CALC_MASTER_WALL_THICKNESS_MISSING', targetId,
        `Resolved master row for ${requestedClass} DN${boreMm} carries no wall thickness.`));
    } else {
      proposals.push(proposalFor('PIPE_WALL_THICKNESS', wallThicknessMm, 'mm', context, masters));
    }
    if (outerDiameterMm === null) {
      blockers.push(issue('LOAD_CALC_MASTER_OUTER_DIAMETER_MISSING', targetId,
        `DN${boreMm} is not a standard nominal size with a known outer diameter.`));
    } else {
      proposals.push(proposalFor('PIPE_OUTER_DIAMETER', outerDiameterMm, 'mm', context, masters));
    }
    if (densityKgM3 === null) {
      blockers.push(issue('LOAD_CALC_MASTER_DENSITY_MISSING', targetId,
        'Project Data materialDensitiesKgPerM3 has no matching or DEFAULT density.'));
    } else {
      proposals.push(proposalFor('MATERIAL_DENSITY', densityKgM3, 'kg/m3', context, masters));
    }
    if (match.needsReview) {
      reviewRequired.push({
        targetId,
        requestedClass,
        resolvedClass: match.resolvedPipingClass,
        confidence: match.confidence,
        method: match.method,
        reasons: match.reasons || [],
      });
    }
  });

  return Object.freeze({
    proposals: Object.freeze(proposals),
    blockers: Object.freeze(dedupe(blockers)),
    reviewRequired: Object.freeze(reviewRequired),
    summary: Object.freeze({
      pipeCount,
      proposalCount: proposals.length,
      blockedCount: blockers.length,
      approximateClassMatchCount: reviewRequired.length,
    }),
  });
}

/**
 * One proposal per field per component, bound to an exact ENTITY selector.
 *
 * The value comes from approved Master Data, so EXACT_APPROVED_MASTER is the
 * applicable authority, but the piping-class row it came from may have been
 * chosen by approximate score. That is recorded verbatim in the evidence and
 * repeated in the rationale so acceptance is an informed decision rather than
 * a rubber stamp.
 */
function proposalFor(fieldId, value, unit, context, masters) {
  const { targetId, boreMm, requestedClass, match, lineRow } = context;
  const approximate = Boolean(match.needsReview);
  return createNonFeaEnrichmentProposal({
    proposalId: `loadcalc-master:${fieldId}:${targetId}`,
    rationale: approximate
      ? `Approved master value for ${fieldId} at DN${boreMm}. Piping class ${requestedClass} resolved approximately to ${match.resolvedPipingClass} (${match.method}, confidence ${round(match.confidence)}); confirm the class is correct before accepting.`
      : `Approved master value for ${fieldId} at DN${boreMm} from piping class ${match.resolvedPipingClass}.`,
    record: {
      recordId: `loadcalc-master:${fieldId}:${targetId}`,
      selectorKind: 'ENTITY',
      selectorKey: targetId,
      fieldId,
      value,
      unit,
      authority: 'EXACT_APPROVED_MASTER',
      sourceId: masters?.pipingClass?.fileName || 'pipingClass',
      revision: masters?.pipingClass?.sourceHash || 'NOT_AVAILABLE',
      evidence: {
        matchMode: approximate ? 'APPROXIMATE_CLASS_MATCH' : 'EXACT',
        requestedPipingClass: requestedClass,
        resolvedPipingClass: match.resolvedPipingClass,
        classMatchMethod: match.method,
        classMatchConfidence: match.confidence,
        classMatchNeedsReview: approximate,
        boreMm,
        lineKey: lineRow.lineKey,
        pipingClassSourceHash: masters?.pipingClass?.sourceHash || null,
        lineListSourceHash: masters?.lineList?.sourceHash || null,
      },
    },
  });
}

/** Bore in millimetres from the source entity's own attributes. */
function boreFromSourceEntity(entity) {
  const attributes = entity?.properties?.attributes || {};
  for (const key of ['ABORE', 'LBORE']) {
    const numeric = Number(String(attributes[key] ?? '').replace(/[^0-9.]/gu, ''));
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
  }
  return null;
}

function finite(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function round(value) {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : value;
}

function issue(code, path, message) {
  return Object.freeze({ code, path, message });
}

function dedupe(rows) {
  return [...new Map(rows.map((row) => [`${row.code}|${row.path}|${row.message}`, row])).values()];
}
