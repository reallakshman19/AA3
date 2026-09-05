QUALIFICATION_PROTOCOL_VERSION: 3
CHAIN_ID: LAFEA3-B02-1646-TASK001
CANDIDATE_ID: chatgpt:bb7305ea-6150-422c-a0c0-3e7aa7a86b37
WORK_ITEM_KEY: github:reallaksh19/Advanced_Analysis#1646
TASK: TASK-001
QUALIFICATION_SCOPE_ID: QSCOPE-1646-TASK001-WORKBENCH_LIFECYCLE_CURRENTNESS
QUESTION_SET_SOURCE: github:reallaksh19/Advanced_Analysis#1646/Appendix-A + Appendix-B/B1
QUESTION_SET_ADMISSION_STATUS: PENDING_INDEPENDENT_ADMISSION
VERDICT: PENDING_INDEPENDENT_VERIFICATION
WRITE_AUTHORITY: READ_ONLY
QUALIFICATION_BASIS_HEAD: e29abec70e39e9d90dad040e527972c898b69562

# Candidate qualification — Appendix A + B1

This artifact records candidate reasoning only. It is not self-admission, self-verification, write authority, roadmap authority, or merge authority.

## Appendix A

### Q1 — summed gate versus per-DOF gate

At T6/L4, `freeMaximum = 1.26e-9` and the shared limit is `2.43e-8`, so the infinity-norm gate consumes `1.26e-9 / 2.43e-8 = 0.05185`, or 5.19% of its limit. The UY force-balance total is `3.53e-8 / 2.43e-8 = 1.4527`, or 145.3%. The gates use the same scalar tolerance but different functionals: the first bounds the largest individual free-DOF residual; the second bounds a signed sum of many residual contributions.

If a representative residual contribution has magnitude `epsilon`, coherent same-sign accumulation is bounded by `N*epsilon = O(N)`. For approximately independent zero-mean contributions, variance adds, so RMS accumulation is `sqrt(N)*sigma = O(sqrt(N))`. For `N = 70,954`, `sqrt(N) = 266.37`. The observed summed residual is `3.53e-8 / 1.26e-9 = 28.0` times the largest individual residual, far below coherent `N` scaling and much closer to cancellation/random-walk behavior.

The repair must tighten the solve rather than relax acceptance. Issue #1112 freezes tolerances before production observation and forbids LAFEA output from generating/calibrating tolerances. Relaxing the gate after observing failure would therefore mutate protected acceptance authority. Tightening the internal PCG target from `tol/10` to `tol/100` leaves the acceptance boundary unchanged and reduces solution error.

Using the observed `tol/10` aggregate ratio `q10 = 1.4527`, a tenfold tighter solve gives the first-order estimate `q100 ~= 0.14527`. Under conservative linear-in-N accumulation, exhaustion occurs at `N* ~= 70,954 / 0.14527 ~= 4.88e5` free DOF. Under random-walk accumulation the estimate is much larger, about `3.36e6` DOF. The conservative figure is only modestly above the frozen `maximumEstimatedDofs = 400,000`, so factor 100 repairs L4 but does not prove comfortable margin over the full 200,000-node/400,000-DOF envelope.

### Q2 — polar-cell triangulation diagnosis

A structured annular cell is symmetric about the sector bisector. With inner radius `r`, outer radius `R`, and sector angle `theta`, the two diagonal lengths are both `sqrt(r^2 + R^2 - 2*r*R*cos(theta))`. Reflection through the bisector maps one diagonal triangulation into the other. Therefore flipping the diagonal cannot change the multiset of triangle angles and cannot improve the minimum angle.

A minimum angle pinned near 9.7-9.9 degrees while the number of blocking triangles grows 52 -> 252 under refinement rules out an isolated coarse-cell accident and a resolution-limited defect. It implicates a dimensionless shape defect preserved by the refinement map: the radial/circumferential anisotropy of the polar cells.

For a quadrilateral, corner scaled Jacobian normalizes the determinant by edge lengths and is essentially `sin(theta)`; an orthogonal rectangle can therefore have SJ near 1 at large aspect ratio. Triangulating the same ~5.6:1 cell necessarily creates a small angle near `atan(1/5.6) ~= 10.1 deg`, so the triangle SJ is near `sin(10.1 deg) ~= 0.175`, below the 0.20 gate. Q8 can therefore pass the same anisotropic grid that T3/T6 reject.

### Q3 — late-frozen custody

`B02D-V2` was frozen after the manifest's original `definitionFreezeExactHead`. Recording its blob under `originalFrozenDefinitionGitBlobs` would falsely represent it as part of the original pre-observation freeze and would make the manifest's original-freeze byte-identity proposition materially false/misleading. That is a provenance defect because freeze timing determines whether a definition could have been selected in response to production output.

Byte custody and programme adoption are different. Byte custody pins exactly which V2 bytes were frozen and detects later mutation. Adoption decides which frozen definition binds the B02 production sequence and which receipts may count as programme evidence. If registration implied adoption, merely pinning V2 could silently replace failing V1 authority with passing V2 evidence.

To make `scope: MESH_POLICY_ONLY` enforceable, a checker must compare the actual superseded/amended payloads and whitelist only mesh-policy differences. Formulation, units, geometry, material, loads/BCs, global ladder/refinement ratio and caps, method applicability, probe/path identities, recovery/representation/units, hard acceptance thresholds, and authority prohibitions must remain identical. The checker must not rely only on declarative booleans such as `methodApplicabilityUnchanged` or `hardQualityThresholdsChanged`.

### Q4 — post-run flag is not currentness

Concrete stale sequence: run with source/canonical/mesh/solver identities `S1/C1/M1/K1`, obtain accepted execution `E1`, then change solver settings to `K2` without rerunning. A persistent post-run `currentAuthority=true` / `CURRENT_RESULT` flag would still describe `E1` as current even though its solver parent is `K1`, not `K2`.

That violates the frozen rule that `CURRENT_RESULT requires exact source, mesh, solver and execution parent identities`. Retained PASS receipts prove historical qualification only; after a governing edit they remain history and do not grant current authority.

A faithful implementation derives currentness by resolving the current source and canonical identities, a current mesh receipt parented to them, the current solver-config identity, and an execution whose recorded source/canonical/mesh/solver parents exactly equal those current identities. Recovery must in turn be parented to the execution and mesh; convergence evidence to recovery. Whenever an execution parent changes, `executionHash` must be recomputed rather than carried forward, and downstream hashes consequently change.

### Q5 — evidence UI authority

`NOT_RUN` is absence of execution evidence; `PASS` is positive qualifying evidence. Styling the former like the latter changes the authority state communicated to reviewers and violates the issue ledger rule keeping `PASS`, `FAIL`, `NOT_RUN`, and `NOT_APPLICABLE` distinct.

A low numeric GCI does not authorize acceptance for `PRE_ASYMPTOTIC`. The frozen B02E policy requires explicit classification and states that pre-asymptotic sequences may not claim GCI acceptance. The panel must therefore show GCI together with classification, and should also show observed order and Richardson value; a pre-asymptotic classification must render as not accepted even if the raw GCI is below a nominal threshold.

A read-only panel is authority-safe only if authority flow is one-way: immutable retained receipts -> presentation projection. Display state must never become an authority parent. A silent failure would be UI code that computes an all-green view and writes `benchmarkQualified`, `currentAuthority`, or a release state back into the engineering store, or a release selector that consumes presenter-derived status instead of governed receipts.

## Appendix B / B1 — TASK-001

### B1.1 — propagating a MATERIAL edit through the declared parent chain

A MATERIAL edit creates a new `sourceRevisionHash`. By the declared parent graph, `canonicalModelHash` must then be recomputed because it is parented to source; `meshRevisionHash` must be recomputed because it is parented to source and canonical; `solverConfigHash` must be recomputed because it is parented directly to source; `executionHash` must be recomputed because all four execution parents include identities that changed; `recoveryHash` must be recomputed because execution and mesh changed; and `convergenceEvidenceHash` must be recomputed because recovery changed. Therefore **none of the seven receipt hashes may legitimately be carried forward**. Payload objects may sometimes be reused, but their custody receipts/hashes cannot be silently reused across changed parents.

`meshObjectMayBeReused: true` means the geometry/connectivity object can be reused when material changes do not alter geometry. It does not mean the old mesh receipt stays current. The new source/canonical identities require a new mesh receipt binding the identical mesh content to those current parents. Keeping the old receipt would break exact parent provenance: an auditor could no longer prove which source/canonical revision the current mesh binding belongs to, and stale history could silently masquerade as current custody.

GEOMETRY differs because a geometry edit changes the physical domain from which nodes/connectivity are discretized. Reusing the old mesh object would no longer be a discretization of the current geometry, so the matrix correctly sets `meshObjectMayBeReused: false`. MATERIAL changes constitutive data while leaving geometry/topology potentially unchanged, permitting object reuse only through explicit rebinding.

### B1.2 — current-execution versus accepted-execution versus mesh-custody failure

A concrete `QUALIFIED` + `ACCEPTED` but stale state is: execution `E1` was accepted against mesh hash `M1`; the user then changes mesh settings and produces current mesh receipt `M2` without rerunning. The historical execution remains qualified/accepted as history, but `computationalState` must be `STALE_RESULT` because the current mesh identity diverges from the execution parent.

The probe compares `analysisMeshCustodyProjection.meshHash` to `execution.meshHash` because it must verify the actual analysis mesh whose results are being recovered/displayed is the exact mesh consumed by that execution. Comparing only with the currently selected mesh profile would compare intent/configuration, not the concrete mesh artifact, and could miss an execution result attached to an old mesh instance generated from the same profile.

`REJECTED` is reachable without staleness when all current parent identities match but the current run itself is rejected—for example solver non-convergence, an invalid Jacobian/orientation, or another fail-closed execution condition under the current source/mesh/solver state. That result is current-but-rejected, not a once-valid result made obsolete by later edits. Collapsing `REJECTED` into `STALE_RESULT` erases whether the current configuration was actually attempted and failed, which is an authority and diagnostic defect.

### B1.3 — orthogonality of qualification and computational currentness

All six combinations are reachable because qualification and currentness answer different questions:

- `NOT_EVALUATED + CURRENT_RESULT`: current accepted engineering result exists; benchmark qualification has not yet been run.
- `NOT_EVALUATED + STALE_RESULT`: an unevaluated result existed, then a governing edit made it stale.
- `FAIL + CURRENT_RESULT`: the current result was evaluated and fails the benchmark/qualification criterion.
- `FAIL + STALE_RESULT`: a failed qualification receipt is retained after a governing edit makes its underlying result stale.
- `PASS + CURRENT_RESULT`: the current result is evaluated, passes qualification, and all current parents match.
- `PASS + STALE_RESULT`: a historical PASS is retained after a governing edit but is no longer current authority.

Deleting stale receipts destroys the audit trail needed to reconstruct what exact source/canonical/mesh/solver parents produced a historical PASS or FAIL, when authority was revoked, whether invalidation rules behaved correctly, and whether a later result is a genuine rerun or an illicit promotion/backdating of old evidence. Retention is therefore necessary for reproducible custody even though retained history cannot itself grant current authority.

## Candidate safe-patch boundary

If independently admitted and verified, the first legitimate implementation boundary is `WORKBENCH_LIFECYCLE_CURRENTNESS`: derive currentness from immutable source/canonical/mesh/solver/execution parent identities and edit invalidation semantics in the production workbench state. No acceptance tolerance, solver formulation, mesh policy, frozen benchmark/oracle, recovery convention, workflow file, benchmark authority, release authority, or temperature authority may change. A post-run boolean assignment is explicitly outside the safe patch boundary.
