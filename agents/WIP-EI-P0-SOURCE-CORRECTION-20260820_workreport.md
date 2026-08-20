# WIP EI P0 source correction — recovery report

## Recovery header

- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: RECOVERABLE_WIP`
- `WORK_INTENT: IMPLEMENT`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `MUTATION_AUTHORITY: WRITE_ALLOWED`
- `BRANCH: agent/ei-p0-source-correction-20260820`
- `MAIN_HEAD_LAST_CHECKED: 782683e7355281e95e5319dcad7f8a5644710d1d`
- `GROUNDING_SOURCE: merged PR1288 / EI PDF blob 9d3eccc56429411e17c07a579bdebbd13cb0bdc5`
- `CURRENT_STAGE: READY_FOR_DRAFT_PR_RECONCILIATION`
- `MERGE_AUTHORITY: NOT_GRANTED`
- `EXACT_NEXT_ACTION: re-ground live main, open draft corrective PR, migrate custody, reconcile hosted state`

Repository: `reallaksh19/Advanced_Analysis`  
Source upload: merged PR `#1288`  
Base: `main@782683e7355281e95e5319dcad7f8a5644710d1d`

## Handover in 60 seconds

PR1288 supplied the requested FIT/AIV/T1 source packs, but its derived CSV/YAML contained several engineering-critical transcription errors. This WIP corrects only formulas independently reproduced from the controlled EI worked examples, the official Energy Institute errata, and the already source-pinned FIT/AIV evidence chain. It deliberately reduces authority where the direct T2.6/T1 source has not been reconciled.

The uploaded PDF is the exact controlled source already pinned elsewhere:

```text
docs/EI data/EI - AVIFF Guidelines 2nd Edition.pdf
Git blob 9d3eccc56429411e17c07a579bdebbd13cb0bdc5
```

## Implemented corrections

### FIT T2.2

`EI-P0-FIT/T2-2_source_reference.yaml`

Corrected:

```text
Gas FVF = sqrt(mu_gas / 0.001 Pa.s)
Gas LOF = rho_v2 * FVF / Fv
Liquid/multiphase LOF = rho_v2 / Fv
```

These reproduce the D2 gas FVF examples (`2e-5 Pa.s -> 0.1414`, `1e-5 Pa.s -> 0.1`) and match the qualified bounded FIT implementation.

Untouched known-good masters:

- `T2-1_support_arrangement.csv`
- `T2-2_fv_coefficients.csv`

The focused gate independently checks the Medium-Stiff D2 6-inch anchor (`alpha≈346183`, `beta≈-0.9341`, `Fv≈18022`).

### AIV T2.5

`EI-P0-AIV/T2-5_flowchart.yaml`

Corrected source PWL to:

```text
PWL = 10 log10[ W^2 ((P1-P2)/P1)^3.6 (Te/Mw)^1.2 ] + 126.1 + SFF
```

This reproduces D2.3:

```text
Relief  ≈ 164.7 dB
Recycle ≈ 159.4 dB
```

Corrected spatial attenuation to the empirical mixed-unit relation:

```text
attenuation_dB = 60 * L_m / Dint_mm
```

D2.3 anchor:

```text
60 * 0.8 / 154 = 0.311688... dB
164.7 - 0.311688... = 164.388... dB -> published 164.4 dB
```

The prior `L/(60D)` transcription was rejected.

### AIV T2.6

`EI-P0-AIV/T2-6_flowchart.yaml`

The uploaded A/S/B equations were removed from engineering authority because they do not reproduce the published D2.3 anchors:

```text
A = 0.93989
S = 68.229
B = 152.207
```

A/S/B remain:

`UNRESOLVED_PENDING_CONTROLLED_T2_6_HUMAN_RECONCILIATION`

The cycles-to-failure equation is now the official Energy Institute errata relation:

```text
log10(N) = 470711.5155
           - 63075.1242 log10(B)
           + 183685.4368 / sqrt(B)
           - 575094.3273 / B^0.1
```

For `B=152.207` it reproduces:

```text
log10(N) = 9.90256787...
N = 7.990388e9
```

matching EI's displayed `9.9026 / 7.99E9`.

Corrected fatigue factor:

```text
Lf = 3.1 - 0.1303 ln(N)
```

For `N=1.95E9`, `Lf≈0.3127`, consistent with published `0.31`. The PR1288 `1.30` constant was rejected.

### AIV modifiers

`T2-6_diameter_ratio_modifier.csv`
- regenerated all `D/d < 10` samples from the retained FLM1 formula;
- retained the published-vs-recalculated D2.3 discrepancy visibly (`1.2133` published vs `1.210975819...` recalculated);
- `D/d >= 10` is now unresolved rather than silently blessed from the upload.

`T2-6_connection_modifier.csv`
- retains only the D2.3-reconciled Weldolet FLM2 path;
- sample values are regenerated from the formula;
- other connection types are not promoted.

`T2-6_material_modifier.csv`
- PR1288's general FLM3-on-N abstraction is quarantined;
- D2.3 non-duplex/Lf statement is retained as worked-example evidence only.

`T2-7_method_source_register.yaml`
- now defines package-level authority and unresolved branches;
- fixes attenuation;
- preserves published flowchart labels instead of inventing an EI identifier to resolve numbering collisions.

## P1 qualitative pack disposition

The existing PR1288 files themselves were left byte-for-byte intact as evidence, but the directory now contains:

`EI-P1-IDENTIFICATION/AUTHORITY_STATUS.yaml`

with:

`QUARANTINED_NOT_ENGINEERING_AUTHORITY`

Reason: PR1288 introduced numeric T1 scoring/multipliers and some altered criteria that are not established by the source-faithful worked-example transcription. These files may not drive applicability, completeness, disposition, or release qualification until direct T1/Chapter-3 transcription is completed.

## Global authority map

Added:

`docs/EI data/EI_SOURCE_AUTHORITY_STATUS.md`

Updated:

`docs/EI data/README.md`

The large `EI_AVIFF_Complete_Master_Register.md` is explicitly classified as a **reference compilation, not a trust root**. It was not rewritten in this slice.

## Rollback evidence

Before editing, immutable original Git blob IDs were recorded under:

`.backups/connector-20260820-ei-p0-source-correction/`

Native backup tooling was not run because this is a connector-only environment; the Git blob manifest is rollback evidence, not a native-backup PASS.

## Validation

Authored:

`scripts/ei-aviff-source-master-p0-check.mjs`

Exact branch-byte validation:

```text
node --check scripts/ei-aviff-source-master-p0-check.mjs   PASS
node scripts/ei-aviff-source-master-p0-check.mjs           PASS
```

Gate output:

```json
{
  "schema": "EiAviffSourceMasterP0Check.v1",
  "status": "PASS",
  "checks": [
    "FIT",
    "AIV_T2_5",
    "AIV_T2_6_VERIFIED_SUBSET",
    "AUTHORITY_QUARANTINE"
  ],
  "designAuthority": false,
  "sourcePromotionBeyondVerifiedSubset": false
}
```

The local reconstruction was hash-checked against the GitHub blobs for every changed/source file consumed by the gate. The untouched `T2-2_fv_coefficients.csv` required preserving its original CRLF bytes and then matched GitHub blob `9bd6cccadd84f82ab4b225496970a711e92b7f65` exactly.

### Validation truth

| Check | Status |
|---|---|
| PR1288/current-main grounding | PASS |
| EI PDF Git-blob identity | PASS |
| confirmed formula diagnosis | PASS |
| pre-edit immutable rollback manifest | PASS |
| exact changed/source blob reconstruction | PASS |
| focused source-master gate | PASS |
| direct visual PDF page inspection through current transport | NOT_RUN / TRANSPORT_BLOCKED |
| native repository checkout | NOT_RUN / DNS_BLOCKED |
| production calculator regression | NOT_APPLICABLE — no production code changed |
| screening/design authority promotion | NOT_APPLICABLE / explicitly false |
| merge | NOT_AUTHORIZED |

## Coordination

Live claims inspected before mutation did not overlap `docs/EI data/**`. Current scope is source transcription + authority quarantine only; it does not modify LAFEA/EMP1 mechanics or any production calculator.

## Follow-up exposed by this correction

Do **not** patch cross-repo production code as part of this PR. After this source correction is reviewed, separately reconcile `3D_Converters` AIV production behavior against the now-explicit source gaps—especially:

- T2.6 A/S/B human transcription;
- `D/d >= 10` FLM1 branch;
- general material treatment;
- non-Weldolet connection handling;
- higher `Lf` LOF mapping;
- independent multi-source AIV benchmark.

Those are follow-on qualification tasks, not authority granted by this source-data correction.
