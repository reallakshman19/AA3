# QS-ADV-BM-MESH-1652-0004 — B02D producer-binding separation refresh

QUESTION_SET_ID: QS-ADV-BM-MESH-1652-0004
QUALIFICATION_PROFILE: FEA
QUALIFICATION_PROFILE_VERSION: 2
QUALIFICATION_SCOPE_ID: QSCOPE-ADV-BM-MESH-1652-PRODUCER-MESH-QUALIFICATION
SUPERSEDES: QS-ADV-BM-MESH-1652-0003
TRIGGER: Owner post-LEG-004 execution passed all focused curved-shell qualifiers and the aggregate determinism gate, then exposed a stale B02D-V1 qualification dependency inside `scripts/lafea-mesh-producer-binding-check.mjs`.
QUESTION_DISPLAY: HIDE

## Q1 — Production trace / binding dependency

`npm run check:lafea-meshing` reaches `scripts/lafea-mesh-producer-binding-check.mjs` only after determinism passes. That producer-binding checker currently imports `scripts/lafea-b02d-probe-stable-polar-mesh-check.mjs`, which is also a standalone historical B02 production-sequence gate. Current production binding separately supports explicit B02D-V2 profile selection through `b02dProfileIdentityV2()` and `B02D-FROZEN-POLAR-V2`; `scripts/lafea-b02d-v2-producer-binding-check.mjs` is the focused check for that binding boundary and also verifies that V1 selection remains present.

Falsifier: treating the historical B02D-V1 benchmark qualifier as equivalent to the current focused producer-binding contract.

## Q2 — Failure isolation

Owner execution on PR head `72237918e4232c742ef82219dabb84303b08c22c` passed topology, healing, quality, convergence, level-count, T6, Q8, mapped mesh, panel, smoothing, all three curved-shell imports and the final determinism assertions. Producer-binding then stopped in the imported historical B02D-V1 checker at `T3/L1`: production evidence was `BLOCK` while that checker expected `PASS`.

The repository's frozen B02D-V2 definition explicitly records the reason for supersession as `FROZEN_V1_T3_COARSE_MESH_HARD_QUALITY_BLOCK` with observed V1 minimum angle `9.736093°`, scaled Jacobian `0.169110`, and maximum aspect ratio `5.911`.

Falsifier: weakening production mesh-quality thresholds or changing the V1/V2 generators to force V1 T3/L1 to PASS.

## Q3 — Authority / invariant separation

Preserve these boundaries:

- historical B02D-V1 remains frozen and may remain fail-closed; do not make its standalone benchmark gate green from BM-MESH;
- B02D-V2 remains explicit opt-in and does not become the default producer route;
- B02 numerical/response, release, trust, and temperature authority remain false;
- production producer binding, mesh-quality thresholds/classification, V1/V2 mesh generators, benchmark definitions/oracles, convergence, workflows and roadmaps are not mutated;
- the BM-MESH governance gate may verify the focused current producer-binding contract without executing a superseded standalone B02 benchmark gate.

## Q4 — Independent numerical witness

The frozen V1 observation is independently inconsistent with current hard quality limits used by BM-MESH:

- `0.169110 < 0.2` scaled-Jacobian block floor;
- `9.736093° < 10°` minimum-angle block floor;
- `5.911` aspect ratio is below the aspect-ratio block limit of `10`, so it does not rescue the element.

Therefore the correct V1 T3/L1 production disposition is fail-closed `BLOCK`; a blanket `PASS` expectation is invalid without changing protected thresholds.

## Q5 — Minimal safe repair

Allowed material scope is limited to `scripts/lafea-mesh-producer-binding-check.mjs`.

Replace the imported historical `lafea-b02d-probe-stable-polar-mesh-check.mjs` dependency with the focused `lafea-b02d-v2-producer-binding-check.mjs`. Leave the historical V1 checker unchanged so the separate B02 production sequence preserves its own fail-closed state. Do not alter any `src/`, `validation/`, package script, threshold, generator, solver, oracle, convergence, workflow, roadmap, release, trust or temperature authority.
