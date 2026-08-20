# PR1289 work report — EI AVIFF P0 source correction

## Recovery header

- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: RECOVERABLE`
- `PR: #1289`
- `BRANCH: agent/ei-p0-source-correction-20260820`
- `BASE_AT_ALLOCATION: main@782683e7355281e95e5319dcad7f8a5644710d1d`
- `IMPLEMENTATION_HEAD_AT_ALLOCATION: 47f8a643e6a056313889a298b458dcc1a4fe475a`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `CURRENT_STAGE: DRAFT_PR_OWNER_GATE`
- `MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED`

## Mission

Correct engineering-critical source transcription defects introduced by merged PR #1288 in the new EI AVIFF FIT/AIV master-data pack, while explicitly quarantining unresolved AIV T2.6 and P1 qualitative material.

## Governing source

```text
Energy Institute — Guidelines for the Avoidance of Vibration Induced Fatigue Failure in Process Pipework
2nd Edition, 2008
docs/EI data/EI - AVIFF Guidelines 2nd Edition.pdf
Git blob 9d3eccc56429411e17c07a579bdebbd13cb0bdc5
```

The blob is identical to the controlled main-guidance source already pinned by the FIT/AIV evidence chain in `reallaksh19/3D_Converters`.

## Delivered correction

### FIT

- gas `FVF = sqrt(mu/0.001 Pa.s)`;
- gas `LOF = rhoV2 * FVF / Fv`;
- liquid/multiphase `LOF = rhoV2 / Fv`;
- valid T2-1 span boundaries and T2-2 correlation coefficients remain unchanged.

### AIV T2.5

- source PWL mass-flow exponent corrected to `W^2`;
- D2.3 relief/recycle source PWL reproduced at 164.7 / 159.4 dB;
- attenuation corrected to empirical `60 * L_m / Dint_mm`;
- D2.3 0.8 m / 154 mm anchor reproduced at ~0.312 dB.

### AIV T2.6

- PR1288 A/S/B equations removed from engineering authority; published D2.3 A/S/B retained as benchmark anchors only;
- official Energy Institute errata equation for `log10(N)` installed and reproduced against `B=152.207`;
- fatigue factor corrected to `Lf = 3.1 - 0.1303 ln(N)` and D2.3 `Lf≈0.31` reproduced;
- FLM1 under-10 samples regenerated from the retained formula; published-vs-recalculated D2.3 variance remains visible/open;
- `D/d >= 10` remains unresolved;
- FLM2 restricted to the D2.3-reconciled Weldolet path;
- PR1288 general FLM3 material abstraction quarantined;
- higher LOF branch/general material/non-Weldolet paths remain unresolved.

### P1 / global authority

- original PR1288 T1/P1 files remain unchanged as evidence;
- new `EI-P1-IDENTIFICATION/AUTHORITY_STATUS.yaml` marks them `QUARANTINED_NOT_ENGINEERING_AUTHORITY`;
- new `EI_SOURCE_AUTHORITY_STATUS.md` is the derived-data authority map;
- README now states that `EI_AVIFF_Complete_Master_Register.md` is reference compilation, not a trust root.

## Validation

Exact reconstructed branch bytes were Git-blob checked and executed:

```text
node --check scripts/ei-aviff-source-master-p0-check.mjs   PASS
node scripts/ei-aviff-source-master-p0-check.mjs           PASS
```

Gate result:

```text
EiAviffSourceMasterP0Check.v1
FIT                         PASS
AIV_T2_5                    PASS
AIV_T2_6_VERIFIED_SUBSET    PASS
AUTHORITY_QUARANTINE        PASS
designAuthority             false
sourcePromotionBeyondVerifiedSubset false
```

The untouched CRLF `T2-2_fv_coefficients.csv` was also reconstructed byte-for-byte and matched GitHub blob `9bd6cccadd84f82ab4b225496970a711e92b7f65`.

Still NOT_RUN:

- direct visual PDF page inspection through current transport: `NOT_RUN / TRANSPORT_BLOCKED`;
- native repository checkout: `NOT_RUN / DNS_BLOCKED`;
- remote CI/current-head workflow evidence: pending hosted reconciliation.

No production calculator/UI/workflow changed. No screening/design authority was promoted.

## Follow-up outside PR1289

After source review, separately reconcile downstream AIV implementation/qualification for:

1. source-faithful T2.6 A/S/B equations;
2. `D/d >= 10` FLM1 behavior;
3. general material treatment;
4. non-Weldolet connections;
5. `Lf >= 0.5` LOF mapping;
6. independent multi-source AIV benchmark.

No merge is authorized by the instruction that created this PR.
