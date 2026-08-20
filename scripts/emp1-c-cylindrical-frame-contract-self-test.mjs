#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  buildCylindricalWrcFrame,
  globalLoadsToWrc,
  proveWrcLoadRoundTrip,
  wrcLoadsToGlobal,
} from './emp1-c-cylindrical-frame-contract-lib.mjs';

const cauxFrame = buildCylindricalWrcFrame({
  vesselCenterlineGlobal: [0, 1, 0],
  nozzleCenterlineGlobal: [1, 0, 0],
});
assert.deepEqual(cauxFrame.axesGlobal.eLong, [0, 1, 0]);
assert.deepEqual(cauxFrame.axesGlobal.eP, [1, 0, 0]);
assert.deepEqual(cauxFrame.axesGlobal.eVc, [0, 0, -1]);

const cauxGlobal = {
  forceGlobal: [-161, -2109, 53],
  momentGlobal: [775, -121, -33],
};
const cauxWrc = globalLoadsToWrc(cauxFrame, cauxGlobal);
assert.deepEqual(cauxWrc, { P: -161, Vc: -53, Vl: -2109, Mc: 121, Ml: 33, Mt: -775 });
const cauxRoundTrip = proveWrcLoadRoundTrip(cauxFrame, cauxGlobal);
assert.equal(cauxRoundTrip.maxResidual, 0);

// Rotation-invariance proof: use an oblique but orthogonal vessel/nozzle pair,
// author WRC components, synthesize global vectors, and recover the exact same
// WRC components without relying on global X/Y/Z field names.
const obliqueFrame = buildCylindricalWrcFrame({
  vesselCenterlineGlobal: [1, 1, 0],
  nozzleCenterlineGlobal: [1, -1, 2],
});
const authoredWrc = { P: 1234.5, Vc: -234.5, Vl: 345.25, Mc: -456.75, Ml: 567.125, Mt: -678.875 };
const authoredGlobal = wrcLoadsToGlobal(obliqueFrame, authoredWrc);
const recoveredWrc = globalLoadsToWrc(obliqueFrame, authoredGlobal);
for (const [key, expected] of Object.entries(authoredWrc)) assert(Math.abs(recoveredWrc[key] - expected) < 1e-10, `${key} rotation invariant`);
assert(proveWrcLoadRoundTrip(obliqueFrame, authoredGlobal, 1e-10).maxResidual < 1e-10);

assert.throws(
  () => buildCylindricalWrcFrame({ vesselCenterlineGlobal: [0,1,0], nozzleCenterlineGlobal: [0,2,0] }),
  /EMP1_C_WRC_FRAME_NON_ORTHOGONAL/u,
);
assert.throws(
  () => buildCylindricalWrcFrame({ vesselCenterlineGlobal: [0,0,0], nozzleCenterlineGlobal: [1,0,0] }),
  /EMP1_C_WRC_VECTOR_ZERO/u,
);
assert.throws(
  () => globalLoadsToWrc(cauxFrame, { forceGlobal: [1,2], momentGlobal: [1,2,3] }),
  /EMP1_C_WRC_VECTOR_INVALID/u,
);

console.log(JSON.stringify({
  schema: 'emp1-c-cylindrical-frame-contract-self-test/v1',
  status: 'PASS',
  authority: {
    sourceSignAuthority: 'WRC537_TABLE4_PASS',
    benchmarkMappingAuthority: 'CAUX_PP25_26_PASS',
    mathematicalRoundTripAuthority: 'PASS',
    globalFieldRenameAuthority: 'PROHIBITED',
  },
  caux: { axesGlobal: cauxFrame.axesGlobal, global: cauxGlobal, wrc: cauxWrc, roundTripMaxResidual: cauxRoundTrip.maxResidual },
  oblique: { axesGlobal: obliqueFrame.axesGlobal, authoredWrc, recoveredWrc },
  negativeProofs: ['NON_ORTHOGONAL_VESSEL_NOZZLE_REJECTED','ZERO_DIRECTION_REJECTED','MALFORMED_GLOBAL_VECTOR_REJECTED'],
}, null, 2));
