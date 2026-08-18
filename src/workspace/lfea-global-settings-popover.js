/**
 * Minimal global settings affordance for the app-wide header.
 *
 * Surfaces the existing read-only engineering settings profile in a
 * popover reachable from any tab. Full editing stays where it already
 * lives (Workspace tab, Properties panel) — this does not duplicate or
 * fork that state, only projects it.
 */
export function mountLfeaGlobalSettingsPopover(headerElement, { getProfile }) {
  if (!headerElement || typeof headerElement.appendChild !== 'function') {
    throw new TypeError('Global settings popover requires a header element.');
  }
  const doc = headerElement.ownerDocument;
  const button = doc.createElement('button');
  button.type = 'button';
  button.className = 'global-settings-button';
  button.dataset.action = 'open-global-settings';
  button.setAttribute('aria-haspopup', 'true');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-label', 'Global settings');
  button.title = 'Global settings';
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-3a7.9 7.9 0 0 0-.14-1.47l1.9-1.48-2-3.46-2.24.9a8 8 0 0 0-2.55-1.47L14.6 2h-4l-.37 2.02a8 8 0 0 0-2.55 1.47l-2.24-.9-2 3.46 1.9 1.48A7.9 7.9 0 0 0 4.2 12c0 .5.05.99.14 1.47l-1.9 1.48 2 3.46 2.24-.9a8 8 0 0 0 2.55 1.47L9.4 22h4l.37-2.02a8 8 0 0 0 2.55-1.47l2.24.9 2-3.46-1.9-1.48c.09-.48.14-.97.14-1.47Z"/></svg>';

  const popover = doc.createElement('div');
  popover.className = 'global-settings-popover';
  popover.dataset.role = 'global-settings-popover';
  popover.hidden = true;

  function render() {
    const profile = getProfile();
    if (!profile) {
      popover.innerHTML = '<p class="global-settings-popover__empty">No engineering settings profile is active yet.</p>';
      return;
    }
    const entries = Object.entries(profile).filter(([, value]) => typeof value !== 'object');
    popover.innerHTML = `
      <h3>Engineering settings</h3>
      <dl class="global-settings-popover__list">
        ${entries.map(([key, value]) => `<dt>${key}</dt><dd>${String(value)}</dd>`).join('')}
      </dl>
      <p class="global-settings-popover__hint">Full editor: Workspace tab &rarr; Properties &rarr; Model health.</p>
    `;
  }

  function toggle(force) {
    const next = force ?? popover.hidden;
    popover.hidden = !next;
    button.setAttribute('aria-expanded', String(next));
    if (next) render();
  }

  button.addEventListener('click', () => toggle());
  headerElement.append(button, popover);

  return Object.freeze({
    close: () => toggle(false),
    destroy() {
      button.remove();
      popover.remove();
    },
  });
}
