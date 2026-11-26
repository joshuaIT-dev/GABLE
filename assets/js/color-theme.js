(() => {
  const modes = ['light', 'current', 'dark'];
  const root = document.documentElement;
  const saved = localStorage.getItem('gable-theme-mode');
  const legacy = localStorage.getItem('gable-theme');
  root.dataset.theme = modes.includes(saved) ? saved : legacy === 'light' ? 'light' : 'current';

  const icons = {
    light: '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"></path>',
    current: '<circle cx="12" cy="12" r="9"></circle><path d="M12 3a9 9 0 0 0 0 18z"></path>',
    dark: '<path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"></path>'
  };
  const labels = { light: 'Light', current: 'Current GABLE colors', dark: 'Dark' };

  function sync(group) {
    group.querySelectorAll('[data-theme-choice]').forEach(button => {
      const mode = button.dataset.themeChoice;
      button.setAttribute('aria-pressed', String(root.dataset.theme === mode));
      button.setAttribute('aria-label', `${labels[mode]} color mode`);
      button.title = labels[mode];
    });
  }

  function mount() {
    const nav = document.querySelector('.nav-links');
    const mountPoint = document.querySelector('.theme-mount');
    if (!nav && !mountPoint) return;
    if (nav?.querySelector('.theme-toggle-item')) return;
    const item = document.createElement('li');
    item.className = 'theme-toggle-item';
    const group = document.createElement('div');
    group.className = 'theme-toggle-group';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Color theme');
    modes.forEach(mode => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'theme-toggle-option';
      button.dataset.themeChoice = mode;
      button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[mode]}</svg>`;
      button.addEventListener('click', () => {
        if (root.dataset.theme === mode) return;
        const bounds = button.getBoundingClientRect();
        root.style.setProperty('--theme-reveal-x', `${bounds.left + bounds.width / 2}px`);
        root.style.setProperty('--theme-reveal-y', `${bounds.top + bounds.height / 2}px`);
        const applyTheme = () => {
          root.dataset.theme = mode;
          localStorage.setItem('gable-theme-mode', mode);
          sync(group);
        };
        if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
          document.startViewTransition(applyTheme);
        } else applyTheme();
      });
      group.appendChild(button);
    });
    if (nav) {
      item.appendChild(group);
      nav.insertBefore(item, nav.firstElementChild);
    } else {
      mountPoint.appendChild(group);
    }
    sync(group);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  document.addEventListener('click', event => {
    document.querySelectorAll('.instructor-settings[open]').forEach(settings => {
      if (!settings.contains(event.target)) settings.open = false;
    });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') document.querySelectorAll('.instructor-settings[open]').forEach(settings => { settings.open = false; });
  });
})();
