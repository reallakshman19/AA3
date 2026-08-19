# PR1259 — LAFEA B02D V2 clean qualification successor

HANDOVER_READINESS: IN_PROGRESS
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL
MERGE_AUTHORITY: NOT_GRANTED

BASE_PR: #1258
BASE_BRANCH: agent/lafea-b01-nullspace-qualification-20260819
BASE_HEAD_AT_ALLOCATION: 0140ef36032b1e86aee83ace134b44206840546d
SOURCE_RECOVERY_PR: #1254
INITIAL_PRODUCTION_HEAD: 7e057ee2ca3db96209c8a7633e3c1d9c5b6ed348
CURRENT_STAGE: DIAGNOSTIC_RESPONSE_REPLAY

## Mission
Promote the prospectively frozen B02D V2 mesh only after clean source custody and independent response qualification on top of B01 PR #1258. Preserve V1 as the registered/default historical route until V2 qualification is complete.

## Clean recovery boundary
Exact V2 source blobs transplanted from #1254 head `643462195533dd777ced2a27af1b3cdb66020121`:
- `src/core/lafea-meshing/b02d-probe-stable-polar-mesh-v2.js` blob `3f69405b41145b1fda103d426d2ac25bda1f22ae`
- `scripts/lafea-b02d-v2-preobservation-quality-check.mjs` blob `ba5e793cb92bd5b3f3fe1a269bb537973598998f`
- `validation/lafea-b02-definitions/B02D-lug-pinhole-v2.json` blob `2a4bbfa79dafdbfe17484b46d5ae76ede42ad298`

Explicitly excluded:
- all ten #1254 temporary workflow files;
- rejected sparse/defect/coarse-correction experiments;
- any response-driven change to the frozen V2 geometry/policy.

## Frozen V2 design
- state: FROZEN_BEFORE_PRODUCTION_OBSERVATION
- production output used to choose definition: false
- annulus: Ri=20 mm, Ro=100 mm, thickness=10 mm
- material: E=200000 MPa, nu=0.3
- levels h=[40,20,10,5] mm, ratio=2
- radial anchors [27,33,47,73,87] mm, protected 60 mm, phase 0.35, 6 base divisions, clearance 0.30
- angular anchors [17,67,83] deg, protected [90,180,270] deg, phase 0.65, 20 base divisions, clearance 0.32
- load window radial 20..60 mm at 0 deg; restraint at 180 deg
- T3/T6/Q8
- no refinementFeatureIds
- no hard mesh-quality threshold change.

Historical pre-observation worst governing T3/L2 metrics:
- minimum scaled Jacobian = 0.2048815995989261
- minimum angle = 11.822568091471519 deg
- maximum aspect ratio = 4.877985269275712
- blocking elements = 0

## Product binding change
`src/workspace/lafea-mesh-producer-binding.js` now recognizes a second, explicit V2-only selector:
- prefix `B02D_PROBE_STABLE_POLAR_V2_QUALIFIED`
- source revision `B02D-FROZEN-POLAR-V2`
- generator `generateLafeaB02dProbeStablePolarMeshV2`

V1 constants, V1 profile identity, V1 source revision and V1 generator branch remain present and default. V2 cannot be selected by a V1 profile and still requires empty refinement features plus the exact 20/100 mm annulus geometry.

## Historical response blocker
Old first V2 production-response replay on #1254 passed pre-observation qualification, then failed at:
`B02D T6/L4 -> NUMERICAL_FAILURE -> REACTION_EQUILIBRIUM_FAILURE`.

PR #1258 specifically addresses the stored B-bar translational nullspace/reaction-equilibrium error class and has already passed focused Lamé plus 54/270/16 B01 matrices at its production qualification head; its integrated final receipt was still running at PR1259 allocation.

## Diagnostic execution strategy
No workflow may be added here without explicit owner permission. #1254 already contains temporary V2 execution workflows, so it is retained as a non-promotable diagnostic carrier and pinned to the exact #1258 B01 candidate bytes. Any green #1254 result is diagnostic evidence only; PR1259 remains the clean promotion carrier.

## Protected invariants
- V1 remains historical/default until explicit later promotion;
- no mesh-quality threshold changes;
- no B02 response acceptance threshold changes;
- no benchmark expected-value changes;
- no release authority;
- no lifecycle/trust-root authority;
- no B01 numerical changes in PR1259;
- no `.github/workflows/*` changes.

## Acceptance before promotion eligibility
1. exact frozen V2 pre-observation quality/determinism for T3/T6/Q8 x L1-L4;
2. production response accepted for T6/Q8 L1-L4 and T3 control path;
3. force and moment equilibrium within frozen acceptance;
4. reaction moment within frozen acceptance;
5. energy reconstruction within frozen acceptance;
6. fixed probes and fixed path mapping/custody valid;
7. T6/Q8 energy/probe convergence and GCI pass frozen rules;
8. B01 #1258 fully qualified as prerequisite;
9. V1 preservation source guard;
10. exact candidate execution route available without unauthorized workflow mutation.

## Current blocker
Clean PR1259 has no permitted permanent workflow that directly invokes the new V2 response route. Diagnostic execution is therefore being performed in non-promotable #1254 using its pre-existing workflows. Exact PR1259 response execution remains NOT_RUN until an existing allowed route can exercise it or owner grants workflow authority.

## Exact next action
Observe #1254 diagnostic V2 production response with #1258 B01 bytes. If it passes, retain evidence, add a clean V2 qualification script/route to PR1259, and seek an existing workflow execution path without changing `.github/workflows/*`; otherwise perform RCA without changing frozen V2 definition or thresholds.

## Appendix A — next-agent qualification
A1 (20): prove V2 was frozen before response observation and identify the exact design change relative to V1 without using response results.
A2 (20): trace V2 profile identity through producer selection and prove V1 cannot select V2 accidentally.
A3 (20): explain why #1254 may supply diagnostic evidence but is not a promotion carrier.
A4 (20): if T6/L4 fails again, decompose reaction equilibrium versus free residual and stored stiffness action before changing any method.
A5 (20): define the promotion gate that keeps release/trust authority false even after numerical qualification.

Takeover threshold: total >= 92/100 and every answer >= 17/20.
