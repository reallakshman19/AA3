# WIP EI P0 source correction — recovery report

## Recovery header

- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: RECOVERABLE_WIP`
- `WORK_INTENT: IMPLEMENT`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `MUTATION_AUTHORITY: WRITE_ALLOWED`
- `BRANCH: agent/ei-p0-source-correction-20260820`
- `MAIN_HEAD_LAST_CHECKED: 782683e7355281e95e5319dcad7f8a5644710d1d`
- `GROUNDING_SOURCE: merged PR1288 / exact EI PDF blob 9d3eccc56429411e17c07a579bdebbd13cb0bdc5`
- `CURRENT_STAGE: P0_SOURCE_TRANSCRIPTION_CORRECTION`
- `MERGE_AUTHORITY: NOT_GRANTED`
- `EXACT_NEXT_ACTION: snapshot exact target blobs, correct independently reproduced FIT/AIV formulas, quarantine unresolved T2.6/P1 transcriptions, add focused source-master validation, then open a draft PR`

Repository: `reallaksh19/Advanced_Analysis`  
Source upload: merged PR `#1288`  
Base: `main@782683e7355281e95e5319dcad7f8a5644710d1d`

## Handover in 60 seconds

PR1288 supplied the missing EI source packs plus `EI - AVIFF Guidelines 2nd Edition.pdf`. The uploaded PDF blob is exactly `9d3eccc56429411e17c07a579bdebbd13cb0bdc5`, matching the controlled EI main-guidance blob already pinned by `3D_Converters` FIT/AIV source evidence.

Audit found multiple engineering-critical transcription defects in the newly merged master data. This WIP corrects only formulas independently reproduced from the controlled EI worked examples / official publisher errata / existing source-pinned production evidence. It must not invent unresolved AIV T2.6 A/S/B equations or qualitative scoring systems.

## Confirmed defects

- `ISS-001 AIV_SOURCE_PWL_EXPONENT`: `T2-5_flowchart.yaml` uses `W^0.2`; EI D.2.3 and the controlled AIV kernel reproduce 164.7/159.4 dB only with `W^2`.
- `ISS-002 AIV_ATTENUATION_FORM`: file uses `L/(60D)` and says units are interchangeable; EI D.2.3 explicitly evaluates `60 * 0.8 m / 154 mm = 0.312 dB`.
- `ISS-003 FIT_GAS_FVF`: `T2-2_source_reference.yaml` uses `1/(mu*1000)`; EI D.2 gas examples and qualified FIT production use `sqrt(mu/0.001 Pa.s)`.
- `ISS-004 FIT_GAS_LOF`: file divides by FVF; controlled FIT method uses `rhoV2 * FVF / Fv` for gas, while liquid/multiphase use `rhoV2/Fv`.
- `ISS-005 AIV_T26_LOG10N`: uploaded polynomial does not reproduce published D.2.3 `B=152.207 -> log10N=9.9026`. Official EI errata equation does.
- `ISS-006 AIV_T26_ASB`: uploaded A/S/B formulas do not reproduce D.2.3 and contradict the existing controlled qualification state, which explicitly keeps A/S/B unrederived pending human T2.6 reconciliation.
- `ISS-007 AIV_FLM1_SAMPLES`: governing FLM1 equation is consistent with the controlled method, but several CSV sample values do not satisfy that equation.
- `ISS-008 AIV_FATIGUE_FACTOR`: uploaded `Lf = 1.30 - 0.1303 ln(N)` cannot reproduce D.2.3 `N=1.95e9 -> Lf≈0.31`; controlled qualification uses `Lf = 3.1 - 0.1303 ln(N)`.
- `ISS-009 AIV_MATERIAL_MODIFIER`: uploaded FLM3-as-N-multiplier abstraction is not qualified against direct T2.6 source; quarantine until reconciled.
- `ISS-010 P1_IDENTIFICATION_SYNTHESIS`: uploaded T1/P1 files introduce numeric scores/multipliers and inferred thresholds not present in the worked-example transcription; they must not be treated as governing EI authority.

## Known-good PR1288 data to preserve

- `EI-P0-FIT/T2-1_support_arrangement.csv` span boundaries match the qualified FIT implementation.
- `EI-P0-FIT/T2-2_fv_coefficients.csv` correlation families match the qualified FIT implementation.
- AIV FLM1 formula itself is retained, but generated/digitized samples require correction and provenance labeling.
- AIV FLM2 formula is retained; sample rows should be regenerated from the formula if retained.

## Authority invariants

- The uploaded PDF is governing source evidence; derived YAML/CSV is not automatically authoritative merely because it is present in the repo.
- No unsourced EI threshold, coefficient, scoring algorithm, applicability rule, or disposition may be invented.
- AIV A/S/B remain `UNRESOLVED_PENDING_CONTROLLED_T2_6_HUMAN_RECONCILIATION`.
- P1 T1 qualitative files remain `QUARANTINED_NOT_ENGINEERING_AUTHORITY` until source-faithful transcription is completed.
- This WIP changes no `3D_Converters` production code and grants no new screening/design authority.

## Validation plan

Focused source-master check will independently verify:

1. FIT FVF: `mu=2e-5 -> sqrt(0.02)=0.141421...`; `mu=1e-5 -> 0.1`.
2. FIT T2-2 medium-stiff coefficients reproduce D.2 worked-example alpha/beta/Fv anchors.
3. AIV source PWL reproduces relief `164.7 dB` and recycle `159.4 dB` to displayed precision.
4. AIV attenuation `60*0.8/154 = 0.311688... dB` and point PWL ≈ `164.4 dB`.
5. Official errata `B=152.207 -> log10N≈9.9026`, `N≈7.99e9`.
6. FLM2 at D.2.3 point PWL ≈ `0.2009`.
7. `Lf = 3.1 - 0.1303 ln(1.95e9) ≈ 0.31` and final LOF branch = `0.29`.
8. FLM1 generated samples satisfy the retained formula and retain the published-vs-recalculated D.2.3 discrepancy as an open reconciliation item.
9. Quarantined P1/T2.6 unresolved files visibly deny engineering authority.

## Coordination

Active claims inspected at base: PR1255 (LAFEA UI), PR1263 (EMP1), PR1268; none claim `docs/EI data/**`. Open-PR search found no EI-data authority conflict. `COORDINATION_STATE = SAFE` for this bounded source correction.

## Validation ledger

| Check | Status | Observation / oracle |
|---|---|---|
| PR1288/main grounding | PASS | GitHub live state |
| uploaded EI PDF identity | PASS | exact Git blob matches controlled FIT/AIV source pin |
| PR1288 comments/reviews | PASS | no PR comments observed |
| P0 formula diagnosis | PASS | source inspection + independent worked-example reproduction |
| focused correction regression | NOT_RUN | not authored yet |
| direct PDF visual page inspection in this transport | NOT_RUN | binary PDF not exposed by connector/web screenshot path |
| merge | NOT_AUTHORIZED | owner has not granted merge for follow-on PR |

## Appendix A / implementation authorization

This is a new WIP, not takeover of an existing engineering-critical PR. Implementation authority is bounded to the owner-approved pending task and the correction plan above. Source changes must be falsifiable against the pinned EI evidence and must fail closed on unresolved formula authority.
