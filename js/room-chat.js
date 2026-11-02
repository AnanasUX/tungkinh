(function () {
  'use strict';

  const PUBLIC_ROOM_ID = 'AN-CHUNG-AN-NHIEN';
  const queryRoom = new URLSearchParams(location.search).get('room');
  const style = document.createElement('style');

  style.textContent = `
    #room-chat-modal { color-scheme: dark; }
    .room-chat-shell { display:flex; flex-direction:column; width:min(980px,100%); max-height:min(760px,94dvh); overflow:hidden; background:linear-gradient(145deg,rgba(9,24,28,.99),rgba(10,16,20,.99)); border:1px solid rgba(121,214,176,.44); box-shadow:0 26px 90px rgba(0,0,0,.62),0 0 46px rgba(42,170,145,.14); }
    .room-chat-header { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; padding:20px 22px 16px; background:linear-gradient(110deg,rgba(18,61,58,.72),rgba(15,31,38,.72)); border-bottom:1px solid rgba(121,214,176,.2); }
    .room-chat-header h3 { margin:4px 0 6px; color:#fff5d6; font-family:Georgia,serif; font-size:clamp(1.2rem,2vw,1.55rem); line-height:1.15; }
    .room-kicker { color:#8ce7c3; font-size:.64rem; font-weight:900; letter-spacing:.16em; }
    .room-chat-subline { display:flex; flex-wrap:wrap; align-items:center; gap:8px; color:#b7d3c9; font-size:.73rem; }
    .room-room-code { color:#f5d68e; font-family:ui-monospace,SFMono-Regular,Consolas,monospace; font-weight:800; }
    .room-visibility { display:inline-flex; align-items:center; gap:5px; padding:4px 8px; border:1px solid rgba(121,214,176,.28); border-radius:999px; background:rgba(121,214,176,.1); color:#9de9c8; font-size:.62rem; font-weight:900; letter-spacing:.04em; }
    .room-visibility.is-private { border-color:rgba(245,214,142,.3); background:rgba(245,214,142,.08); color:#f5d68e; }
    .room-close { display:grid; place-items:center; flex:0 0 auto; width:36px; height:36px; border:1px solid rgba(255,255,255,.14); border-radius:50%; background:rgba(255,255,255,.07); color:#fff; font-size:1.45rem; line-height:1; cursor:pointer; transition:background .2s,transform .2s; }
    .room-close:hover { background:rgba(255,255,255,.16); transform:rotate(4deg); }
    .room-chat-toolbar { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 18px 0; border-bottom:1px solid rgba(255,255,255,.08); }
    .room-channel-tabs { display:flex; gap:6px; min-width:0; }
    .room-channel-tab { display:inline-flex; align-items:center; gap:6px; padding:10px 13px; border:1px solid transparent; border-bottom:0; border-radius:10px 10px 0 0; background:transparent; color:#9ebdb4; font-size:.75rem; font-weight:900; cursor:pointer; transition:color .2s,background .2s,border-color .2s; }
    .room-channel-tab:hover { color:#e4fff2; background:rgba(121,214,176,.08); }
    .room-channel-tab.is-active { color:#071713; background:#79d6b0; border-color:#9be7c8; }
    .room-sync-status { display:inline-flex; align-items:center; gap:6px; color:#9ebdb4; font-size:.65rem; white-space:nowrap; }
    .room-sync-dot { width:7px; height:7px; border-radius:50%; background:#f2ae4b; box-shadow:0 0 9px rgba(242,174,75,.7); }
    .room-sync-status.is-online .room-sync-dot { background:#67e8b1; box-shadow:0 0 9px rgba(103,232,177,.8); }
    .room-chat-grid { display:grid; grid-template-columns:minmax(0,1fr) 292px; min-height:520px; flex:1; overflow:hidden; }
    .room-chat-main { display:flex; flex-direction:column; min-width:0; min-height:0; }
    .room-channel-title { padding:12px 20px 0; color:#f5d68e; font-size:.78rem; font-weight:900; }
    .room-chat-messages { flex:1; min-height:0; overflow:auto; padding:15px 20px 20px; background:radial-gradient(circle at 50% 0,rgba(49,126,108,.1),transparent 48%),rgba(0,0,0,.16); scrollbar-width:thin; scrollbar-color:rgba(121,214,176,.35) transparent; }
    .room-chat-message { max-width:min(78%,560px); margin:0 0 13px; }
    .room-chat-message.is-self { margin-left:auto; text-align:right; }
    .room-chat-meta { display:flex; align-items:center; gap:8px; margin-bottom:4px; color:#a9c5bd; font-size:.67rem; }
    .room-chat-meta strong { color:#e4f2e9; }
    .room-chat-message.is-self .room-chat-meta { justify-content:flex-end; }
    .room-chat-bubble { display:inline-block; padding:10px 13px; border:1px solid rgba(121,214,176,.15); border-radius:14px 14px 14px 4px; background:#17322f; color:#f8f1e5; font-size:.83rem; line-height:1.45; text-align:left; white-space:pre-wrap; overflow-wrap:anywhere; }
    .room-chat-message.is-self .room-chat-bubble { border-color:rgba(245,214,142,.3); border-radius:14px 14px 4px 14px; background:linear-gradient(145deg,#b97d21,#8c5b17); color:#fff8e5; }
    .room-chat-empty { display:grid; place-items:center; min-height:210px; color:#96b5ab; text-align:center; font-size:.8rem; }
    .room-chat-empty strong { display:block; margin-bottom:5px; color:#f5d68e; font-size:1rem; }
    .room-chat-composer { display:flex; gap:8px; padding:12px 16px 14px; border-top:1px solid rgba(255,255,255,.1); background:rgba(6,13,15,.72); }
    .room-chat-composer input,.room-join-row input { min-width:0; flex:1; border:1px solid rgba(121,214,176,.28); border-radius:10px; outline:none; background:#071011; color:#fff; padding:11px 12px; font-size:.82rem; transition:border-color .2s,box-shadow .2s; }
    .room-chat-composer input:focus,.room-join-row input:focus { border-color:#79d6b0; box-shadow:0 0 0 3px rgba(121,214,176,.12); }
    .room-chat-composer button,.room-join-row button { min-width:64px; border:0; border-radius:10px; background:#79d6b0; color:#071713; font-weight:900; cursor:pointer; transition:filter .2s,transform .2s; }
    .room-chat-composer button:hover,.room-join-row button:hover { filter:brightness(1.12); }
    .room-chat-composer button:active,.room-join-row button:active { transform:scale(.97); }
    .room-chat-sidebar { overflow:auto; padding:17px 16px; border-left:1px solid rgba(121,214,176,.18); background:rgba(3,12,14,.34); scrollbar-width:thin; scrollbar-color:rgba(121,214,176,.3) transparent; }
    .room-side-title { display:block; margin-bottom:9px; color:#f5d68e; font-size:.72rem; font-weight:900; letter-spacing:.03em; }
    .room-side-caption { margin:-3px 0 10px; color:#8baaa0; font-size:.65rem; line-height:1.4; }
    .room-member { display:flex; align-items:center; gap:8px; padding:8px 0; border-bottom:1px solid rgba(255,255,255,.06); font-size:.75rem; }
    .room-member-avatar { display:grid; place-items:center; flex:0 0 auto; width:28px; height:28px; border:1px solid rgba(121,214,176,.25); border-radius:50%; background:#244c47; }
    .room-member-name { flex:1; min-width:0; overflow:hidden; color:#d7e7df; text-overflow:ellipsis; white-space:nowrap; }
    .room-member-state { color:#79d6b0; font-size:.8rem; }
    .room-mic-button,.room-secondary-action { width:100%; margin-top:12px; padding:10px; border:1px solid rgba(121,214,176,.35); border-radius:10px; background:rgba(121,214,176,.11); color:#b7efd9; font-weight:900; cursor:pointer; transition:background .2s,border-color .2s,transform .2s; }
    .room-mic-button:hover,.room-secondary-action:hover { background:rgba(121,214,176,.2); }
    .room-mic-button.is-live { border-color:#ff9588; background:#ba4138; color:#fff; }
    .room-join-label { margin-top:19px; }
    .room-join-row { display:flex; gap:6px; }
    .room-qr-card { display:flex; flex-direction:column; align-items:center; gap:8px; margin-top:17px; padding:12px; border:1px solid rgba(245,214,142,.16); border-radius:12px; background:rgba(255,255,255,.04); }
    #room-qr-canvas { width:142px; height:142px; image-rendering:pixelated; }
    #room-share-url { width:100%; overflow:hidden; color:#9ebdb4; font-size:.61rem; text-align:center; text-overflow:ellipsis; white-space:nowrap; }
    .room-chat-shell button:focus-visible,.room-chat-shell input:focus-visible { outline:2px solid #f5d68e; outline-offset:2px; }
    @media (max-width:760px) {
      .room-chat-shell { max-height:96dvh; border-radius:16px; }
      .room-chat-header { padding:16px 15px 13px; }
      .room-chat-toolbar { padding-inline:12px; }
      .room-channel-tab { padding-inline:9px; font-size:.68rem; }
      .room-sync-status { display:none; }
      .room-chat-grid { grid-template-columns:1fr; min-height:0; overflow:auto; }
      .room-chat-main { min-height:52dvh; }
      .room-chat-sidebar { max-height:33dvh; border-top:1px solid rgba(121,214,176,.18); border-left:0; }
      .room-chat-messages { padding-inline:13px; }
      .room-chat-message { max-width:88%; }
    }
    @media (max-width:420px) {
      .room-kicker { font-size:.55rem; letter-spacing:.1em; }
      .room-chat-header h3 { font-size:1.1rem; }
      .room-chat-subline { font-size:.65rem; }
      .room-channel-title { padding-inline:13px; }
      .room-chat-composer { padding-inline:10px; }
      .room-chat-composer input { font-size:.76rem; }
    }
  `;
  document.head.appendChild(style);

  const state = {
    roomId: (queryRoom || PUBLIC_ROOM_ID).trim().toUpperCase(),
    channel: 'lobby',
    messages: [],
    messageIds: new Set(),
    members: new Map(),
    stream: null,
    muted: true
  };

  function profile() {
    const current = window.currentUserProfile || {};
    return { name: current.dharmaName || current.fullName || 'Đồng Tu', avatar: current.avatarType || 'monk' };
  }

  function isPublicRoom() { return state.roomId === PUBLIC_ROOM_ID; }

  function makeRoomId() {
    return `AN-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
  }

  function roomUrl() {
    return isPublicRoom() ? `${location.origin}${location.pathname}` : `${location.origin}${location.pathname}?room=${encodeURIComponent(state.roomId)}`;
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function setRoomMeta() {
    const publicRoom = isPublicRoom();
    setText('room-code-label', publicRoom ? 'PHÒNG CHUNG' : state.roomId);
    setText('room-member-count', String(state.members.size + 1));
    setText('room-visibility-label', publicRoom ? 'MỞ · MỌI NGƯỜI CÙNG THẤY' : 'RIÊNG · CÓ MÃ MỜI');
    setText('room-chat-title', publicRoom ? 'Đạo tràng chung' : 'Phòng tu tập riêng');
    document.getElementById('room-visibility')?.classList.toggle('is-private', !publicRoom);
    setText('room-share-url', roomUrl());
  }

  function renderQr() {
    const canvas = document.getElementById('room-qr-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = 220;
    canvas.width = size;
    canvas.height = size;
    ctx.fillStyle = '#fffaf0';
    ctx.fillRect(0, 0, size, size);
    let seed = [...state.roomId].reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 17);
    const cells = 29;
    const cell = 7;
    const pad = 8;
    ctx.fillStyle = '#101817';
    const bit = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return (seed & 1) === 1; };
    const finder = (x, y) => {
      ctx.fillRect(pad + x * cell, pad + y * cell, 7 * cell, 7 * cell);
      ctx.fillStyle = '#fffaf0'; ctx.fillRect(pad + (x + 1) * cell, pad + (y + 1) * cell, 5 * cell, 5 * cell);
      ctx.fillStyle = '#101817'; ctx.fillRect(pad + (x + 2) * cell, pad + (y + 2) * cell, 3 * cell, 3 * cell);
    };
    finder(0, 0); finder(22, 0); finder(0, 22);
    for (let y = 0; y < cells; y += 1) for (let x = 0; x < cells; x += 1) {
      const inFinder = (x < 8 && y < 8) || (x >= 21 && y < 8) || (x < 8 && y >= 21);
      if (!inFinder && bit()) ctx.fillRect(pad + x * cell, pad + y * cell, cell, cell);
    }
  }

  function renderMembers() {
    const list = document.getElementById('room-members-list');
    if (!list) return;
    list.innerHTML = '';
    const me = profile();
    const all = [{ id: 'me', name: me.name, avatar: me.avatar, speaking: !state.muted, self: true }, ...state.members.values()];
    all.slice(0, 24).forEach(member => {
      const item = document.createElement('div');
      item.className = 'room-member';
      const avatar = member.avatar === 'female' ? '🧕' : '🧘';
      item.innerHTML = `<span class="room-member-avatar">${avatar}</span><span class="room-member-name"></span><span class="room-member-state">${member.speaking ? '●' : '○'}</span>`;
      item.querySelector('.room-member-name').textContent = `${member.name}${member.self ? ' · Bạn' : ''}`;
      list.appendChild(item);
    });
    setText('room-member-count', String(all.length));
  }

  function renderMessages() {
    const list = document.getElementById('room-chat-messages');
    if (!list) return;
    list.innerHTML = '';
    const messages = state.messages.filter(message => (message.channel || 'lobby') === state.channel).slice(-120);
    if (!messages.length) {
      list.innerHTML = '<div class="room-chat-empty"><div><strong>Không gian đang tĩnh lặng</strong><span>Hãy gửi lời lành đầu tiên cho đạo tràng.</span></div></div>';
    } else {
      messages.forEach(message => {
        const row = document.createElement('div');
        row.className = `room-chat-message${message.self ? ' is-self' : ''}`;
        row.innerHTML = '<div class="room-chat-meta"><strong></strong><time></time></div><div class="room-chat-bubble"></div>';
        row.querySelector('strong').textContent = message.name || 'Đồng Tu';
        row.querySelector('time').textContent = new Date(message.time || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        row.querySelector('.room-chat-bubble').textContent = message.text || '';
        list.appendChild(row);
      });
    }
    list.scrollTop = list.scrollHeight;
  }

  function addMessage(message) {
    if (!message || !message.text) return;
    const fallbackId = `${message.senderId || message.name || 'guest'}:${message.time || message.timestamp}:${message.text}`;
    const messageId = message.messageId || fallbackId;
    if (state.messageIds.has(messageId)) return;
    state.messageIds.add(messageId);
    state.messages.push({ ...message, messageId, time: message.time || message.timestamp || Date.now() });
    if (state.messages.length > 300) state.messages.splice(0, state.messages.length - 300);
  }

  function hydrateHistory(history) {
    if (!Array.isArray(history)) return;
    history.filter(message => message && message.roomId === state.roomId).forEach(message => addMessage({ ...message, self: message.senderId === window.RealtimeSanctuary?.clientId }));
    renderMessages();
  }

  function receive(payload) {
    if (!payload || payload.roomId !== state.roomId) return;
    if (payload.type === 'ROOM_CHAT') {
      addMessage({ ...payload, self: payload.senderId === window.RealtimeSanctuary?.clientId });
      renderMessages();
      return;
    }
    if (payload.type === 'ROOM_PRESENCE' && payload.senderId) {
      state.members.set(payload.senderId, { name: payload.name || 'Đồng Tu', avatar: payload.avatar, speaking: Boolean(payload.speaking) });
      renderMembers();
    }
  }

  function publish(payload) {
    if (window.RealtimeSanctuary) window.RealtimeSanctuary.publishMessage({ ...payload, roomId: state.roomId });
  }

  function ensureRoom() {
    setRoomMeta();
    renderQr();
    publish({ type: 'ROOM_PRESENCE', name: profile().name, avatar: profile().avatar, speaking: !state.muted });
    renderMembers();
    hydrateHistory(window.RealtimeSanctuary?.roomChatHistory || []);
  }

  function open() {
    ensureRoom();
    const modal = document.getElementById('room-chat-modal');
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
    renderMessages();
    document.getElementById('room-chat-input')?.focus();
  }

  function close() {
    const modal = document.getElementById('room-chat-modal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
  }

  async function toggleMic() {
    const button = document.getElementById('room-mic-button');
    try {
      if (!state.stream) state.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state.muted = !state.muted;
      state.stream.getAudioTracks().forEach(track => { track.enabled = !state.muted; });
      setText('room-mic-label', state.muted ? 'Bật mic' : 'Tắt mic');
      button?.classList.toggle('is-live', !state.muted);
      publish({ type: 'ROOM_PRESENCE', name: profile().name, avatar: profile().avatar, speaking: !state.muted });
      renderMembers();
    } catch (_) {
      window.showLiveGiftBanner?.('Microphone', 'Hãy cấp quyền microphone để nói chuyện trong đạo tràng.', 'bell');
    }
  }

  function send() {
    const input = document.getElementById('room-chat-input');
    const text = (input?.value || '').trim().slice(0, 500);
    if (!text) return;
    const message = { type: 'ROOM_CHAT', messageId: `${window.RealtimeSanctuary?.clientId || 'guest'}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, channel: state.channel, name: profile().name, text, time: Date.now(), self: true };
    addMessage(message);
    publish(message);
    if (input) input.value = '';
    renderMessages();
  }

  function setRoom(roomId) {
    state.roomId = (roomId || PUBLIC_ROOM_ID).trim().toUpperCase();
    state.messages = [];
    state.messageIds.clear();
    state.members.clear();
    setRoomMeta();
    renderQr();
  }

  window.openRoomChat = open;
  window.closeRoomChat = close;
  window.createRoomChat = function () { setRoom(makeRoomId()); open(); };
  window.joinRoomChat = function () {
    const entered = (document.getElementById('room-id-input')?.value || '').trim().toUpperCase();
    if (entered) { setRoom(entered); open(); }
  };
  window.toggleRoomMic = toggleMic;
  window.sendRoomChat = send;
  window.copyRoomInvite = async function () {
    try {
      await navigator.clipboard.writeText(roomUrl());
      setText('room-copy-label', 'Đã sao chép liên kết');
      setTimeout(() => setText('room-copy-label', 'Sao chép lời mời'), 1800);
    } catch (_) {}
  };
  window.handleRoomMessageKey = function (event) {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); }
  };
  window.switchRoomChannel = function (channel) {
    state.channel = channel === 'dm' ? 'dm' : 'lobby';
    document.querySelectorAll('.room-channel-tab').forEach(tab => tab.classList.toggle('is-active', tab.dataset.channel === state.channel));
    setText('room-channel-title', state.channel === 'dm' ? 'Nhắn tin riêng' : (isPublicRoom() ? 'Toàn phòng tu · mọi người cùng thấy' : 'Toàn phòng trong room này'));
    renderMessages();
  };

  function injectRoomUi() {
    if (document.getElementById('room-chat-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'room-chat-modal';
    modal.className = 'hidden fixed inset-0 z-[130] bg-black/85 backdrop-blur-md items-center justify-center p-2 sm:p-4';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'room-chat-title');
    modal.innerHTML = `
      <div class="room-chat-shell rounded-2xl text-amber-50 relative" onclick="event.stopPropagation()">
        <header class="room-chat-header">
          <div>
            <div class="room-kicker">ĐẠO TRÀNG AN NHIÊN · CHAT & VOICE</div>
            <h3 id="room-chat-title">Đạo tràng chung</h3>
            <div class="room-chat-subline"><span id="room-visibility" class="room-visibility"><span>●</span><span id="room-visibility-label">MỞ · MỌI NGƯỜI CÙNG THẤY</span></span><span>Mã: <strong id="room-code-label" class="room-room-code">PHÒNG CHUNG</strong></span><span>· <strong id="room-member-count">1</strong> người</span></div>
          </div>
          <button type="button" onclick="closeRoomChat()" class="room-close" aria-label="Đóng chat">×</button>
        </header>
        <div class="room-chat-toolbar">
          <div class="room-channel-tabs" role="tablist" aria-label="Luồng chat">
            <button type="button" class="room-channel-tab is-active" data-channel="lobby" onclick="switchRoomChannel('lobby')" role="tab">🌐 Toàn phòng tu</button>
            <button type="button" class="room-channel-tab" data-channel="dm" onclick="switchRoomChannel('dm')" role="tab">🔒 Nhắn tin riêng</button>
          </div>
          <div id="room-sync-status" class="room-sync-status"><span class="room-sync-dot"></span><span>Đang đồng bộ</span></div>
        </div>
        <div class="room-chat-grid">
          <section class="room-chat-main" aria-label="Tin nhắn phòng">
            <div id="room-channel-title" class="room-channel-title">Toàn phòng tu · mọi người cùng thấy</div>
            <div id="room-chat-messages" class="room-chat-messages" aria-live="polite"></div>
            <div class="room-chat-composer"><input id="room-chat-input" onkeydown="handleRoomMessageKey(event)" placeholder="Gửi lời lành cho đạo tràng..." maxlength="500" autocomplete="off"><button type="button" onclick="sendRoomChat()" aria-label="Gửi tin nhắn">Gửi</button></div>
          </section>
          <aside class="room-chat-sidebar" aria-label="Thông tin phòng">
            <span class="room-side-title">Thành viên đang tu</span>
            <p class="room-side-caption">Mọi người trong cùng mã phòng sẽ thấy tin nhắn chung và trạng thái mic.</p>
            <div id="room-members-list"></div>
            <button type="button" id="room-mic-button" onclick="toggleRoomMic()" class="room-mic-button">🎙 <span id="room-mic-label">Bật mic</span></button>
            <button type="button" onclick="createRoomChat()" class="room-secondary-action">＋ Tạo room riêng</button>
            <label for="room-id-input" class="room-side-title room-join-label">Tham gia bằng mã</label>
            <div class="room-join-row"><input id="room-id-input" placeholder="AN-XXXX-XXXX" autocomplete="off"><button type="button" onclick="joinRoomChat()">Vào</button></div>
            <div class="room-qr-card"><canvas id="room-qr-canvas" aria-label="Mã mời room"></canvas><strong id="room-share-url"></strong><button type="button" onclick="copyRoomInvite()" class="room-secondary-action"><span id="room-copy-label">Sao chép lời mời</span></button></div>
          </aside>
        </div>
      </div>`;
    modal.addEventListener('click', close);
    document.body.appendChild(modal);
    setRoomMeta();
    renderQr();
    renderMembers();
    hydrateHistory(window.RealtimeSanctuary?.roomChatHistory || []);
  }

  window.addEventListener('room-realtime-message', event => receive(event.detail));
  window.addEventListener('room-chat-history', event => hydrateHistory(event.detail));
  window.addEventListener('keydown', event => { if (event.key === 'Escape' && !document.getElementById('room-chat-modal')?.classList.contains('hidden')) close(); });
  window.addEventListener('beforeunload', () => state.stream?.getTracks().forEach(track => track.stop()));
  window.addEventListener('load', injectRoomUi);
  document.addEventListener('DOMContentLoaded', injectRoomUi, { once: true });
  if (document.readyState !== 'loading') injectRoomUi();
})();
