let sbOpen = false;
let sbHistory = [];
let sbCurrentSubject = null;
let sbIsTyping = false;
let sbQuizHidden = false;
let sbRequest = null;

let sbChatId = null;
let sbChats = [];
let sbLoadVersion = 0;
let sbRetryRequest = null;
const sbDrafts = new Map();

document.addEventListener('DOMContentLoaded', () => {
  document.body.insertAdjacentHTML('beforeend', `
    <button class="sb-bubble" id="sb-bubble" onclick="sbToggle()" aria-label="Open Study Buddy" aria-controls="sb-window" aria-expanded="false"><i data-lucide="messages-square" aria-hidden="true"></i><span class="sb-bubble-label">Study Buddy</span><span class="sb-unread" id="sb-unread" hidden>1</span></button>
    <section class="sb-window" id="sb-window" aria-label="Study Buddy conversation" hidden>
      <div class="sb-header"><div class="sb-header-left"><span class="sb-avatar"><i data-lucide="messages-square" aria-hidden="true"></i></span><div><h3 class="sb-header-title" id="sb-chat-title">Study Buddy</h3><p class="sb-header-sub" id="sb-status">Your space to understand and practice</p></div></div><div class="sb-header-right"><button id="sb-expand-btn" onclick="switchTab('studybuddy')" title="Open full view" aria-label="Open Study Buddy full view"><i data-lucide="maximize-2" aria-hidden="true"></i></button><button id="sb-minimize-btn" onclick="sbMinimize()" title="Use floating chat" aria-label="Use floating chat" hidden><i data-lucide="minimize-2" aria-hidden="true"></i></button><button class="sb-btn-clear" onclick="sbDelete(sbChatId)" title="Delete conversation" aria-label="Delete conversation"><i data-lucide="trash-2" aria-hidden="true"></i></button><button class="sb-btn-close" id="sb-close-btn" onclick="sbToggle()" aria-label="Close Study Buddy"><i data-lucide="x" aria-hidden="true"></i></button></div></div>
      <div class="sb-messages" id="sb-messages" role="log" aria-live="polite" aria-label="Conversation"></div>
      <div class="sb-typing" id="sb-typing" role="status" hidden>Study Buddy is thinking...</div>
      <form class="sb-input-row" onsubmit="event.preventDefault();sbSend()"><label class="sr-only" for="sb-input">Message Study Buddy</label><textarea class="sb-input" id="sb-input" placeholder="What would you like to understand?" rows="2" maxlength="2000" onkeydown="if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();sbSend()}"></textarea><button class="sb-send-btn" id="sb-send-btn" type="submit" aria-label="Send message"><i data-lucide="arrow-up" aria-hidden="true"></i></button></form>
      <div class="sb-composer-note">Enter to send &middot; Shift + Enter for a new line</div>
    </section>`);
  sbAddMessage('bot', 'Welcome to your study space. Ask about a concept, work through an example, or tell me what you want to review.');
  sbSyncView();
  sbLoadHistory(true);
  const battle = document.getElementById('modal-battle');
  if (battle) new MutationObserver(() => sbSetQuizHidden(battle.classList.contains('open')))
    .observe(battle, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && sbOpen && !sbIsFullView()) sbToggle();
  });
});

function sbIsFullView() {
  return Boolean(document.getElementById('panel-studybuddy')?.classList.contains('active'));
}
function sbSyncView() {
  const chat = document.getElementById('sb-window');
  const bubble = document.getElementById('sb-bubble');
  if (!chat || !bubble) return;
  const full = sbIsFullView();
  const host = full ? document.getElementById('studybuddy-chat-host') : document.body;
  if (chat.parentElement !== host) {
    host.appendChild(chat);
    if (!full) sbOpen = false;
  }
  chat.classList.toggle('sb-full-view', full);
  chat.hidden = sbQuizHidden || (!full && !sbOpen);
  chat.classList.toggle('open', !chat.hidden);
  bubble.hidden = full || sbQuizHidden;
  bubble.classList.toggle('active', sbOpen);
  bubble.setAttribute('aria-expanded', String(sbOpen && !chat.hidden));
  document.getElementById('sb-expand-btn').hidden = full;
  document.getElementById('sb-minimize-btn').hidden = !full;
  document.getElementById('sb-close-btn').hidden = full;
  if (full || sbOpen) document.getElementById('sb-unread').hidden = true;
  document.querySelector('.main')?.classList.toggle('studybuddy-expanded', full);
  if (full) sbRenderSubjects();
  sbScrollBottom();
}
function sbSetQuizHidden(hidden) {
  sbQuizHidden = hidden;
  if (hidden) sbOpen = false;
  sbSyncView();
}
function sbToggle() {
  if (sbQuizHidden) return;
  if (sbIsFullView()) { document.getElementById('sb-input').focus(); return; }
  sbOpen = !sbOpen;
  sbSyncView();
  document.getElementById(sbOpen ? 'sb-input' : 'sb-bubble').focus();
}
function sbMinimize() {
  switchTab('home');
  sbOpen = true;
  sbSyncView();
  document.getElementById('sb-input').focus();
}
function sbRenderSubjects() {
  const select = document.getElementById('sb-subject-select');
  const subjects = getStudentSubjects();
  select.replaceChildren(new Option('Any subject', ''), ...subjects.map(subject => new Option(subject, subject)));
  select.value = subjects.includes(sbCurrentSubject) ? sbCurrentSubject : '';
}
function sbSetSubject(subject) {
  sbCurrentSubject = subject || null;
  document.getElementById('sb-input').placeholder = subject ? `Ask about ${subject}...` : 'What would you like to understand?';
  document.getElementById('sb-input').focus();
}
function sbPrompt(kind) {
  const topic = sbCurrentSubject || 'a topic I am studying';
  const prompts = {
    explain: `Help me understand a concept in ${topic}. Ask which concept I want to explore first.`,
    practice: `Help me practice ${topic} with one question at a time. Wait for my answer before explaining.`,
    review: `Help me make a review plan for ${topic}. Ask what I need to cover first.`
  };
  document.getElementById('sb-input').value = prompts[kind] || '';
  document.getElementById('sb-input').focus();
}
async function sbApi(action, values = {}, signal) {
  const query = !action && values.chat_id ? `?chat_id=${encodeURIComponent(values.chat_id)}` : '';
  const response = await fetch('../assets/php/studybuddy.php' + query, {
    method: action ? 'POST' : 'GET', credentials: 'include', cache: 'no-store', signal,
    headers: { 'Content-Type': 'application/json' },
    ...(action ? { body: JSON.stringify({ action, ...values }) } : {})
  });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.message || 'Study Buddy is unavailable.');
  return data;
}
function sbRenderHistory() {
  const list = document.getElementById('sb-history-list');
  list.replaceChildren();
  if (!sbChats.length) {
    const empty = document.createElement('p'); empty.className = 'sb-history-empty';
    empty.textContent = 'No conversations yet. Start a chat to save your study history.'; list.append(empty); return;
  }
  for (const chat of sbChats) {
    const row = document.createElement('div'); row.className = 'sb-history-item';
    row.classList.toggle('selected', Number(chat.chat_id) === sbChatId);
    const open = document.createElement('button'); open.className = 'sb-history-open';
    open.setAttribute('aria-current', Number(chat.chat_id) === sbChatId ? 'true' : 'false');
    const title = document.createElement('strong'); title.textContent = chat.title;
    const date = document.createElement('span'); date.textContent = new Date(chat.updated_at.replace(' ', 'T')).toLocaleDateString('en-PH', {month:'short',day:'numeric'});
    open.append(title, date); open.onclick = () => sbOpenChat(Number(chat.chat_id));
    const actions = document.createElement('div'); actions.className = 'sb-history-actions';
    const rename = document.createElement('button'); rename.textContent = 'Rename'; rename.onclick = () => sbRename(chat, row);
    const remove = document.createElement('button'); remove.textContent = 'Delete'; remove.onclick = () => sbDelete(Number(chat.chat_id));
    actions.append(rename, remove); row.append(open, actions); list.append(row);
  }
}
async function sbLoadHistory(restore = false) {
  try {
    const data = await sbApi(null); sbChats = data.chats; sbRenderHistory();
    if (restore && !sbChatId && !sbIsTyping && !document.getElementById('sb-input').value && sbChats.length) await sbOpenChat(Number(sbChats[0].chat_id));
  } catch (error) {
    document.getElementById('sb-history-list').textContent = error.message;
  }
}
function sbCancelRequest() {
  if (sbRequest) sbRequest.abort();
  sbRequest = null; sbLoadVersion++; sbSetTyping(false);
}
function sbDisplayChat(data) {
  sbChatId = Number(data.chat.chat_id); sbCurrentSubject = data.chat.subject || null;
  document.getElementById('sb-chat-title').textContent = data.chat.title;
  sbHistory = data.messages.map(message => ({role:message.role,content:message.content}));
  document.getElementById('sb-messages').replaceChildren();
  if (!data.messages.length) sbAddMessage('bot','A fresh conversation. What would you like to work on?');
  for (const message of data.messages) sbAddMessage(message.role === 'user' ? 'user' : 'bot', message.content, message.created_at);
  document.getElementById('sb-input').placeholder = sbCurrentSubject ? `Ask about ${sbCurrentSubject}...` : 'What would you like to understand?';
  sbRenderSubjects(); sbRenderHistory();
}
async function sbOpenChat(id) {
  sbDrafts.set(sbChatId, document.getElementById('sb-input').value);
  sbCancelRequest(); const version = sbLoadVersion; sbSetTyping(true);
  try {
    const data = await sbApi(null, {chat_id:id});
    if (version !== sbLoadVersion) return;
    sbDisplayChat(data); document.getElementById('sb-input').value = sbDrafts.get(id) || '';
  } catch (error) { if (version === sbLoadVersion) showToast('!',error.message); }
  finally { if (version === sbLoadVersion) sbSetTyping(false); }
}
async function sbNewChat() {
  sbDrafts.set(sbChatId, document.getElementById('sb-input').value);
  sbCancelRequest(); const version = sbLoadVersion; sbSetTyping(true);
  try {
    const data = await sbApi('create');
    if (version !== sbLoadVersion) return;
    sbDisplayChat(data); document.getElementById('sb-input').value = '';
    await sbLoadHistory(); document.getElementById('sb-input').focus();
  } catch (error) { if (version === sbLoadVersion) showToast('!',error.message); }
  finally { if (version === sbLoadVersion) sbSetTyping(false); }
}
function sbRename(chat, row) {
  if (row.querySelector('form')) return;
  const form = document.createElement('form'); form.className = 'sb-rename-form';
  const input = document.createElement('input'); input.value = chat.title; input.maxLength = 100; input.required = true; input.setAttribute('aria-label','Conversation title');
  const save = document.createElement('button'); save.type = 'submit'; save.textContent = 'Save';
  const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'Cancel'; cancel.onclick = () => form.remove();
  form.append(input,save,cancel); row.append(form); input.focus();
  form.onsubmit = async event => {
    event.preventDefault(); save.disabled = true;
    try {
      const data = await sbApi('rename',{chat_id:chat.chat_id,title:input.value.trim()});
      if (Number(chat.chat_id) === sbChatId) document.getElementById('sb-chat-title').textContent = data.chat.title;
      await sbLoadHistory();
    } catch (error) { showToast('!',error.message); save.disabled = false; }
  };
}
function sbDelete(id) {
  if (!id) { sbClearLocal(); return; }
  showConfirm('Delete this conversation?', 'This removes the conversation and all its saved messages.', 'Delete', async () => {
    if (id === sbChatId) sbCancelRequest();
    try {
      await sbApi('delete',{chat_id:id}); sbDrafts.delete(id);
      if (id === sbChatId) sbClearLocal();
      await sbLoadHistory();
    } catch (error) { showToast('!',error.message); }
  });
}
async function sbSend() {
  const input = document.getElementById('sb-input'); const text = input.value.trim();
  if (!text || sbIsTyping) return;
  sbSetTyping(true);
  const controller = new AbortController(); sbRequest = controller;
  const subject = sbCurrentSubject || '';
  const timeout = setTimeout(() => controller.abort(), 40000);
  try {
    if (!sbChatId) {
      const created = await sbApi('create',{},controller.signal);
      if (sbRequest !== controller) return;
      sbChatId = Number(created.chat.chat_id);
    }
    const id = sbChatId;
    const retry = sbRetryRequest;
    const requestId = retry && retry.id === id && retry.text === text ? retry.requestId : crypto.randomUUID();
    sbRetryRequest = {id,text,requestId};
    input.value = ''; sbAddMessage('user',text);
    const data = await sbApi('send',{chat_id:id,message:text,subject,request_id:requestId},controller.signal);
    if (sbRequest !== controller) return;
    sbRetryRequest = null; sbDrafts.delete(id); sbDisplayChat(data);
    await sbLoadHistory();
    if (!sbIsFullView() && !sbOpen) document.getElementById('sb-unread').hidden = false;
  } catch (error) {
    if (sbRequest !== controller) return;
    sbAddMessage('bot', error.name === 'AbortError' ? 'The reply is taking longer than expected. Retry your question or reopen this conversation to check for a saved reply.' : error.message);
    if (!input.value) input.value = text;
  } finally {
    clearTimeout(timeout);
    if (sbRequest === controller) { sbRequest = null; sbSetTyping(false); }
  }
}
function sbFormatReply(bubble, text) {
  let list = null;
  for (const line of String(text).split('\n')) {
    if (!line.trim()) { list = null; continue; }
    const bullet = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.+)/);
    let block;
    if (bullet) {
      const tag = /^\s*\d/.test(line) ? 'ol' : 'ul';
      if (!list || list.tagName.toLowerCase() !== tag) {
        list = document.createElement(tag); bubble.append(list);
      }
      block = document.createElement('li'); list.append(block);
    } else {
      list = null; block = document.createElement('p'); bubble.append(block);
    }
    const content = bullet ? bullet[1] : line.replace(/^#{1,6}\s+/, '');
    for (const part of content.split(/(\*\*[^*]+\*\*)/g)) {
      if (part.startsWith('**') && part.endsWith('**')) {
        const strong = document.createElement('strong'); strong.textContent = part.slice(2, -2); block.append(strong);
      } else block.append(document.createTextNode(part));
    }
  }
}

function sbAddMessage(role, text, timestamp = null) {
  const row = document.createElement('div');
  row.className = `sb-msg sb-msg-${role === 'user' ? 'user' : 'bot'}`;
  const bubble = document.createElement('div');
  bubble.className = 'sb-msg-bubble';
  if (role === 'user') bubble.textContent = text;
  else sbFormatReply(bubble, text);
  const time = document.createElement('div');
  time.className = 'sb-msg-time';
  time.textContent = (timestamp ? new Date(timestamp.replace(' ', 'T')) : new Date()).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
  row.append(bubble, time);
  document.getElementById('sb-messages').appendChild(row);
  sbScrollBottom();
}
function sbSetTyping(typing) {
  sbIsTyping = typing;
  document.getElementById('sb-typing').hidden = !typing;
  document.getElementById('sb-send-btn').disabled = typing;
  document.getElementById('sb-status').textContent = typing ? 'Thinking about your question...' : 'Your space to understand and practice';
}
function sbScrollBottom() {
  const messages = document.getElementById('sb-messages');
  if (messages) messages.scrollTop = messages.scrollHeight;
}
function sbClearLocal() {
  sbCancelRequest(); sbChatId = null; sbHistory = []; sbRetryRequest = null; sbCurrentSubject = null;
  document.getElementById('sb-chat-title').textContent = 'Study Buddy';
  document.getElementById('sb-subject-select').value = '';
  document.getElementById('sb-input').value = '';
  document.getElementById('sb-input').placeholder = 'What would you like to understand?';
  document.getElementById('sb-messages').replaceChildren();
  document.getElementById('sb-unread').hidden = true;
  sbAddMessage('bot', 'Start a new conversation or reopen a chat from your history.');
  sbRenderHistory();
}
function sbClear() { sbDelete(sbChatId); }
