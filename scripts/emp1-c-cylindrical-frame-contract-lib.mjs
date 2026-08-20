export const EMP1_C_CYLINDRICAL_FRAME_SCHEMA = 'emp1-c-cylindrical-frame-contract/v1';

/**
 * Build the canonical cylindrical WRC basis from physical directions, not from
 * global field names. For a radial nozzle on a cylindrical shell:
 *   eLong = vessel centerline direction
 *   eP    = nozzle centerline / radial direction
 *   eVc   = eLong x eP
 *
 * The WRC load components are then resolved by projection. Moment signs are
 * source/benchmark-bound separately from force-axis construction.
 */
export function buildCylindricalWrcFrame({ vesselCenterlineGlobal, nozzleCenterlineGlobal, orthogonalityTolerance = 1e-10 }) {
  const eLong = normalize3(vesselCenterlineGlobal, 'vesselCenterlineGlobal');
  const eP = normalize3(nozzleCenterlineGlobal, 'nozzleCenterlineGlobal');
  const alignment = dot(eLong, eP);
  if (Math.abs(alignment) > orthogonalityTolerance) {
    throw new TypeError(`EMP1_C_WRC_FRAME_NON_ORTHOGONAL:${alignment}`);
  }
  const eVc = normalize3(cross(eLong, eP), 'circumferentialDirection');
  const handedness = dot(cross(eLong, eP), eVc);
  const orthogonalityResidual = Math.max(Math.abs(dot(eLong, eP)), Math.abs(dot(eLong, eVc)), Math.abs(dot(eP, eVc)));
  if (Math.abs(1 - handedness) > orthogonalityTolerance || orthogonalityResidual > orthogonalityTolerance) {
    throw new TypeError('EMP1_C_WRC_FRAME_QUALIFICATION_FAILURE');
  }
  return deepFreeze({
    schema: EMP1_C_CYLINDRICAL_FRAME_SCHEMA,
    shellFamily: 'CYLINDRICAL',
    construction: 'eLong=normalize(vesselCenterline);eP=normalize(nozzleCenterline);eVc=normalize(eLong×eP)',
    forceBasis: { P: eP, Vc: eVc, Vl: eLong },
    momentBasis: { Mc: scale(eLong, -1), Ml: eVc, Mt: scale(eP, -1) },
    axesGlobal: { eLong, eP, eVc },
    orthogonalityResidual,
    handedness,
    orthogonalityTolerance,
  });
}

export function globalLoadsToWrc(frame, { forceGlobal, momentGlobal }) {
  const F = vector3(forceGlobal, 'forceGlobal');
  const M = vector3(momentGlobal, 'momentGlobal');
  return {
    P: dot(F, frame.forceBasis.P),
    Vc: dot(F, frame.forceBasis.Vc),
    Vl: dot(F, frame.forceBasis.Vl),
    Mc: dot(M, frame.momentBasis.Mc),
    Ml: dot(M, frame.momentBasis.Ml),
    Mt: dot(M, frame.momentBasis.Mt),
  };
}

export function wrcLoadsToGlobal(frame, { P, Vc, Vl, Mc, Ml, Mt }) {
  for (const [name, value] of Object.entries({ P, Vc, Vl, Mc, Ml, Mt })) {
    if (!Number.isFinite(value)) throw new TypeError(`EMP1_C_WRC_LOAD_NOT_FINITE:${name}`);
  }
  return {
    forceGlobal: add(add(scale(frame.forceBasis.P, P), scale(frame.forceBasis.Vc, Vc)), scale(frame.forceBasis.Vl, Vl)),
    momentGlobal: add(add(scale(frame.momentBasis.Mc, Mc), scale(frame.momentBasis.Ml, Ml)), scale(frame.momentBasis.Mt, Mt)),
  };
}

export function proveWrcLoadRoundTrip(frame, globalLoads, tolerance = 1e-9) {
  const wrc = globalLoadsToWrc(frame, globalLoads);
  const reconstructed = wrcLoadsToGlobal(frame, wrc);
  const forceResidual = subtract(reconstructed.forceGlobal, globalLoads.forceGlobal);
  const momentResidual = subtract(reconstructed.momentGlobal, globalLoads.momentGlobal);
  const maxResidual = Math.max(...forceResidual.map(Math.abs), ...momentResidual.map(Math.abs));
  if (maxResidual > tolerance) throw new TypeError(`EMP1_C_WRC_FRAME_ROUNDTRIP_FAILURE:${maxResidual}`);
  return { wrc, reconstructed, forceResidual, momentResidual, maxResidual, tolerance };
}

function vector3(value, path) {
  if (!Array.isArray(value) || value.length !== 3 || value.some((x) => !Number.isFinite(x))) throw new TypeError(`EMP1_C_WRC_VECTOR_INVALID:${path}`);
  return value.map(Number);
}
function normalize3(value, path) {
  const v = vector3(value, path);
  const n = Math.sqrt(dot(v, v));
  if (!(n > 0)) throw new TypeError(`EMP1_C_WRC_VECTOR_ZERO:${path}`);
  return v.map((x) => x / n);
}
function dot(a,b) { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
function cross(a,b) { return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
function scale(a,s) { return a.map((x)=>x*s); }
function add(a,b) { return a.map((x,i)=>x+b[i]); }
function subtract(a,b) { return a.map((x,i)=>x-b[i]); }
function deepFreeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.values(value).forEach(deepFreeze); return Object.freeze(value); }
