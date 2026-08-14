# WIP-L3V3-20260814 — LAFEA.3 Mesh Workspace v3 Vertical Slice

## Recovery header

- WORK_INTENT: IMPLEMENT
- REPOSITORY_STATE: NEW_PR_REQUIRED
- MUTATION_AUTHORITY: WRITE_ALLOWED (explicit owner request: start LAFEA.3 v3 vertical slice)
- CRITICALITY: ENGINEERING_CRITICAL
- TAKEOVER_AUTHORITY: NOT_APPLICABLE — new WIP from current main; no inherited implementation PR
- SOURCE_TASK: Advanced_Analysis issue #1119 follow-on
- PREDECESSOR: PR #1126 merged; Mesh Workspace v3 foundation
- BRANCH: `agent/lafea3-v3-vertical-slice`
- LIVE_MAIN: `9e3cc21760f14f2dd65e27c8e48a3e74a2cb1e08`
- REPORT_BASIS_HEAD: `9e3cc21760f14f2dd65e27c8e48a3e74a2cb1e08`
- PR: NONE

## Handover in 60 seconds

Mission: wire the existing qualified LAFEA.3 planar continuum mesher into the merged Mesh Workspace v3 contracts without replacing the numerical kernel. Produce real v3 dependency, adapter, mesh identity, topology/domain/high-order validation, artifact lifecycle and CAS custody from the actual generated T3/T6/Q8 mesh. Keep trusted authority fail-closed: no v3 CURRENT_PASS or solver execution authority is permitted until an independently verified authority receipt exists.

Current state: repository grounding complete; no production file has yet been changed on this branch. Active B02 PRs own run/execution/currentness/API files, so this WIP is intentionally constrained to the mesh-generation seam and new additive v3 modules/checks.

EXACT_NEXT_ACTION: add a self-contained LAFEA.3 v3 candidate builder and adversarial checker; integrate its retained candidate into `lafea-workbench-mesh-generation-state.js` only. Do not edit run/execution/currentness/API/workflow files.

## Live ground truth

- Default/base branch: `main`
- Main/base SHA at grounding: `9e3cc21760f14f2dd65e27c8e48a3e74a2cb1e08`
- Working branch: `agent/lafea3-v3-vertical-slice`
- Branch head at grounding: same as main; 0 implementation commits ahead
- Merge base: current main SHA above
- Source task: issue #1119 architecture follow-on, owner explicitly requested the LAFEA.3 v3 end-to-end slice
- Repository policy: root `AGENTS.md` + `reallaksh19/Common/skills/engineering-pr-delivery/SKILL.md`
- `agents/MASTER_INDEX.md`: absent
- `agents/status/`: absent
- `agents/claims/`: absent

## Coordination / overlap

### PR #1128 — AUTO MODE policy
- Exact/path overlap: none with intended production files
- Authority overlap: policy only
- Classification: SAFE

### PR #1122 — B02 G2 currentness custody
- Changed production paths include `lafea-workbench-orchestrator-store.js`, readiness/evidence/currentness
- Classification: COORDINATION_REQUIRED if this WIP touches orchestrator store/currentness. This WIP will not touch those files in the first slice.

### PR #1123 — B02 G3 run transaction / solver custody
- Changed production paths include `lafea-continuum-authoritative-workbench-run.js`, `lafea-workbench-domain-first-run-actions.js`, execution state and runtime diagnostics
- Engineering authority overlap: exact authoritative run/result boundary
- Classification: BLOCKED_BY_ACTIVE_CLAIM for v3 solver dispatch/result integration. This WIP will not touch those files until the stack resolves or owner coordinates explicitly.

### PR #1124 — B02 G4 physical probes/recovery
- Changed production path includes `lafea-workbench-orchestrator-api.js` and recovery/convergence helpers
- Classification: COORDINATION_REQUIRED for public API changes. This WIP will not touch orchestrator API in the first slice.

### PR #1125 — B02A-E definition freeze
- Benchmark/convergence authority only; no intended benchmark/tolerance changes here
- Classification: SAFE provided this WIP does not modify benchmark definitions/convergence acceptance.

### PR #1118 — visible workbench UI
- UI/controller paths only; no mesh-generation-state ownership
- Classification: SAFE for the non-UI mesh-generation slice.

## Mission / scope / acceptance

### In scope now
1. Derive v3 semantic mesh dependency from retained current LAFEA.3 domain/geometry/profile.
2. Bind LAFEA.3 v3 continuum adapter capability/payload.
3. Reuse the existing qualified v2 producer output as the numerical mesh generation engine.
4. Derive v3 numerical/artifact mesh identities from the actual retained mesh.
5. Run global topology qualification.
6. Run independent domain/feature conformance evidence using analytic geometry authority and actual generated mesh.
7. Run full-domain T6/Q8 Jacobian certification where applicable.
8. Seal required v3 validation bundle and v3 mesh evidence.
9. Exercise quarantine -> validated -> retained storage lifecycle.
10. Retain the candidate through v3 CAS as `CURRENT_BLOCK` pending trusted authority.
11. Expose the retained v3 candidate in mesh-generation state, without changing existing v2 run authority.
12. Add adversarial executable checks for T3/T6/Q8 and stale/tamper/fail-closed cases.

### Explicitly deferred / blocked by active claims
- changing authoritative `run()` or domain-first execution state
- public orchestrator API mutation
- production result publication/recovery/currentness changes
- claiming v3 CURRENT_PASS without trusted signature verification
- client-side authority issuance
- workflow YAML changes
- benchmark/tolerance/probe/convergence-definition changes

## Active issues / risks / decisions / questions

### DEC-001 — numerical kernel reuse
The existing LAFEA.3 v2 producer/solver remain the numerical computation authority. V3 wraps identity, semantic dependencies, validation and custody; it does not fork meshing or FE formulation.

### DEC-002 — trust remains external
A structurally valid receipt is not trusted authority. Until a protected verifier exists, the v3 mesh candidate must remain `CURRENT_BLOCK` / pending authority even when every engineering validation gate passes.

### DEC-003 — avoid active B02 ownership
First commit is restricted to new v3 bridge/check files plus `lafea-workbench-mesh-generation-state.js`. No run/currentness/API files.

### RISK-001 — domain overlap/outside proof
Area equality alone cannot prove no overlap/outside coverage. The conformance operator must combine positive mapping, global topology, exact boundary feature conformity and independent mapped area closure; any unproven condition blocks rather than assuming zero.

### RISK-002 — runtime-resource evidence
The current producer exposes actual node/element/DOF counts but not authoritative peak memory/time. The first LAFEA.3 validation gate must not fabricate memory/time measurements; it will bind actual structural counts to the qualified producer ceilings and disclose the narrower resource oracle.

### RISK-003 — active B02 run stack
#1123/#1124 can alter exact solver/run APIs before this branch is ready for post-trust dispatch/result wiring.

### ISS-001 — v2 sourceHash invalidation remains in current run authority
This slice must not silently replace existing v2 custody semantics. V3 semantic dependency runs in parallel until trusted authority + coordinated migration is implemented.

### QST-001 — protected receipt verifier
No protected trust service exists in the current client code. Solver authorization must stay non-executing until that boundary is supplied.

## Current technical hypothesis and falsifier

Hypothesis: the existing deterministic LAFEA.3 v2 producer output contains enough exact mesh/plan/capability lineage to construct a complete fail-closed v3 engineering candidate without changing the mesher or solver.

Falsifier: any required v3 gate can only be satisfied by inventing a measurement, trusting producer self-assertion as an independent oracle, weakening a current FEM gate, or modifying a file claimed by the active B02 run/recovery stack. If observed, stop and classify the affected stage as blocked rather than manufacturing authority.

## Authority / invariants

- T3/T6/Q8 formulation and existing numerical solver behavior must remain byte/semantically unchanged in this slice.
- Existing v1/v2 authority remains current and unchanged until explicit migration.
- `meshContentHash` is numerical execution identity; `meshIdentity`/artifact provenance cannot substitute for it.
- T6/Q8 mapping positivity must be certified over the complete parent domain, not sample-only.
- Global topology and domain conformance are blocking gates, not warnings.
- No CURRENT_PASS without independently verified authority receipt.
- No execution/result publication authority is added in the first slice.
- No tolerance/benchmark/probe/expected-value changes.

## Validation ledger

| Check | Status | Observation | Oracle | Basis / limitation |
|---|---|---|---|---|
| Live main/branch SHA grounding | PASS | REMOTE_EXECUTION | AUTHORITATIVE_REFERENCE | GitHub refs at `9e3cc217...` |
| Active PR overlap inspection | PASS | REMOTE_EXECUTION | AUTHORITATIVE_REFERENCE | GitHub changed-file ledgers #1118/#1122/#1123/#1124 |
| Repository policy read | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | root `AGENTS.md` + Common delivery skill |
| Production LAFEA.3 v3 implementation | NOT_RUN | NOT_OBSERVED | NONE | no production mutation yet |
| Existing LAFEA.3 regressions on this branch | NOT_RUN | NOT_OBSERVED | NONE | branch equals main before implementation |
| New v3 adversarial checker | NOT_RUN | NOT_OBSERVED | NONE | not written yet |

## Changed-file ledger

- `agents/WIP-L3V3-20260814_workreport.md` — durable WIP recovery artifact only.

## Review / CI state

- PR: none
- Review threads: not applicable
- Branch CI: none yet
- Workflow changes authorized: NO

## Exact continuation state

Safe work location: additive v3 bridge under `src/workspace/` plus focused script under `scripts/`, then narrow integration into `src/workspace/lafea-workbench-mesh-generation-state.js` if no live ownership changes appear.

EXACT_NEXT_ACTION: implement candidate builder + checker, execute/inspect focused checks if available, update this report, then open a draft PR and migrate this report to `agents/PR<NUMBER>_workreport.md`.
