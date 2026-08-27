# PR1491 Work Report — Issue #1321 Source-Axis-General Scalar Gravity

## Recovery header
- Repository: `reallaksh19/Advanced_Analysis`
- PR: #1491 — `Load Calc: qualify source-axis-general scalar gravity`
- Branch: `agent/issue-1321-source-axis-general-gravity`
- Exact repair base: `3e22134fe224bb6ea128bea9547b331cd633a8b8`
- Technical re-ground commit: `f34bba88e46bd0020645c4507d3bdc809a57894a`
- State: SOURCE_COMPLETE_MERGE_AUTHORIZED_EXECUTION_NOT_RUN
- Merge authority: OWNER_GRANTED_BY_2026_08_27_USER_COMMAND

## Mission
Qualify governed X/Y/Z source-up authority for the existing scalar route-chainage gravity path, including the mandatory Y-up case, without changing mass composition, route/support allocation, equilibrium or CoG formulas and without generalizing direction-dependent downstream mechanics.

## Bounded engineering cutover
1. Governed source-up axis accepts X/Y/Z with approved evidence; source length remains mm-only.
2. The unchanged scalar kernel keeps `Z_UP` only as a legacy compatibility token. Published support-load authority/result metadata is rebound to `X_UP`, `Y_UP` or `Z_UP` only after source-axis qualification.
3. Support-site grouping remains Euclidean and therefore invariant to coordinate-axis permutation.
4. Gravity result sign convention is `SOURCE_UP_POSITIVE_SUPPORT_REACTION`.
5. Product-default profile is version 6; Basic Calculation Defaults exposes X/Y/Z while Product default remains Z if no higher source/project authority exists.
6. The retained Y↔Z permutation falsifier compares route chainage, end reactions, evaluated force and first-moment equilibrium.

## Invariance basis
The bounded calculation uses Euclidean grouping/topology/route length, scalar `mass * g * loadFactor`, scalar reaction allocation, and route-chainage first moments. These are invariant to permutation of source X/Y/Z axes. This is not a general 3D gravity-vector or coordinate-rotation qualification.

## Deliberately not generalized
Direction-dependent domains remain separately Z-qualified/fail-closed: civil resultant transfer, structural support-assembly geometry, component eccentric-moment vectors, +Z support contact, thermal liftoff intake/active-set authority, and source-bound thermal ROM execution.

## Current-main reconciliation
From the prior clean base `b648e174b80b49ceed76036d590b89ad4fe08c2e` through current `main@3e22134fe224bb6ea128bea9547b331cd633a8b8`, six merged commits changed EMP.1/LAFEA, #1496/#1486 and the shared Non-FEA runner. None touched the nine #1491 technical paths. All nine technical blobs were therefore preserved byte-for-byte and re-parented onto current main.

## Exact changed-file ledger — 12
1. `agents/PR1491_workreport.md`
2. `agents/claims/PR1491.yaml`
3. `agents/status/PR1491.yaml`
4. `scripts/authorized-empirical-source-axis-binding-check.mjs`
5. `scripts/non-fea-calculation-defaults-basic-ux-check.mjs`
6. `scripts/non-fea-product-default-profile-check.mjs`
7. `scripts/source-axis-permutation-equivalence-check.mjs`
8. `src/workspace/engineering-loads/authorized-empirical-gravity-convention-binding.js`
9. `src/workspace/engineering-loads/authorized-empirical-source-axis-binding.js`
10. `src/workspace/project-data/non-fea-calculation-defaults-model.js`
11. `src/workspace/project-data/non-fea-product-default-profile.js`
12. `src/workspace/support-sites/support-site-model.js`

## Protected invariants
- no `support-load-distribution-v3.js` formula change;
- no route-partition, CoG, support-capability or equilibrium formula change;
- no arbitrary gravity vector, unit conversion or frame rotation;
- no relabelling of Z-only vector/contact/thermal mechanics;
- invalid/missing axis evidence and unsupported units remain fail-closed.

## Validation truth
- current-main overlap audit: PASS_SOURCE_RECONCILIATION
- exact nine-technical-blob preservation: PASS_SOURCE_RECONCILIATION
- support-site/route/scalar-kernel axis-invariance trace: PASS_SOURCE_INSPECTION
- downstream Z-only compatibility audit: PASS_SOURCE_INSPECTION
- X/Y/Z authority binding and Y↔Z falsifier source review: PASS_SOURCE_INSPECTION
- faithful checkout: BLOCKED — `Could not resolve host: github.com`
- focused Node execution: NOT_RUN
- Non-FEA aggregate: NOT_RUN
- `npm run check:imports`: NOT_RUN
- advanced-shell contract: NOT_RUN
- production build: NOT_RUN
- `git diff --check`: NOT_RUN

No NOT_RUN is represented as PASS.

## Five-question takeover gate
1. Why are route chainage and scalar gravity statics invariant under X/Y/Z permutation?
2. Why must raw kernel `Z_UP` remain a compatibility marker rather than source-axis authority?
3. Which downstream domains remain Z-only and why would metadata relabelling be unsafe there?
4. Which nine technical paths were preserved byte-for-byte during this re-ground?
5. Which executable checks remain NOT_RUN and why?

## EXACT_NEXT_ACTION
Re-read live main; require 0-behind, exact 12-file scope, clean reviews/threads and raw GitHub mergeability. If clean, mark ready and perform the owner-authorized squash merge while explicitly retaining `EXECUTION_NOT_RUN`.
