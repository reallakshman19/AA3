# EMP.1 professional deployment operations custody

## Purpose

This document defines the provider-neutral operational custody required by Issue #1389 for environment separation, exact-artifact promotion and rollback readiness.

It does **not** select a deployment provider, execute a deployment, prove a provider action occurred, grant engineering/release/deployment authority, or claim that rollback has been exercised successfully.

## Authority invariant

`DEPLOYMENT_OPERATIONS_CUSTODY_CAN_BLOCK_RELEASE_BUT_CANNOT_CREATE_ENGINEERING_DEPLOYMENT_OR_ROLLBACK_SUCCESS_AUTHORITY`

A valid deployment-operations receipt is necessary release evidence. It is not a provider API attestation, disaster-recovery certification or code-compliance decision.

## Required environment separation

The professional deployment chain distinguishes three environments:

```text
PREVIEW     — PR/review surface
STAGING     — exact release-candidate verification surface
PRODUCTION  — professional production surface
```

Every environment has its own explicit identity and HTTPS URL. Staging and production identities and URLs must be distinct. Preview must also remain a separately identified surface rather than an alias for production.

Provider selection is deliberately outside this contract. The same provider may host more than one environment, but environment identity must remain unambiguous.

## Exact-artifact promotion rule

The qualified staging artifact is the production artifact.

Required custody:

```text
candidate HEAD
candidate tree
buildArtifactSha256
      ↓
STAGING deployed artifact
      ↓  promote existing qualified artifact; no rebuild
PRODUCTION deployed artifact
```

The staging and production records must both retain the exact release-candidate HEAD/tree/build-artifact SHA-256. The promotion record must state:

```text
fromEnvironment = STAGING
toEnvironment = PRODUCTION
rebuildPerformedBetweenStagingAndProduction = false
```

A production rebuild from a later branch, new checkout, changed dependency graph or otherwise different bytes is not the qualified artifact and must fail closed.

## Previous-production rollback baseline

A rollback-qualified production promotion must retain the whole previous production version before activation of the new version.

Required previous-production custody includes:

```text
previous candidate HEAD
previous candidate tree
previous build/deployed artifact SHA-256
provider name
provider deployment/version identity
retained = true
```

The previous artifact must differ from the newly promoted artifact. The rollback target is the retained previous whole artifact/version, not a set of application flags.

### Initial production bootstrap

A first-ever production deployment cannot fabricate a previous production version.

`INITIAL_PRODUCTION_BOOTSTRAP` may be recorded as an explicit diagnostic state, but it does **not** satisfy rollback readiness under Issue #1389. Until a genuine retained previous-production/rollback baseline exists, final rollback-qualified professional release remains blocked.

## Whole-artifact rollback rule

Qualified rollback mode is exactly:

```text
WHOLE_ARTIFACT_VERSION_ROLLBACK
```

and:

```text
selectiveAuthorityToggleAllowed = false
```

Rollback must restore the complete retained previous production artifact/version. It must never be implemented by selectively changing any combination of:

```text
EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED
bounded registry registration
engineeringUseAuthorized
releaseQualified
global EMP.1.C authority
code-compliance state
source/oracle/tolerance identities
```

Those fields are part of the qualified artifact state; independently toggling them is not a rollback of the deployed product.

## Provider-neutral rollback procedure

When rollback is required:

1. Freeze further production promotion until the incident is classified.
2. Read the retained deployment-operations receipt for the affected release.
3. Identify the `previousProduction.providerDeploymentVersionId` and previous artifact SHA-256.
4. Verify that the retained provider version/artifact identity still matches the recorded previous-production custody before activation.
5. Use the selected provider's independently controlled operational mechanism to reactivate **that existing retained whole version**. Do not rebuild source and do not edit WRC/EMP.1 authority fields selectively.
6. Verify the resulting production artifact identity against the retained previous artifact SHA-256.
7. Perform the production smoke checks required by the normal deployment contract.
8. Retain a separate observed rollback record containing the provider/version identity, before/after artifact identities, UTC observation time and smoke result.
9. Only that separately observed rollback evidence may claim rollback execution or rollback success.

This repository document does not encode provider commands because no provider-specific deployment authority is selected by Issue #1389.

## Rollback readiness versus execution

These states are deliberately separate:

```text
rollbackReady    = previous whole production artifact/version is retained and identified
rollbackExecuted = an operator/provider action actually restored it
rollbackSuccess  = restored artifact identity + required smoke evidence were observed
```

The deployment-operations checker in this batch may establish only the first state.

For the qualified promotion receipt:

```text
rollbackReady = true
rollbackExecuted = false
rollbackSuccessClaimed = false
```

A later separately authorized observed-rollback evidence contract may establish execution/success. This document and its checker must not do so.

## Required receipt relationship

The deployment-operations receipt is checked only after the existing production deployment receipt and deployed security-header observation have passed in the release candidate harness.

It cross-checks the current production environment against the already governed production deployment receipt and retains the current exact candidate/artifact plus the prior rollback target.

## Explicit exclusions

This contract does not provide:

- provider configuration or provider API integration;
- GitHub Actions workflow changes;
- infrastructure entitlement/runner repair;
- WRC numerical/source/oracle/tolerance changes;
- code-compliance authority;
- selective feature-flag rollback;
- backup/restore of user data or external databases;
- general business-continuity/disaster-recovery certification;
- proof that preview/staging/production or rollback actually executed.

## Fail-closed rule

Missing or contradictory environment identity, candidate identity, artifact identity, no-rebuild custody, previous-production retention, rollback target, procedure custody or authority boundary blocks final professional release. No missing field may be defaulted from the current candidate merely to obtain PASS.
