/**
 * LAFEA.4 five-DOF triangular CST+DKT shell presentation boundary.
 *
 * Engineering stress authority is retained integration-point surface evidence.
 * No nodal stress projection, averaging, smoothing or contour interpolation is
 * promoted by this presenter.
 */
import {
  formulaId,
  presenterResult,
  presenterRow,
  requiredUnit,
} from './common.js';

export function presentLocalShell(result, units) {
  const stress = shellStressUnit(units);
  const length = requiredUnit(units, 'length');
  const force = requiredUnit(units, 'force');
  const moment = requiredUnit(units, 'moment');
  const summaryRows = [];
  const stressRows = [];
  const displacementRows = [];
  let maximumStress = null;
  let maximumSigmaX = null;
  let maximumDisplacement = null;
  let maximumForceReaction = null;
  let maximumMomentReaction = null;
  let maximumAppliedForce = null;
  let maximumAppliedMoment = null;

  for (const [caseIndex, loadCase] of (result.loadCaseResults ?? []).entries()) {
    const caseLabel = loadCase.loadCaseId || `Case ${caseIndex + 1}`;
    const casePath = `result.loadCaseResults[${caseIndex}]`;

    for (const [elementIndex, element] of (loadCase.elementResults ?? []).entries()) {
      for (const [pointIndex, point] of (element.integrationPoints ?? []).entries()) {
        for (const [surfaceIndex, surface] of (point.surfaces ?? []).entries()) {
          const surfacePath = `${casePath}.elementResults[${elementIndex}]`
            + `.integrationPoints[${pointIndex}].surfaces[${surfaceIndex}]`;
          const location = `${caseLabel} · Element ${element.elementId}`
            + ` · ${point.integrationPointId} · ${surface.surface}`;
          const vonMisesPath = `${surfacePath}.vonMises`;
          maximumStress = larger(maximumStress, {
            value: surface.vonMises,
            label: location,
            sourcePath: vonMisesPath,
            formula: formulaId(surface),
          });
          const sigmaX = surface.combinedStress?.sigmaX;
          if (Number.isFinite(sigmaX)) {
            maximumSigmaX = larger(maximumSigmaX, {
              value: Math.abs(sigmaX),
              label: location,
              sourcePath: `${surfacePath}.combinedStress.sigmaX`,
              formula: formulaId(surface),
            });
          }
          stressRows.push(presenterRow(
            `${location} · von Mises equivalent stress`,
            surface.vonMises,
            stress,
            formulaId(surface),
            vonMisesPath,
          ));
        }
      }
    }

    for (const [nodeIndex, record] of (loadCase.nodalDisplacements ?? []).entries()) {
      const nodePath = `${casePath}.nodalDisplacements[${nodeIndex}]`;
      const magnitude = Math.hypot(record.ux, record.uy, record.uz);
      maximumDisplacement = larger(maximumDisplacement, {
        value: magnitude,
        label: `${caseLabel} · Node ${record.nodeId}`,
        sourcePath: nodePath,
        formula: formulaId(loadCase),
      });
      displacementRows.push(presenterRow(
        `${caseLabel} · Node ${record.nodeId} · UZ`,
        record.uz,
        length,
        formulaId(loadCase),
        `${nodePath}.uz`,
      ));
    }

    for (const [reactionIndex, reaction] of (loadCase.reactions ?? []).entries()) {
      const candidate = {
        value: Math.abs(reaction.value),
        label: `${caseLabel} · ${reaction.nodeId} · ${reaction.dof}`,
        sourcePath: `${casePath}.reactions[${reactionIndex}].value`,
        formula: formulaId(loadCase),
      };
      if (reaction.kind === 'FORCE') maximumForceReaction = larger(maximumForceReaction, candidate);
      if (reaction.kind === 'MOMENT') maximumMomentReaction = larger(maximumMomentReaction, candidate);
    }

    const appliedForce = loadCase.appliedLoadEvidence?.appliedForce;
    if (vector3(appliedForce)) {
      maximumAppliedForce = larger(maximumAppliedForce, {
        value: Math.hypot(...appliedForce),
        label: `${caseLabel} · applied force resultant`,
        sourcePath: `${casePath}.appliedLoadEvidence.appliedForce`,
        formula: formulaId(loadCase.appliedLoadEvidence),
      });
    }
    const appliedMoment = loadCase.appliedLoadEvidence?.appliedMomentAboutOrigin;
    if (vector3(appliedMoment)) {
      maximumAppliedMoment = larger(maximumAppliedMoment, {
        value: Math.hypot(...appliedMoment),
        label: `${caseLabel} · applied moment about global origin`,
        sourcePath: `${casePath}.appliedLoadEvidence.appliedMomentAboutOrigin`,
        formula: formulaId(loadCase.appliedLoadEvidence),
      });
    }

    appendEquilibriumRow(
      summaryRows,
      `${caseLabel} · Force equilibrium residual`,
      loadCase.forceEquilibrium,
      force,
      `${casePath}.forceEquilibrium.qualification.actual`,
    );
    appendEquilibriumRow(
      summaryRows,
      `${caseLabel} · Moment equilibrium residual`,
      loadCase.momentEquilibrium,
      moment,
      `${casePath}.momentEquilibrium.qualification.actual`,
    );
  }

  appendSummaryMaximum(summaryRows, 'Max translational displacement magnitude', maximumDisplacement, length);
  appendSummaryMaximum(summaryRows, 'Max authoritative surface/IP von Mises', maximumStress, stress);
  appendSummaryMaximum(summaryRows, 'Max |combined surface σx|', maximumSigmaX, stress);
  appendSummaryMaximum(summaryRows, 'Max translational reaction component', maximumForceReaction, force);
  appendSummaryMaximum(summaryRows, 'Max tangent reaction moment component', maximumMomentReaction, moment);
  appendSummaryMaximum(summaryRows, 'Max applied force resultant magnitude', maximumAppliedForce, force);
  appendSummaryMaximum(summaryRows, 'Max applied moment resultant magnitude', maximumAppliedMoment, moment);

  const governing = maximumStress
    ? {
      label: 'Governing retained shell surface/IP von Mises equivalent stress',
      value: maximumStress.value,
      unit: stress,
      locationId: maximumStress.label,
      sourcePath: maximumStress.sourcePath,
    }
    : null;

  return presenterResult(result, [
    {
      title: 'Engineering summary — retained shell evidence only',
      rows: summaryRows,
    },
    {
      title: 'CST+DKT integration-point surface stress evidence',
      rows: stressRows,
    },
    {
      title: 'CST+DKT nodal displacement evidence',
      rows: displacementRows,
    },
  ], governing);
}

function appendSummaryMaximum(rows, label, candidate, unit) {
  if (!candidate) return;
  rows.push(presenterRow(
    `${label} · ${candidate.label}`,
    candidate.value,
    unit,
    candidate.formula,
    candidate.sourcePath,
  ));
}

function appendEquilibriumRow(rows, label, equilibrium, unit, sourcePath) {
  const qualification = equilibrium?.qualification;
  if (!Number.isFinite(qualification?.actual)) return;
  rows.push(presenterRow(
    `${label} · ${qualification.accepted === true ? 'PASS' : 'FAIL'}`,
    qualification.actual,
    unit,
    formulaId(equilibrium),
    sourcePath,
  ));
}

function larger(current, candidate) {
  if (!candidate || !Number.isFinite(candidate.value)) return current;
  return !current || candidate.value > current.value ? candidate : current;
}

function vector3(value) {
  return Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
}

function shellStressUnit(units) {
  if (typeof units?.stress === 'string' && units.stress) return units.stress;
  return requiredUnit(units, 'pressure');
}
