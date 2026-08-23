# LFEA Piping Component Promotion — Candidate Questionnaire Rev 1

Three questions to identify who should be allotted the piping component
promotion work described in
`docs/lfea/LFEA_Piping_Component_Promotion_Plan_Rev1.md`.

## How to use this

Ask these out loud, in a conversation. They are deliberately not written as
exam questions — each is a situation the person will actually meet in the first
week of this task, and the answer that matters is the reasoning, not a
definition.

Do **not** send the plan document beforehand. Q1 and Q2 describe real
measurements from this repository, and a candidate who has read §3 can recite
the answer without understanding it.

Give no hints. If someone asks a clarifying question, that is signal — the good
clarifying questions are noted under each question.

Scoring: a candidate should be **strong on Q3 and at least one of Q1/Q2**.
Q3 is not a soft question. It is the one that predicts whether this work lands
correctly or produces confident, wrong numbers.

---

## Q1 — The bend that will not close

> "You've got a customer's CAESAR model in front of you, already solved, nothing
> corrupt about it. You pull one 90-degree bend out. The element runs from node
> 20 to node 30, and the declared bend radius is 18 inches.
>
> You measure the distance from node 20 to the arc centre and get 0.867 metres.
> From node 30 to the same centre you get 0.539. The radius is 0.457.
>
> Three different numbers. What's your read on that, and what would you need
> before you could put chords on that arc?"

**What this is really asking:** do they know how CAESAR lays out a bend?

**Strong answer sounds like:** the TO node is the *working point* — the corner
where the two straight runs would intersect if the bend weren't there. The arc
doesn't start or end at either node; it starts a tangent length back along the
incoming run and ends a tangent length along the outgoing one, where the tangent
length is `R·tan(θ/2)`. So the arc straddles the corner across two elements. To
chord it you need the tangent points, and you have to shorten both neighbours to
meet them — you cannot just subdivide the bend element in place. May also mention
near/far weld points, or that bend geometry in CAESAR is defined on the element
*following* the bend.

**Weak answer sounds like:** "the data's wrong", "the model needs cleaning",
"take the average and use that as the radius", "loosen the tolerance until it
passes", or jumping straight to a code change without asking what the nodes mean.

**Good clarifying questions:** "Is node 30 the intersection point or the far weld
point?" · "What's the angle between the adjacent runs?" · "Does the next element
start at node 30?"

---

## Q2 — The bends got too flexible

> "You've just switched a solver from modelling bends as straight chords to
> representing the curve properly, and you've applied the code flexibility factor
> on top. You rerun the benchmark.
>
> Displacement near the bends is now about 30% higher than the CAESAR reference.
> You were expecting a few percent. Support loads have dropped correspondingly.
>
> Where do you look first? And what would make you suspect your model rather
> than the benchmark?"

**What this is really asking:** do they understand what the flexibility factor
already contains?

**Strong answer sounds like:** suspects the compliance is being counted twice.
The factor `k` is defined relative to a straight beam — it exists to make a
straight element behave like a curved one. If the curve is now also represented
geometrically, applying `k` on top adds the same softness a second time. First
check is what basis the factor set was declared against (chord vs arc), and
whether the double-count guard is actually being exercised rather than skipped.
May also raise pressure stiffening — internal pressure *reduces* `k`, and
omitting that correction over-softens large thin-wall bends. Would not touch the
benchmark: CAESAR is the reference, a 30% gap in the soft direction is the
model's problem.

**Weak answer sounds like:** "tune the factor until it matches", "the benchmark
is out of date, re-baseline it", "refine the mesh more", "add more chords", or
treating a 30% miss as a tolerance to widen.

**Good clarifying questions:** "Was the factor derived for a chord or an arc
model?" · "Is pressure in this load case?" · "Did element count change and did
anything else move with it?"

---

## Q3 — The support on the node you're about to delete

> "To represent the bend properly you have to retire the corner node and replace
> it with an arc. On this model, one of those corner nodes has a +Y support
> sitting on it.
>
> What do you do about the support? Who, if anyone, do you go and ask?
>
> And suppose it's Friday, the PR is due, and you can't reach anyone — do you
> ship it?"

**What this is really asking:** do they know when to stop? This is the question
that decides the allocation.

**Strong answer sounds like:** will not silently move or drop it. An omitted or
relocated support changes the load path and every reaction downstream of it, and
the result will still look completely plausible — that's what makes it dangerous.
Options are to retain the corner as a massless station so nothing moves, or to
re-target under an explicit rule; either way it's an engineering decision for the
model owner or lead, not a default the implementer picks. Notes that a +Y is
one-way, so where it lands relative to the arc changes whether it lifts off.
On the Friday question: **no** — fails closed, blocks, and says why in the PR.
Would rather ship nothing than ship a moved support.

**Weak answer sounds like:** "snap it to the nearest node", "the solver will sort
it out", "it's probably redundant", "ship it and fix it in a follow-up", or
treating it purely as a data-structure problem about remapping an ID.

**Listen for:** whether they distinguish *plausible* from *correct*. Anyone who
says a version of "it would still look fine, and that's the problem" understands
this task.

**Good clarifying questions:** "Is it one-way or double-acting?" · "How far is
the corner from the nearest retained node relative to the pipe movement?" ·
"Does anything else reference that node — a load, a code station?"

---

## Scoring

| | Q1 | Q2 | Q3 |
|---|---|---|---|
| **Allot the task** | strong | strong | strong |
| **Allot with a reviewer** | strong or weak | strong or weak | **strong** (at least one of Q1/Q2 strong) |
| **Do not allot** | — | — | weak |

A candidate weak on Q3 should not be given this work regardless of how well they
answer Q1 and Q2. The mechanics can be learned from the plan and the benchmark
harness; the instinct to stop cannot, and this task has several places where
proceeding confidently produces numbers that are wrong and look right.

Someone strong on Q3 but weak on both Q1 and Q2 is worth pairing with a piping
stress engineer rather than turning away — that combination is a competent
engineer who simply hasn't worked in CAESAR conventions before.

## Note on the open questions

§13 of the plan lists four questions deliberately left for a human. A candidate
who, unprompted, says some of this needs an engineering decision before any code
is written is telling you they have read the problem correctly.
