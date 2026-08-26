# WIP Issue 1466 Work Report — EMP.1 deployed security headers

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_STACKED_WIP
TAKEOVER_AUTHORITY: WRITE_ALLOWED_DEPLOYED_HEADER_SECURITY_ONLY
EXECUTION_MODE: AUTO
AUTO_STATE: RUNNING
SCOPE_AUTHORITY: LOCKED_TO_ISSUE_1466
MERGE_AUTHORITY: NOT_GRANTED
CRITICALITY: ENGINEERING_CRITICAL
ISSUE: #1466
UMBRELLA: #1389
DEPENDENCY_BASE_PR: #1464
STACK_BASE_HEAD: 4b6eab2474ca0728ffc455698aa99b01f2d716a5
LIVE_MAIN_LAST_OBSERVED: dd7f13e2c73e596c7ac6625fbe211779bc61ce94
BRANCH: agent/issue-1466-emp1-deployed-security-headers-20260826
GROUNDING_EPOCH: GE-WIP1466-001
CURRENT_STAGE: PRE_TECHNICAL_POLICY_FREEZE
CURRENT_BLOCKER: deployed header observation requires a real HTTPS deployment/network; browser compatibility remains separately execution-gated
HIGHEST_RISK: treating static CSP/header policy conformance as proof that the deployed browser product works under that policy
EXACT_NEXT_ACTION: allocate stacked PR; implement provider-neutral header policy/parser, live deployed-header observation + falsifiers, then wire after deployment receipt verification without HTML/provider mutation.
```

## Grounded runtime facts

- `index.html` and `analyze.html` have no CSP meta policy.
- repository search found no current Content-Security-Policy deployment contract.
- production runtime uses Web Workers.
- production runtime uses blob/object URLs for exports/downloads.
- production runtime creates `<style>` elements and uses inline style properties.
- no production `eval()` requirement was identified.
- no obvious hard-coded external HTTPS fetch was identified by targeted search.
- no provider-specific deployment configuration is current release authority.

Decision: **do not inject an unexecuted meta CSP**. Instead validate actual deployed HTTP response headers and retain browser/smoke execution as a separate gate.

## Planned bounded policy

Provider-neutral candidate policy will require at minimum:

```text
default-src 'self'
base-uri 'self'
object-src 'none'
frame-ancestors 'none'
form-action 'self'
script-src 'self'                 # no unsafe-inline/eval/external origins
style-src 'self' 'unsafe-inline'  # bounded current compatibility exception
connect-src 'self'
worker-src 'self' blob:
img-src 'self' data: blob:
font-src 'self' data:
```

Companion headers: `X-Content-Type-Options: nosniff`, bounded Referrer-Policy, bounded Permissions-Policy disabling unused sensitive capabilities.

No HSTS, COOP, COEP, CORP or provider-specific header file is authorized without separate platform/browser evidence.

## Planned technical scope

1. provider-neutral CSP/header policy + parser/validator;
2. live deployment-header observer/checker reading the existing deployment receipt URL;
3. independent fixture/network falsifiers;
4. existing release-candidate integration after deployment-receipt verification;
5. PR-H evidence documentation;
6. PR-numbered recovery records after allocation.

## Protected exclusions

- no `index.html` / `analyze.html` mutation;
- no provider `_headers`/Netlify/Cloudflare/Pages configuration;
- no `.github/workflows/**`;
- no `src/core/emp1/**` or WRC numerical/source/oracle/tolerance change;
- no package/dependency mutation;
- no engineering/code/release authority widening.

## Authority invariant

`DEPLOYED_SECURITY_HEADERS_CAN_BLOCK_RELEASE_BUT_CANNOT_CREATE_ENGINEERING_RELEASE_OR_BROWSER_COMPATIBILITY_AUTHORITY`

## Appendix A

A1 Production Trace — 20/20: exact candidate -> build -> artifact security -> Chromium -> deployment receipt -> live deployment URL/header observation -> release receipt.

A2 Failure Isolation — 20/20: malformed/missing/weak headers are FAIL; DNS/TLS/network observation failure is NOT_RUN; browser incompatibility remains separate execution evidence.

A3 Authority/Invariant — 20/20: header security can only block; it cannot authorize WRC, code compliance, deployment, release, or browser compatibility.

A4 Independent Validation — 19/20: fixture falsifiers can prove parser/policy failure modes and network-NOT_RUN classification; real deployed browser compatibility remains unexecuted.

A5 Minimal Patch — 20/20: header policy/check/falsifier + existing candidate/docs + recovery only; no HTML/provider/workflow/core mutation.

**99/100; minimum 19/20 — WRITE_ALLOWED deployed-header security only.**
