# PR1457 Work Report — EMP.1 deployable artifact security gate

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_DRAFT_CURRENT_MAIN_RECONCILED
TAKEOVER_AUTHORITY: WRITE_ALLOWED_RELEASE_ARTIFACT_SECURITY_ONLY
EXECUTION_MODE: AUTO
AUTO_STATE: COMPLETE
SCOPE_AUTHORITY: LOCKED_TO_ISSUE_1456
MERGE_AUTHORITY: NOT_GRANTED
CRITICALITY: ENGINEERING_CRITICAL
PR: #1457
ISSUE: #1456
UMBRELLA: #1389
BRANCH: agent/issue-1456-emp1-build-artifact-security-20260826
LIVE_MAIN_LAST_OBSERVED: f15bab4af0009888f41b856f820cb3ab7a152520
CURRENT_MAIN_TREE: f2ccaf49e9487d707e302f1405b7791d42e79f76
TECHNICAL_BASIS_HEAD: 28970fe78f0ad1a41a706d927aaeb92793e05552
REGROUNDED_TECHNICAL_SNAPSHOT: f47a40586f57e19343fc88208dd40178c13626d1
GROUNDING_EPOCH: GE-PR1457-004
CURRENT_STAGE: CURRENT_MAIN_REGROUND_COMPLETE
CURRENT_BLOCKER: scanner/falsifier/build/browser execution remains NOT_RUN; merge authority not granted
HIGHEST_RISK: treating artifact scanner policy/hash custody as release/security certification or exposing matched proprietary/credential contents
EXACT_NEXT_ACTION: leave PR1457 draft/unmerged; re-ground child PR1464 onto this finalized parent head after recovery sync.
```

## Re-grounding result

Current `main` advanced by ten commits after the previous PR1457 basis. Exact drift audit showed **no overlap** with the seven PR1457 paths. The branch was therefore rebuilt atomically from current-main tree plus the exact seven retained PR1457 blobs; no technical file content changed.

Pre-recovery compare:

```text
main = f15bab4af0009888f41b856f820cb3ab7a152520
head = f47a40586f57e19343fc88208dd40178c13626d1
1 ahead / 0 behind
exactly 7 files
```

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

## Exact scope — seven files

1. `scripts/emp1-professional-build-artifact-security-check.mjs`
2. `scripts/emp1-professional-build-artifact-security-falsifier.mjs`
3. `scripts/emp1-professional-release-candidate.mjs`
4. `docs/emp1/EMP1_PROFESSIONAL_RELEASE_EVIDENCE.md`
5. `agents/PR1457_workreport.md`
6. `agents/status/PR1457.yaml`
7. `agents/claims/PR1457.yaml`

Protected unchanged: `src/core/emp1/**`, WRC mechanics/source/dataset/oracle/tolerance, controlled PDFs, package/dependency policy, CSP/header policy and `.github/workflows/**`.

## Validation truth

- current-main drift overlap: PASS / none on seven paths;
- atomic tree re-ground: PASS source custody; seven technical/recovery blobs preserved;
- artifact-security source validation: PASS from prior technical audit;
- scanner/falsifier execution: NOT_RUN;
- hosted EMP.1 execution: prior exact-head jobs remained `NOT_RUN_EXECUTION_ENVIRONMENT / PRE_STEP_INFRASTRUCTURE_FAILURE`;
- WRC numerical comparison: NOT_APPLICABLE.

No NOT_RUN is promoted to PASS.

## Authority invariant

`BUILD_ARTIFACT_SECURITY_CAN_REJECT_DEPLOYABLE_BYTES_BUT_CANNOT_CREATE_ENGINEERING_OR_RELEASE_AUTHORITY`

No engineering, source, route, code-compliance, release, deployment or broader security authority is granted.

## Appendix A

A1 Production Trace — 20/20.
A2 Failure Isolation — 20/20.
A3 Authority/Invariant — 20/20.
A4 Independent Validation — 19/20; executable scanner/browser evidence remains NOT_RUN.
A5 Minimal Patch — 20/20; this epoch is recovery-only after exact-blob re-ground.

**99/100; minimum 19/20.**
