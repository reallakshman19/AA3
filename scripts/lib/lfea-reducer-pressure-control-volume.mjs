import assert from 'node:assert/strict';

/**
 * RESEARCH GEOMETRY ONLY. Axial static force balance of a fluid control volume
 * bounded by TWO planar cross-sections and an axisymmetric sloping sidewall,
 * each exposed to the SAME static pressure P. +x runs from inlet -> outlet.
 *
 * All values are forces ON THE FLUID. At the inlet: +P*A_inlet;
 * at the outlet: -P*A_outlet; sidewall-on-fluid: +P*(A_outlet-A_inlet).
 * Those external forces sum to zero for every uniform P and taper.
 *
 * The sidewall-on-fluid term is the NEGATIVE of fluid-on-solid sidewall
 * traction. It is not, by itself, a force to attach at either beam endpoint.
 * In particular, using the sidewall term as an extra nodal load in addition
 * to an already closed-end pressure convention may double-count forces.
 */
export function idealizedFluidPressureControlVolume({
  pressurePa,
  inletInnerDiameterM,
  outletInnerDiameterM,
}) {
  for (const [key,value] of Object.entries({
    pressurePa,inletInnerDiameterM,outletInnerDiameterM,
  })) {
    assert.ok(typeof value==='number' && Number.isFinite(value),
      'REDUCER_PRESSURE_CV_NONFINITE:'+key);
  }
  assert.ok(inletInnerDiameterM>0 && outletInnerDiameterM>0,
    'REDUCER_PRESSURE_CV_DIAMETERS_MUST_BE_POSITIVE');
  const inletAreaM2=Math.PI*inletInnerDiameterM**2/4;
  const outletAreaM2=Math.PI*outletInnerDiameterM**2/4;
  const inletPressureOnFluidN=pressurePa*inletAreaM2;
  const outletPressureOnFluidN=-pressurePa*outletAreaM2;
  const wallPressureOnFluidN=pressurePa*(outletAreaM2-inletAreaM2);
  const fluidPressureOnSolidSidewallN=-wallPressureOnFluidN;
  const pressureEndFaceSumOnFluidN=inletPressureOnFluidN+outletPressureOnFluidN;
  const netFluidExternalAxialForceN=pressureEndFaceSumOnFluidN+wallPressureOnFluidN;
  const scale=Math.max(1,Math.abs(inletPressureOnFluidN),
    Math.abs(outletPressureOnFluidN),Math.abs(wallPressureOnFluidN));
  const relativeEquilibriumResidual=Math.abs(netFluidExternalAxialForceN)/scale;
  assert.ok(relativeEquilibriumResidual<=1e-12,
    'REDUCER_PRESSURE_CV_UNIFORM_PRESSURE_EQUILIBRIUM_FAILURE');
  return {
    schema:'lfea-idealized-fluid-pressure-control-volume/v1',
    status:'IDEALIZED_AXISYMMETRIC_FORCE_BALANCE_NOT_REDUCER_PRESSURE_AUTHORITY',
    coordinateConvention:'PLUS_X_FROM_INLET_TO_OUTLET',
    axialForcesActOn:'FLUID_CONTROL_VOLUME',
    pressurePa,
    inletInnerDiameterM,outletInnerDiameterM,
    inletAreaM2,outletAreaM2,
    inletPressureOnFluidN,
    outletPressureOnFluidN,
    pressureEndFaceSumOnFluidN,
    wallPressureOnFluidN,
    fluidPressureOnSolidSidewallN,
    netFluidExternalAxialForceN,
    relativeEquilibriumResidual,
    fullPressureBoundaryClosureRequired:true,
    wallPressureLoadAllocatedToBeamNodes:false,
    physicalReducerEndCapAllocationEstablished:false,
    physicalReducerEccentricPressureModelEstablished:false,
    caesarIIPressureRuleIdentified:false,
    productionPressurePromotionAuthorized:false,
  };
}
