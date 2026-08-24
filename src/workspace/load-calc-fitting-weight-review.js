import { rankXmlCiiWeightCandidates } from '../calc-workspace/cii-standalone-port/core/weight-valve-hints.js';

/**
 * Builds reviewable component-weight candidates for catalogue fittings.
 *
 * Bore and rating alone do not identify a fitting: at DN150 900# the master
 * offers ten rows spanning 26 kg to 538 kg. Face-to-face length is the
 * discriminator, so each component's own geometry is measured from its arrive
 * and leave positions and matched against the master's length column using the
 * existing XML->CII ranking logic rather than a new matching rule.
 *
 * Length narrows but does not always decide: a DN150 900# valve at 610 mm
 * still leaves five candidates between 263 kg and 538 kg, and the ranker's
 * own best pick is not reliable for them. Nothing is therefore selected
 * automatically. This module only assembles what a reviewer needs to choose,
 * and records how many candidates a choice was made from.
 */

/** Catalogue fittings: types the weights master can describe. */
const CATALOGUE_FITTING_TYPES = Object.freeze(['FLAN', 'FLANGE', 'VALV', 'VALVE', 'INST', 'INSTRUMENT']);

const DEFAULT_LENGTH_TOLERANCE_MM = 4;

export function buildFittingWeightReviewRows({ dataset, masters } = {}) {
  const sourceModel = dataset?.sharedModel;
  if (!sourceModel) throw new TypeError('Fitting weight review requires an active dataset shared model.');
  const weightRows = masters?.weight?.normalizedRows || [];
  const rawByEntityId = new Map((dataset.entities || []).map((entity) => [entity.entityId, entity]));
  const config = {
    weight: {
      masterRows: weightRows.map((row) => row._sourceProvenance || row),
      lengthToleranceMm: DEFAULT_LENGTH_TOLERANCE_MM,
      masterLengthUnit: 'raw',
    },
  };

  const rows = [];
  (sourceModel.components || []).forEach((component) => {
    const type = String(component.type || '').trim().toUpperCase();
    if (!CATALOGUE_FITTING_TYPES.includes(type)) return;
    if (component.engineeringProperties?.componentWeightKg != null) return;
    const targetId = component.componentKey || component.sourceEntityId;
    const attributes = rawByEntityId.get(component.sourceEntityId)?.properties?.attributes || {};
    const boreMm = numberFrom(attributes.ABORE ?? attributes.LBORE);
    const lengthMm = distanceBetween(attributes.APOS, attributes.LPOS);
    const description = String(attributes.DTXR || '').trim();
    const rating = ratingFromText(description);

    const base = {
      targetId, type, description, boreMm, lengthMm, rating,
      sourceEntityId: component.sourceEntityId,
    };
    if (boreMm === null || lengthMm === null) {
      rows.push({ ...base, candidates: [], unresolvable: 'NO_BORE_OR_LENGTH' });
      return;
    }
    let ranking;
    try {
      ranking = rankXmlCiiWeightCandidates(
        { boreMm, rating, lengthMm, nodeName: description },
        config,
        { includeRejected: true },
      );
    } catch {
      rows.push({ ...base, candidates: [], unresolvable: 'RANKING_FAILED' });
      return;
    }
    const candidates = [...(ranking.candidates || []), ...(ranking.rejectedCandidates || [])]
      .map((candidate) => ({
        typeDesc: candidate.typeDesc || candidate.valveType || 'UNSPECIFIED',
        weightKg: candidate.weight,
        rowLengthMm: candidate.rowLength,
        rowBoreMm: candidate.rowBore,
        rowRating: candidate.rowRating,
        lengthQualified: candidate.lengthQualified === true,
        lengthDeltaMm: Number.isFinite(candidate.rowLength) ? Math.abs(candidate.rowLength - lengthMm) : null,
      }))
      .sort(byLengthThenWeight);
    rows.push({
      ...base,
      candidates,
      unresolvable: candidates.length === 0 ? 'NO_CANDIDATE' : null,
    });
  });
  return Object.freeze({
    rows: Object.freeze(rows),
    summary: Object.freeze({
      fittingCount: rows.length,
      withCandidates: rows.filter((row) => row.candidates.length > 0).length,
      singleCandidate: rows.filter((row) => row.candidates.length === 1).length,
      needsChoice: rows.filter((row) => row.candidates.length > 1).length,
      unresolvable: rows.filter((row) => row.unresolvable).length,
      weightMasterRowCount: weightRows.length,
    }),
  });
}

/**
 * The enrichment record for a reviewer's chosen candidate.
 *
 * Records how many candidates were on offer and whether the chosen one was
 * length-qualified, so a single-candidate confirmation stays distinguishable
 * from a judgement call between five.
 */
export function fittingWeightRecordFor(row, candidate, masters) {
  return {
    recordId: `loadcalc-fitting-weight:${row.targetId}`,
    selectorKind: 'ENTITY',
    selectorKey: row.targetId,
    fieldId: 'COMPONENT_WEIGHT',
    value: candidate.weightKg,
    unit: 'kg',
    authority: 'EXACT_APPROVED_MASTER',
    sourceId: masters?.weight?.fileName || 'weight',
    revision: masters?.weight?.sourceHash || 'NOT_AVAILABLE',
    evidence: {
      matchMode: candidate.lengthQualified ? 'BORE_RATING_LENGTH' : 'BORE_RATING_ONLY',
      selectedTypeDesc: candidate.typeDesc,
      componentDescription: row.description,
      boreMm: row.boreMm,
      rating: row.rating,
      componentLengthMm: row.lengthMm,
      masterRowLengthMm: candidate.rowLengthMm,
      lengthDeltaMm: candidate.lengthDeltaMm,
      lengthToleranceMm: DEFAULT_LENGTH_TOLERANCE_MM,
      candidateCount: row.candidates.length,
      reviewerSelected: true,
      weightMasterSourceHash: masters?.weight?.sourceHash || null,
    },
  };
}

function byLengthThenWeight(left, right) {
  if (left.lengthQualified !== right.lengthQualified) return left.lengthQualified ? -1 : 1;
  const leftDelta = left.lengthDeltaMm ?? Number.POSITIVE_INFINITY;
  const rightDelta = right.lengthDeltaMm ?? Number.POSITIVE_INFINITY;
  if (leftDelta !== rightDelta) return leftDelta - rightDelta;
  return (left.weightKg ?? 0) - (right.weightKg ?? 0);
}

function numberFrom(value) {
  const numeric = Number(String(value ?? '').replace(/[^0-9.]/gu, ''));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function distanceBetween(start, end) {
  if (!start || !end) return null;
  const distance = Math.hypot(
    Number(end.x) - Number(start.x),
    Number(end.y) - Number(start.y),
    Number(end.z) - Number(start.z),
  );
  return Number.isFinite(distance) && distance > 0 ? Math.round(distance * 1000) / 1000 : null;
}

/** Pressure rating as written in the fitting description, e.g. "900#". */
function ratingFromText(value) {
  const match = /(\d{2,4})\s*#/u.exec(String(value || ''));
  return match ? match[1] : '';
}
