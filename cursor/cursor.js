(() => {
  if (window.gableCursorInstalled) return;
  window.gableCursorInstalled = true;
  const root = document.documentElement;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const spinner = document.createElement('span');
  spinner.className = 'gable-loading-cursor';
  spinner.setAttribute('aria-hidden', 'true');
  document.addEventListener('DOMContentLoaded', () => document.body.append(spinner), { once: true });
  const clearPointer = () => root.classList.remove('gable-mouse-visible', 'gable-pressing');
  document.addEventListener('pointermove', event => {
    if (!finePointer.matches || event.pointerType === 'touch') return clearPointer();
    spinner.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
    root.classList.add('gable-mouse-visible');
  }, { passive: true });
  document.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !finePointer.matches || event.pointerType === 'touch') return;
    if (event.target.closest('textarea, [contenteditable="true"], input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"])')) {
      root.classList.remove('gable-pressing');
      return;
    }
    const control = event.target.closest('a[href],button,summary,select,label[for],[role="button"],[onclick],input[type="button"],input[type="submit"],input[type="reset"],input[type="checkbox"],input[type="radio"]');
    if (control && !control.matches(':disabled,[aria-disabled="true"]')) root.classList.add('gable-pressing');
  });
  document.addEventListener('pointerup', () => root.classList.remove('gable-pressing'));
  document.addEventListener('pointercancel', clearPointer);
  document.documentElement.addEventListener('pointerleave', clearPointer);
  window.addEventListener('blur', clearPointer);
  finePointer.addEventListener('change', clearPointer);

  // Count overlapping requests so one completed request cannot hide another's loading state.
  const originalFetch = window.fetch;
  let pending = 0;
  let delay;
  window.fetch = async function (...args) {
    if (pending++ === 0) delay = setTimeout(() => root.classList.add('gable-loading'), 200);
    try { return await originalFetch.apply(this, args); }
    finally {
      if (--pending === 0) {
        clearTimeout(delay);
        root.classList.remove('gable-loading');
      }
    }
  };
})();
