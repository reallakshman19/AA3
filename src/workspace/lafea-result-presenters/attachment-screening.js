/**
 * LAFEA.2 nominal far-field pipe-section screening presenter.
 *
 * This presenter does not convert screening arithmetic into a code-assessment
 * result, local attachment stress, shell stress or weld stress. Formula-trace
 * identities remain available in the retained raw evidence; they are not
 * represented as fabricated numeric rows.
 */
import {
  formulaId,
  presenterResult,
  presenterRow,
  requiredUnit,
} from './common.js';

export function presentAttachmentScreening(result, units) {
  const stress = requiredUnit(units, 'stress');
  const quantityLabels = {
    vonMisesMaximum: 'Von Mises equivalent stress maximum',
    principalMaximum: 'Maximum principal normal stress',
    principalMinimum: 'Minimum principal normal stress',
    sigmaRMaximum: 'Radial normal stress maximum',
    sigmaRMinimum: 'Radial normal stress minimum',
    sigmaThetaMaximum: 'Circumferential stress maximum',
    sigmaThetaMinimum: 'Circumferential stress minimum',
    sigmaXMaximum: 'Axial stress maximum',
    sigmaXMinimum: 'Axial stress minimum',
    tauXThetaMaximum: 'Torsional shear stress maximum',
    tauXThetaMinimum: 'Torsional shear stress minimum',
  };
  const locationLabels = {
    LMID: 'mid-wall location',
    L0: 'outer-surface location',
    L1: 'inner-surface location',
  };

  const rows = (result.envelopes ?? []).map((record, index) => {
    const quantity = quantityLabels[record.quantity] || String(record.quantity);
    const location = locationLabels[record.evaluationLocationId]
      || String(record.evaluationLocationId);
    return presenterRow(
      `${quantity} · case ${record.screeningCaseId} (${location})`,
      record.value,
      stress,
      formulaId(record),
      `result.envelopes[${index}].value`,
    );
  });
  const custodyRows = pressureThrustCustodyRows(result);

  const governingIndex = (result.envelopes ?? [])
    .findIndex((row) => row.quantity === 'vonMisesMaximum');
  const governingRecord = governingIndex >= 0 ? result.envelopes[governingIndex] : null;
  const governing = governingRecord
    ? {
      label: 'Governing nominal von Mises equivalent stress',
      value: governingRecord.value,
      unit: stress,
      locationId: governingRecord.evaluationLocationId,
      sourcePath: `result.envelopes[${governingIndex}].value`,
    }
    : null;

  const sections = [
    {
      title: 'Nominal pipe-section stress envelopes and tensor invariants',
      rows,
    },
  ];
  if (custodyRows.length) {
    sections.push({
      title: 'Retained axial pressure-thrust custody evidence',
      rows: custodyRows,
    });
  }
  return presenterResult(result, sections, governing);
}

function pressureThrustCustodyRows(result) {
  const rows = [];
  const seen = new Set();
  (result.pointStressStates ?? []).forEach((state, index) => {
    const screeningCaseId = String(state?.screeningCaseId ?? 'UNRESOLVED_SCREENING_CASE');
    if (seen.has(screeningCaseId)) return;
    const pressure = state?.pressureStress;
    if (!pressure || typeof pressure !== 'object') return;
    if (typeof pressure.axialPressureThrustBasis !== 'string'
      || typeof pressure.axialPressureTreatment !== 'string') return;
    seen.add(screeningCaseId);
    rows.push(
      presenterRow(
        `Axial pressure-thrust basis · case ${screeningCaseId}`,
        pressure.axialPressureThrustBasis,
        'classification',
        formulaId(pressure),
        `result.pointStressStates[${index}].pressureStress.axialPressureThrustBasis`,
      ),
      presenterRow(
        `Applied axial pressure treatment · case ${screeningCaseId}`,
        pressure.axialPressureTreatment,
        'classification',
        formulaId(pressure),
        `result.pointStressStates[${index}].pressureStress.axialPressureTreatment`,
      ),
    );
  });
  return rows;
}
