(() => {
  const emojiPattern = /(?:\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*(?:\p{Emoji_Modifier})?|\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3)/gu;
  const icons = new Map([
    ['\u{23F1}\u{FE0F}', 'clock'],
    ['\u{23F1}', 'clock'],
    ['\u{23F2}\u{FE0F}', 'clock'],
    ['\u{23F2}', 'clock'],
    ['\u{23F0}', 'clock'],
    ['\u{1F550}', 'clock'],
    ['\u{26A0}\u{FE0F}', 'triangle-alert'],
    ['\u{26A0}', 'triangle-alert'],
    ['\u{1F3AE}', 'gamepad-2'],
    ['\u{1F4B0}', 'coins'],
    ['\u{1F4CB}', 'clipboard-list'],
    ['\u{1F451}', 'crown'],
    ['\u{1F468}\u{200D}\u{1F4BB}', 'code-xml'],
    ['\u{1F468}\u{200D}\u{1F3EB}', 'graduation-cap'],
    ['\u{1F4AC}', 'message-circle'],
    ['\u{1F4E7}', 'mail'],
    ['\u{1F4DE}', 'phone'],
    ['\u{1F465}', 'users'],
    ['\u{1F393}', 'graduation-cap'],
    ['\u{1F4DD}', 'notebook-pen'],
    ['\u{2B50}', 'star'],
    ['\u{1F514}', 'bell'],
    ['\u{1F3C6}', 'trophy'],
    ['\u{1F527}', 'wrench'],
    ['\u{1F512}', 'lock'],
    ['\u{1FA91}', 'armchair'],
    ['\u{1F500}', 'shuffle'],
    ['\u{1F9E9}', 'puzzle'],
    ['\u{1F4C8}', 'chart-no-axes-column-increasing'],
    ['\u{1F3EB}', 'school'],
    ['\u{1F3E0}', 'house'],
    ['\u{1F50D}', 'search'],
    ['\u{1F4E2}', 'megaphone'],
    ['\u{1F4ED}', 'mail-open'],
    ['\u{1F464}', 'user-round'],
    ['\u{1F441}', 'eye'],
    ['\u{1F648}', 'eye-off'],
    ['\u{1F4BB}', 'laptop'],
    ['\u{1F4D0}', 'ruler'],
    ['\u{1F6A9}', 'flag'],
    ['\u{1F4BE}', 'save'],
    ['\u{1F525}', 'flame'],
    ['\u{1F381}', 'gift'],
    ['\u{1F392}', 'backpack'],
    ['\u{1F3DB}\u{FE0F}', 'landmark'],
    ['\u{1F6E1}\u{FE0F}', 'shield'],
    ['\u{1F916}', 'bot'],
    ['\u{1F680}', 'rocket'],
    ['\u{2753}', 'circle-help'],
    ['\u{2715}', 'x'],
    ['\u{2716}', 'x'],
    ['\u{2717}', 'x'],
    ['\u{2718}', 'x'],
    ['\u{274E}', 'x'],
    ['\u{1F4D6}', 'book-open'],
    ['\u{1F3AF}', 'target'],
    ['\u{1F4A1}', 'lightbulb'],
    ['\u{1F4B2}', 'circle-dollar-sign'],
    ['\u{270F}\u{FE0F}', 'pencil'],
    ['\u{1F3C5}', 'medal'],
    ['\u{2705}', 'circle-check'],
    ['\u{26A1}', 'zap'],
    ['\u{2699}\u{FE0F}', 'settings'],
    ['\u{2795}', 'circle-plus'],
    ['\u{1F947}', 'medal'],
    ['\u{1F948}', 'medal'],
    ['\u{1F949}', 'medal'],
    ['\u{1F5D1}\u{FE0F}', 'trash-2'],
    ['\u{1F5D1}', 'trash-2'],
    ['\u{1F5D3}\u{FE0F}', 'calendar-days'],
    ['\u{1F4E5}', 'inbox'],
    ['\u{1F4E1}', 'radio-tower'],
    ['\u{1F6A8}', 'siren'],
    ['\u{1F4CC}', 'pin'],
    ['\u{1F9CA}', 'snowflake'],
    ['\u{1F91D}', 'handshake'],
    ['\u{1F9E0}', 'brain'],
    ['\u{1F579}\u{FE0F}', 'joystick'],
    ['\u{1F3C1}', 'flag-triangle-right'],
    ['\u{1F39F}\u{FE0F}', 'ticket'],
    ['\u{1F534}', 'circle'],
    ['\u{1F535}', 'circle'],
    ['\u{1F7E1}', 'circle'],
    ['\u{1F7E2}', 'circle'],
    ['\u{1F7E0}', 'circle'],
    ['\u{1FA77}', 'heart'],
    ['\u{1F49C}', 'heart'],
    ['\u{2764}\u{FE0F}', 'heart'],
    ['\u{274C}', 'circle-x'],
    ['\u{1F6AB}', 'ban'],
    ['\u{1F44B}', 'hand'],
    ['\u{1F440}', 'eye'],
    ['\u{1F4AD}', 'message-circle'],
    ['\u{1F4DA}', 'library-big'],
    ['\u{1F4F6}', 'radio-tower'],
    ['\u{1F9D1}\u{200D}\u{1F4BB}', 'code-xml'],
    ['\u{1F9D1}\u{200D}\u{1F3EB}', 'graduation-cap']
  ]);

  function convert(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (emojiPattern.test(node.nodeValue)) { nodes.push(node); emojiPattern.lastIndex = 0; }
      else emojiPattern.lastIndex = 0;
    }
    let changed = false;
    for (const node of nodes) {
      if (!node.parentElement || node.parentElement.closest('script,style,textarea,code,pre,svg')) continue;
      if (!emojiPattern.test(node.nodeValue.replace(/\s/g, ''))) emojiPattern.lastIndex = 0;
      else {
        emojiPattern.lastIndex = 0;
        if (/icon|emoji/i.test(node.parentElement.className)) node.parentElement.classList.add('lucide-icon');
      }
      const fragment = document.createDocumentFragment();
      let last = 0;
      for (const match of node.nodeValue.matchAll(emojiPattern)) {
        fragment.append(document.createTextNode(node.nodeValue.slice(last, match.index)));
        const icon = document.createElement('i');
        const symbol = match[0].replace(/[\uFE0E\uFE0F]/g, '');
        icon.setAttribute('data-lucide', icons.get(match[0]) || icons.get(symbol) || 'sparkles');
        icon.setAttribute('aria-hidden', 'true');
        const medalClass = match[0] === '\u{1F947}' ? ' emoji-medal-gold' : match[0] === '\u{1F948}' ? ' emoji-medal-silver' : match[0] === '\u{1F949}' ? ' emoji-medal-bronze' : '';
        icon.className = 'emoji-lucide' + medalClass;
        fragment.append(icon);
        last = match.index + match[0].length;
      }
      fragment.append(document.createTextNode(node.nodeValue.slice(last)));
      node.replaceWith(fragment);
      changed = true;
    }
    const hasUnrenderedIcon = root.nodeType === Node.ELEMENT_NODE &&
      (root.matches('[data-lucide]:not(svg)') || root.querySelector('[data-lucide]:not(svg)'));
    if (changed || hasUnrenderedIcon) lucide.createIcons();
  }

  convert(document.body);
  new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'characterData') convert(record.target.parentElement);
      for (const node of record.addedNodes || []) {
        if (node.nodeType === Node.TEXT_NODE) convert(node.parentElement);
        else if (node.nodeType === Node.ELEMENT_NODE) convert(node);
      }
    }
  }).observe(document.body, { childList: true, characterData: true, subtree: true });
})();
