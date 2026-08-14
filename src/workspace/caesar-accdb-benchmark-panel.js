/**
 * CAESAR II ACCDB friction-benchmark panel — a frozen static snapshot viewer,
 * not a live solver. It has two sections with deliberately different trust
 * levels, and never blurs them into one table:
 *
 * - **Normal reactions**: a linear-mechanics quantity, measured against real
 *   CAESAR output, accurate (22-23 of 23 restraints within +-10% on every
 *   case). Shown as a qualified pass/fail comparison table.
 * - **Friction (tangential force)**: still measured well outside +-10% on
 *   most restraints (worst case thousands of percent). Shown only as a
 *   labelled diagnostic preview - explicit "not for design use" banner,
 *   muted styling, a neutral regime-match flag instead of a pass/fail badge.
 *   See agents/M047_STAGE2_ROADMAP.md for the open mechanism (R7).
 *
 * Data comes from `core/fea-benchmarks/caesar-accdb-benchmark-snapshot.js`,
 * a frozen build-time snapshot of a real pinned-ACCDB solve. This panel
 * performs no engineering judgement of its own and computes nothing; every
 * number and status here was already decided by the snapshot.
 */
import {
  CAESAR_ACCDB_SNAPSHOT_CASE_IDS,
  loadCaesarAccdbSnapshot,
} from '../core/fea-benchmarks/caesar-accdb-benchmark-snapshot.js';
import {
  benchmarkElement as create,
  formatBenchmarkNumber as formatNumber,
} from './fea-benchmark-dom.js';

export class CaesarAccdbBenchmarkPanel {
  /**
   * @param {Element|null} hostElement Panel host.
   * @param {{initialCaseId?:string}} options Explicit options.
   */
  constructor(hostElement, options = {}) {
    this.hostElement = hostElement;
    this.caseId = CAESAR_ACCDB_SNAPSHOT_CASE_IDS.includes(options.initialCaseId)
      ? options.initialCaseId
      : CAESAR_ACCDB_SNAPSHOT_CASE_IDS[0];
  }

  render() {
    if (!this.hostElement) return;
    const snapshot = loadCaesarAccdbSnapshot(this.caseId);
    const section = create(this.hostElement, 'section', 'caesar-accdb-benchmark');
    section.dataset.role = 'caesar-accdb-benchmark-panel';
    section.append(
      this.header(snapshot),
      this.caseSelector(),
      this.custodyNotice(snapshot),
      this.normalReactionsSection(snapshot),
      this.frictionDiagnosticSection(snapshot),
    );
    this.hostElement.replaceChildren(section);
  }

  header(snapshot) {
    const header = create(this.hostElement, 'header', 'caesar-accdb-benchmark__header');
    header.append(
      create(this.hostElement, 'span', 'panel-eyebrow', 'CAESAR II ACCDB cross-check'),
      create(this.hostElement, 'h2', null, `M047 friction benchmark — ${snapshot.caseLabel}`),
      create(this.hostElement, 'p', null,
        'Real pinned-ACCDB solve compared restraint-by-restraint against CAESAR’s own output. '
        + 'Frozen at build time — not a live solve.'),
    );
    return header;
  }

  caseSelector() {
    const bar = create(this.hostElement, 'div', 'caesar-accdb-benchmark__controls');
    CAESAR_ACCDB_SNAPSHOT_CASE_IDS.forEach((caseId) => {
      const button = create(this.hostElement, 'button', null, caseId);
      button.type = 'button';
      button.dataset.role = 'caesar-accdb-benchmark-case-select';
      button.dataset.caseId = caseId;
      button.setAttribute('aria-pressed', String(caseId === this.caseId));
      button.disabled = caseId === this.caseId;
      button.addEventListener('click', () => {
        this.caseId = caseId;
        this.render();
      });
      bar.append(button);
    });
    return bar;
  }

  custodyNotice(snapshot) {
    const { custody } = snapshot;
    const documentRef = this.hostElement?.ownerDocument ?? globalThis.document;
    const notice = create(this.hostElement, 'p', 'caesar-accdb-benchmark__custody');
    notice.append(
      create(this.hostElement, 'strong', null, custody.converged ? 'Converged. ' : 'Did not converge. '),
      documentRef.createTextNode(
        `${custody.note} Solver profile ${custody.solverProfileId}. `
        + `Production promotion: ${custody.productionPromotionAuthorized ? 'authorized' : 'not authorized'}.`,
      ),
    );
    return notice;
  }

  normalReactionsSection(snapshot) {
    const section = create(this.hostElement, 'section', 'caesar-accdb-benchmark__section');
    const passCount = snapshot.normalReactions.filter((row) => row.status === 'PASS').length;
    section.append(
      create(this.hostElement, 'h3', null,
        `Normal reactions — ${passCount}/${snapshot.normalReactions.length} within ±${snapshot.normalReactions[0]?.goalPercent ?? 10}%`),
      create(this.hostElement, 'p', 'caesar-accdb-benchmark__section-note',
        'Linear-mechanics quantity: weight, pressure and thermal load path. Already accurate; treat as qualified.'),
      this.scroll(this.normalReactionsTable(snapshot)),
    );
    return section;
  }

  normalReactionsTable(snapshot) {
    const table = create(this.hostElement, 'table');
    const head = create(this.hostElement, 'tr');
    ['', 'Restraint', 'Node', 'CAESAR (N)', 'Solved (N)', 'Error %']
      .forEach((label) => head.append(create(this.hostElement, 'th', null, label)));
    table.append(head);
    snapshot.normalReactions.forEach((row) => {
      const tr = create(this.hostElement, 'tr');
      tr.dataset.status = row.status;
      tr.append(
        create(this.hostElement, 'td', 'caesar-accdb-benchmark__cell-status', row.status),
        create(this.hostElement, 'td', null, row.restraintId),
        create(this.hostElement, 'td', null, row.nodeName ?? row.nodeId),
        create(this.hostElement, 'td', 'caesar-accdb-benchmark__cell-number', formatNumber(row.referenceN, 'N')),
        create(this.hostElement, 'td', 'caesar-accdb-benchmark__cell-number', formatNumber(row.solvedN, 'N')),
        create(this.hostElement, 'td', 'caesar-accdb-benchmark__cell-number', formatNumber(row.percentError, '%')),
      );
      table.append(tr);
    });
    return table;
  }

  frictionDiagnosticSection(snapshot) {
    const section = create(this.hostElement, 'section', 'caesar-accdb-benchmark__section caesar-accdb-benchmark__section--diagnostic');
    const withinGoal = snapshot.frictionDiagnostic.filter((row) => row.withinGoal).length;
    section.append(
      create(this.hostElement, 'h3', null, 'Friction (tangential force) — diagnostic preview'),
      create(this.hostElement, 'p', 'caesar-accdb-benchmark__section-note caesar-accdb-benchmark__section-note--warning',
        `Not for design use. Only ${withinGoal}/${snapshot.frictionDiagnostic.length} restraints are within `
        + `±${snapshot.summary.goalRelative * 100}% on this case; the worst error is orders of magnitude larger. `
        + 'The "Regime" column shows whether the solver agrees with CAESAR on stick/slide, which does not imply the '
        + 'force magnitude or direction shown is trustworthy at that restraint.'),
      this.scroll(this.frictionDiagnosticTable(snapshot)),
    );
    return section;
  }

  frictionDiagnosticTable(snapshot) {
    const table = create(this.hostElement, 'table');
    const head = create(this.hostElement, 'tr');
    ['Restraint', 'Node', 'CAESAR |Ft| (N)', 'Solved |Ft| (N)', 'Vector error %', 'Regime (ref/solved)']
      .forEach((label) => head.append(create(this.hostElement, 'th', null, label)));
    table.append(head);
    snapshot.frictionDiagnostic.forEach((row) => {
      const tr = create(this.hostElement, 'tr');
      tr.dataset.regimeMatch = String(row.regimeMatch);
      tr.append(
        create(this.hostElement, 'td', null, row.restraintId),
        create(this.hostElement, 'td', null, row.nodeName ?? row.nodeId),
        create(this.hostElement, 'td', 'caesar-accdb-benchmark__cell-number', formatNumber(row.referenceMagnitudeN, 'N')),
        create(this.hostElement, 'td', 'caesar-accdb-benchmark__cell-number', formatNumber(row.solvedMagnitudeN, 'N')),
        create(this.hostElement, 'td', 'caesar-accdb-benchmark__cell-number', formatNumber(row.vectorRelativeErrorPercent, '%')),
        create(this.hostElement, 'td', null, `${row.regimeReference} / ${row.regimeSolved}`),
      );
      table.append(tr);
    });
    return table;
  }

  scroll(table) {
    const wrapper = create(this.hostElement, 'div', 'caesar-accdb-benchmark__scroll');
    wrapper.append(table);
    return wrapper;
  }

  destroy() {
    this.hostElement?.replaceChildren();
    this.hostElement = null;
  }
}
