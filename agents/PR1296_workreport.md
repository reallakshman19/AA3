# PR1296 work report — EMP.1.C higher-gamma Original curve domain qualification

## Recovery header

- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: RECOVERABLE`
- `ISSUE: #1261`
- `PR: #1296`
- `PARENT_PR: #1291`
- `BASE: agent/emp1-c-exact-gamma-qualified-route-issue1261@6d1e29073e34a25830d282b761525068443798aa`
- `BRANCH: agent/emp1-c-higher-gamma-domain-issue1261`
- `VALIDATED_INITIAL_HEAD: 66e06871613e62a7a8f6481ee8c889233879d7b9`
- `HIGHER_GAMMA_WORKFLOW: 32357165433 (#1) PASS`
- `MERGE_AUTHORITY: NOT_GRANTED`
- `HIGHER_GAMMA_ROUTES_AUTHORIZED: 0`
- `INHERITED_GAMMA5_ROUTE: PRESERVED`
- `GLOBAL_EMP1_C_ROUTE_REGISTERED: false`
- `RELEASE_QUALIFIED: false`

## Objective

PR #1296 asks one engineering-authority question only:

> Can an exact source-tabulated cylindrical `gamma > 5` be admitted to the full WRC537 Table-5 Original-curve route without inventing the beta outer limit?

The answer from the current WRC source package is **no**.

This is not because coefficient data are missing. The higher-gamma coefficient rows exist. The blocker is that the required Original radial-load curves visibly delete their outer portions, while the individual higher-gamma termination beta coordinates are not numerically printed in the source charts.

## Source rule

Frozen source:

```text
document      docs/emp1/WRC537_2013.pdf
Git blob       ce861233928154145a9257efbbf8dbef3f5a17d1
raw SHA-256    698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
edition        2013
```

WRC section 4.4 is retained as the governing curve-domain authority:

```text
ORIGINAL_CURVES_MUST_NOT_BE_USED_BEYOND_LIMITS_INDICATED
```

with the retained reason that outer regions were reported appreciably unconservative.

Geometry parameters remain:

```text
gamma = Rm/T
beta  = 0.875*r0/Rm
```

## Why coefficient availability is insufficient

The rational coefficient tables provide a mathematical fit that can be evaluated beyond the plotted Original segment. That does **not** authorize such evaluation.

For a production Table-5 route, every required Original curve must have a qualified beta domain. A coefficient row therefore proves only:

```text
curve fit coefficients exist for this gamma
```

It does not prove:

```text
this beta lies inside the source-authorized Original curve segment
```

PR #1296 explicitly prevents these invalid substitutions:

```text
coefficient existence -> domain authority                 PROHIBITED
rational-fit behavior -> inferred chart endpoint          PROHIBITED
gamma=5 beta maximum -> copied to higher gamma            PROHIBITED
Original missing region -> Extrapolated fallback          PROHIBITED
pixel/graph coordinate reading -> production authority    PROHIBITED
```

## First-fail route qualification strategy

The full cylindrical Table-5 route consumes 14 Original figures:

```text
1A, 2A, 3A, 4A,
1B-1, 2B-1, 3B, 4B,
1C, 1C-1, 2C, 2C-1, 3C, 4C
```

For route authorization, the usable beta maximum at one gamma is the intersection of all required figure domains.

Therefore one unresolved required curve endpoint is enough to block the route. PR #1296 begins with the two source figures already known to contain higher-gamma deleted outer segments:

```text
Figure 1C Original  chart PDF page 128  coefficient page 129
Figure 2C Original  chart PDF page 136  coefficient page 137
```

This avoids manufacturing an apparently complete 14-figure numeric ledger when the first required source curves already fail exact endpoint custody.

## Machine qualification

New artifacts:

```text
validation/emp1/wrc537-2013/cylindrical-higher-gamma-beta-limit-ledger-v1.json
scripts/emp1-wrc-cylindrical-higher-gamma-beta-limit-check.mjs
.github/workflows/emp1-c-higher-gamma-domain.yml
```

The checker verifies:

1. exact WRC raw SHA-256;
2. retained section 4.4 curve-limit authority;
3. exact required 14-figure Table-5 set;
4. inherited gamma=5 route remains `0.05 <= beta <= 0.5`;
5. all higher tabulated gammas have Original coefficient rows in Figure 1C and Figure 2C;
6. every higher-gamma route beta intersection remains `null`;
7. no endpoint inference or digitization is admitted;
8. higher-gamma production comparison and route registration remain false;
9. global EMP.1.C remains unregistered.

Higher exact-tabulated gammas checked:

```text
7.5, 10, 15, 25, 35, 50, 75, 100, 150, 200, 300
```

Machine result on workflow #1:

```text
coefficient rows present in 1C and 2C   11 / 11 gammas PASS
higher-gamma routes authorized           0 / 11
higher-gamma routes blocked             11 / 11
endpoint inference used                 false
chart digitization used                 false
inherited gamma=5 route preserved       true
```

Initial check semantic hash:

```text
aff694ac91bcdbd0fe1efcaaa1ae8da8cc4695d20246a02169c991e5f66a3051
```

## Independent source-chart re-observation

Workflow run:

```text
run ID                  32357165433
run number              1
head                    66e06871613e62a7a8f6481ee8c889233879d7b9
artifact ID             9402093459
artifact size           259178 bytes
artifact digest SHA256  30dc1d0b3e01e25d1452e35ad18761256c0136b81ab9a02390802c4cf5e005cf
render method           Poppler pdftoppm
render resolution       220 dpi
OCR                     none
```

Rendered source-page hashes:

```text
Figure 1C Original page 128
  dfbc3a3da8898c3ba299bbbe3b6bdec9dda352861dbcd6dc207b50757f63aef5

Figure 2C Original page 136
  4f736e01ce9365ecc815c73dd240966da5f27125b15af3c957d2c848ded9869e
```

Independent visual re-observation:

- both source charts visibly show higher-gamma Original curves terminating progressively earlier than the gamma=5 curve;
- the x-axis is beta and the curves are gamma-labelled;
- the individual higher-gamma termination beta values are **not numerically annotated per curve**;
- obtaining exact numeric endpoints from the graphical line termination would require coordinate extraction/digitization;
- no such digitization was performed;
- no production result was used.

Engineering conclusion:

```text
SOURCE SHOWS DELETED HIGHER-GAMMA OUTER SEGMENTS       PASS
SOURCE GIVES EXACT NUMERIC ENDPOINT FOR EACH CURVE     NO
COEFFICIENT TABLE CAN SUBSTITUTE FOR ENDPOINT           NO
GRAPHICAL DIGITIZATION ALLOWED FOR PRODUCTION AUTHORITY NO
FULL TABLE-5 GAMMA>5 ROUTE AUTHORITY                    BLOCKED
```

## Why not approximate the chart endpoint?

The endpoint is an applicability boundary, not a normal interpolated response value. Moving it outward can admit a region WRC explicitly warns may be appreciably unconservative.

A visual estimate such as `beta ~= 0.xx` would therefore create a false engineering boundary. Even an apparently close gridline alignment is not accepted as an exact machine value unless the source itself states the numerical boundary or another authoritative source provides it.

## Impact on PR #1291

None of the qualified PR #1291 production capability is changed.

Preserved route:

```text
WRC537 2013
CYLINDRICAL / ROUND / ORIGINAL
gamma = 5
0.05 <= beta <= 0.5
Delta p = 0
Kn = Kb = 1
```

Qualification SHA-256 remains:

```text
3b4375407dc9484c80144f2d9a5b555000d0257021108cd799923ed6fede1a8e
```

The public product still has one bounded production route and no global/full-domain EMP.1.C route.

## Current blocker classification

The gamma>5 blocker is now more precise than `NOT_YET_REVIEWED`:

```text
BLOCKED_SOURCE_REPRESENTATION_REQUIRES_GRAPHICAL_DIGITIZATION
```

This means the source was reviewed and the missing datum is known: exact numeric Original-curve beta endpoints for higher gamma.

## Required authority to reopen gamma>5

Any future widening must supply an authoritative **numeric** endpoint source. Acceptable examples would be:

- WRC erratum/addendum listing the limits numerically;
- an authoritative WRC computation table or implementation note giving exact beta maxima per gamma/figure;
- another source explicitly incorporated/authorized by WRC that defines the deleted-curve limits numerically.

Not acceptable:

- pixel coordinate measurement;
- OCR of curve locations;
- reading the rational fit until it “looks” like the chart end;
- assuming a regular gamma-to-beta limit pattern;
- copying a neighboring gamma limit;
- using the Extrapolated curve where Original is deleted.

## Next engineering increment

Because gamma>5 cannot progress from the currently supplied source without prohibited digitization, do not spend more production coding effort on higher-gamma routes.

Next useful authority work should be one of these separate increments:

1. **Nonzero pressure-thrust policy qualification** - establish exact inclusion/exclusion, reference point, sign/direction and double-count protection from source; or
2. **General `Kn/Kb` qualification** - extract and qualify the WRC Appendix-B stress-concentration-factor equations/charts and their domain.

Do not mix either into PR #1296. PR #1296 is a source-domain conclusion only.

## Changed-file ledger

```text
.github/workflows/emp1-c-higher-gamma-domain.yml
scripts/emp1-wrc-cylindrical-higher-gamma-beta-limit-check.mjs
validation/emp1/wrc537-2013/cylindrical-higher-gamma-beta-limit-ledger-v1.json
agents/status/PR1296.yaml
agents/claims/PR1296.yaml
agents/PR1296_workreport.md
```

No production evaluator, route registry, orchestrator or UI source is changed by PR #1296.

## Appendix A — next-agent expert questions

1. Does the primary WRC PDF still SHA-256 to `698fcdc3...c27b2`?
2. Does WRC section 4.4 still govern Original-curve use beyond indicated limits?
3. Are Figures 1C and 2C required by the cylindrical Table-5 route?
4. Do both figures visibly contain deleted higher-gamma outer segments?
5. Is a numeric beta endpoint printed for each higher-gamma curve? If not, why is graphical coordinate extraction insufficient for production authority?
6. Do all 11 higher exact-tabulated gamma values have coefficient rows in both probe figures?
7. Why do those coefficient rows not authorize evaluation past the plotted Original segment?
8. Is `routeBetaIntersection` still null for every gamma>5 assessment?
9. Is digitization still explicitly prohibited for production boundary authority?
10. Does PR #1296 change any production evaluator or route registry? It must not.
11. Does the inherited gamma=5 bounded route remain registered and unchanged?
12. Does global/full-domain EMP.1.C remain unregistered and releaseQualified=false?
13. What exact new source would be sufficient to reopen higher-gamma beta-limit qualification?
14. If no such source is found, which separate authority increment should proceed next: nonzero pressure-thrust or Appendix-B `Kn/Kb`?
