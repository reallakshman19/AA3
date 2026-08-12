# M047 BM4_L — Fix 1: source-domain-correct friction-site consumption

## Mission

Make the InputXML friction-site mapper carry the **corrected InputXML restraint semantics** required by BM4_L without ever substituting those labels into the independent ACCDB namespace.

This Fix 1 branch is now structurally stacked on corrected PR #1074 head:

```text
b03e0c1d7277b6b9738303de33f70ac9982da9ba
```

It remains a bounded semantic-custody fix. It does not implement the proprietary nonlinear active-set/state-history rules that F2.7 proved are absent from the retained exact-build package.

## Correct source-domain authority

F2.6/F2.7 established two distinct source namespaces.

### ACCDB — direct database authority, no mutation

Authenticated BM4_L and BM4_NL `RESTRAINT_TYPES` lookups both publish:

```text
RES_TYPEID 1 -> ANC
RES_TYPEID 3 -> Y
RES_TYPEID 8 -> GUI
RES_TYPEID 9 -> LIM
```

These are direct ACCDB product labels. No InputXML mutation is applied to them.

### InputXML — mutation exactly once before classification

For BM4_L, the governed InputXML correction includes:

```text
+Y   17 -> 14
LIM   7 -> 8
GUI  10 -> 9
X     1 -> 2
Y     2 -> 3
Z     3 -> 5
     18 -> 15
```

Therefore representative InputXML semantics are:

```text
raw 17 -> corrected 14 -> +Y
raw  7 -> corrected  8 -> LIM
raw 10 -> corrected  9 -> GUI
```

The numeric values `8` and `9` exist in both sources but do **not** have the same source-domain label. This is intentional and must not be normalized away.

## Exact cross-source custody

The four complete row sets still reconcile exactly:

| ACCDB | Corrected InputXML | Rows |
|---|---|---:|
| ANC | ANC | 1 |
| Y | +Y | 29 |
| GUI | LIM | 6 |
| LIM | GUI | 10 |

This is a row-set crosswalk, not permission to rename either source.

The earlier node-set-derived ACCDB claim:

```text
1=ANC, 3=+Y, 8=LIM, 9=GUI
```

is **withdrawn**. Direct `RESTRAINT_TYPES` authority governs ACCDB.

## Root cause fixed

The older `buildInputXmlFrictionSiteMap()` correctly found positive-friction rows from `FRIC_COEF`, but it exposed raw exported InputXML `TYPE` without a governed corrected semantic contract.

Raw InputXML `TYPE` is source evidence, not mechanics semantics. Fix 1 now makes that distinction explicit.

## Implementation

`src/core/nonlinear-restraint-friction/inputxml-friction-site-map.js` supports two explicit modes.

### Source-only compatibility mode

```js
buildInputXmlFrictionSiteMap(xmlText)
```

The mapper retains raw type custody but reports:

```text
SOURCE_ONLY_RAW_TYPE_NOT_CLASSIFIED
rawTypeUsedAsMechanicsSemantics = false
```

### Governed InputXML semantic mode

```js
buildInputXmlFrictionSiteMap(xmlText, {
  restraintTypeMutationConfig: bm4lMutation,
})
```

The mapper then:

1. retains raw InputXML `TYPE` as source evidence;
2. applies the supplied mutation exactly once through the governed mutation utility;
3. decodes only the corrected InputXML type;
4. carries corrected code, abbreviation, family and mutation evidence into friction-site and companion contracts;
5. fails closed if a positive-friction BM4_L row does not resolve to corrected InputXML `+Y`.

The module does not consume, mutate or rename ACCDB `RES_TYPEID` values.

## Friction and gap custody retained

The source correction preserves the exact BM4_L physical inventory:

```text
29 corrected InputXML +Y rows
26 positive-friction rows, mu=0.3
ACCDB counterpart: 29 Y rows / 26 positive-friction rows
3 non-friction Y/+Y nodes: 20300, 20640, 21640
5 friction-coupled positive-gap companion rows
6 positive-gap rows total
ACCDB GAP: unset sentinel on all 46 rows
positive gap magnitude authority: corrected InputXML
```

No friction node, normal vector, coefficient, gap magnitude, contact state or load is changed by Fix 1.

## Accuracy — old vs Fix 1

The governed L13 denominator remains exactly 1,914 comparisons.

| Metric | Before Fix 1 | Corrected Fix 1 | Delta |
|---|---:|---:|---:|
| Passed | 1,719 | 1,719 | 0 |
| Failed | 195 | 195 | 0 |
| Total | 1,914 | 1,914 | 0 |
| Accuracy | **89.8119122257%** | **89.8119122257%** | **0.0000 pp** |

Quantity breakdown remains identical:

| Quantity | Pass | Fail | Total |
|---|---:|---:|---:|
| Displacement | 279 | 12 | 291 |
| Rotation | 264 | 27 | 291 |
| Restraint force | 77 | 13 | 90 |
| Restraint moment | 90 | 0 | 90 |
| Source-end force FROM | 256 | 32 | 288 |
| Source-end force TO | 255 | 33 | 288 |
| Source-end moment FROM | 249 | 39 | 288 |
| Source-end moment TO | 249 | 39 | 288 |

The zero accuracy delta is the expected engineering result. Fix 1 changes semantic custody, not the nonlinear equilibrium equations, comparator, tolerances or CAESAR references.

## Numerical baseline retained

The independent replay from the retained exact Windows/ACE stiffness/load ledger remains:

```text
1,938 DOFs
82 iterations
7 STICK / 19 SLIDING
passed 1719
failed 195
total 1914
accuracy 89.81191222570533%
```

No score-selected contact or friction state is introduced.

## Checker hardening

The focused checker now locks all of the following simultaneously:

```text
ACCDB direct: 1=ANC, 3=Y, 8=GUI, 9=LIM
InputXML:     17->14 +Y, 7->8 LIM, 10->9 GUI
F2.6 schema/status = corrected v2 direct-authority result
all four row-set crosswalks exact
cross-source labels not equivalent
26 positive-friction rows
6 positive-gap rows / 5 friction-coupled
ACCDB gaps all unset
withdrawn ACCDB inference remains withdrawn
Fix 1 does not rename ACCDB types
accuracy remains 1719/1914
```

## F2.7 boundary after retained-source audit

PR #1075 completed the retained-source observability audit. The exact output XML and all 40 tables in the authenticated BM4_NL ACCDB do **not** expose the nonlinear state history required for a CAESAR-equivalent implementation.

Still missing:

```text
OPEN/CLOSED/REOPENED ordering
contact-state commit/convergence ordering
STICK -> SLIDING scheduling
first-slide 15-degree handling
subsequent direction/zero-crossing handling
normal-force update basis around the 0.15 threshold
```

Official CAESAR guidance establishes the qualitative stiffness/Coulomb law and scalar controls, but not the full hidden update/commit ordering needed to reproduce the exact state machine.

The next authority required for an accuracy-changing F2.8 integration is an exact-build L13 **Active Boundary Conditions plus nonlinear iteration/state trace**, or equivalent product evidence exposing those transitions.

## Decision

**FIX 1 CORRECTED AND RESTACKED ON DIRECT F2.6 AUTHORITY. INPUTXML SEMANTICS ARE MUTATED EXACTLY ONCE; ACCDB REMAINS DIRECT `1=ANC, 3=Y, 8=GUI, 9=LIM`. L13 REMAINS `1719/1914 = 89.8119122257%`. NO ACCURACY-CHANGING NONLINEAR MECHANICS ARE PROMOTED WITHOUT THE MISSING EXACT-BUILD STATE TRACE.**
