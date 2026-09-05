# QS-ADV-BM-MESH-1652-0007 — staged-runner / source-custody gate qualification

QUESTION_SET_ID: QS-ADV-BM-MESH-1652-0007
QUALIFICATION_PROFILE: FEA
QUALIFICATION_PROFILE_VERSION: 2
QUALIFICATION_SCOPE_ID: QSCOPE-ADV-BM-MESH-1652-STAGED-RUNNER-SOURCE-CUSTODY-GATE
SUPERSEDES: QS-ADV-BM-MESH-1652-0006
TRIGGER: Owner command `proceed next` after EP-0016 advanced issue #1652 from frozen TASK-003 ladder/probe definitions toward TASK-004 staged-runner implementation.
QUESTION_DISPLAY: SHOW

OWNER_QUALIFICATION_BASELINE_DISCOVERY: COMPLETE
OWNER_QUALIFICATION_BASELINE_SOURCE: issue #1652 + governing LAFEA roadmaps; no separate Owner-authored Q1-Q5 baseline found
OWNER_QUALIFICATION_BASELINE_STATUS: SATISFIED

## Q1 — Source-custody integrity before runner admission

TASK-004 may not consume a source registry whose path/blob custody is false. Re-fetch every LEG-007-added source pin against the current exact repository source. `S-011` is valid, but `S-012` and `S-013` are not: the registry records non-resolving blob SHAs `7b4cec6c2fa6a14727d0e8e67c44f905ad97d503` and `e21296ae2483320a3c5e024489249abdaa8ddd3c`, while the live branch/current-main paths resolve to `c06ebf7006b76b38de8c416f659152396d34976e` for `src/core/lafea-meshing/mesh-convergence-framework.js` and `f1991fc17f0e799933917601b78c7a89af196df1` for `src/workspace/lafea-continuum-physical-probe.js`.

Required evidence: live branch file fetches, current `source-registry.json`, and blob-resolution check.

Falsifier: admitting runner material while either source path is still pinned to a SHA that is not the current file blob.

## Q2 — Staged runner execution and audit semantics

Issue #1652 requires one runner, `scripts/lafea-mesh-benchmark-run.mjs --stage M0..M4`, with one retained `lafea-benchmark-audit-record/v1` record per selected stage and fail-closed advancement. The runner must require an exact 40-hex HEAD, optionally enforce `--expected-head`, require a clean tracked tree, retain method stdout/stderr/evidence hashes, and keep `releaseAuthorityGranted=false` and `temperatureAuthorityGranted=false`.

Use `scripts/lafea.3-solver-benchmark-run.mjs` and `scripts/lib/lafea-benchmark-audit.mjs` as implementation precedents, not as BM-MESH numerical authority. The audit schema explicitly permits `caseStatus: BLOCKED`, which is the correct state when a selected stage is not executable because required authority is absent.

Required evidence: issue #1652 runner/audit text; `lafea.3-solver-benchmark-run.mjs`; `lafea-benchmark-audit.mjs`; `validation/lafea-benchmark-program/audit-record.schema.json`.

Falsifier: a runner that uses an `&&` chain with no per-stage record, executes on a dirty tracked tree, promotes a blocked stage to PASS, or grants release/temperature authority.

## Q3 — M0–M2 production-path boundary

M0–M2 must use the bound production producer rather than benchmark-authored meshes. LAFEA.3 uses the registered producer binding (`planLafeaAnalysisMesh` / `produceLafeaAnalysisMeshEvidence`) and LAFEA.4 uses `planLafeaShellAnalysisMesh` / `produceLafeaShellAnalysisMesh`. M0 checks canonical mesh conformance, counts/DOF and bound-family/resource disposition; exact negative-case rejection-code definitions remain TASK-005 authority. M1 measures the producer repeatability policy through in-process, cross-process and shuffled-input executions without post-sorting producer output. M2 compares producer mesh geometry to the frozen LEG-006 independent oracle; production output never defines expected values.

Required evidence: producer registry/binding, shell producer, LEG-006 geometry/oracle, issue #1652 M0–M2 text.

Falsifier: use of B01 Python mesh generation, benchmark-only mesh adapters, post-run node/element reordering to manufacture determinism, or production output used as its own M2 oracle.

## Q4 — M3/M4 blocked-authority handling

TASK-004 must distinguish implemented runner mechanics from executable benchmark authority. Continuum M3 element-quality distributions may be computed from production meshes using the governed profile thresholds and `quality-gates.js`. However issue #1652 also requires the LAFEA.4 shell size-to-thickness check (`0.5t–2t`), and the current frozen BM-MESH definitions do not govern a shell thickness. The only nearby `thickness = 10` occurrence is a quality-gate unit check, not BM-MESH fixture authority. Therefore the LAFEA.4 h/t subcheck cannot be invented or declared PASS.

M4 remains blocked because material, shell thickness, load/support conditions, load-case/quantity/recovery identity and solver acceptance fixture authority are unresolved. The runner may emit truthful `BLOCKED` stage evidence for unresolved authority, but it may not fabricate physics to obtain a PASS. Existing convergence limits and raw-singular-peak rejection remain unchanged.

Required evidence: issue #1652 M3/M4 text; `quality-gates.js`; `mesh-convergence-framework.js`; frozen `fixed-probes.json` deferred fields.

Falsifier: choosing shell thickness, material, loads, supports or probe quantity from convenience/example values, or claiming M3/M4 PASS without governed fixtures and execution.

## Q5 — Next contribution / minimal repair before runner material

The immediate next material leg is a bounded custody repair only:

- update `validation/lafea-benchmark-data/MESH/sources/source-registry.json` so `S-012.blobSha` equals `c06ebf7006b76b38de8c416f659152396d34976e`;
- update the same file so `S-013.blobSha` equals `f1991fc17f0e799933917601b78c7a89af196df1`;
- change no other benchmark definition, production source, threshold, solver/oracle, workflow, roadmap, program-registration, B02, TECH-13, release/trust/temperature authority.

After that repair is accepted, re-ground TASK-004 again before runner material. The subsequent runner leg may then consider `scripts/lafea-mesh-benchmark-run.mjs`, `validation/lafea-benchmark-data/MESH/bucket-manifest.json`, required audit/source-registry additions, and narrowly scoped helpers, while preserving blocked M3 shell-thickness and M4 physics authority until separately governed.

NO-PATCH in the immediate repair leg: `src/**`, `scripts/**`, geometry/oracle/convergence definitions, quality/convergence thresholds, solver/compiler, `.github/workflows/**`, roadmaps, benchmark-program registration, release/trust/temperature authority.
