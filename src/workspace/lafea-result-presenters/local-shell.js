/**
 * LAFEA.4 five-DOF shell presentation boundary.
 *
 * Engineering stress authority is retained integration-point surface evidence.
 * MITC transverse-shear quantities are presented separately from the existing
 * same-point in-plane von Mises invariant. No nodal stress projection,
 * averaging, smoothing or contour interpolation is promoted here.
 */
import {
  formulaId,
  presenterResult,
  presenterRow,
  requiredUnit,
} from './common.js';

const MITC_RESULT_SCHEMA = 'local-shell-result/v2';

export function presentLocalShell(result, units) {
  const stress = shellStressUnit(units);
  const length = requiredUnit(units, 'length');
  const force = requiredUnit(units, 'force');
  const moment = requiredUnit(units, 'moment');
  const shearResultantUnit = `${force}/${length}`;
  const mitc = result?.schema === MITC_RESULT_SCHEMA;
  const formulationLabel = mitc
    ? 'MITC4/MITC3 Reissner–Mindlin'
    : 'CST+DKT thin-shell';
  const summaryRows = [];
  const stressRows = [];
  const shearRows = [];
  const displacementRows = [];
  let maximumStress = null;
  let maximumSigmaX = null;
  let maximumDisplacement = null;
  let maximumForceReaction = null;
  let maximumMomentReaction = null;
  let maximumAppliedForce = null;
  let maximumAppliedMoment = null;
  let maximumShearStress = null;
  let maximumShearResultant = null;

  if (mitc && typeof result.productionQualification?.state === 'string') {
    summaryRows.push(presenterRow(
      'Production route release qualification',
      result.productionQualification.state,
      'status',
      null,
      'result.productionQualification.state',
    ));
  }

  for (const [caseIndex, loadCase] of (result.loadCaseResults ?? []).entries()) {
    const caseLabel = loadCase.loadCaseId || `Case ${caseIndex + 1}`;
    const casePath = `result.loadCaseResults[${caseIndex}]`;

    for (const [elementIndex, element] of (loadCase.elementResults ?? []).entries()) {
      const elementLabel = mitc && element.formulation
        ? `${element.elementId} · ${element.formulation}`
        : `${element.elementId}`;
      for (const [pointIndex, point] of (element.integrationPoints ?? []).entries()) {
        const pointLabel = point.integrationPointId || `IP ${pointIndex + 1}`;
        for (const [surfaceIndex, surface] of (point.surfaces ?? []).entries()) {
          const surfacePath = `${casePath}.elementResults[${elementIndex}]`
            + `.integrationPoints[${pointIndex}].surfaces[${surfaceIndex}]`;
          const location = `${caseLabel} · Element ${elementLabel}`
            + ` · ${pointLabel} · ${surface.surface}`;
          const vonMisesPath = `${surfacePath}.vonMises`;
          const retainedFormula = formulaId(surface) ?? formulaId(element) ?? formulaId(loadCase);
          maximumStress = larger(maximumStress, {
            value: surface.vonMises,
            label: location,
            sourcePath: vonMisesPath,
            formula: retainedFormula,
          });
          const sigmaX = surface.combinedStress?.sigmaX;
          if (Number.isFinite(sigmaX)) {
            maximumSigmaX = larger(maximumSigmaX, {
              value: Math.abs(sigmaX),
              label: location,
              sourcePath: `${surfacePath}.combinedStress.sigmaX`,
              formula: retainedFormula,
            });
          }
          stressRows.push(presenterRow(
            `${location} · von Mises equivalent stress`,
            surface.vonMises,
            stress,
            retainedFormula,
            vonMisesPath,
          ));
        }

        if (mitc) {
          appendMitcShearRows({
            rows: shearRows,
            point,
            element,
            caseLabel,
            elementLabel,
            pointLabel,
            pointPath: `${casePath}.elementResults[${elementIndex}].integrationPoints[${pointIndex}]`,
            stressUnit: stress,
            resultantUnit: shearResultantUnit,
            onStress: (candidate) => { maximumShearStress = larger(maximumShearStress, candidate); },
            onResultant: (candidate) => { maximumShearResultant = larger(maximumShearResultant, candidate); },
          });
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
  appendSummaryMaximum(summaryRows, 'Max |combined surface sigmaX|', maximumSigmaX, stress);
  if (mitc) {
    appendSummaryMaximum(summaryRows, 'Max effective transverse-shear stress magnitude', maximumShearStress, stress);
    appendSummaryMaximum(summaryRows, 'Max transverse-shear resultant magnitude', maximumShearResultant, shearResultantUnit);
  }
  appendSummaryMaximum(summaryRows, 'Max translational reaction component', maximumForceReaction, force);
  appendSummaryMaximum(summaryRows, 'Max tangent reaction moment component', maximumMomentReaction, moment);
  appendSummaryMaximum(summaryRows, 'Max applied force resultant magnitude', maximumAppliedForce, force);
  appendSummaryMaximum(summaryRows, 'Max applied moment resultant magnitude', maximumAppliedMoment, moment);

  const governing = maximumStress
    ? {
      label: mitc
        ? 'Governing retained MITC in-plane surface/IP von Mises equivalent stress'
        : 'Governing retained shell surface/IP von Mises equivalent stress',
      value: maximumStress.value,
      unit: stress,
      locationId: maximumStress.label,
      sourcePath: maximumStress.sourcePath,
    }
    : null;

  const sections = [
    {
      title: `Engineering summary — ${formulationLabel} retained evidence`,
      rows: summaryRows,
    },
    {
      title: `${formulationLabel} integration-point surface stress evidence`,
      rows: stressRows,
    },
  ];
  if (mitc) {
    sections.push({
      title: 'MITC retained transverse-shear evidence — separate from in-plane von Mises',
      rows: shearRows,
    });
  }
  sections.push({
    title: `${formulationLabel} nodal displacement evidence`,
    rows: displacementRows,
  });

  return presenterResult(result, sections, governing);
}

function appendMitcShearRows(context) {
  const {
    rows, point, element, caseLabel, elementLabel, pointLabel, pointPath,
    stressUnit, resultantUnit, onStress, onResultant,
  } = context;
  const shearStress = point.transverseShearStressAverage;
  if (Number.isFinite(shearStress?.tauXZEffectiveAverage)
    && Number.isFinite(shearStress?.tauYZEffectiveAverage)) {
    const magnitude = Math.hypot(
      shearStress.tauXZEffectiveAverage,
      shearStress.tauYZEffectiveAverage,
    );
    const label = `${caseLabel} · Element ${elementLabel} · ${pointLabel}`;
    const path = `${pointPath}.transverseShearStressAverage`;
    const candidate = {
      value: magnitude,
      label,
      sourcePath: path,
      formula: formulaId(element),
    };
    onStress(candidate);
    rows.push(presenterRow(
      `${label} · effective average transverse-shear stress magnitude`,
      magnitude,
      stressUnit,
      formulaId(element),
      path,
    ));
  }
  const resultant = point.transverseShearResultant;
  if (Number.isFinite(resultant?.qX) && Number.isFinite(resultant?.qY)) {
    const magnitude = Math.hypot(resultant.qX, resultant.qY);
    const label = `${caseLabel} · Element ${elementLabel} · ${pointLabel}`;
    const path = `${pointPath}.transverseShearResultant`;
    const candidate = {
      value: magnitude,
      label,
      sourcePath: path,
      formula: formulaId(element),
    };
    onResultant(candidate);
    rows.push(presenterRow(
      `${label} · transverse-shear resultant magnitude`,
      magnitude,
      resultantUnit,
      formulaId(element),
      path,
    ));
  }
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
