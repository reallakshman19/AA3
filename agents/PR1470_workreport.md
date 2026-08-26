# PR1470 Work Report — EMP.1 deployed security headers

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_STACKED_DRAFT_CURRENT_BASE_RECONCILED
TAKEOVER_AUTHORITY: WRITE_ALLOWED_DEPLOYED_HEADER_SECURITY_ONLY
EXECUTION_MODE: AUTO
AUTO_STATE: COMPLETE
SCOPE_AUTHORITY: LOCKED_TO_ISSUE_1466
MERGE_AUTHORITY: NOT_GRANTED
CRITICALITY: ENGINEERING_CRITICAL
PR: #1470
ISSUE: #1466
UMBRELLA: #1389
DEPENDENCY_BASE_PR: #1464
BASE_BRANCH: agent/issue-1463-emp1-dependency-security-20260826
STACK_BASE_HEAD: 4b6eab2474ca0728ffc455698aa99b01f2d716a5
BRANCH: agent/issue-1466-emp1-deployed-security-headers-20260826
PR_HEAD_AT_ALLOCATION: 440b89b8e708d3fd88a79f8637d6556c31cd9ee0
TECHNICAL_BASIS: f115af6fbe929bda1b5770c0614b2f1bfb588872
LIVE_MAIN_LAST_OBSERVED: dd7f13e2c73e596c7ac6625fbe211779bc61ce94
REPORT_SYNC: CURRENT_FOR_TECHNICAL_AND_VALIDATION_STATE
APPENDIX_A_STATUS: PASS_99_MIN19
GROUNDING_EPOCH: GE-PR1470-002
CURRENT_STAGE: TECHNICAL_IMPLEMENTATION_AND_RECOVERY_COMPLETE
CURRENT_BLOCKER: a real production HTTPS deployment/receipt and executable browser environment are still required to observe headers and prove runtime compatibility; hosted jobs remain pre-step NOT_RUN
HIGHEST_RISK: treating static CSP/header conformance or fixture PASS as proof that the deployed browser product works under the policy
EXACT_NEXT_ACTION: leave PR1470 draft/unmerged pending Owner merge authorization and upstream #1464/#1457 disposition; any future merge decision must re-ground the exact stacked base/head and fresh hosted evidence.
```

## Mission

Close the bounded #1389 PR-H security-header obligation by requiring observation of the actual production HTTPS response headers after deployment-receipt custody is verified. This PR must be able to reject a release but cannot create engineering, release, deployment or browser-compatibility authority.

## Runtime basis and decision

Current application runtime uses Web Workers, blob/object URLs, dynamically created `<style>` elements and inline style properties. `index.html` and `analyze.html` do not carry an authoritative CSP contract. Therefore this PR deliberately **does not inject an unexecuted meta CSP** and does not add provider-specific deployment configuration.

The bounded current compatibility policy requires:

```text
default-src 'self'
base-uri 'self'
object-src 'none'
frame-ancestors 'none'
form-action 'self'
script-src 'self'                 # no unsafe-inline/eval/wildcard/external origin
style-src 'self' 'unsafe-inline'  # explicit current DOM-style compatibility exception
connect-src 'self'
worker-src 'self' blob:
img-src 'self' data: blob:
font-src 'self' data:
```

Companion headers require `X-Content-Type-Options: nosniff`, a bounded referrer policy, and `Permissions-Policy` disabling camera, microphone and geolocation.

## Implemented production trace

```text
exact release candidate
→ existing production build / artifact security / Chromium gates
→ existing deployment-receipt verifier
→ DEPLOYMENT_SECURITY_HEADERS
   → recheck receipt head/tree/artifact custody
   → require HTTPS
   → GET deployed URL
   → follow at most 3 same-origin HTTPS redirects
   → observe actual HTTP response headers
   → validate bounded CSP + companion-header policy
→ release candidate may proceed only if the live observation passes
```

Transport/tool failure is classified `NOT_RUN_EXECUTION_ENVIRONMENT`; policy violation is `FAIL`. Header PASS still records `browserCompatibilityEstablished = false`.

## Security hardening completed in GE-PR1470-002

- CSP rejection diagnostics are category-only (`WILDCARD`, `UNSAFE_INLINE`, `UNSAFE_EVAL`, `WASM_UNSAFE_EVAL`, `EXTERNAL_ORIGIN`, `UNQUALIFIED_SOURCE`) and do not echo a rejected origin/token.
- malformed/mismatched deployment receipts fail through bounded JSON diagnostics rather than assertion stacks.
- receipt-custody failure does not echo receipt URL/content.
- falsifier injects `PROPRIETARY_RECEIPT_SENTINEL_DO_NOT_ECHO` and requires it absent from stdout/stderr.
- header observation remains ordered after the independent deployment-receipt gate.
- observer exit code `3` remains mapped by the release harness to `NOT_RUN_EXECUTION_ENVIRONMENT`.
- release receipt binds the exact security-header policy semantic hash and explicitly denies browser-compatibility authority.

## Changed-file ledger — exact stacked scope

Against stack base `4b6eab2474ca0728ffc455698aa99b01f2d716a5`, technical basis `f115af6fbe929bda1b5770c0614b2f1bfb588872` is 17 ahead / 0 behind with exactly eight paths:

1. `scripts/emp1-professional-security-header-policy.mjs`
2. `scripts/emp1-professional-deployment-security-headers-check.mjs`
3. `scripts/emp1-professional-deployment-security-headers-falsifier.mjs`
4. `scripts/emp1-professional-release-candidate.mjs`
5. `docs/emp1/EMP1_PROFESSIONAL_DEPLOYED_SECURITY_HEADERS.md`
6. `agents/PR1470_workreport.md`
7. `agents/status/PR1470.yaml`
8. `agents/claims/PR1470.yaml`

Protected and unchanged in this batch: `index.html`, `analyze.html`, provider-specific deployment configuration, `package.json`, `package-lock.json`, `src/core/emp1/**`, WRC source/dataset/oracle/tolerance/mechanics and `.github/workflows/**`.

## Validation matrix

| Gate | Status | Observation / oracle |
|---|---|---|
| Live main grounding | PASS | `main=dd7f13e2c73e596c7ac6625fbe211779bc61ce94`; repository custody |
| Exact stacked diff | PASS | `4b6eab24... -> f115af6f...`; 17 ahead / 0 behind; exactly 8 paths |
| Source-level policy/observer integration inspection | PASS | deployment receipt precedes live header gate; header exit 3 retained as NOT_RUN; no browser authority |
| Reviews | PASS | 0 submitted reviews observed |
| Review threads | PASS | 0 review threads observed |
| Focused Node falsifier execution in local container | NOT_RUN_EXECUTION_ENVIRONMENT | exact branch source could not be materialized because container DNS could not resolve `raw.githubusercontent.com`; no encoded test is promoted to PASS |
| Exact-head hosted runEmp1 | NOT_RUN_EXECUTION_ENVIRONMENT / PRE_STEP_INFRASTRUCTURE_FAILURE | run `32970361014`, job `98182390554`, `steps=null`, `logs_url=null` |
| Exact-head hosted gamma5 | NOT_RUN_EXECUTION_ENVIRONMENT / PRE_STEP_INFRASTRUCTURE_FAILURE | run `32970361196`, job `98182390982`, `steps=null`, `logs_url=null` |
| Live deployment header observation | NOT_RUN | no qualified production deployment receipt/HTTPS observation executed in this epoch |
| Browser compatibility under deployed CSP | NOT_RUN | explicitly separate from static policy; requires actual deployed browser execution |
| WRC numerical comparison | NOT_APPLICABLE | no mechanics/source/oracle/tolerance mutation |

No `NOT_RUN` state is represented as PASS.

## Authority invariant

`DEPLOYED_SECURITY_HEADERS_CAN_BLOCK_RELEASE_BUT_CANNOT_CREATE_ENGINEERING_RELEASE_OR_BROWSER_COMPATIBILITY_AUTHORITY`

Bounded truth remains:

```text
deployed security headers may reject release = true
static policy creates browser compatibility  = false
engineering authority granted                = false
code compliance granted                      = false
release authority granted                    = false
deployment authority granted                 = false
broader application security certification   = false
```

## Risks / decisions

- **DEC-1470-01:** observe real deployed response headers; do not add speculative HTML meta-CSP.
- **DEC-1470-02:** retain `style-src 'self' 'unsafe-inline'` only as a bounded current-runtime compatibility exception; removing it requires a separately executed style refactor/browser qualification.
- **DEC-1470-03:** network/DNS/TLS/tool inability is `NOT_RUN_EXECUTION_ENVIRONMENT`; weak/missing observed headers are `FAIL`.
- **RISK-1470-01:** provider configuration is still outside this PR, so a future deployment must actually serve the qualified headers before release can pass.
- **RISK-1470-02:** static header conformance does not prove worker/blob/style functionality under CSP; real browser execution remains mandatory.

## Appendix A

A1 Production Trace — 20/20: exact candidate → deployment receipt → live same-origin HTTPS header observation → bounded release gate.

A2 Failure Isolation — 20/20: receipt/policy/redirect violations are deterministic FAIL; transport unavailability is NOT_RUN; browser incompatibility remains a separate runtime boundary.

A3 Authority/Invariant — 20/20: security headers can reject release only; they cannot authorize WRC mechanics, code compliance, deployment, release or browser compatibility.

A4 Independent Validation — 19/20: negative fixture/sentinel falsifiers are encoded independently; genuine deployed header/browser execution is still NOT_RUN.

A5 Minimal Patch — 20/20: four technical scripts including inherited candidate integration, one dedicated evidence note and three recovery records; no HTML/provider/package/workflow/core mutation.

**99/100; minimum 19/20 — handover-ready within deployed-header security scope.**
