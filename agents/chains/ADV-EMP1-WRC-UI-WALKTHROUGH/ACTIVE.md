CHAIN_STATE_VERSION: 3
CHAIN_ID: ADV-EMP1-WRC-UI-WALKTHROUGH
MISSION: Execute and qualify the engineer-facing EMP.1/WRC professional workflow for issue #1559 without changing WRC numerical/source/release authority
ACTIVE_ENDPOINT: EP-0031
ACTIVE_ENDPOINT_FILE: agents/chains/ADV-EMP1-WRC-UI-WALKTHROUGH/endpoints/EP-0031.md
MATERIAL_HISTORY_ROOT_BASE: 0676f6b145dad164869d2979f69b4a4491e8d803
MATERIAL_LEG_PREWORK_ENDPOINT_FILE: agents/chains/ADV-EMP1-WRC-UI-WALKTHROUGH/endpoints/EP-0027.md
SOURCE_PR: 1594 MERGED
RECOVERY_PR: 1597 MERGED
SOURCE_HEAD: 325982b5ccb213cb02766658c2ce243c78ae02ce
RECOVERY_HEAD: 325982b5ccb213cb02766658c2ce243c78ae02ce
WRC_MERGE_COMMIT: e00ce199e26070e855bd87b1354f229e06feea32
PR: 1599 DRAFT
BRANCH: codex/emp1-wrc-ui-1559-qpack-handover
RECONCILED_MAIN: e00ce199e26070e855bd87b1354f229e06feea32
LATEST_MATERIAL_HEAD: 304c31833ffa4437f54740c3249ed367ac67d4e2
LATEST_SOURCE_HEAD: 325982b5ccb213cb02766658c2ce243c78ae02ce
STATE: QUALIFICATION_PACK_READY_BROWSER_HUMAN_ACCEPTANCE_OPEN
ENGINEERING_STATE: IMPLEMENTATION_ACCEPTANCE_HARNESS_AND_CUSTODY_MERGED
CUSTODY_STATE: HELD
QUALIFICATION_STATE: Q1_Q5_REQUIRED_BEFORE_MATERIAL_TAKEOVER
TAKEOVER_AUTHORITY: READ_ONLY_UNTIL_Q1_Q5_ANSWERED
WRITE_AUTHORITY: PRE_MUTATION_ENDPOINT_REQUIRED_BEFORE_ANY MATERIAL SOURCE CHANGE
AUTO_STATE: PAUSED_AT_QUALIFICATION_THEN_BROWSER_HUMAN_GATE
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
AUTHORITY_DOMAIN: EMP.1 WRC professional workflow browser/human acceptance evidence and takeover qualification only; production UI, WRC source/mechanics, route authorization, code compliance and release authority protected
ACTIVE_CUSTODIAN: gpt-5.6-sol
CUSTODY_EPOCH: 4
COORDINATION_STATE: SAFE_POST_MERGE_QPACK_HANDOVER
DEPENDENCIES: incoming custodian answers EP-0031 Q1-Q5 from live repository; then faithful repository checkout plus project-local dependencies, Chromium execution, 12 viewport + 12 full-page + 12 ARIA + manifest v3, then qualified human live observation or review of a recording
ENVIRONMENT_BROWSER_CAPABILITY: AVAILABLE_SYSTEM_CHROMIUM
ENVIRONMENT_PYTHON_PLAYWRIGHT_CAPABILITY: AVAILABLE
SOURCE_MATERIALIZATION_STATE: BLOCKED_EXECUTION_ENVIRONMENT
LATEST_EXECUTION_PROBE: git ls-remote failed before checkout: Could not resolve host github.com; no mounted Advanced_Analysis .git checkout found under bounded runtime paths
EVIDENCE_POLICY: 12_VIEWPORT_12_FULL_PAGE_12_ARIA_MANIFEST_V3
FINAL_ACCEPTANCE_POLICY: QUALIFIED_LIVE_OR_RECORDED_HUMAN_OBSERVATION_REQUIRED
ARTIFACT_ONLY_FINAL_PASS: FALSE
EXACT_NEXT_ACTION: answer EP-0031 Q1-Q5 from current live repository first; then from a faithful checkout of current main run node scripts/run-playwright.mjs e2e/emp1-professional-walkthrough-evidence.spec.js --workers=1; inspect 12/12/12 + manifest v3; then qualified live/recorded pressure-vessel/local-stress review; if a defect is found create a new PRE_MUTATION endpoint before patching
COMMON_PROTOCOL: engineering-pr-delivery-v2
COMMON_PROTOCOL_BASIS: 10d667ce715bb52e1f73035c6fa326db77d0f9dd
COMMON_PROTOCOL_STATUS: OWNER_PINNED
ROADMAPS: Issue #1389 §14; issue #1559 owner clarification and Definition of Done
ROADMAP_REVIEW_STATUS: REVIEWED
HANDOVER_READY: TRUE
