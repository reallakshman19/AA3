# PR1258 — LAFEA B01 translation-nullspace qualification recovery

HANDOVER_READINESS: READY_TO_CONTINUE
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL
MERGE_AUTHORITY: NOT_GRANTED

CURRENT_MAIN_LAST_CHECKED: b841975b20e547c721447e95527a995805d9761a
QUALIFICATION_CANDIDATE_HEAD: a66bbb9358bab9d1d689946c93247ddf3cbbefe1
REPORT_SYNC_MODE: REPORT_ONLY_AFTER_CANDIDATE
SOURCE_RECOVERY_PR: #1250
STACKED_CLEAN_B02_PR: #1259
CURRENT_STAGE: INTEGRATED_EXACT_HEAD_QUALIFICATION

## Handover in 60 seconds
PR #1258 is the clean current-main B01 successor. The current production candidate is frozen at `a66bbb9358bab9d1d689946c93247ddf3cbbefe1`; this report commit is documentation-only and must not replace that SHA as qualification authority.

Current candidate mechanics:
1. symmetric Jacobi-equilibrated sparse CG route;
2. no in-loop exact-residual restart of the Krylov state;
3. compensated original-coordinate residual observations during CG;
4. fixed 50,000-iteration cap unchanged;
5. terminal error-free-product/DD residual oracle;
6. at most three Jacobi-scaled minimum-residual Richardson cleanup steps, accepted only on strict independent residual reduction;
7. B-bar two-translation roundoff-bounded local-stiffness reconstruction;
8. T6 curved-element quality governed by high-order scaled Jacobian rather than the straight-corner angle surrogate;
9. formal-UI wording-only source-guard correction.

No engineering tolerance, benchmark expected value, constitutive coefficient, B-bar formula, load, mesh generator, mesh-quality threshold, release authority or trust root is changed.

## Governing RCA
For T6/L4/nu=0.4999/REGULAR, the prior decomposition recorded:
- reaction imbalance UX = -7.357309073086071e-8
- reaction imbalance UY = -4.7548454062962264e-8
- summed free residual UX = 8.688617895272798e-10
- summed free residual UY = 6.175070082734687e-10
- stored full-K translation-nullspace defect UX = -7.270422894133344e-8
- stored full-K translation-nullspace defect UY = -4.693094705468879e-8
- reaction limit = 2.427520890326532e-8

The local stiffness representation, not a looser acceptance threshold, therefore required correction.

## B-bar translation-nullspace mechanism
`src/core/local-continuum/planar-translation-nullspace.js` retains the independent/deformational block H and reconstructs the dependent UX/UY block/couplings:

K = [ R^T H R   -R^T H ]
    [   -H R        H   ]

Properties:
- only planar translations are enforced;
- rotation is not projected;
- correction must remain <= `4096 * Number.EPSILON * localDofCount` relative to stiffness scale;
- larger changes fail closed with `LAFEA_BBAR_TRANSLATION_NULLSPACE_CORRECTION_EXCEEDS_ROUNDOFF_ENVELOPE`;
- before/after nullspace action and correction magnitude are retained as evidence.

## Terminal sparse cleanup
The governing case later exposed an internal residual floor at approximately `3.3760443329811096e-9` against frozen target `1.5439099506948204e-9` after the unchanged 50,000-iteration cap.

The retained terminal mechanism:
- evaluates the capped solution with an error-free-product/DD CSR residual oracle;
- performs at most three minimum-residual corrections in Jacobi-scaled coordinates;
- chooses the one-dimensional residual-minimizing alpha;
- retains a candidate step only if the independent DD infinity residual strictly decreases;
- does not change A, b, iteration cap, convergence target or engineering tolerance.

## Rejected solver variants
Two portability assumptions were explicitly falsified by the focused Lamé gate and are not part of the candidate:
- unconditional exact-residual restart every 100 iterations (`36c37dbc...`) -> reaction-equilibrium failure;
- restart only when recursive residual crossed target but exact residual had not (`09465160...`) -> reaction-equilibrium failure.

Therefore exact residual may be observed during the equilibrated CG trajectory, but it must not restart that trajectory. Terminal DD/minimum-residual cleanup remains the bounded correction route.

## Exact candidate evidence — `a66bbb9358bab9d1d689946c93247ddf3cbbefe1`
Existing permanent workflows only; no workflow file changed.

Observed PASS:
- exact checkout / clean tree / syntax;
- focused B-bar Lamé convergence diagnostic including governing T6/L4 near-incompressible case;
- registered 54-case base matrix (reconfirmed in multiple chains);
- dedicated 270-case metamorphic qualification, run `32208643173`;
- frozen 16-case fail-closed qualification, run `32208643186`, after reconfirming base + metamorphic matrices.

Still executing at this report checkpoint:
- integrated B01 exact-head qualification, run `32208643212`, step `Execute integrated B01 qualification`.

Not yet claimable:
- final integrated B01 receipt PASS;
- final exact-head custody hardening for all newly authoritative helper blobs;
- merge eligibility.

## Main ancestry / changed-file boundary
At candidate freeze, current main is `b841975b20e547c721447e95527a995805d9761a` and `main...candidate` reports candidate ahead by 16, behind by 0, merge base exactly current main.

Exactly ten PR paths relative to main:
- `agents/PR1258_workreport.md`
- `agents/claims/PR1258.yaml`
- `agents/status/PR1258.yaml`
- `scripts/lafea-plane-strain-bbar-source-guard.mjs`
- `src/core/local-continuum/bbar-plane-strain.js`
- `src/core/local-continuum/jacobi-equilibrated-cg.js`
- `src/core/local-continuum/planar-translation-nullspace.js`
- `src/core/local-continuum/solver.js`
- `src/core/local-continuum/sparse-matrix.js`
- `src/workspace/lafea-analysis-mesh-quality.js`

No `.github/workflows/*` path is changed.

## Remaining qualification/harness work
If integrated B01 passes on candidate `a66bbb93...`:
1. harden `scripts/lafea-b01-final-qualification.mjs` custody to include the newly authoritative equilibrated solver, sparse DD oracle, translation-nullspace helper and T6 mesh-quality-domain file;
2. preserve current-main inactive/fallback solver behavior where it is not part of the new dispatch authority rather than carrying unrelated edits;
3. run one final exact-head qualification on the hardened candidate;
4. re-run relevant workbench/build collateral;
5. only then classify merge eligibility. Merge still requires explicit owner authorization.

If integrated B01 fails, inspect the first integrated subcheck and repair only that demonstrated failure. Do not widen any tolerance.

## B02 dependency
Clean B02D V2 promotion work is PR #1259 and remains stacked/draft. Experimental #1254 is diagnostic-only and non-promotable. B02 must not be merged or promoted before B01 has an independently qualified prerequisite head.

## Appendix A — next-agent qualification
A1 (20): derive the two-mode dependent-block reconstruction and prove TX/TY nullspace without using benchmark output.
A2 (20): explain why the roundoff envelope is a representation guard and not an engineering tolerance.
A3 (20): explain why both in-loop reliable-restart variants were rejected while terminal DD/minimum-residual cleanup remains admissible.
A4 (20): trace the exact candidate through 54/270/16/focused-Lame evidence and identify what integrated evidence is still missing.
A5 (20): define the final custody paths and prove B02/release/trust authority remains outside PR1258.

Takeover threshold: total >= 92/100 and every answer >= 17/20.
