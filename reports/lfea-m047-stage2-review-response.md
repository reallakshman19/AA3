# M047 Stage 2 — review response and technical RCA

Scope: the two FEA reviews of PR #1090. Each point is answered as **valid and fixed**,
**valid and open**, or **not supported by the source bytes**, with the evidence that
settles it. Nothing below is an opinion about the reviewer; where the reviews are
right they are right, and the code has moved.

All measurements in this document come from the pinned `BM4_L.ACCDB`
(`64c05a50…`, 5,136,384 bytes) read on Linux with the portable JS reader.

---

## Review 1 — friction-site selection

### 1.1 "Friction belongs to specific ACCDB `Y` rows carrying `FRIC_COEF≈0.3`, not to every non-anchor translational restraint" — **valid, fixed**

The reviewer is exactly right, including the count. Read from the pinned ACCDB:

| Fact | Value |
|---|---|
| `INPUT_RESTRAINTS` rows | 46 |
| distinct restraint nodes | 30 |
| `RES_TYPEID` values present | 1 `ANC`, 3 `Y`, 8 `GUI`, 9 `LIM` |
| `Y` rows with `FRIC_COEF > 0` | **26** |
| `Y` rows with blank `FRIC_COEF` | **3** — nodes 20300, 20640, 21640 |
| anchors | 1 — node 22490 |
| stored coefficient | `0.30000001192092896` (float32 of 0.3) |
| blank sentinel | `-1.01010000705719` |

The friction plan is now built per restraint row:

- the coefficient is the row's own `FRIC_COEF`, recorded as `MODEL_INPUT` with source
  `ACCDB:INPUT_RESTRAINTS:FRIC_COEF`;
- a blank row resolves to the layers below the model input (individual-file, then
  global default `0`), so 20300, 20640 and 21640 carry **no friction**;
- a declared row must agree with the file-level model-input declaration within
  float32 storage (`1e-6`), otherwise the run stops naming the node and column.

### 1.2 "`normalMagnitude = norm(normalReactions)` over all restrained translations can put guide/limit reaction into `µ|N|`" — **valid, fixed**

This was a real defect. The Coulomb normal is now this restraint's own reaction
projected on its own signed direction cosine:

```
n              = signed unit vector from XCOSINE/YCOSINE/ZCOSINE
signedNormalN  = R_n · n
|N|            = |signedNormalN|
capacity       = mu * |N|
```

A co-located `GUI` or `LIM` is a different restraint and contributes nothing to this
capacity. Where a guide or line stop removes a tangential direction, that direction is
dropped from the friction plane and recorded as `restrainedTangentialDofs`, so at
nodes 20030, 20390 and 21480 (`Y` + `GUI` + `LIM`) the friction declaration is
recorded as having no free tangential direction rather than silently applied.

### 1.3 "The regex does not match `FRIC_COEF`" — **valid, fixed**

Correct, and it would have thrown on the real file for two further reasons the review
did not need to reach: the stored value is `0.30000001192092896`, not `0.3`, and blank
rows store `-1.0101…` rather than null. The resolver now matches `FRIC_COEF`, compares
at float32 precision, and treats a negative value as "not declared".

### 1.4 "The fixture cannot detect the defect" — **valid, fixed**

The fixture now mirrors the real table contract: `REST_PTR`, `NODE_NAME`,
`RES_TYPEID` 1/3/9, `STIFFNESS`/`GAP`/`CNODE`/`FRIC_COEF` with the negative blank
sentinel, and four restraint nodes chosen to exercise every branch — anchor, a `Y`
support with both tangents free, a `Y` support whose `LIM` removes one tangent, and a
`Y` support the model leaves frictionless. The migration baseline was re-captured from
the pre-change commit against this fixture so the regression proof still compares like
with like.

---

## Review 2 — custody, base, scope

### 2.1 "Stage 2 ACCDB custody is wrong; the issue's `e21b0862…` is authorized" — **not supported by the source bytes**

Both pinned Common commits serve a byte-identical archive, and the archive contains
exactly one member:

```
curl -s .../f4d49f2a.../LFEA/BM4/BM4_L.zip | sha256sum
  978617cba50fa0b1a16c2fa71dc1e0d38e55ac834b191f887d100c6951abd8b9   (582,488 bytes)
curl -s .../45d51ea.../LFEA/BM4/BM4_L.zip | sha256sum
  978617cba50fa0b1a16c2fa71dc1e0d38e55ac834b191f887d100c6951abd8b9   (identical)
unzip -p BM4_L.zip BM4_L.ACCDB | sha256sum
  64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8   (5,136,384 bytes)
```

The issue's **byte count** matches the member exactly (5,136,384). The issue's member
SHA-256 does not match those bytes, and the archive SHA-256 the issue declares is the
one that does match. A declaration cannot override the bytes it describes, so the
manifest now records `status: ARBITRATED_BY_MEASUREMENT` with the measured hash
governing, the declared hash retained as superseded, and the reproduction command
inline. If the owner has a different `BM4_L.ACCDB` whose hash is `e21b0862…`, that is a
different file from the one the issue's own ZIP link serves, and it should be published
before it can be used.

### 2.2 "Not based on the required #1046 exact head" — **valid, and worth stating precisely**

Measured after fetching both:

| Relation | Result |
|---|---|
| `0855afb…` (PR #1046 head) is ancestor of `origin/main` | **no** |
| merge base | `b255003…` |
| `origin/main` ahead of merge base | **779 commits** |
| `0855afb…` ahead of merge base | **1 commit** |
| that commit | "M047: add BM4_L engineering validation gates" |
| what it adds that main lacks | `qualification-engineering-assessment.js` (594 lines), profile/comparison additions, the now-retired CI workflow |

So main is not a descendant of `0855afb…`; it is the 779-commit adopted successor line,
and PR #1046 is still a one-commit unmerged draft. Issue #1083 permits "that exact head
**or its adopted successor**", and this work is based on the successor. The one thing
`0855afb…` carries that main does not is the engineering-assessment module — which is
the coordinate-invariant vector layer the issue's "present state" quotes. Stage 2
therefore re-implements that vector gate in `lfea-m047-stage2-friction-rca.mjs`
(layer 2) rather than depending on an unmerged module. Adopting #1046's module itself is
a separate decision; say the word and it can be rebased in and qualified on its own.

This branch has also been rebased onto current `origin/main`.

### 2.3 "Reopening the qualified linear solver needs real BM4_L proof, not a synthetic fixture" — **valid, and now satisfied on the real file**

See "Real-data regression proof" below: the six control cases were solved on the pinned
ACCDB with the pre-change commit and with this branch, and compared row by row.

### 2.4 "L1 is unfinished" — **valid, now implemented**

The blocker was the hydrotest weight basis, which the ACCDB does not store. The owner
has since declared it: **test fluid 1000 kg/m³ at ambient temperature**. Implemented as
a governed `linearSolve.hydrotestBasis` authority (`RESOLVED`, with source recorded),
with `HP` bound to the ACCDB `HYDRO_PRESSURE` field (22,035 kPa on element 1) and no
thermal strain. `WW` replaces only the contents density; pipe, insulation and component
weight are untouched. An undeclared or `UNRESOLVED` basis still fails closed.

### 2.5 "Evidence must be per friction restraint, not grouped per node" — **valid, fixed**

Every friction entity is now one restraint row. `restraintId` is
`<node>:REST_PTR<n>:TYPE<t>:<normal DOF>`, and the ledger carries `nodeName`,
`restraintPointer`, `restraintTypeId`, the signed normal, the friction plane, the
restrained tangential directions and the coefficient's authority level and source. The
profile's `stateScope` now reads `PER_FRICTION_RESTRAINT_TANGENTIAL_RESULTANT_V1`, and
`convergedStates` is keyed by `restraintId`.

### 2.6 "Signed normal evidence loses the restraint-direction sign; the quantity is `R·n`" — **valid, fixed**

Implemented exactly as stated: `normalUnitVector` retains the sign from the direction
cosines, `signedNormalProjectionN = R·n` is recorded, and `|N| = |R·n|` feeds the cap.

### 2.7 "The ACE-only premise is obsolete; `mdb-reader` exists in XML_Compare_Utilities" — **valid, fixed**

`src/core/fea-benchmarks/caesar-accdb-reader.js` is a port of that repo's
`parser/accdb-mdb.js` (commit `d83c6221…`) with attribution in the header: same
table-name matching, a Node file/custody boundary, and output in the existing
`caesar-accdb-raw-export/v1` contract. Extraction of the pinned file takes 0.27 s on
Linux. `scripts/lfea-m047-stage2-production-run.mjs` is now the production boundary;
the Windows/ACE harness remains as an independent provider cross-check, not a
prerequisite.

---

## Technical RCA

### Root cause 1 — friction sites were derived from configuration, not from the model

The first implementation resolved one coefficient for the whole file and then asked
"which DOFs at this node are free?". The ACCDB answers a different and stricter
question per restraint row: *this* restraint has *this* coefficient and *this* normal.
Deriving sites from configuration made three frictionless supports frictional and mixed
guide reactions into the Coulomb capacity. Fixed by making the restraint row the unit of
friction, with the configuration layers used only where the row is blank.

### Root cause 2 — the documented iteration form does not converge on this model

CAESAR's published description — delete the tangential spring at breakaway, apply a
constant `µ|N|` opposing sliding — leaves the sliding DOF unsupported inside the
iteration. On BM4_L, with 26 coupled sliding supports, the measured behaviour was a
stable active set from iteration 3 and then a **period-3 limit cycle** that never
converged in 60 iterations:

```
state changes per iteration: 20,1,0,0,0, … 0
displacement update norm  (m): 2.73e-3, 1.94e-3, 2.19e-3, 2.71e-3, 1.90e-3, 2.29e-3, …
reaction update norm      (N): 1.35e+4, 8.64e+3, 5.07e+3, 1.32e+4, 8.19e+3, 5.14e+3, …
```

Under-relaxing the sliding force damped but did not remove the cycle.

**Fix — same law, stabilised solution.** The tangential spring stays assembled and the
Coulomb limit is imposed by a return-mapped slip offset:

```
elastic trial   F_trial = -k_f (u_t - u_slip)
if |F_trial| <= mu|N|   stick, slip unchanged
else                    F = mu|N| * F_trial/|F_trial|,  u_slip = u_t + F/k_f
offset load     L       = k_f u_slip
net force               = -k_f u_t + L = -k_f (u_t - u_slip) = F
```

At the fixed point the net tangential force is exactly the capped Coulomb force in the
direction opposing the accumulated slip — the same converged state the documented form
defines, because a spring force and an applied force of equal magnitude and direction
are the same nodal force. What changes is only the iteration matrix, which stays
positive definite. This is declared in the profile as
`solutionStrategy: RETAINED_TANGENTIAL_SPRING_WITH_RETURN_MAPPED_SLIP_OFFSET_V1` with
`fixedPointEquivalenceRule`, so the substitution is visible rather than implied.

A consequence worth stating: at convergence a support that slid sits *on* the yield
surface, so its per-iteration elastic classification reads `STICK`. The physical outcome
is reported separately as `regime: SLID | STUCK`, taken from the accumulated slip, and
the slide residual, cap and direction gates are evaluated on that regime.

### Root cause 3 — cost hid the behaviour

Each iteration recompiled and re-factorised the whole model (~10 s). With the
compilation cached by constraint signature and the factorisation cache passed through,
an iteration costs **1.35 s** (4.5 s for the first). Reuse is excluded from the
execution semantic hash, so cached and cold runs produce identical evidence.

---

## Real-data results

See `reports/lfea-m047-stage2-real-data-results.md`, generated from the production run
on the pinned ACCDB, for: the six-case control comparison against the pre-change
commit, the friction convergence ledger, the four comparison layers, and the paired
deltas `L13−L6`, `L7−L5`, `L15−L14`.
