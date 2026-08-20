# PR1289 work report — EI AVIFF P0 source correction

## Recovery header

- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: RECOVERABLE`
- `PR: #1289`
- `BRANCH: agent/ei-p0-source-correction-20260820`
- `BASE_AT_ALLOCATION: main@782683e7355281e95e5319dcad7f8a5644710d1d`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `CURRENT_STAGE: DRAFT_PR_OWNER_GATE`
- `MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED`

## Mission

Correct engineering-critical source transcription defects introduced by merged PR #1288 in the EI AVIFF FIT/AIV master-data pack, quarantine synthetic P1 qualitative authority, and close AIV T2.5/T2.6 transcription gaps only where the source equation chain is independently corroborated and numerically reproduced.

## Governing source

```text
Energy Institute — Guidelines for the Avoidance of Vibration Induced Fatigue Failure in Process Pipework
2nd Edition, 2008
docs/EI data/EI - AVIFF Guidelines 2nd Edition.pdf
Git blob 9d3eccc56429411e17c07a579bdebbd13cb0bdc5
```

That blob is identical to the controlled main-guidance source already pinned by the FIT/AIV evidence chain in `reallaksh19/3D_Converters`.

Exact visual parity against pages 60/61 of that pinned binary remains `NOT_RUN / TRANSPORT_BLOCKED`; this PR does not relabel that gate as PASS.

## Delivered correction

### FIT T2.2

- gas `FVF = sqrt(mu/0.001 Pa.s)`;
- gas `LOF = rhoV2 * FVF / Fv`;
- liquid/multiphase `LOF = rhoV2 / Fv`;
- valid T2-1 span boundaries and T2-2 correlation coefficients remain unchanged.

### AIV T2.5

Source-corroborated and D.2.3-reproduced qualification evidence now records:

- source PWL mass-flow exponent `W^2`;
- sonic-flow factor `SFF=6 dB` for sonic conditions, otherwise `0 dB`;
- qualified low-noise-trim reduction as a PWL delta;
- 155 dB source/discontinuity gates;
- empirical attenuation `60 * L_m / Dint_mm`;
- multi-source energy summation `10 log10(sum(10^(PWL_i/10)))`;
- main-line source-path rule based on the greatest welded-discontinuity LOF encountered, with downstream source-path LOF `0.29` after the first sub-155 dB point.

The multi-source equation is source-corroborated, but production promotion still requires an independent multi-source benchmark and governed simultaneous-source scope.

### AIV T2.6

PR1288's non-reproducing A/S/B polynomial has been replaced by the source-corroborated chain:

```text
R = Dext / T
s = 91.9 - R
a = 3.28e-7 R^3 - 8.503e-5 R^2 + 7.063e-3 R + 0.816
B = a [PWL - 0.112762 s - 0.001812 s^2 + 4.307277e-5 s^3]
```

For D.2.3 (`Dext=168.3 mm`, `T=7.11 mm`, point PWL `164.3883 dB`) this independently reproduces:

```text
a = 0.9398945   published 0.93989
s = 68.229114   published 68.229
B = 152.206736  published 152.207
```

The official EI errata `log10(N)` relation remains installed and gives `N≈7.9918e9` for the independently reproduced `B`.

The remaining T2.6 branch logic is now source-corroborated qualification evidence:

- `Dext/dext < 10` FLM1 polynomial;
- `Dext/dext >= 10 -> FLM1 = 0.5`;
- Weldolet -> apply `FLM2 = 0.29 + 0.09*tanh((PWL-172)/2.9)`;
- non-Weldolet -> no FLM2 multiplier;
- Duplex -> apply `FLM3 = 0.263 + 0.087*tanh((PWL-172)/2.9)`;
- non-Duplex -> no FLM3 multiplier;
- `Lf = 3.1 - 0.1303 ln(N)`, clamped to `[0,1]`;
- `Lf >= 0.5 -> LOF = Lf`; otherwise `LOF = 0.29`.

The D.2.3 published FLM1 `1.2133` versus direct calculation from displayed dimensions `1.210975819...` remains explicitly open. Using the published FLM1 with the reproduced chain gives `N_after≈1.9484e9`, `Lf≈0.31285`, `LOF=0.29`.

### P1 / global authority

- original PR1288 T1/P1 files remain evidence only;
- `EI-P1-IDENTIFICATION/AUTHORITY_STATUS.yaml` keeps the package `QUARANTINED_NOT_ENGINEERING_AUTHORITY`;
- `EI_SOURCE_AUTHORITY_STATUS.md` is the derived-data authority map;
- `EI_AVIFF_Complete_Master_Register.md` remains a reference compilation, not a trust root.

## Validation truth

### Earlier exact-byte focused gate

The pre-corroboration v1 gate was executed from reconstructed Git-blob-matched bytes and passed:

```text
EiAviffSourceMasterP0Check.v1
FIT                         PASS
AIV_T2_5                    PASS
AIV_T2_6_VERIFIED_SUBSET    PASS
AUTHORITY_QUARANTINE        PASS
```

### Current v2 independent numerical oracle

The current source equations were independently executed after the T2.5/T2.6 reconciliation:

```text
relief PWL                       164.68517595 dB
recycle PWL                      159.36481554 dB
attenuation 60*0.8/154           0.311688312 dB
point PWL                        164.388311688 dB
a                                0.939894519
s                               68.229113924
B                              152.206736454
log10(N)                          9.902644471
N                                 7.991797506e9
FLM1 recalculated                 1.210975819
FLM1 at ratio 10                  0.5
FLM2                              0.200940146
FLM3 at 172 dB                    0.263
N using published FLM1            1.948405660e9
Lf                                0.312846872
LOF                               0.29
160 dB + 160 dB                   163.010299957 dB
```

Branch-edge checks also passed independently:

- high Lf clamp -> `Lf=1`, `LOF=1`;
- low Lf clamp -> `Lf=0`, `LOF=0.29`.

### Current v2 branch-script execution

`scripts/ei-aviff-source-master-p0-check.mjs` has been extended to cover the full source-corroborated chain and authority boundaries, but exact current-branch Node execution is **NOT_RUN / TRANSPORT_BLOCKED** because neither a native checkout nor raw branch retrieval is available in the execution container. Do not convert the independent numerical oracle into an exact script PASS.

Still `NOT_RUN`:

- exact pinned-PDF page visual parity: `NOT_RUN / TRANSPORT_BLOCKED`;
- native repository checkout: `NOT_RUN / DNS_BLOCKED`;
- current-head hosted CI/workflows: reconcile at final head.

No production calculator/UI/workflow is changed by PR1289. No screening/design authority is promoted.

## Remaining promotion gates

Before any downstream AIV production promotion:

1. exact pinned-PDF visual parity for T2.5/T2.6;
2. explicit engineering disposition of the D.2.3 published FLM1 arithmetic variance;
3. independent multi-source benchmark;
4. governed simultaneous-source scope;
5. governed welded-discontinuity inventory completeness;
6. downstream `3D_Converters` implementation/readiness parity;
7. production release qualification.

No merge is authorized by the instruction that created or continued this PR.
