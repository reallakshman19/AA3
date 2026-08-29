import { END_CONDITIONS } from '../local-stress/index.js';
import { AXIAL_PRESSURE_THRUST_BASES, FORMULA_IDS } from './constants.js';
import { sourceError, unsupportedError } from './errors.js';
import { canonicalNumber } from './numeric.js';
export function pressureAtLocation(sourceResult,caseRow,location) {
  const pressure=sourceResult.pressureStressResults.find((row)=>row.pressureDefinitionIdentity===caseRow.pressureDefinitionId);
  const reused=findPoint(pressure.requestedPoints,location.radius);
  const point=reused??recoverPoint(pressure,location.radius);
  const axial=axialPressureComponent(pressure,caseRow.pressureFactor,caseRow.axialPressureThrustBasis);
  const formulaIds=[reused?FORMULA_IDS.PRESSURE_EXACT:FORMULA_IDS.PRESSURE_RADIUS];
  if(axial.custodyApplied)formulaIds.push(FORMULA_IDS.PRESSURE_THRUST_CUSTODY);
  return {
    pressureDefinitionId:caseRow.pressureDefinitionId, pressureResultIdentity:pressure.identity,
    pressureFactor:caseRow.pressureFactor, radius:location.radius,
    sigmaRPressure:canonicalNumber(point.radialStress*caseRow.pressureFactor),
    sigmaThetaPressure:canonicalNumber(point.hoopStress*caseRow.pressureFactor),
    sigmaXPressure:axial.value, sourceAxialPressureStress:pressure.axialPressureStress,
    axialPressureThrustBasis:caseRow.axialPressureThrustBasis,
    axialPressureTreatment:axial.treatment,
    explicitAxialResultant:pressure.explicitAxialResultant,
    endCondition:pressure.endCondition, limitations:pressure.limitations,
    sourceReferences:pressure.sourceReferences,
    reuseMode:reused?'EXACT_POINT':'COEFFICIENT_RADIUS_RECOVERY',
    formulaIds:formulaIds.sort(),
  };
}
function axialPressureComponent(pressure,factor,basis) {
  if(factor===0)return axialEvidence(0,'ZERO_PRESSURE_FACTOR',false);
  if(pressure.endCondition===END_CONDITIONS.EXPLICIT_AXIAL_RESULTANT)return axialEvidence(0,'EXPLICIT_AXIAL_RESULTANT_HANDLED_AS_MECHANICAL_RESULTANT',false);
  if(pressure.endCondition===END_CONDITIONS.UNSPECIFIED)throw unsupportedError('UNSPECIFIED_AXIAL_PRESSURE_SCREENING','screeningCases.pressureDefinitionId','A non-zero pressure factor requires declared axial-pressure semantics.');
  if(typeof pressure.axialPressureStress!=='number'||!Number.isFinite(pressure.axialPressureStress))throw sourceError('FOUNDATION_AXIAL_PRESSURE_EVIDENCE_MISSING','sourceEvidence.foundationResult.pressureStressResults','Foundation axial pressure evidence is required for a non-zero pressure factor.');
  if(pressure.endCondition===END_CONDITIONS.OPEN_END) {
    if(pressure.axialPressureStress!==0)throw sourceError('FOUNDATION_OPEN_END_AXIAL_EVIDENCE_INVALID','sourceEvidence.foundationResult.pressureStressResults','Open-end axial pressure evidence must be zero.');
    return axialEvidence(0,'OPEN_END_ZERO_AXIAL_PRESSURE_STRESS',false);
  }
  if(pressure.endCondition===END_CONDITIONS.CLOSED_END) {
    if(pressure.axialPressureStress===0)return axialEvidence(0,'CLOSED_END_ZERO_AXIAL_PRESSURE_STRESS',false);
    if(basis===AXIAL_PRESSURE_THRUST_BASES.UNKNOWN)throw unsupportedError('AXIAL_PRESSURE_THRUST_BASIS_REQUIRED','screeningCases.axialPressureThrustBasis','Closed-end pressure screening requires explicit axial pressure-thrust provenance.');
    if(basis===AXIAL_PRESSURE_THRUST_BASES.INCLUDES_PRESSURE_THRUST)return axialEvidence(0,'SUPPRESSED_ALREADY_INCLUDED_IN_MECHANICAL_RESULTANT',true);
    if(basis===AXIAL_PRESSURE_THRUST_BASES.EXCLUDES_PRESSURE_THRUST)return axialEvidence(canonicalNumber(pressure.axialPressureStress*factor),'ADDED_FROM_FOUNDATION_CLOSED_END_STRESS',true);
    throw unsupportedError('AXIAL_PRESSURE_THRUST_BASIS_UNSUPPORTED','screeningCases.axialPressureThrustBasis',`Unsupported axial pressure-thrust basis ${basis}.`);
  }
  return axialEvidence(canonicalNumber(pressure.axialPressureStress*factor),'FOUNDATION_AXIAL_PRESSURE_STRESS_APPLIED',false);
}
function axialEvidence(value,treatment,custodyApplied){return {value,treatment,custodyApplied};}
function findPoint(points,radius) { return points.find((row)=>row.radius===radius)??null; }
function recoverPoint(pressure,radius) {
  const a=pressure.coefficientA,b=pressure.coefficientB;
  return {radialStress:canonicalNumber(a-b/radius**2),hoopStress:canonicalNumber(a+b/radius**2)};
}
