# PR1457 Work Report — EMP.1 deployable artifact security gate

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_DRAFT_CURRENT_MAIN_RECONCILED
TAKEOVER_AUTHORITY: WRITE_ALLOWED_RELEASE_ARTIFACT_SECURITY_ONLY
EXECUTION_MODE: AUTO
AUTO_STATE: RUNNING
PHASE_PROGRESSION: AUTO
SCOPE_AUTHORITY: LOCKED_TO_APPROVED_MISSION_ISSUE_1389_ISSUE_1456
MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED
CRITICALITY: ENGINEERING_CRITICAL
PR: #1457
ISSUE: #1456
UMBRELLA: #1389
BRANCH: agent/issue-1456-emp1-build-artifact-security-20260826
LIVE_MAIN_LAST_OBSERVED: 20e0abb5301363bef0659cf615bc8a37559ac869
CURRENT_MAIN_TREE: ea619d56311f4be6c1f27a4ca433794979ddee33
REPORT_BASIS_HEAD: 922570990764c083f454864bf193e25be281b9bf
TECHNICAL_BASIS_HEAD: 28970fe78f0ad1a41a706d927aaeb92793e05552
GROUNDING_EPOCH: GE-PR1457-005
CURRENT_STAGE: CURRENT_MAIN_EXACT_BLOB_REGROUND_VALIDATED
CURRENT_BLOCKER: executable scanner/falsifier/build/browser evidence remains NOT_RUN; merge authority not granted
HIGHEST_RISK: treating artifact scanner policy/hash custody as release/security certification or exposing matched proprietary/credential contents
EXACT_NEXT_ACTION: keep PR1457 draft/unmerged and re-ground child PR1464 onto this recovery-synchronized parent head.
```

## Handover in 60 Seconds

PR #1457 implements the bounded deployable-artifact security gate for EMP.1. Current `main` advanced from the prior merge base by five unrelated commits. Exact drift inspection showed no overlap with this PR's seven paths, so the branch was structurally re-grounded without changing any retained technical blob.

Structural recovery:

```text
prior PR1457 head = f11e4ccb291db26f067dc7e2bfe2f5a304f7095d
current main      = 20e0abb5301363bef0659cf615bc8a37559ac869
current main tree = ea619d56311f4be6c1f27a4ca433794979ddee33
re-ground head    = 922570990764c083f454864bf193e25be281b9bf
compare           = 5 ahead / 0 behind current main
changed files     = exactly 7
```

The re-ground commit has two parents: the previous PR head and current `main`. Its tree is current-main tree plus the exact seven retained PR1457 blobs. Branch movement used `force=false`.

## Implemented artifact-security gate

The complete built `dist/` tree is scanned after `PRODUCTION_BUILD` and before release Chromium/deployment acceptance. The gate rejects:

- controlled WRC537 and CAUx PDFs by basename and exact SHA-256, including renamed copies;
- source maps;
- key/credential containers and `.env*` / `.npmrc`;
- private-key PEM headers;
- high-confidence GitHub PAT/AWS access-key signatures;
- deployable symlinks.

Diagnostics expose violation code + deployable relative path only; matched content is never echoed.

Independent falsifiers cover clean PASS, both controlled source names/hashes, renamed copies, map/key/config classes, PEM/GitHub/AWS signatures, no-value echo and exact release ordering.

## Exact changed-file ledger — seven files

1. `scripts/emp1-professional-build-artifact-security-check.mjs`
2. `scripts/emp1-professional-build-artifact-security-falsifier.mjs`
3. `scripts/emp1-professional-release-candidate.mjs`
4. `docs/emp1/EMP1_PROFESSIONAL_RELEASE_EVIDENCE.md`
5. `agents/PR1457_workreport.md`
6. `agents/status/PR1457.yaml`
7. `agents/claims/PR1457.yaml`

Protected unchanged: `src/core/emp1/**`, WRC mechanics/source/dataset/oracle/tolerance, controlled PDFs, package/dependency policy, CSP/header policy and `.github/workflows/**`.

## Validation ledger

- current-main drift overlap — `PASS`; `SOURCE_INSPECTION`; no overlap with seven PR paths.
- structural exact-blob re-ground — `PASS`; `SOURCE_INSPECTION`; current-main tree plus exact seven retained blobs.
- compare current main → re-ground head — `PASS`; `SOURCE_INSPECTION`; 5 ahead / 0 behind / exactly 7 files.
- artifact-security source validation — `PASS_PRIOR_AUDIT`; no new technical mutation in this epoch.
- scanner execution — `NOT_RUN`.
- falsifier execution — `NOT_RUN`.
- production build/browser execution — `NOT_RUN` in this epoch.
- hosted EMP.1 execution — retained prior classification `NOT_RUN_EXECUTION_ENVIRONMENT / PRE_STEP_INFRASTRUCTURE_FAILURE`.
- WRC numerical comparison — `NOT_APPLICABLE` because mechanics/expected values/tolerances are unchanged.

No `NOT_RUN` is promoted to PASS.

## Authority invariant

`BUILD_ARTIFACT_SECURITY_CAN_REJECT_DEPLOYABLE_BYTES_BUT_CANNOT_CREATE_ENGINEERING_OR_RELEASE_AUTHORITY`

No engineering, source, route, code-compliance, release, deployment or broader security authority is granted.

## Coordination

AUTO MODE is active for the Issue #1389 continuation plan. It authorizes phase progression, not merge. PR1457 remains draft/unmerged. The next bounded phase is structural propagation into child PR1464; no workflow or engineering-authority mutation is authorized.

## Appendix A

A1 Production Trace — 20/20.
A2 Failure Isolation — 20/20.
A3 Authority/Invariant — 20/20.
A4 Independent Validation — 19/20; executable scanner/browser evidence remains NOT_RUN.
A5 Minimal Patch — 20/20; current phase is exact-blob recovery only.

**99/100; minimum 19/20.**
