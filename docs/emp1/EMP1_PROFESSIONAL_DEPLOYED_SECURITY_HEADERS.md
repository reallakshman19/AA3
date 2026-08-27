# EMP.1 professional deployed security-header gate

## Purpose

This note defines the bounded deployed HTTP security-header qualification added under Issue #1466 / umbrella #1389.

It does **not** configure a deployment provider and does not grant WRC method authority, global EMP.1.C authority, code compliance, release authority, deployment authority, browser-compatibility authority or general application-security certification.

The gate exists because source code and deployment-provider defaults are not sufficient evidence of the headers actually served to a professional user. The release path therefore observes the real production HTTPS response after the exact deployment receipt has already been verified.

## Why this batch does not inject CSP into HTML

At implementation grounding, `index.html` and `analyze.html` contained no CSP meta policy. The current application also deliberately uses:

- Web Workers;
- blob/object URLs for exports and downloads;
- dynamically created `<style>` elements;
- many runtime `element.style.*` assignments.

No production requirement for inline script or `eval()` was identified by the bounded repository audit.

Adding a strict `<meta http-equiv="Content-Security-Policy">` without executable browser evidence could therefore break the current product and would confuse a source-code policy change with deployed HTTP-header evidence. This batch does not do that.

## Provider-neutral required CSP

The live deployment response must satisfy the following exact required directive sets:

```text
default-src 'self'
base-uri 'self'
object-src 'none'
frame-ancestors 'none'
form-action 'self'
script-src 'self'
style-src 'self' 'unsafe-inline'
connect-src 'self'
worker-src 'self' blob:
img-src 'self' data: blob:
font-src 'self' data:
```

The policy forbids wildcard sources, explicit HTTP/HTTPS source tokens, external script origins, `'unsafe-eval'`, `'wasm-unsafe-eval'`, and `'unsafe-inline'` outside the style directives.

If overriding directives are present, they must remain within the bounded profile. In particular:

```text
script-src-elem 'self'
script-src-attr 'none'
style-src-elem 'self' 'unsafe-inline'
style-src-attr 'unsafe-inline'
child-src 'self' blob:
frame-src 'none'
manifest-src 'self'
media-src 'self' blob:
```

The `style-src 'unsafe-inline'` allowance is an explicit **current compatibility exception**, not a preferred long-term security posture. The application currently creates style elements and style attributes/properties. Removing that exception requires a separately executed style refactor and browser qualification; it must not be deleted merely to make the policy look stricter.

The blob/data allowances are similarly bounded to current application needs and do not authorize arbitrary remote origins.

## Companion headers

The observed response must also contain:

```text
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
```

or the accepted bounded alternative:

```text
Referrer-Policy: strict-origin-when-cross-origin
```

`Permissions-Policy` must explicitly disable at least:

```text
camera=()
microphone=()
geolocation=()
```

Additional permissions restrictions are allowed.

This batch deliberately does not require HSTS, COOP, COEP or CORP because deployment-provider lifecycle and browser compatibility for those controls are not established here.

## Live observation

Run against a retained deployment receipt:

```text
node scripts/emp1-professional-deployment-security-headers-check.mjs \
  --receipt <deployment-receipt.json> \
  --expected-head <candidate SHA> \
  --expected-tree <candidate tree SHA> \
  --expected-artifact-sha256 <dist SHA-256>
```

The checker independently reasserts candidate head/tree/artifact custody from the deployment receipt, requires a production DEPLOYED HTTPS URL and smoke PASS, then performs a real HTTPS request.

Redirect policy is fail-closed:

- HTTPS only;
- maximum three redirects;
- final origin must equal the original deployment origin;
- downgrade to HTTP is rejected;
- cross-origin redirects are rejected.

A successful HTTP response with missing or weak security headers is `FAIL`.

DNS, network, TLS, request-launch or timeout failure means the live header observation could not be established and is classified:

```text
NOT_RUN_EXECUTION_ENVIRONMENT
```

It is never promoted to PASS.

## Independent falsification

Run:

```text
node scripts/emp1-professional-deployment-security-headers-falsifier.mjs
```

The falsifier covers:

- missing CSP;
- script `'unsafe-inline'`;
- script `'unsafe-eval'`;
- wildcard script source;
- external script origin;
- missing `object-src`, `frame-ancestors`, `base-uri` or `form-action` restriction;
- removal of the current style-inline compatibility allowance;
- missing `nosniff`, bounded referrer policy or disabled sensitive permissions;
- cross-origin redirect projection;
- non-success HTTP response;
- fixture PASS cannot create live observation/browser authority;
- network failure is NOT_RUN;
- release-candidate ordering after deployment receipt;
- exit-3 NOT_RUN preservation;
- browser-compatibility claim remains false.

## Release-candidate ordering

The live header gate is intentionally **not** part of the pre-deployment gate list. It runs only after the existing deployment receipt has passed exact candidate/artifact verification:

```text
... build / artifact security / Chromium ...
DEPLOYMENT_EVIDENCE
DEPLOYMENT_SECURITY_HEADERS
```

The final release candidate can qualify only when every retained execution gate passes. Therefore a missing, weak or unobservable deployed header set blocks professional release.

A header PASS means only that the observed production HTTPS response matched this bounded header profile. It does not prove that every interactive browser path remains compatible; the separately retained browser/smoke execution evidence remains required.

## Authority invariant

```text
DEPLOYED_SECURITY_HEADERS_CAN_BLOCK_RELEASE
BUT_CANNOT_CREATE_ENGINEERING_RELEASE_OR_BROWSER_COMPATIBILITY_AUTHORITY
```
