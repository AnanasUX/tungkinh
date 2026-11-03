(function () {
  'use strict';

  const PUBLIC_ROOM_ID = 'AN-CHUNG-AN-NHIEN';
  const queryRoom = new URLSearchParams(location.search).get('room');
  const style = document.createElement('style');

  // STUN servers for WebRTC P2P Voice
  const RTC_CONFIG = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ]
  };

  style.textContent = `
    #room-chat-modal {
      color-scheme: dark;
    }

    /* Outer Shell: Sacred Sandalwood & Imperial Gold Glassmorphism */
    .room-chat-shell {
      display: flex;
      flex-direction: column;
      width: min(980px, 96vw);
      max-height: min(740px, 92dvh);
      overflow: hidden;
      background: linear-gradient(165deg, rgba(38, 19, 8, 0.97) 0%, rgba(20, 9, 3, 0.98) 50%, rgba(10, 4, 1, 0.99) 100%);
      border: 1.5px solid rgba(245, 190, 80, 0.5);
      border-radius: 24px;
      box-shadow: 0 25px 80px rgba(0, 0, 0, 0.9), 0 0 40px rgba(245, 180, 60, 0.18), inset 0 1px 0 rgba(255, 240, 180, 0.3);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
    }

    /* Header: Sacred Lotus Title & Controls */
    .room-chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 22px;
      background: linear-gradient(110deg, rgba(58, 28, 10, 0.85) 0%, rgba(30, 14, 5, 0.9) 100%);
      border-bottom: 1.5px solid rgba(245, 190, 80, 0.35);
      position: relative;
    }
    .room-chat-header::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 20%;
      right: 20%;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255, 230, 140, 0.6), transparent);
    }

    .room-header-left {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
    }

    .room-lotus-emblem {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: radial-gradient(circle, #b4751e 0%, #5c3008 100%);
      border: 1.5px solid rgba(255, 230, 140, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      box-shadow: 0 0 16px rgba(245, 180, 60, 0.4);
      flex-shrink: 0;
    }

    .room-chat-header h3 {
      margin: 2px 0 3px;
      color: #fff9e6;
      font-family: 'Lora', Georgia, serif;
      font-size: clamp(1.15rem, 1.8vw, 1.45rem);
      font-weight: 700;
      letter-spacing: 0.02em;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8), 0 0 14px rgba(245, 190, 80, 0.3);
    }

    .room-kicker {
      color: #f6c863;
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .room-chat-subline {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      color: #dfcaa2;
      font-size: 0.74rem;
    }

    .room-room-code {
      color: #ffd875;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-weight: 800;
      padding: 1px 6px;
      border-radius: 6px;
      background: rgba(245, 190, 80, 0.12);
      border: 1px solid rgba(245, 190, 80, 0.3);
    }

    .room-visibility {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 9px;
      border: 1px solid rgba(245, 190, 80, 0.4);
      border-radius: 999px;
      background: rgba(245, 190, 80, 0.15);
      color: #ffe699;
      font-size: 0.64rem;
      font-weight: 800;
      letter-spacing: 0.04em;
    }
    .room-visibility.is-private {
      border-color: rgba(248, 113, 113, 0.45);
      background: rgba(239, 68, 68, 0.15);
      color: #fca5a5;
    }

    .room-close {
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      width: 36px;
      height: 36px;
      border: 1.5px solid rgba(255, 230, 140, 0.35);
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.08);
      color: #ffe8a3;
      font-size: 1.4rem;
      line-height: 1;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    }
    .room-close:hover {
      background: rgba(245, 190, 80, 0.25);
      border-color: rgba(255, 235, 160, 0.7);
      color: #ffffff;
      transform: rotate(90deg) scale(1.08);
    }

    /* Channel Toolbar */
    .room-chat-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 20px 0;
      background: rgba(18, 8, 3, 0.6);
      border-bottom: 1px solid rgba(245, 190, 80, 0.2);
    }

    .room-channel-tabs {
      display: flex;
      gap: 8px;
      min-width: 0;
    }

    .room-channel-tab {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px 15px;
      border: 1.5px solid transparent;
      border-bottom: 0;
      border-radius: 12px 12px 0 0;
      background: transparent;
      color: #d1b88e;
      font-size: 0.78rem;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .room-channel-tab:hover {
      color: #fff2c6;
      background: rgba(245, 190, 80, 0.1);
    }
    .room-channel-tab.is-active {
      color: #2b1306;
      background: linear-gradient(180deg, #fce49c 0%, #e5b34a 100%);
      border-color: rgba(255, 235, 160, 0.7);
      box-shadow: 0 -2px 10px rgba(245, 190, 80, 0.25);
    }

    .room-sync-status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #d4bc92;
      font-size: 0.68rem;
      white-space: nowrap;
    }
    .room-sync-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #f59e0b;
      box-shadow: 0 0 10px rgba(245, 158, 11, 0.8);
    }
    .room-sync-status.is-online .room-sync-dot {
      background: #10b981;
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.9);
    }

    /* Main Grid Layout */
    .room-chat-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 280px;
      min-height: 480px;
      flex: 1;
      overflow: hidden;
    }

    .room-chat-main {
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 0;
      background: radial-gradient(circle at 50% 12%, rgba(245, 190, 80, 0.05) 0%, transparent 55%), rgba(12, 5, 2, 0.4);
    }

    .room-channel-title {
      padding: 10px 20px 6px;
      color: #f7d48a;
      font-size: 0.74rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
      border-bottom: 1px solid rgba(245, 190, 80, 0.1);
    }

    .room-chat-messages {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 16px 20px;
      scrollbar-width: thin;
      scrollbar-color: rgba(245, 190, 80, 0.35) transparent;
    }
    .room-chat-messages::-webkit-scrollbar {
      width: 6px;
    }
    .room-chat-messages::-webkit-scrollbar-thumb {
      background: rgba(245, 190, 80, 0.3);
      border-radius: 4px;
    }

    .room-chat-message {
      max-width: min(82%, 580px);
      margin: 0 0 14px;
      animation: fadeInMsg 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes fadeInMsg {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .room-chat-message.is-self {
      margin-left: auto;
      text-align: right;
    }

    .room-chat-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
      color: #dfcaa2;
      font-size: 0.68rem;
    }
    .room-chat-meta strong {
      color: #fce19a;
      font-weight: 700;
    }
    .room-chat-meta time {
      color: rgba(223, 202, 162, 0.65);
      font-size: 0.64rem;
    }
    .room-chat-message.is-self .room-chat-meta {
      justify-content: flex-end;
    }

    .room-chat-bubble {
      display: inline-block;
      padding: 10px 14px;
      border: 1px solid rgba(245, 190, 80, 0.25);
      border-radius: 16px 16px 16px 4px;
      background: linear-gradient(145deg, rgba(46, 22, 10, 0.9) 0%, rgba(30, 14, 5, 0.95) 100%);
      color: #fef4dc;
      font-size: 0.84rem;
      line-height: 1.5;
      text-align: left;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
    }
    .room-chat-message.is-self .room-chat-bubble {
      border-color: rgba(255, 235, 160, 0.55);
      border-radius: 16px 16px 4px 16px;
      background: linear-gradient(145deg, #b87720 0%, #874e0d 100%);
      color: #fffdf5;
      box-shadow: 0 4px 16px rgba(184, 119, 32, 0.35);
    }

    .room-chat-empty {
      display: grid;
      place-items: center;
      min-height: 220px;
      color: #d1b88e;
      text-align: center;
      font-size: 0.82rem;
    }
    .room-chat-empty-icon {
      font-size: 42px;
      margin-bottom: 10px;
      filter: drop-shadow(0 0 16px rgba(245, 180, 60, 0.4));
      animation: floatLotus 3s ease-in-out infinite alternate;
    }
    @keyframes floatLotus {
      from { transform: translateY(0); }
      to { transform: translateY(-6px); }
    }
    .room-chat-empty strong {
      display: block;
      margin-bottom: 6px;
      color: #ffd875;
      font-size: 1.05rem;
      font-family: 'Lora', Georgia, serif;
    }

    /* Dharma Quick Blessing Bar */
    .room-dharma-pills {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      overflow-x: auto;
      scrollbar-width: none;
      background: rgba(18, 8, 3, 0.7);
      border-top: 1px solid rgba(245, 190, 80, 0.15);
    }
    .room-dharma-pills::-webkit-scrollbar {
      display: none;
    }
    .room-dharma-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 9999px;
      background: rgba(245, 190, 80, 0.12);
      border: 1px solid rgba(245, 190, 80, 0.3);
      color: #ffe8a3;
      font-size: 0.72rem;
      font-weight: 600;
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }
    .room-dharma-pill:hover {
      background: rgba(245, 190, 80, 0.28);
      border-color: rgba(255, 235, 160, 0.7);
      color: #ffffff;
      transform: translateY(-1px);
    }
    .room-dharma-pill:active {
      transform: translateY(0) scale(0.96);
    }

    /* Composer */
    .room-chat-composer {
      display: flex;
      gap: 8px;
      padding: 12px 18px 14px;
      background: rgba(12, 5, 2, 0.95);
      border-top: 1.5px solid rgba(245, 190, 80, 0.3);
    }

    .room-chat-composer input,
    .room-join-row input {
      min-width: 0;
      flex: 1;
      border: 1.5px solid rgba(245, 190, 80, 0.35);
      border-radius: 12px;
      outline: none;
      background: rgba(22, 10, 4, 0.85);
      color: #fff9e6;
      padding: 10px 14px;
      font-size: 0.85rem;
      transition: all 0.2s ease;
      box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.6);
    }
    .room-chat-composer input::placeholder {
      color: rgba(223, 202, 162, 0.55);
    }
    .room-chat-composer input:focus,
    .room-join-row input:focus {
      border-color: #f6c863;
      box-shadow: 0 0 0 3px rgba(246, 200, 99, 0.25), inset 0 2px 6px rgba(0, 0, 0, 0.6);
      background: rgba(28, 12, 5, 0.95);
    }

    .room-chat-composer button,
    .room-join-row button {
      min-width: 72px;
      padding: 0 16px;
      border: 1px solid rgba(255, 235, 160, 0.6);
      border-radius: 12px;
      background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%);
      color: #1a0b02;
      font-weight: 800;
      font-size: 0.84rem;
      letter-spacing: 0.02em;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 14px rgba(217, 119, 6, 0.4);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
    }
    .room-chat-composer button:hover,
    .room-join-row button:hover {
      filter: brightness(1.12);
      box-shadow: 0 6px 18px rgba(217, 119, 6, 0.6);
      transform: translateY(-1px);
    }
    .room-chat-composer button:active,
    .room-join-row button:active {
      transform: translateY(0) scale(0.97);
    }

    /* Sidebar: Room Info & Invite */
    .room-chat-sidebar {
      overflow-y: auto;
      padding: 16px 18px;
      border-left: 1.5px solid rgba(245, 190, 80, 0.25);
      background: linear-gradient(180deg, rgba(22, 10, 4, 0.75) 0%, rgba(12, 5, 2, 0.9) 100%);
      scrollbar-width: thin;
      scrollbar-color: rgba(245, 190, 80, 0.3) transparent;
    }
    .room-chat-sidebar::-webkit-scrollbar {
      width: 5px;
    }
    .room-chat-sidebar::-webkit-scrollbar-thumb {
      background: rgba(245, 190, 80, 0.25);
      border-radius: 4px;
    }

    .room-side-title {
      display: block;
      margin-bottom: 6px;
      color: #f7d48a;
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .room-side-caption {
      margin: -2px 0 10px;
      color: #cbb28b;
      font-size: 0.67rem;
      line-height: 1.4;
    }

    .room-member {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 7px 0;
      border-bottom: 1px solid rgba(245, 190, 80, 0.12);
      font-size: 0.76rem;
    }
    .room-member-avatar {
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      width: 28px;
      height: 28px;
      border: 1.5px solid rgba(245, 190, 80, 0.4);
      border-radius: 50%;
      background: radial-gradient(circle, #5c3008 0%, #291303 100%);
      color: #fde68a;
      font-weight: 700;
      font-size: 0.75rem;
      transition: all 0.3s ease;
    }
    .room-member.is-speaking .room-member-avatar {
      border-color: #34d399;
      box-shadow: 0 0 12px rgba(52, 211, 153, 0.7);
      animation: pulseAvatar 1s infinite alternate;
    }
    @keyframes pulseAvatar {
      from { transform: scale(1); }
      to { transform: scale(1.12); }
    }

    .room-member-name {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      color: #fdf4db;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 600;
    }
    .room-member-state {
      color: #10b981;
      font-size: 0.75rem;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .room-member.is-speaking .room-member-state {
      color: #34d399;
      font-weight: 800;
      text-shadow: 0 0 8px rgba(52, 211, 153, 0.5);
    }

    /* Live Voice Volume Waveform */
    .room-voice-meter {
      display: none;
      align-items: center;
      gap: 3px;
      height: 14px;
      margin-top: 6px;
      justify-content: center;
    }
    .room-voice-meter.is-active {
      display: flex;
    }
    .room-voice-bar {
      width: 3px;
      height: 6px;
      background: #34d399;
      border-radius: 2px;
      transition: height 0.08s ease;
    }

    .room-mic-button,
    .room-secondary-action {
      width: 100%;
      margin-top: 10px;
      padding: 9px 12px;
      border: 1px solid rgba(245, 190, 80, 0.4);
      border-radius: 12px;
      background: rgba(245, 190, 80, 0.12);
      color: #fde68a;
      font-weight: 800;
      font-size: 0.78rem;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .room-mic-button:hover,
    .room-secondary-action:hover {
      background: rgba(245, 190, 80, 0.22);
      border-color: rgba(255, 235, 160, 0.6);
      color: #ffffff;
      transform: translateY(-1px);
    }
    .room-mic-button.is-live {
      border-color: #f87171;
      background: #991b1b;
      color: #ffffff;
      box-shadow: 0 0 16px rgba(239, 68, 68, 0.6);
    }

    .room-join-label {
      margin-top: 16px;
    }
    .room-join-row {
      display: flex;
      gap: 6px;
    }

    .room-qr-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
      padding: 12px;
      border: 1px solid rgba(245, 190, 80, 0.3);
      border-radius: 14px;
      background: rgba(10, 4, 1, 0.6);
      box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.5);
    }
    #room-qr-canvas {
      width: 130px;
      height: 130px;
      border-radius: 8px;
      border: 1px solid rgba(245, 190, 80, 0.4);
      image-rendering: pixelated;
    }
    #room-share-url {
      width: 100%;
      overflow: hidden;
      color: #dfcaa2;
      font-size: 0.62rem;
      text-align: center;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .room-chat-shell button:focus-visible,
    .room-chat-shell input:focus-visible {
      outline: 2px solid #f6c863;
      outline-offset: 2px;
    }

    /* Mobile Responsive Layout (< 768px) */
    @media (max-width: 768px) {
      .room-chat-shell {
        max-height: 94dvh;
        border-radius: 20px;
      }
      .room-chat-header {
        padding: 12px 14px;
      }
      .room-lotus-emblem {
        width: 36px;
        height: 36px;
        font-size: 18px;
      }
      .room-chat-toolbar {
        padding-inline: 12px;
      }
      .room-channel-tab {
        padding: 7px 11px;
        font-size: 0.72rem;
      }
      .room-sync-status {
        display: none;
      }
      .room-chat-grid {
        grid-template-columns: 1fr;
        min-height: 0;
        overflow-y: auto;
      }
      .room-chat-main {
        min-height: 52dvh;
      }
      .room-chat-sidebar {
        max-height: 34dvh;
        border-top: 1.5px solid rgba(245, 190, 80, 0.25);
        border-left: 0;
      }
      .room-chat-messages {
        padding: 12px 14px;
      }
      .room-chat-message {
        max-width: 90%;
      }
    }

    @media (max-width: 440px) {
      .room-kicker {
        font-size: 0.58rem;
        letter-spacing: 0.08em;
      }
      .room-chat-header h3 {
        font-size: 1.1rem;
      }
      .room-chat-subline {
        font-size: 0.66rem;
      }
      .room-channel-title {
        padding-inline: 12px;
      }
      .room-chat-composer {
        padding: 10px 12px;
      }
      .room-chat-composer input {
        font-size: 0.78rem;
        padding: 8px 10px;
      }
      .room-chat-composer button {
        min-width: 60px;
        font-size: 0.78rem;
      }
    }
  `;
  document.head.appendChild(style);

  // Hidden Audio Element Container for remote incoming voices
  let audioContainer = document.getElementById('room-remote-voices-container');
  if (!audioContainer) {
    audioContainer = document.createElement('div');
    audioContainer.id = 'room-remote-voices-container';
    audioContainer.style.display = 'none';
    document.body.appendChild(audioContainer);
  }

  const state = {
    roomId: (queryRoom || PUBLIC_ROOM_ID).trim().toUpperCase(),
    channel: 'lobby',
    messages: [],
    messageIds: new Set(),
    members: new Map(), // senderId => { id, name, speaking, lastSeen }
    stream: null,
    muted: true,
    recorder: null,
    peerConnections: new Map(), // peerId => RTCPeerConnection
    remoteAudioStreams: new Map(), // peerId => MediaStream
    analyser: null,
    audioContext: null
  };

  function profile() {
    const current = window.currentUserProfile || {};
    return {
      name: current.dharmaName || current.fullName || 'Đồng Tu',
      avatar: current.avatarType || 'monk'
    };
  }

  function myId() {
    return window.RealtimeSanctuary?.clientId || 'guest-' + Math.random().toString(36).slice(2, 8);
  }

  function isPublicRoom() {
    return state.roomId === PUBLIC_ROOM_ID;
  }

  function makeRoomId() {
    return `AN-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
  }

  function roomUrl() {
    return isPublicRoom()
      ? `${location.origin}${location.pathname}`
      : `${location.origin}${location.pathname}?room=${encodeURIComponent(state.roomId)}`;
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function setRoomMeta() {
    const publicRoom = isPublicRoom();
    setText('room-code-label', publicRoom ? 'PHÒNG CHUNG' : state.roomId);
    setText('room-member-count', String(state.members.size + 1));
    setText('room-visibility-label', publicRoom ? 'MỞ · TOÀN ĐẠO TRÀNG' : 'RIÊNG · CÓ MÃ MỜI');
    setText('room-chat-title', publicRoom ? 'Đạo Tràng Chung' : 'Phòng Tu Tập Riêng');
    document.getElementById('room-visibility')?.classList.toggle('is-private', !publicRoom);
    setText('room-share-url', roomUrl());
  }

  function renderQr() {
    const canvas = document.getElementById('room-qr-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = 200;
    canvas.width = size;
    canvas.height = size;
    ctx.fillStyle = '#fffdf5';
    ctx.fillRect(0, 0, size, size);
    let seed = [...state.roomId].reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 17);
    const cells = 25;
    const cellSize = size / cells;
    ctx.fillStyle = '#3c1d08';

    function drawFinder(x, y) {
      ctx.fillRect(x * cellSize, y * cellSize, 7 * cellSize, 7 * cellSize);
      ctx.fillStyle = '#fffdf5';
      ctx.fillRect((x + 1) * cellSize, (y + 1) * cellSize, 5 * cellSize, 5 * cellSize);
      ctx.fillStyle = '#3c1d08';
      ctx.fillRect((x + 2) * cellSize, (y + 2) * cellSize, 3 * cellSize, 3 * cellSize);
    }
    drawFinder(1, 1);
    drawFinder(cells - 8, 1);
    drawFinder(1, cells - 8);

    for (let r = 0; r < cells; r++) {
      for (let c = 0; c < cells; c++) {
        if ((r < 9 && c < 9) || (r < 9 && c > cells - 10) || (r > cells - 10 && c < 9)) continue;
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        if ((seed % 100) < 46) {
          ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
      }
    }
  }

  function renderMembers() {
    const list = document.getElementById('room-members-list');
    if (!list) return;
    list.innerHTML = '';
    const myProfile = profile();
    const selfItem = {
      id: myId(),
      name: `${myProfile.name} (Bạn)`,
      speaking: !state.muted
    };
    const members = [selfItem, ...state.members.values()];

    members.forEach(member => {
      const row = document.createElement('div');
      row.className = `room-member${member.speaking ? ' is-speaking' : ''}`;
      row.dataset.peerId = member.id;
      const initial = (member.name || 'Đ')[0].toUpperCase();
      row.innerHTML = `
        <span class="room-member-avatar">${initial}</span>
        <span class="room-member-name"></span>
        <span class="room-member-state">${member.speaking ? '🎙 Đang nói' : '🪷 Tịnh tâm'}</span>
      `;
      row.querySelector('.room-member-name').textContent = member.name;
      list.appendChild(row);
    });
    setText('room-member-count', String(members.length));
  }

  function renderMessages() {
    const list = document.getElementById('room-chat-messages');
    if (!list) return;
    list.innerHTML = '';
    const messages = state.messages.filter(message => (message.channel || 'lobby') === state.channel).slice(-120);
    if (!messages.length) {
      list.innerHTML = `
        <div class="room-chat-empty">
          <div>
            <div class="room-chat-empty-icon">🪷</div>
            <strong>Không Gian Đang Tĩnh Lặng</strong>
            <span>Hãy gửi lời chúc an lành hoặc câu niệm Phật đầu tiên cho Đạo Tràng.</span>
          </div>
        </div>`;
    } else {
      messages.forEach(message => {
        const row = document.createElement('div');
        row.className = `room-chat-message${message.self ? ' is-self' : ''}`;
        row.innerHTML = '<div class="room-chat-meta"><strong></strong><time></time></div><div class="room-chat-bubble"></div>';
        row.querySelector('strong').textContent = message.name || 'Đồng Tu';
        row.querySelector('time').textContent = new Date(message.time || message.timestamp || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
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
    state.messages.push({ ...message, messageId });
    if (state.messages.length > 200) {
      const removed = state.messages.shift();
      if (removed?.messageId) state.messageIds.delete(removed.messageId);
    }
  }

  function hydrateHistory(history) {
    if (!Array.isArray(history)) return;
    history.forEach(item => {
      if (item && item.type === 'ROOM_CHAT') {
        const itemRoom = (item.roomId || PUBLIC_ROOM_ID).trim().toUpperCase();
        if (itemRoom === state.roomId) {
          addMessage({ ...item, self: item.senderId === myId() });
        }
      }
    });
    renderMessages();
  }

  /* ==========================================================================
     WEBRTC VOICE ENGINE & AUDIO CHUNK RESILIENT FALLBACK
     ========================================================================== */

  // Play remote audio stream safely with browser autoplay policy handling
  function playRemoteAudioStream(peerId, stream) {
    if (!stream) return;
    state.remoteAudioStreams.set(peerId, stream);

    let audioEl = document.getElementById(`remote-audio-${peerId}`);
    if (!audioEl) {
      audioEl = document.createElement('audio');
      audioEl.id = `remote-audio-${peerId}`;
      audioEl.autoplay = true;
      audioEl.playsInline = true;
      audioEl.style.display = 'none';
      audioContainer.appendChild(audioEl);
    }
    audioEl.srcObject = stream;
    audioEl.volume = 1.0;
    audioEl.play().catch(() => {
      const resume = () => {
        audioEl.play().catch(() => {});
        window.removeEventListener('click', resume);
        window.removeEventListener('touchstart', resume);
      };
      window.addEventListener('click', resume, { once: true });
      window.addEventListener('touchstart', resume, { once: true });
    });

    // Also route stream into Web Audio API destination for guaranteed playback on iOS/Android
    try {
      const audioCtx = window.AudioEngine?.ctx || state.audioContext || (window.AudioContext && new (window.AudioContext || window.webkitAudioContext)());
      if (audioCtx) {
        if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(audioCtx.destination);
      }
    } catch (e) {
      console.warn('[RoomVoice] WebAudio routing fallback:', e);
    }

    // Update UI that this peer is active and speaking
    const member = state.members.get(peerId);
    if (member) {
      member.speaking = true;
      renderMembers();
    }
  }

  // Create or retrieve PeerConnection for a specific peer
  function getOrCreatePeerConnection(peerId) {
    if (state.peerConnections.has(peerId)) {
      return state.peerConnections.get(peerId);
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    state.peerConnections.set(peerId, pc);

    // If local microphone stream is already active, attach audio tracks
    if (state.stream) {
      state.stream.getAudioTracks().forEach(track => {
        pc.addTrack(track, state.stream);
      });
    }

    // Handle receiving remote audio
    pc.ontrack = (event) => {
      console.log(`[RoomVoice] Received incoming audio track from peer: ${peerId}`);
      if (event.streams && event.streams[0]) {
        playRemoteAudioStream(peerId, event.streams[0]);
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        publish({
          type: 'ROOM_VOICE_CANDIDATE',
          senderId: myId(),
          targetId: peerId,
          candidate: event.candidate
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[RoomVoice] Peer ${peerId} connection state: ${pc.connectionState}`);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        state.peerConnections.delete(peerId);
        state.remoteAudioStreams.delete(peerId);
        const el = document.getElementById(`remote-audio-${peerId}`);
        if (el) el.remove();
      }
    };

    return pc;
  }

  // Initiate WebRTC Call to a remote peer
  async function callPeer(peerId) {
    if (peerId === myId()) return;
    try {
      const pc = getOrCreatePeerConnection(peerId);
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      publish({
        type: 'ROOM_VOICE_OFFER',
        senderId: myId(),
        targetId: peerId,
        sdp: offer
      });
    } catch (err) {
      console.warn(`[RoomVoice] Failed to create offer for ${peerId}:`, err);
    }
  }

  // Fallback: Play audio slice from base64 (MediaRecorder chunk fallback) with Web Audio API
  async function playAudioChunk(peerId, base64Data, mimeType) {
    if (!base64Data || peerId === myId()) return;
    // If WebRTC is already actively streaming audio from this peer, skip chunk to prevent echo
    if (state.remoteAudioStreams.has(peerId)) return;

    try {
      const byteChars = atob(base64Data);
      const byteNums = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNums[i] = byteChars.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNums);

      // 1. Try decoding with master Web Audio API context (AudioEngine.ctx or state.audioContext)
      const audioCtx = window.AudioEngine?.ctx || state.audioContext || (window.AudioContext && new (window.AudioContext || window.webkitAudioContext)());
      if (audioCtx) {
        if (audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {});
        }
        try {
          const audioBuffer = await audioCtx.decodeAudioData(byteArray.buffer.slice(0));
          const source = audioCtx.createBufferSource();
          source.buffer = audioBuffer;
          const gainNode = audioCtx.createGain();
          gainNode.gain.value = 1.0;
          source.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          source.start(0);

          const member = state.members.get(peerId);
          if (member) {
            member.speaking = true;
            renderMembers();
            clearTimeout(member._speakTimer);
            member._speakTimer = setTimeout(() => {
              member.speaking = false;
              renderMembers();
            }, 1000);
          }
          return;
        } catch (decErr) {
          // If decodeAudioData fails, fallback to HTML5 Audio element below
        }
      }

      // 2. Fallback to HTML5 Audio element
      const blob = new Blob([byteArray], { type: mimeType || 'audio/webm' });
      const blobUrl = URL.createObjectURL(blob);
      const audio = new Audio(blobUrl);
      audio.volume = 1.0;
      audio.play().then(() => {
        setTimeout(() => URL.revokeObjectURL(blobUrl), 3500);
      }).catch(() => {});
    } catch (e) {
      console.warn('[RoomVoice] Error playing audio chunk:', e);
    }
  }

  // Setup Visual Mic Waveform Meter
  function setupAudioVisualizer() {
    if (!state.stream) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!state.audioContext) state.audioContext = new AudioCtx();
      if (state.audioContext.state === 'suspended') state.audioContext.resume();

      const source = state.audioContext.createMediaStreamSource(state.stream);
      state.analyser = state.audioContext.createAnalyser();
      state.analyser.fftSize = 64;
      source.connect(state.analyser);

      const bufferLength = state.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const meter = document.getElementById('room-voice-meter');

      function updateMeter() {
        if (!state.muted && state.analyser && meter) {
          state.analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
          const average = sum / bufferLength;

          const bars = meter.querySelectorAll('.room-voice-bar');
          bars.forEach((bar, idx) => {
            const h = Math.min(16, Math.max(4, (average / 12) * (idx + 1) * 0.7));
            bar.style.height = `${h}px`;
          });
          requestAnimationFrame(updateMeter);
        } else if (meter) {
          meter.querySelectorAll('.room-voice-bar').forEach(b => b.style.height = '4px');
        }
      }
      updateMeter();
    } catch (e) {}
  }

  // Setup MediaRecorder Chunk Broadcast Fallback
  function startMediaRecorderFallback() {
    if (!state.stream || typeof MediaRecorder === 'undefined') return;
    try {
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm');

      state.recorder = new MediaRecorder(state.stream, { mimeType: mime, audioBitsPerSecond: 28000 });
      state.recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0 && !state.muted) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result || '').split(',')[1];
            if (base64) {
              publish({
                type: 'ROOM_VOICE_CHUNK',
                roomId: state.roomId,
                senderId: myId(),
                name: profile().name,
                mimeType: mime,
                data: base64
              });
            }
          };
          reader.readAsDataURL(event.data);
        }
      };
      state.recorder.start(600); // Send 600ms chunks
    } catch (err) {
      console.warn('[RoomVoice] MediaRecorder fallback unavailable:', err);
    }
  }

  function stopMediaRecorderFallback() {
    if (state.recorder && state.recorder.state !== 'inactive') {
      try {
        state.recorder.stop();
      } catch (_) {}
    }
    state.recorder = null;
  }

  /* ==========================================================================
     RECEIVE & DISPATCH REALTIME MESSAGES
     ========================================================================== */

  async function receive(payload) {
    if (!payload || !payload.type) return;
    const messageRoom = (payload.roomId || PUBLIC_ROOM_ID).trim().toUpperCase();
    if (messageRoom !== state.roomId) return;
    if (payload.senderId === myId()) return;

    switch (payload.type) {
      case 'ROOM_CHAT':
        addMessage({ ...payload, self: false });
        renderMessages();
        break;

      case 'ROOM_PRESENCE':
        if (payload.senderId) {
          const isSpeaking = Boolean(payload.speaking);
          state.members.set(payload.senderId, {
            id: payload.senderId,
            name: payload.name || 'Đồng Tu',
            speaking: isSpeaking,
            lastSeen: Date.now()
          });
          renderMembers();

          // If a new member joins and our mic is active, send WebRTC offer to them!
          if (!state.muted && isSpeaking) {
            callPeer(payload.senderId);
          }
        }
        break;

      case 'ROOM_VOICE_OFFER':
        if (payload.targetId === myId() || payload.targetId === 'all') {
          try {
            const pc = getOrCreatePeerConnection(payload.senderId);
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            publish({
              type: 'ROOM_VOICE_ANSWER',
              senderId: myId(),
              targetId: payload.senderId,
              sdp: answer
            });
          } catch (err) {
            console.warn('[RoomVoice] Error answering voice offer:', err);
          }
        }
        break;

      case 'ROOM_VOICE_ANSWER':
        if (payload.targetId === myId()) {
          try {
            const pc = state.peerConnections.get(payload.senderId);
            if (pc) {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            }
          } catch (err) {
            console.warn('[RoomVoice] Error setting remote answer:', err);
          }
        }
        break;

      case 'ROOM_VOICE_CANDIDATE':
        if (payload.targetId === myId() && payload.candidate) {
          try {
            const pc = state.peerConnections.get(payload.senderId);
            if (pc) {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            }
          } catch (err) {
            console.warn('[RoomVoice] Error adding ICE candidate:', err);
          }
        }
        break;

      case 'ROOM_VOICE_CHUNK':
        if (payload.data) {
          playAudioChunk(payload.senderId, payload.data, payload.mimeType);
        }
        break;
    }
  }

  function publish(payload) {
    if (window.RealtimeSanctuary) {
      window.RealtimeSanctuary.publishMessage({ ...payload, roomId: state.roomId });
    }
  }

  function ensureRoom() {
    setRoomMeta();
    renderQr();
    publish({
      type: 'ROOM_PRESENCE',
      name: profile().name,
      avatar: profile().avatar,
      speaking: !state.muted
    });
    renderMembers();
    hydrateHistory(window.RealtimeSanctuary?.roomChatHistory || []);
  }

  function open() {
    ensureRoom();
    const modal = document.getElementById('room-chat-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
    renderMessages();
    setTimeout(() => {
      document.getElementById('room-chat-input')?.focus();
    }, 150);
  }

  function close() {
    const modal = document.getElementById('room-chat-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  async function toggleMic() {
    const button = document.getElementById('room-mic-button');
    const meter = document.getElementById('room-voice-meter');

    try {
      // 1. Acquire microphone stream with noise suppression & echo cancellation
      if (!state.stream) {
        state.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      }

      state.muted = !state.muted;
      state.stream.getAudioTracks().forEach(track => {
        track.enabled = !state.muted;
      });

      button?.classList.toggle('is-live', !state.muted);
      setText('room-mic-label', state.muted ? 'Bật mic đàm thoại' : 'Đang bật mic · Chạm tắt');
      meter?.classList.toggle('is-active', !state.muted);

      // Sync Dock Mic Button
      const dockMic = document.getElementById('btn-dock-mic');
      const dockMicIcon = document.getElementById('dock-mic-icon');
      const dockMicLabel = document.getElementById('dock-mic-label');
      if (dockMic) {
        if (!state.muted) {
          dockMic.classList.remove('bg-amber-950/85', 'text-amber-100');
          dockMic.classList.add('bg-gradient-to-r', 'from-emerald-600', 'to-teal-600', 'text-white', 'shadow-[0_0_15px_rgba(16,185,129,0.7)]', 'border-emerald-300');
          if (dockMicIcon) dockMicIcon.textContent = '🟢';
          if (dockMicLabel) dockMicLabel.innerHTML = 'Mic: <span class="text-emerald-200 font-black">Bật</span>';
        } else {
          dockMic.classList.remove('bg-gradient-to-r', 'from-emerald-600', 'to-teal-600', 'text-white', 'shadow-[0_0_15px_rgba(16,185,129,0.7)]', 'border-emerald-300');
          dockMic.classList.add('bg-amber-950/85', 'text-amber-100');
          if (dockMicIcon) dockMicIcon.textContent = '🎙️';
          if (dockMicLabel) dockMicLabel.innerHTML = 'Micro';
        }
      }

      if (!state.muted) {
        setupAudioVisualizer();
        startMediaRecorderFallback();

        // Initiate WebRTC call to all known members in the room
        state.members.forEach((_, peerId) => {
          callPeer(peerId);
        });
      } else {
        stopMediaRecorderFallback();
      }

      // Broadcast presence state
      publish({
        type: 'ROOM_PRESENCE',
        name: profile().name,
        avatar: profile().avatar,
        speaking: !state.muted
      });
      renderMembers();

    } catch (err) {
      console.error('[RoomVoice] getUserMedia error:', err);
      alert('Không thể kết nối Micro: Vui lòng nhấn vào biểu tượng ổ khóa 🔒 trên thanh địa chỉ trình duyệt và chọn "Cho phép (Allow)" Micro để tham gia đàm thoại.');
    }
  }

  function sendText(customText) {
    const input = document.getElementById('room-chat-input');
    const text = (customText || input?.value || '').trim().slice(0, 500);
    if (!text) return;

    const message = {
      type: 'ROOM_CHAT',
      messageId: `${myId()}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      channel: state.channel,
      name: profile().name,
      text,
      time: Date.now(),
      self: true
    };
    addMessage(message);
    publish(message);
    if (input && !customText) input.value = '';
    renderMessages();
  }

  function send() {
    sendText();
  }

  function setRoom(roomId) {
    state.roomId = (roomId || PUBLIC_ROOM_ID).trim().toUpperCase();
    state.messages = [];
    state.messageIds.clear();
    state.members.clear();
    // Reset voice connections on room change
    state.peerConnections.forEach(pc => pc.close());
    state.peerConnections.clear();
    state.remoteAudioStreams.clear();
    if (audioContainer) audioContainer.innerHTML = '';
    setRoomMeta();
    renderQr();
    renderMembers();
  }

  window.openRoomChat = open;
  window.closeRoomChat = close;
  window.createRoomChat = function () { setRoom(makeRoomId()); open(); };
  window.joinRoomChat = function () {
    const entered = (document.getElementById('room-id-input')?.value || '').trim().toUpperCase();
    if (entered) { setRoom(entered); open(); }
  };
  window.toggleRoomMic = toggleMic;
  window.toggleSanctuaryMic = toggleMic;
  window.isSanctuaryMicLive = () => !state.muted;
  window.sendRoomChat = send;
  window.sendQuickDharmaBlessing = function (text) {
    sendText(text);
  };
  window.copyRoomInvite = async function () {
    try {
      await navigator.clipboard.writeText(roomUrl());
      setText('room-copy-label', '✓ Đã sao chép liên kết');
      setTimeout(() => setText('room-copy-label', 'Sao chép lời mời'), 2200);
    } catch (_) {}
  };
  window.handleRoomMessageKey = function (event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      send();
    }
  };
  window.switchRoomChannel = function (channel) {
    state.channel = channel === 'dm' ? 'dm' : 'lobby';
    document.querySelectorAll('.room-channel-tab').forEach(tab => {
      tab.classList.toggle('is-active', tab.dataset.channel === state.channel);
    });
    setText('room-channel-title', state.channel === 'dm'
      ? '🔒 Nhắn tin riêng tư cùng Đạo Hữu'
      : (isPublicRoom() ? '🌐 Đạo Tràng Toàn Cầu · Mọi người cùng chiêm bái' : '🔒 Phòng Tu Riêng · Trong mã phòng này'));
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
      <div class="room-chat-shell text-amber-50 relative" onclick="event.stopPropagation()">
        
        <!-- Sacred Header -->
        <header class="room-chat-header">
          <div class="room-header-left">
            <div class="room-lotus-emblem" title="Đạo Tràng An Nhiên">🪷</div>
            <div>
              <div class="room-kicker">ĐẠO TRÀNG AN NHIÊN · PHÁP THOẠI & ĐỒNG TU</div>
              <h3 id="room-chat-title">Đạo Tràng Chung</h3>
              <div class="room-chat-subline">
                <span id="room-visibility" class="room-visibility">
                  <span>●</span><span id="room-visibility-label">MỞ · TOÀN ĐẠO TRÀNG</span>
                </span>
                <span>Mã phòng: <strong id="room-code-label" class="room-room-code">PHÒNG CHUNG</strong></span>
                <span>· <strong id="room-member-count">1</strong> đồng tu</span>
              </div>
            </div>
          </div>
          <button type="button" onclick="closeRoomChat()" class="room-close" title="Đóng đàm luận" aria-label="Đóng chat">×</button>
        </header>

        <!-- Channel Navigation Toolbar -->
        <div class="room-chat-toolbar">
          <div class="room-channel-tabs" role="tablist" aria-label="Luồng đàm luận">
            <button type="button" class="room-channel-tab is-active" data-channel="lobby" onclick="switchRoomChannel('lobby')" role="tab">🌐 Đạo Tràng Toàn Cầu</button>
            <button type="button" class="room-channel-tab" data-channel="dm" onclick="switchRoomChannel('dm')" role="tab">🔒 Nhắn Tin Riêng</button>
          </div>
          <div id="room-sync-status" class="room-sync-status is-online">
            <span class="room-sync-dot"></span>
            <span>Đang trực tuyến</span>
          </div>
        </div>

        <!-- Chat Main Grid -->
        <div class="room-chat-grid">
          
          <!-- Messages Column -->
          <section class="room-chat-main" aria-label="Tin nhắn phòng">
            <div id="room-channel-title" class="room-channel-title">
              <span>🌐</span><span>Đạo Tràng Toàn Cầu · Mọi người cùng chiêm bái</span>
            </div>
            
            <div id="room-chat-messages" class="room-chat-messages" aria-live="polite"></div>

            <!-- Quick Dharma Blessing Pills -->
            <div class="room-dharma-pills">
              <span class="text-[10px] text-amber-300/70 font-bold uppercase tracking-wider shrink-0 mr-1">Lời lành:</span>
              <button type="button" onclick="sendQuickDharmaBlessing('Nam Mô A Di Đà Phật 🙏')" class="room-dharma-pill">🙏 A Di Đà Phật</button>
              <button type="button" onclick="sendQuickDharmaBlessing('Tùy hỷ công đức quý Đạo hữu 🪷')" class="room-dharma-pill">🪷 Tùy hỷ công đức</button>
              <button type="button" onclick="sendQuickDharmaBlessing('Nguyện thân tâm thường an lạc ✨')" class="room-dharma-pill">✨ Thân tâm an lạc</button>
              <button type="button" onclick="sendQuickDharmaBlessing('Nguyện cầu quốc thới dân an 🕯️')" class="room-dharma-pill">🕯️ Nguyện cầu bình an</button>
              <button type="button" onclick="sendQuickDharmaBlessing('Vạn sự cát tường, phước huệ trang nghiêm 🕊️')" class="room-dharma-pill">🕊️ Cát tường như ý</button>
            </div>

            <!-- Input Composer -->
            <div class="room-chat-composer">
              <input id="room-chat-input" onkeydown="handleRoomMessageKey(event)" placeholder="Gửi lời lành, thưa hỏi Phật pháp cho Đạo Tràng..." maxlength="500" autocomplete="off">
              <button type="button" onclick="sendRoomChat()" aria-label="Gửi tin nhắn">
                <span>Gửi</span><span>📤</span>
              </button>
            </div>
          </section>

          <!-- Sidebar Column: Members & Voice Control -->
          <aside class="room-chat-sidebar" aria-label="Thông tin phòng">
            <span class="room-side-title">Đồng Tu Đang Huân Tu</span>
            <p class="room-side-caption">Các đạo hữu trong cùng phòng sẽ nghe giọng nói trực tiếp và trạng thái tịnh tâm.</p>
            <div id="room-members-list"></div>

            <!-- Mic Control with Animated Sound Level Meter -->
            <button type="button" id="room-mic-button" onclick="toggleRoomMic()" class="room-mic-button">
              <span>🎙</span><span id="room-mic-label">Bật mic đàm thoại</span>
            </button>
            <div id="room-voice-meter" class="room-voice-meter" title="Âm lượng giọng nói">
              <span class="room-voice-bar"></span>
              <span class="room-voice-bar"></span>
              <span class="room-voice-bar"></span>
              <span class="room-voice-bar"></span>
              <span class="room-voice-bar"></span>
            </div>

            <button type="button" onclick="createRoomChat()" class="room-secondary-action">
              <span>＋</span><span>Tạo phòng tu riêng</span>
            </button>

            <label for="room-id-input" class="room-side-title room-join-label">Tham gia bằng mã phòng</label>
            <div class="room-join-row">
              <input id="room-id-input" placeholder="AN-XXXX-XXXX" autocomplete="off">
              <button type="button" onclick="joinRoomChat()">Vào</button>
            </div>

            <!-- Room QR Card -->
            <div class="room-qr-card">
              <canvas id="room-qr-canvas" aria-label="Mã mời phòng"></canvas>
              <strong id="room-share-url"></strong>
              <button type="button" onclick="copyRoomInvite()" class="room-secondary-action">
                <span id="room-copy-label">Sao chép lời mời</span>
              </button>
            </div>
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
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !document.getElementById('room-chat-modal')?.classList.contains('hidden')) close();
  });
  window.addEventListener('beforeunload', () => {
    state.stream?.getTracks().forEach(track => track.stop());
    state.peerConnections.forEach(pc => pc.close());
  });
  window.addEventListener('load', injectRoomUi);
  document.addEventListener('DOMContentLoaded', injectRoomUi, { once: true });
  if (document.readyState !== 'loading') injectRoomUi();
})();
