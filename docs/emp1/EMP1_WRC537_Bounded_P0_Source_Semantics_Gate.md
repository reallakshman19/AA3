# EMP.1 bounded WRC 537 P0 source-semantics gate

Status: `BLOCKED_P0_SOURCE_SEMANTICS`

This record is the Issue #1389 PR-B reconciliation layer for the bounded WRC 537 (2013) professional release. It does not replace the individual source-qualification artifacts and does not grant engineering, production, deployment, global EMP.1.C or code-compliance authority.

## Current result

The controlled WRC source custody is reconciled, but nine release-critical authority gates remain source-blocked:

1. cylindrical recovery surface and sign semantics — #1385;
2. stress-intensity reconstruction semantics — #1383;
3. shell-thickness basis — #1375;
4. cylindrical mean-radius basis — #1377;
5. elastic material / shell-theory applicability — #1379;
6. physical attachment-axis normality — #1368;
7. cylindrical attachment class — #1370;
8. nearby-attachment / discontinuity isolation — #1373;
9. WRC-versus-code-acceptance boundary — #1381.

The machine-readable authority map is:

`validation/emp1/release/emp1-wrc537-gamma5-p0-source-semantics-gate-v1.json`

and the reconciler is:

`scripts/emp1-professional-p0-source-semantics-check.mjs`

## Two checker modes

Normal inspection mode verifies that the source artifacts, WRC SHA-256, issue bindings, frozen release profile and current fail-closed route/registry all agree. A successful inspection means **the blocker representation is internally consistent**, not that the WRC method is professionally release-qualified.

`--require-ready` is the authorization-facing mode. While any of the nine source gates remains blocked it must terminate non-zero. It may not be bypassed by a matching production result, CAUx result, secondary/OCR interpretation, or a widened tolerance.

## Source boundary

The exact controlled source identity remains:

`WRC537_2013 raw PDF SHA-256 = 698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2`

Current connected repository access exposes the PDF object identity but does not provide directly inspectable primary PDF page content. Therefore this PR does not convert any secondary/OCR statement into primary-source authority.

## Frozen release-profile boundary

PR-A froze `EMP1_WRC537_2013_CYLINDRICAL_GAMMA5_ZERO_DP_V1`. PR-B does not mutate that profile. Any future semantic profile change requires a new version/qualification under Issue #1389 anti-drift rule AD-11.

The bounded route remains unauthorized until source closure, CAUx disposition, exact-head qualification, separate authorization, post-promotion qualification, executable CI/build/browser evidence and deployment provenance are all complete.
