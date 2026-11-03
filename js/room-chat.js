/**
 * Chùa An Nhiên — Sacred Zen Room Chat & High-Fidelity Voice Mesh (v4.0)
 * Đạo Tràng Đàm Thoại & Pháp Thoại Thời Gian Thực
 *
 * Tính Năng Cốt Lõi:
 * 1. Giao Diện Tinh Hoa Thiền Tịnh (Imperial Gold Zen Glassmorphism):
 *    - Tuyệt đối không chồng lấn hay đè lên nhau trên mọi màn hình (PC, Laptop, Tablet, Mobile).
 *    - Phân tách tab thông minh: [🌐 Đạo Tràng Toàn Cầu] · [🔒 Nhắn Tin Riêng] · [👥 Đồng Tu & Mã Phòng].
 *    - Băng rôn lời lành gửi nhanh (Quick Dharma Blessing Pills).
 * 2. Đàm Thoại Giọng Nói Trực Tuyến 2 Chiều (Realtime Dual-Engine Voice Mesh):
 *    - Chu kỳ thu âm độc lập (Self-Contained Looping Slices) tạo gói tin âm thanh Opus chuẩn 100% có container header.
 *    - Giải mã trực tiếp qua Web Audio API (decodeAudioData + BufferSource timeline scheduler).
 *    - Hoàn toàn vượt qua rào cản chặn âm thanh Autoplay trên iOS Safari & Android Chrome.
 *    - Kết hợp WebRTC P2P trực tiếp + Kênh WebSocket Server sub-millisecond.
 * 3. Nút Điều Khiển Mic Đa Vị Trí (Multi-point Mic Controls):
 *    - Nút Mic ngay trên Header của Chat.
 *    - Nút Mic trong Sidebar thành viên.
 *    - Nút Mic trực tiếp tại thanh công cụ dưới đáy Chánh Điện (#btn-dock-mic).
 */

(function () {
  'use strict';

  const PUBLIC_ROOM_ID = 'GLOBAL-SANCTUARY';
  const queryRoom = new URLSearchParams(window.location.search).get('room');

  const RTC_CONFIG = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ]
  };

  // Inject High-End Sacred Chat Styles
  const style = document.createElement('style');
  style.id = 'room-chat-custom-styles';
  style.textContent = `
    #room-chat-modal {
      color-scheme: dark;
      display: none;
      align-items: center;
      justify-content: center;
      position: fixed;
      inset: 0;
      z-index: 130;
      background: rgba(4, 2, 1, 0.85);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      padding: clamp(6px, 2vw, 16px);
      box-sizing: border-box;
    }
    #room-chat-modal:not(.hidden) {
      display: flex !important;
    }
    #room-chat-modal.hidden {
      display: none !important;
    }

    /* Outer Shell: Sacred Sandalwood & Imperial Gold Glassmorphism */
    .room-chat-shell {
      display: flex;
      flex-direction: column;
      width: min(960px, 98vw);
      height: min(650px, 94vh, 94dvh);
      max-height: min(650px, 94vh, 94dvh);
      overflow: hidden;
      background: linear-gradient(165deg, rgba(34, 16, 7, 0.98) 0%, rgba(18, 8, 3, 0.99) 50%, rgba(10, 4, 1, 1) 100%);
      border: 1.5px solid rgba(245, 190, 80, 0.55);
      border-radius: 20px;
      box-shadow: 0 25px 80px rgba(0, 0, 0, 0.95), 0 0 45px rgba(245, 180, 60, 0.2), inset 0 1px 0 rgba(255, 240, 180, 0.35);
      position: relative;
      box-sizing: border-box;
    }

    /* Header: Sacred Lotus Title & Controls */
    .room-chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 0 16px;
      height: 50px;
      min-height: 50px;
      background: linear-gradient(90deg, rgba(54, 25, 9, 0.92) 0%, rgba(26, 11, 4, 0.96) 100%);
      border-bottom: 1.5px solid rgba(245, 190, 80, 0.35);
      flex-shrink: 0;
      box-sizing: border-box;
    }

    .room-header-left {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .room-lotus-emblem {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: radial-gradient(circle, #b4751e 0%, #5c3008 100%);
      border: 1.5px solid rgba(255, 230, 140, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      box-shadow: 0 0 12px rgba(245, 180, 60, 0.5);
      flex-shrink: 0;
    }

    .room-header-titles {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .room-header-topline {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: nowrap;
    }

    .room-chat-header h3 {
      margin: 0;
      color: #fff9e6;
      font-family: 'Lora', Georgia, serif;
      font-size: clamp(0.95rem, 1.4vw, 1.15rem);
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8), 0 0 10px rgba(245, 190, 80, 0.3);
    }

    .room-room-code {
      color: #ffd875;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-weight: 800;
      padding: 1px 6px;
      border-radius: 6px;
      background: rgba(245, 190, 80, 0.14);
      border: 1px solid rgba(245, 190, 80, 0.35);
      font-size: 0.65rem;
      white-space: nowrap;
    }

    .room-header-right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    /* Quick Header Mic Toggle Button */
    .room-header-mic-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 11px;
      border-radius: 9999px;
      font-size: 0.74rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      background: rgba(245, 190, 80, 0.15);
      border: 1.2px solid rgba(245, 190, 80, 0.45);
      color: #ffe8a3;
      white-space: nowrap;
    }
    .room-header-mic-btn:hover {
      background: rgba(245, 190, 80, 0.3);
      border-color: #ffd875;
      color: #fff;
    }
    .room-header-mic-btn.is-live {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-color: #6ee7b7;
      color: #ffffff;
      box-shadow: 0 0 15px rgba(16, 185, 129, 0.7);
      animation: pulseMic 1.4s infinite alternate;
    }
    @keyframes pulseMic {
      from { transform: scale(1); filter: brightness(1); }
      to { transform: scale(1.03); filter: brightness(1.15); }
    }

    .room-close {
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      width: 32px;
      height: 32px;
      border: 1.5px solid rgba(255, 230, 140, 0.35);
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.08);
      color: #ffe8a3;
      font-size: 1.3rem;
      line-height: 1;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .room-close:hover {
      background: rgba(245, 190, 80, 0.25);
      border-color: rgba(255, 235, 160, 0.7);
      color: #ffffff;
      transform: rotate(90deg) scale(1.08);
    }

    /* Channel Navigation Toolbar */
    .room-chat-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 0 16px;
      height: 38px;
      min-height: 38px;
      background: rgba(16, 7, 2, 0.75);
      border-bottom: 1px solid rgba(245, 190, 80, 0.22);
      flex-shrink: 0;
      box-sizing: border-box;
    }

    .room-channel-tabs {
      display: flex;
      gap: 6px;
      min-width: 0;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .room-channel-tabs::-webkit-scrollbar {
      display: none;
    }

    .room-channel-tab {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 12px;
      border-radius: 8px;
      background: transparent;
      border: 1px solid transparent;
      color: #d1b88e;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .room-channel-tab:hover {
      color: #fff2c6;
      background: rgba(245, 190, 80, 0.12);
    }
    .room-channel-tab.is-active {
      color: #1a0802;
      background: linear-gradient(180deg, #fce49c 0%, #e5b34a 100%);
      border-color: rgba(255, 235, 160, 0.8);
      font-weight: 800;
      box-shadow: 0 2px 8px rgba(245, 190, 80, 0.35);
    }

    .room-sync-status {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      color: #d4bc92;
      font-size: 0.68rem;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .room-sync-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.9);
    }

    /* Main Body Grid Layout */
    .room-chat-grid {
      display: flex;
      flex-direction: row;
      flex: 1 1 0%;
      min-height: 0;
      height: 100%;
      overflow: hidden;
      position: relative;
      box-sizing: border-box;
    }

    /* Main Chat Column */
    .room-chat-main {
      display: flex;
      flex-direction: column;
      flex: 1 1 0%;
      min-width: 0;
      min-height: 0;
      height: 100%;
      background: radial-gradient(circle at 50% 12%, rgba(245, 190, 80, 0.04) 0%, transparent 60%), rgba(12, 5, 2, 0.5);
      overflow: hidden;
      box-sizing: border-box;
    }

    .room-channel-title {
      padding: 0 16px;
      height: 28px;
      min-height: 28px;
      color: #f7d48a;
      font-size: 0.72rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
      border-bottom: 1px solid rgba(245, 190, 80, 0.12);
      flex-shrink: 0;
      background: rgba(14, 6, 2, 0.4);
    }

    /* Messages Scroll Area */
    .room-chat-messages {
      flex: 1 1 0%;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 12px 16px;
      scrollbar-width: thin;
      scrollbar-color: rgba(245, 190, 80, 0.35) transparent;
      box-sizing: border-box;
    }
    .room-chat-messages::-webkit-scrollbar {
      width: 5px;
    }
    .room-chat-messages::-webkit-scrollbar-thumb {
      background: rgba(245, 190, 80, 0.3);
      border-radius: 9999px;
    }

    .room-chat-message {
      max-width: min(84%, 560px);
      margin: 0 0 10px;
      animation: fadeInMsg 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes fadeInMsg {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .room-chat-message.is-self {
      margin-left: auto;
      text-align: right;
    }

    .room-chat-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 3px;
      color: #dfcaa2;
      font-size: 0.67rem;
    }
    .room-chat-meta strong {
      color: #fce19a;
      font-weight: 700;
    }
    .room-chat-meta time {
      color: rgba(223, 202, 162, 0.65);
      font-size: 0.62rem;
    }
    .room-chat-message.is-self .room-chat-meta {
      justify-content: flex-end;
    }

    .room-chat-bubble {
      display: inline-block;
      padding: 8px 13px;
      border: 1px solid rgba(245, 190, 80, 0.25);
      border-radius: 14px 14px 14px 3px;
      background: linear-gradient(145deg, rgba(46, 22, 10, 0.92) 0%, rgba(28, 13, 5, 0.96) 100%);
      color: #fef4dc;
      font-size: 0.82rem;
      line-height: 1.45;
      text-align: left;
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: anywhere;
      box-shadow: 0 3px 12px rgba(0, 0, 0, 0.45);
    }
    .room-chat-message.is-self .room-chat-bubble {
      border-color: rgba(255, 235, 160, 0.6);
      border-radius: 14px 14px 3px 14px;
      background: linear-gradient(145deg, #b87720 0%, #874e0d 100%);
      color: #fffdf5;
      box-shadow: 0 3px 14px rgba(184, 119, 32, 0.4);
    }

    .room-chat-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 160px;
      height: 100%;
      color: #d1b88e;
      text-align: center;
      font-size: 0.8rem;
    }
    .room-chat-empty-icon {
      font-size: 38px;
      margin-bottom: 8px;
      filter: drop-shadow(0 0 14px rgba(245, 180, 60, 0.4));
      animation: floatLotus 3s ease-in-out infinite alternate;
    }
    @keyframes floatLotus {
      from { transform: translateY(0); }
      to { transform: translateY(-5px); }
    }
    .room-chat-empty strong {
      display: block;
      margin-bottom: 4px;
      color: #ffd875;
      font-size: 1rem;
      font-family: 'Lora', Georgia, serif;
    }

    /* Dharma Quick Blessing Bar (Single Row, Never Overlaps) */
    .room-dharma-pills {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0 12px;
      height: 38px;
      min-height: 38px;
      overflow-x: auto;
      overflow-y: hidden;
      white-space: nowrap;
      scrollbar-width: none;
      background: rgba(18, 8, 3, 0.85);
      border-top: 1px solid rgba(245, 190, 80, 0.18);
      flex-shrink: 0;
      box-sizing: border-box;
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
      border: 1px solid rgba(245, 190, 80, 0.32);
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
      border-color: rgba(255, 235, 160, 0.75);
      color: #ffffff;
      transform: translateY(-1px);
    }
    .room-dharma-pill:active {
      transform: scale(0.96);
    }

    /* Composer: Fixed at bottom, zero overlap */
    .room-chat-composer {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 14px;
      height: 52px;
      min-height: 52px;
      background: rgba(12, 5, 2, 0.98);
      border-top: 1.5px solid rgba(245, 190, 80, 0.32);
      flex-shrink: 0;
      box-sizing: border-box;
    }

    .room-chat-composer input,
    .room-join-row input {
      min-width: 0;
      flex: 1;
      height: 38px;
      border: 1.5px solid rgba(245, 190, 80, 0.35);
      border-radius: 9999px;
      outline: none;
      background: rgba(22, 10, 4, 0.9);
      color: #fff9e6;
      padding: 0 14px;
      font-size: 0.83rem;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }
    .room-chat-composer input::placeholder {
      color: rgba(223, 202, 162, 0.55);
    }
    .room-chat-composer input:focus,
    .room-join-row input:focus {
      border-color: #f6c863;
      box-shadow: 0 0 0 3px rgba(246, 200, 99, 0.25);
      background: rgba(28, 12, 5, 0.98);
    }

    .room-chat-composer button,
    .room-join-row button {
      min-width: 68px;
      height: 38px;
      padding: 0 15px;
      border: 1px solid rgba(255, 235, 160, 0.6);
      border-radius: 9999px;
      background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%);
      color: #1a0b02;
      font-weight: 800;
      font-size: 0.82rem;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 3px 12px rgba(217, 119, 6, 0.4);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      flex-shrink: 0;
      box-sizing: border-box;
    }
    .room-chat-composer button:hover,
    .room-join-row button:hover {
      filter: brightness(1.12);
      transform: translateY(-1px);
    }
    .room-chat-composer button:active,
    .room-join-row button:active {
      transform: scale(0.96);
    }

    /* Sidebar: Room Info, Members & Voice */
    .room-chat-sidebar {
      width: 270px;
      min-width: 270px;
      height: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 14px 16px;
      border-left: 1.5px solid rgba(245, 190, 80, 0.25);
      background: linear-gradient(180deg, rgba(22, 10, 4, 0.85) 0%, rgba(12, 5, 2, 0.95) 100%);
      scrollbar-width: thin;
      scrollbar-color: rgba(245, 190, 80, 0.3) transparent;
      flex-shrink: 0;
      box-sizing: border-box;
    }
    .room-chat-sidebar::-webkit-scrollbar {
      width: 4px;
    }
    .room-chat-sidebar::-webkit-scrollbar-thumb {
      background: rgba(245, 190, 80, 0.25);
      border-radius: 9999px;
    }

    .room-side-title {
      display: block;
      margin-bottom: 5px;
      color: #f7d48a;
      font-size: 0.74rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .room-side-caption {
      margin: 0 0 10px;
      color: #cbb28b;
      font-size: 0.66rem;
      line-height: 1.4;
    }

    .room-member {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      border-bottom: 1px solid rgba(245, 190, 80, 0.1);
      font-size: 0.75rem;
    }
    .room-member-avatar {
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      width: 26px;
      height: 26px;
      border: 1.5px solid rgba(245, 190, 80, 0.4);
      border-radius: 50%;
      background: radial-gradient(circle, #5c3008 0%, #291303 100%);
      color: #fde68a;
      font-weight: 700;
      font-size: 0.72rem;
      transition: all 0.3s ease;
    }
    .room-member.is-speaking .room-member-avatar {
      border-color: #34d399;
      box-shadow: 0 0 12px rgba(52, 211, 153, 0.8);
      animation: pulseAvatar 0.9s infinite alternate;
    }
    @keyframes pulseAvatar {
      from { transform: scale(1); }
      to { transform: scale(1.14); }
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
      font-size: 0.72rem;
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }
    .room-member.is-speaking .room-member-state {
      color: #34d399;
      font-weight: 800;
      text-shadow: 0 0 8px rgba(52, 211, 153, 0.6);
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
      margin-top: 8px;
      height: 36px;
      border: 1px solid rgba(245, 190, 80, 0.4);
      border-radius: 9999px;
      background: rgba(245, 190, 80, 0.12);
      color: #fde68a;
      font-weight: 800;
      font-size: 0.76rem;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      box-sizing: border-box;
    }
    .room-mic-button:hover,
    .room-secondary-action:hover {
      background: rgba(245, 190, 80, 0.22);
      border-color: rgba(255, 235, 160, 0.6);
      color: #ffffff;
      transform: translateY(-1px);
    }
    .room-mic-button.is-live {
      border-color: #6ee7b7;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff;
      box-shadow: 0 0 16px rgba(16, 185, 129, 0.7);
    }

    .room-join-label {
      margin-top: 14px;
    }
    .room-join-row {
      display: flex;
      gap: 6px;
    }

    .room-qr-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      margin-top: 14px;
      padding: 10px;
      border: 1px solid rgba(245, 190, 80, 0.3);
      border-radius: 12px;
      background: rgba(10, 4, 1, 0.6);
      box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.5);
    }
    #room-qr-canvas {
      width: 120px;
      height: 120px;
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

    /* RESPONSIVE DESIGN: ZERO OVERLAPPING ACROSS ALL DEVICES */
    @media (max-width: 840px), (max-height: 540px) {
      .room-chat-shell {
        height: min(600px, 96vh, 96dvh);
        max-height: min(600px, 96vh, 96dvh);
        border-radius: 16px;
      }
      .room-chat-header {
        height: 44px;
        min-height: 44px;
        padding: 0 12px;
      }
      .room-chat-header h3 {
        font-size: 0.95rem;
      }
      .room-chat-toolbar {
        height: 36px;
        min-height: 36px;
        padding: 0 12px;
      }
      .room-sync-status {
        display: none;
      }

      /* Smart Tab Switcher: Chat OR Members, Never Squeezed! */
      .room-chat-grid.show-members .room-chat-main {
        display: none !important;
      }
      .room-chat-grid.show-members .room-chat-sidebar {
        display: block !important;
        width: 100% !important;
        min-width: 100% !important;
        border-left: none !important;
      }
      .room-chat-grid:not(.show-members) .room-chat-sidebar {
        display: none !important;
      }
      .room-chat-grid:not(.show-members) .room-chat-main {
        display: flex !important;
        width: 100% !important;
      }
      
      .room-chat-composer {
        height: 46px;
        min-height: 46px;
        padding: 0 10px;
      }
      .room-chat-composer input {
        height: 34px;
        font-size: 0.78rem;
      }
      .room-chat-composer button {
        height: 34px;
        min-width: 58px;
        font-size: 0.78rem;
      }
      .room-dharma-pills {
        height: 34px;
        min-height: 34px;
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
    channel: 'lobby', // 'lobby' | 'dm' | 'members'
    messages: [],
    messageIds: new Set(),
    members: new Map(), // senderId => { id, name, speaking, lastSeen }
    stream: null,
    muted: true,
    isLoopRecording: false,
    peerConnections: new Map(), // peerId => RTCPeerConnection
    remoteAudioStreams: new Map(), // peerId => MediaStream
    peerAudioSchedule: new Map(), // peerId => nextPlayTime for Web Audio API
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
    setText('room-chat-title', publicRoom ? 'Đạo Tràng Chung' : 'Phòng Tu Tập Riêng');
    const tabMembers = document.getElementById('room-tab-members');
    if (tabMembers) tabMembers.textContent = `👥 Đồng Tu (${state.members.size + 1})`;
  }

  function renderQr() {
    const canvas = document.getElementById('room-qr-canvas');
    const shareUrl = document.getElementById('room-share-url');
    if (!canvas || !shareUrl) return;
    shareUrl.textContent = roomUrl();
    QRCodeEngine.draw(canvas, roomUrl(), {
      size: 130,
      margin: 1,
      dark: '#1f1309',
      light: '#fde9b8'
    });
  }

  function renderMembers() {
    const list = document.getElementById('room-members-list');
    if (!list) return;
    list.innerHTML = '';

    // Local self member
    const selfRow = document.createElement('div');
    selfRow.className = `room-member${!state.muted ? ' is-speaking' : ''}`;
    selfRow.innerHTML = `
      <div class="room-member-avatar">${profile().name.slice(0, 1).toUpperCase()}</div>
      <div class="room-member-name">${profile().name} <span class="text-amber-300 font-normal">(Bạn)</span></div>
      <div class="room-member-state">${!state.muted ? '🟢 Đang nói' : 'Tịnh niệm'}</div>
    `;
    list.appendChild(selfRow);

    // Remote devotees
    state.members.forEach(member => {
      const row = document.createElement('div');
      row.className = `room-member${member.speaking ? ' is-speaking' : ''}`;
      row.innerHTML = `
        <div class="room-member-avatar">${(member.name || 'Đ').slice(0, 1).toUpperCase()}</div>
        <div class="room-member-name">${member.name || 'Đồng Tu'}</div>
        <div class="room-member-state">${member.speaking ? '🟢 Đang nói' : 'Tịnh niệm'}</div>
      `;
      list.appendChild(row);
    });

    setRoomMeta();
  }

  function renderMessages() {
    const list = document.getElementById('room-chat-messages');
    if (!list) return;
    list.innerHTML = '';
    const messages = state.messages.filter(message => (message.channel || 'lobby') === (state.channel === 'members' ? 'lobby' : state.channel)).slice(-120);
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
     WEBRTC VOICE ENGINE & HIGH-FIDELITY AUDIO SLICE RELAY
     ========================================================================== */

  // Play remote audio stream safely with Web Audio destination routing
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

    try {
      const audioCtx = window.AudioEngine?.ctx || state.audioContext || (window.AudioContext && new (window.AudioContext || window.webkitAudioContext)());
      if (audioCtx) {
        if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(audioCtx.destination);
      }
    } catch (_) {}

    const member = state.members.get(peerId);
    if (member) {
      member.speaking = true;
      renderMembers();
    }
  }

  function getOrCreatePeerConnection(peerId) {
    if (state.peerConnections.has(peerId)) {
      return state.peerConnections.get(peerId);
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    state.peerConnections.set(peerId, pc);

    if (state.stream) {
      state.stream.getAudioTracks().forEach(track => {
        pc.addTrack(track, state.stream);
      });
    }

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        playRemoteAudioStream(peerId, event.streams[0]);
      }
    };

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
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        state.peerConnections.delete(peerId);
        state.remoteAudioStreams.delete(peerId);
        const el = document.getElementById(`remote-audio-${peerId}`);
        if (el) el.remove();
      }
    };

    return pc;
  }

  async function callPeer(peerId) {
    if (!peerId || peerId === myId()) return;
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
      console.warn(`[RoomVoice] Failed offer to ${peerId}:`, err);
    }
  }

  // Self-Contained Looping Slice Recorder: Produces 100% valid, decodable audio bursts
  function startVoiceLoopRecorder() {
    if (!state.stream) return;
    state.isLoopRecording = true;

    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm');

    let currentRec = null;

    function captureNextSlice() {
      if (!state.isLoopRecording || state.muted || !state.stream) return;

      try {
        currentRec = new MediaRecorder(state.stream, { mimeType: mime, audioBitsPerSecond: 24000 });
        const chunks = [];
        currentRec.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };
        currentRec.onstop = () => {
          if (chunks.length > 0 && !state.muted && state.isLoopRecording) {
            const fullBlob = new Blob(chunks, { type: mime });
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
            reader.readAsDataURL(fullBlob);
          }
          if (state.isLoopRecording && !state.muted) {
            setTimeout(captureNextSlice, 25);
          }
        };

        currentRec.start();
        setTimeout(() => {
          if (currentRec && currentRec.state === 'recording') {
            try { currentRec.stop(); } catch (_) {}
          }
        }, 400);

      } catch (err) {
        console.warn('[RoomVoice] Recorder slice error:', err);
        setTimeout(() => { if (state.isLoopRecording) captureNextSlice(); }, 500);
      }
    }

    captureNextSlice();
  }

  function stopVoiceLoopRecorder() {
    state.isLoopRecording = false;
  }

  // Seamless Jitter-Free Audio Chunk Playback with Timeline Scheduling
  async function playAudioChunk(peerId, base64Data, mimeType) {
    if (!base64Data || peerId === myId()) return;
    if (state.remoteAudioStreams.has(peerId)) return; // WebRTC direct stream takes precedence

    try {
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioCtx = window.AudioEngine?.ctx || state.audioContext || (window.AudioContext && new (window.AudioContext || window.webkitAudioContext)());
      if (audioCtx) {
        if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
        try {
          const audioBuffer = await audioCtx.decodeAudioData(bytes.buffer.slice(0));
          const source = audioCtx.createBufferSource();
          source.buffer = audioBuffer;
          const gainNode = audioCtx.createGain();
          gainNode.gain.value = 1.0;
          source.connect(gainNode);
          gainNode.connect(audioCtx.destination);

          const now = audioCtx.currentTime;
          const nextPlay = Math.max(now, state.peerAudioSchedule.get(peerId) || now);
          source.start(nextPlay);
          state.peerAudioSchedule.set(peerId, nextPlay + audioBuffer.duration);

          const member = state.members.get(peerId);
          if (member) {
            member.speaking = true;
            renderMembers();
            clearTimeout(member._speakTimer);
            member._speakTimer = setTimeout(() => {
              member.speaking = false;
              renderMembers();
            }, Math.max(700, audioBuffer.duration * 1000 + 200));
          }
          return;
        } catch (_) {}
      }

      // Fallback: HTML5 Audio element
      const blob = new Blob([bytes], { type: mimeType || 'audio/webm' });
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
    } catch (_) {}
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
      case 'ROOM_VOICE_ANNOUNCE':
        if (payload.senderId) {
          const isSpeaking = Boolean(payload.speaking);
          state.members.set(payload.senderId, {
            id: payload.senderId,
            name: payload.name || 'Đồng Tu',
            speaking: isSpeaking,
            lastSeen: Date.now()
          });
          renderMembers();

          // Connect WebRTC if unmuted or if remote unmuted
          if (!state.muted || isSpeaking) {
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
      window.RealtimeSanctuary.publishMessage({ ...payload, roomId: state.roomId, senderId: myId() });
    }
  }

  function updateMicButtonsUI() {
    const isLive = !state.muted;

    // 1. Room Modal Header Mic Button
    const headerMicBtn = document.getElementById('room-header-mic-btn');
    if (headerMicBtn) {
      headerMicBtn.classList.toggle('is-live', isLive);
      headerMicBtn.innerHTML = isLive ? '<span>🟢</span><span>Đang Nói (Bật)</span>' : '<span>🎙️</span><span>Bật Mic</span>';
    }

    // 2. Room Modal Sidebar Mic Button
    const sidebarMicBtn = document.getElementById('room-mic-button');
    const meter = document.getElementById('room-voice-meter');
    if (sidebarMicBtn) {
      sidebarMicBtn.classList.toggle('is-live', isLive);
      setText('room-mic-label', isLive ? 'Đang bật mic · Chạm tắt' : 'Bật mic đàm thoại');
    }
    if (meter) {
      meter.classList.toggle('is-active', isLive);
    }

    // 3. Bottom Dock Mic Button
    const dockMic = document.getElementById('btn-dock-mic');
    const dockMicIcon = document.getElementById('dock-mic-icon');
    const dockMicLabel = document.getElementById('dock-mic-label');
    if (dockMic) {
      if (isLive) {
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
  }

  async function toggleMic() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Trình duyệt của bạn không hỗ trợ tính năng truyền âm thanh trực tiếp (Microphone).');
      return;
    }

    try {
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

      updateMicButtonsUI();

      if (!state.muted) {
        setupAudioVisualizer();
        startVoiceLoopRecorder();

        // Broadcast presence & voice state
        publish({
          type: 'ROOM_VOICE_ANNOUNCE',
          roomId: state.roomId,
          senderId: myId(),
          name: profile().name,
          speaking: true
        });

        // Initiate WebRTC call to all known members in the room
        state.members.forEach((_, peerId) => {
          callPeer(peerId);
        });
      } else {
        stopVoiceLoopRecorder();
        publish({
          type: 'ROOM_VOICE_ANNOUNCE',
          roomId: state.roomId,
          senderId: myId(),
          name: profile().name,
          speaking: false
        });
      }

      renderMembers();

    } catch (err) {
      console.error('[RoomVoice] getUserMedia error:', err);
      alert('Không thể kết nối Micro: Vui lòng nhấn vào biểu tượng ổ khóa 🔒 trên thanh địa chỉ trình duyệt và chọn "Cho phép (Allow)" Micro để tham gia đàm thoại.');
    }
  }

  function ensureRoom() {
    setRoomMeta();
    renderQr();
    publish({
      type: 'ROOM_PRESENCE',
      roomId: state.roomId,
      senderId: myId(),
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
      updateMicButtonsUI();
      setTimeout(() => {
        const input = document.getElementById('room-chat-input');
        if (input && window.innerWidth >= 768) input.focus();
        const list = document.getElementById('room-chat-messages');
        if (list) list.scrollTop = list.scrollHeight;
      }, 100);
    }
  }

  function close() {
    const modal = document.getElementById('room-chat-modal');
    if (modal) modal.classList.add('hidden');
  }

  function sendText(customText) {
    const input = document.getElementById('room-chat-input');
    const text = (customText || input?.value || '').trim().slice(0, 500);
    if (!text) return;

    const message = {
      type: 'ROOM_CHAT',
      roomId: state.roomId,
      senderId: myId(),
      messageId: `${myId()}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      channel: state.channel === 'dm' ? 'dm' : 'lobby',
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
      setText('room-copy-label', '✓ Đã sao chép');
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
    state.channel = channel;
    document.querySelectorAll('.room-channel-tab').forEach(tab => {
      tab.classList.toggle('is-active', tab.dataset.channel === channel);
    });

    const grid = document.querySelector('.room-chat-grid');
    if (grid) {
      if (channel === 'members') {
        grid.classList.add('show-members');
      } else {
        grid.classList.remove('show-members');
      }
    }

    setText('room-channel-title', channel === 'dm'
      ? '🔒 Nhắn tin riêng tư cùng Đạo Hữu'
      : (isPublicRoom() ? '🌐 Đạo Tràng Toàn Cầu · Mọi người cùng chiêm bái' : '🔒 Phòng Tu Riêng · Trong mã phòng này'));

    renderMessages();
  };

  function injectRoomUi() {
    if (document.getElementById('room-chat-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'room-chat-modal';
    modal.className = 'hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'room-chat-title');
    modal.innerHTML = `
      <div class="room-chat-shell text-amber-50 relative" onclick="event.stopPropagation()">
        
        <!-- Sacred Header -->
        <header class="room-chat-header">
          <div class="room-header-left">
            <div class="room-lotus-emblem" title="Đạo Tràng An Nhiên">🪷</div>
            <div class="room-header-titles">
              <div class="room-header-topline">
                <h3 id="room-chat-title">Đạo Tràng Chung</h3>
                <span id="room-code-label" class="room-room-code">PHÒNG CHUNG</span>
              </div>
            </div>
          </div>

          <div class="room-header-right">
            <!-- Header Quick Mic Toggle -->
            <button type="button" id="room-header-mic-btn" onclick="toggleRoomMic()" class="room-header-mic-btn" title="Bật/Tắt Micro Đàm Thoại">
              <span>🎙️</span><span>Bật Mic</span>
            </button>
            <button type="button" onclick="closeRoomChat()" class="room-close" title="Đóng đàm luận" aria-label="Đóng chat">×</button>
          </div>
        </header>

        <!-- Channel Navigation Toolbar -->
        <div class="room-chat-toolbar">
          <div class="room-channel-tabs" role="tablist" aria-label="Luồng đàm luận">
            <button type="button" class="room-channel-tab is-active" data-channel="lobby" onclick="switchRoomChannel('lobby')" role="tab">🌐 Đạo Tràng Toàn Cầu</button>
            <button type="button" class="room-channel-tab" data-channel="dm" onclick="switchRoomChannel('dm')" role="tab">🔒 Nhắn Tin Riêng</button>
            <button type="button" id="room-tab-members" class="room-channel-tab" data-channel="members" onclick="switchRoomChannel('members')" role="tab">👥 Đồng Tu (1)</button>
          </div>
          <div id="room-sync-status" class="room-sync-status">
            <span class="room-sync-dot"></span>
            <span>Trực tuyến</span>
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

            <!-- Quick Dharma Blessing Pills (Single Row, Never Overlaps) -->
            <div class="room-dharma-pills">
              <span class="text-[10px] text-amber-300/70 font-bold uppercase tracking-wider shrink-0 mr-1">Lời lành:</span>
              <button type="button" onclick="sendQuickDharmaBlessing('Nam Mô A Di Đà Phật 🙏')" class="room-dharma-pill">🙏 A Di Đà Phật</button>
              <button type="button" onclick="sendQuickDharmaBlessing('Tùy hỷ công đức quý Đạo hữu 🪷')" class="room-dharma-pill">🪷 Tùy hỷ công đức</button>
              <button type="button" onclick="sendQuickDharmaBlessing('Nguyện thân tâm thường an lạc ✨')" class="room-dharma-pill">✨ Thân tâm an lạc</button>
              <button type="button" onclick="sendQuickDharmaBlessing('Nguyện cầu quốc thới dân an 🕯️')" class="room-dharma-pill">🕯️ Nguyện cầu bình an</button>
              <button type="button" onclick="sendQuickDharmaBlessing('Vạn sự cát tường, phước huệ trang nghiêm 🕊️')" class="room-dharma-pill">🕊️ Cát tường như ý</button>
            </div>

            <!-- Input Composer (Fixed at bottom) -->
            <div class="room-chat-composer">
              <input id="room-chat-input" onkeydown="handleRoomMessageKey(event)" placeholder="Gửi lời lành, niệm Phật cùng Đạo Tràng..." maxlength="500" autocomplete="off">
              <button type="button" onclick="sendRoomChat()" aria-label="Gửi tin nhắn">
                <span>Gửi</span><span>📤</span>
              </button>
            </div>
          </section>

          <!-- Sidebar Column: Members & Room Management -->
          <aside class="room-chat-sidebar" aria-label="Thông tin phòng">
            <span class="room-side-title">Đồng Tu Đang Huân Tu</span>
            <p class="room-side-caption">Các đạo hữu cùng phòng nghe giọng nói trực tiếp và trạng thái tịnh tâm.</p>
            
            <div id="room-members-list"></div>

            <!-- Mic Control in Sidebar with Animated Waveform -->
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
              <input id="room-id-input" placeholder="Mã phòng..." autocomplete="off">
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
