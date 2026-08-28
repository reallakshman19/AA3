/*
 * The DRAFT label must actually reach the screen.
 *
 * Every other entry in the limitations list says a quantity is NOT produced.
 * DRAFT_SPRING_SUPPORT_NO_REFERENCE says the opposite: a quantity IS produced,
 * from a path no reference model has ever checked. Rendered as one more grey
 * bullet among "No fatigue assessment is produced", that distinction is exactly
 * the kind a reader skims past.
 *
 * So this verifies the rendering, not just the string: the row carries the
 * label element, the data attribute the stylesheet keys off, and prose that
 * says what to do about it. And it verifies ordinary limitations do NOT get
 * labelled, because a badge on everything is a badge on nothing.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  formatLimitation,
  isDraftLimitation,
  limitationListItem,
} from '../src/workspace/lafea-results-view.js';

// A DOM stub rather than a dependency: enough of the surface that the renderer
// exercises its real branches, and nothing beyond it.
function stubRoot() {
  const make = (tag) => ({
    tag,
    className: '',
    textContent: '',
    title: '',
    dataset: {},
    children: [],
    append(...nodes) { this.children.push(...nodes); },
    get text() {
      return this.children.reduce(
        (all, child) => all + (typeof child === 'string' ? child : child.text ?? ''),
        this.textContent,
      );
    },
  });
  return { ownerDocument: { createElement: make, createTextNode: (value) => value } };
}

const root = stubRoot();

// ------------------------------------------------------------------ draft row
const draft = limitationListItem(root, 'DRAFT_SPRING_SUPPORT_NO_REFERENCE');
assert.equal(draft.dataset.draft, 'true',
  'a draft row must carry the attribute the stylesheet keys off');

const badge = draft.children.find((child) => child?.className === 'lafea-result-limitation-draft');
assert.ok(badge, 'a draft row must render a visible label element');
assert.equal(badge.textContent, 'DRAFT', 'the label must read DRAFT');
assert.ok(badge.title.length > 0, 'the label must explain itself on hover');

const text = draft.text;
assert.ok(/draft/iu.test(text), 'the row must say the results are draft');
assert.ok(/reference/iu.test(text),
  'the row must say what is missing -- a reference model -- not just that something is wrong');

// ------------------------------------------------------------- ordinary rows
// A badge on every row is a badge on nothing.
for (const ordinary of ['NO_FATIGUE', 'NO_PLASTICITY', 'GENERIC_APPROX_FRICTION_IGNORED']) {
  const row = limitationListItem(root, ordinary);
  assert.equal(row.dataset.draft, undefined, `${ordinary} must not be labelled DRAFT`);
  assert.equal(
    row.children.find((child) => child?.className === 'lafea-result-limitation-draft'),
    undefined,
    `${ordinary} must not render a draft label`,
  );
  assert.equal(isDraftLimitation(ordinary), false);
}
assert.equal(isDraftLimitation('DRAFT_SPRING_SUPPORT_NO_REFERENCE'), true);

// The code must not fall through to the generic prettifier, which would render
// it as "Draft spring support no reference" and say nothing useful.
assert.notEqual(
  formatLimitation('DRAFT_SPRING_SUPPORT_NO_REFERENCE'),
  'Draft spring support no reference',
  'the draft code must have real prose, not the underscore-stripped fallback',
);

// ------------------------------------------------------------------ styling
const styles = readFileSync('src/workspace/lafea-workbench-styles.js', 'utf8');
assert.match(styles, /\.lafea-result-limitation-draft\{/u,
  'the label must be styled, not inherit the surrounding grey');
assert.match(styles, /li\[data-draft="true"\]/u,
  'the draft row itself must be distinguishable from ordinary limitations');

console.log(JSON.stringify({
  check: 'lfea-ui-draft-label',
  status: 'PASS',
  labelText: badge.textContent,
  labelTitle: badge.title,
  rowText: text,
  ordinaryRowsUnlabelled: true,
}, null, 2));
