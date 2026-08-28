# PR1001 Stage 9 — local tee + resolved-alpha replay result

## Current truth

- Governed implementation evidence source: exact-head qualification artifact from `7488ba76126f8240bb61c80fad243cf096c5fe08`.
- Authorized ACCDB SHA-256: `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`.
- Tee mechanics candidate remains `g_thermal = epsilon * r_surface` on `ACCDB.E12` and `ACCDB.E36.STRAIGHT`, changing initial-load state only.
- BM4_L T1 strain reconstructed directly from CAESAR L3 ordinary-straight kinematics/end forces: `epsilon_T1 = 0.00121096700947` for 21 C -> 120 C, equivalent interval mean `alpha = 1.2231989994646464e-5 /K`.
- Live branch source/profile are still unmodified under the no-Actions policy.

## Local replay method

The cached exact-head artifact contains all 322 analysis-element global stiffness matrices, recovery end actions, joint displacement states, and benchmark references. The local replay:

1. Reassembles the exact common global stiffness matrix from the 322 `globalStiffness` ledgers.
2. Recovers 30 finite-restraint nodes / 51 restrained DOFs from exact equilibrium; translational stiffness is `1e14 N/m`, anchor rotational stiffness is `5.729577951308232e13 N.m/rad`.
3. Verifies source-element endpoint recovery mapping exactly (`maximum absolute baseline mapping error = 0`).
4. Applies tee free growth only as the production-equation initial-load perturbation `-K g` on carriers E12 and E36.STRAIGHT.
5. Solves the linear perturbation with the same K.
6. Scales the existing T1 state from provisional strain to the reconstructed CAESAR strain and recomposes L5/L14 by the governed linear identities.
7. Recomputes restraint reaction deltas from the finite support stiffnesses.
8. Compares only the governed scope: displacement/rotation, restraint reactions, and source-element global end actions. Derived `INCIDENT_GLOBAL_*` diagnostics are not included in the governed 435 count.

## Calibration

Before using the resolved strain, the replay was run at the existing provisional strain `0.0011583`.

It reproduces the already-qualified tee result exactly:

| Case | Stage-5 authority | Local replay |
|---|---:|---:|
| L2 | 31 | 31 |
| L3 | 37 | 37 |
| L4 | 40 | 40 |
| L5 | 43 | 43 |
| L6 | 22 | 22 |
| L14 | 37 | 37 |
| **Total** | **210** | **210** |

Calibration status: **PASS**.

## Resolved-alpha result — live comparison gate

Using `epsilon_T1 = 0.00121096700947` and the same tee mechanics:

| Case | Tee + provisional alpha | Tee + resolved alpha |
|---|---:|---:|
| L2 | 31 | 31 |
| L3 | 37 | **22** |
| L4 | 40 | 40 |
| L5 | 43 | **13** |
| L6 | 22 | 22 |
| L14 | 37 | **22** |
| **Total** | **210** | **150** |

W/P-only cases are unchanged. Thermal-containing cases improve exactly in the predicted direction.

Failure composition at 150:

- L2: 31 = 26 zero-reference + 5 nonzero-reference.
- L3: 22 = 17 zero-reference + 5 nonzero-reference.
- L4: 40 = 33 zero-reference + 7 nonzero-reference.
- L5: 13 = 5 zero-reference + 8 nonzero-reference.
- L6: 22 = 7 zero-reference + 15 nonzero-reference.
- L14: 22 = 17 zero-reference + 5 nonzero-reference.

## Stage-7 local gate sensitivity — still not promoted

With the separately-qualified local-only rotation zero boundary `0.0001 deg = 1.7453292519943296e-6 rad`, tee + resolved alpha gives:

`L2/L3/L4/L5/L6/L14 = 6/5/7/8/15/5`, total **46**.

This is sensitivity only. The live branch rotation gate remains `1e-7 rad`; 46 is not live PR parity.

The previously alpha-contingent `L5:22110:RZ` moves to `1.7283668022824805e-6 rad`, now below the local `0.0001 deg` boundary as predicted before replay. `L2:20440:RZ` stays unchanged at about `-2.0332762129334813e-6 rad` because L2 contains no thermal term.

## Validation ledger

- **PASS** — provisional tee calibration exactly reproduces 210.
- **PASS** — source endpoint recovery maps baseline source actions with maximum absolute error 0.
- **PASS** — tee perturbation solve residual maximum `2.92e-7` in assembled equation units.
- **PASS** — tee perturbation equilibrium maximum `2.75e-7 N` / `2.84e-9 N.m`.
- **PASS** — resolved full L3 equilibrium maximum `1.78e-5 N` / `7.86e-8 N.m`, far inside `5 N / 0.5 N.m` gates.
- **PASS** — `L14 = L3` exactly in the replay.
- **PASS** — `L5 = L6 + L3` exactly in the replay.
- **PASS** — common K is unchanged.
- **PASS** — W/P-only cases are unchanged by alpha/tee thermal free state.
- **NOT_RUN** — Node production module execution from a full local checkout; source archive is not transferable into the shell through the connected GitHub interface.
- **NOT_RUN** — GitHub Actions rerun, intentionally prohibited by current PR workflow policy.

## Stage decision

**COMPLETE / LOCAL_VALIDATION_PASS.**

The reconstructed CAESAR interval strain is no longer merely a benchmark-optimal diagnostic value: it is independently recovered from an overdetermined constitutive relation across CAESAR L3 straight-element displacement/end-force records. The local exact-equation replay calibrates to the previously qualified 210 result and then yields **150** under the live gate when the resolved strain is applied.

Production delivery remains intentionally separate:

1. tee free-growth v3 core patch;
2. BM4_L profile exact interval strain/authority patch;
3. Stage-7 zero-rotation profile candidate remains separate and unpromoted;
4. reducer sampling remains blocked by missing direct CAESAR station authority.
