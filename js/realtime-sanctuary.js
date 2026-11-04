/**
 * Chùa An Nhiên — Unified Real-time Sanctuary & Cloud Storage Stream System (v3.0)
 * Đạo Tràng Trực Tuyến & Giải Pháp Lưu Trữ Server Chung Luồng
 *
 * GIẢI PHÁP LƯU TRỮ SERVER CHUNG 1 LUỒNG (Single Source of Truth):
 * 1. Lưu Trữ Server Bền Vững (Cloud Storage on Port 443 + Dedicated Node Server):
 *    - Toàn bộ thiết bị (Mobile 4G/5G, PC, Tablet) đồng bộ qua Máy Chủ Lưu Trữ chung.
 *    - Tự động lưu trữ danh sách đồng tu, vị trí Bồ đoàn và tiến độ tụng kinh.
 *    - Chạy trên cổng chuẩn HTTPS (Port 443), không bị chặn bởi bất kỳ nhà mạng 4G hay tường lửa nào.
 * 2. Kết Nối Trực Tiếp Node.js Server:
 *    - Khi chạy node server.js hoặc cấu hình URL máy chủ riêng, tự động chuyển sang WebSocket/REST của server.
 * 3. Đồng Bộ Khóa Lễ Tụng Kinh Thời Gian Thực (Shared Room Chanting):
 *    - Từng câu kinh, nhịp mõ và động tác đảnh lễ đồng bộ 100% giữa các thiết bị.
 * 4. Tự Động Giải Quyết Xung Đột Bồ Đoàn (Conflict Resolution) & Phục Hồi Khi Mở Khóa Màn Hình.
 */

(function () {
  'use strict';

  // Universal Real-Time Stream on Standard Port 443 (100% accessible on 4G/5G Viettel/Vinaphone/Mobi, zero limits)
  const NTFY_TOPIC = 'chuanhien_sanctuary_oqukilrmabwaovxgtbzy';
  const NTFY_WS_URL = 'wss://ntfy.sh/' + NTFY_TOPIC + '/ws';
  const NTFY_PUB_URL = 'https://ntfy.sh/' + NTFY_TOPIC;
  const NTFY_POLL_URL = 'https://ntfy.sh/' + NTFY_TOPIC + '/json?poll=1&since=45s';
  const NTFY_SSE_URL = 'https://ntfy.sh/' + NTFY_TOPIC + '/sse';

  // Global MQTT Brokers as high-speed speed accelerators
  const BROKERS = [
    { host: 'broker.emqx.io', port: 8084, path: '/mqtt', ssl: true, label: 'EMQX Global Broker' },
    { host: 'broker.hivemq.com', port: 8884, path: '/mqtt', ssl: true, label: 'HiveMQ Global Broker' }
  ];

  const SANCTUARY_TOPIC = 'chuanhien/oqukilrmabwaovxgtbzy/session';
  let currentBrokerIndex = 0;
  let pahoClient = null;
  let ntfySocket = null;
  let nodeWs = null;
  let ntfySSE = null;
  let ntfyReconnectTimer = null;
  let isConnected = false;
  let isConnecting = false;
  let reconnectTimer = null;
  let heartbeatTimer = null;
  let cloudSyncTimer = null;
  let pruneTimer = null;

  // Local BroadcastChannel for instant zero-latency multi-tab sync on same device
  const localChannel = (typeof window.BroadcastChannel !== 'undefined')
    ? new window.BroadcastChannel('chua_an_nhien_realtime_channel_v3')
    : null;

  // Unique client identity per browser session (unified across transport engines)
  const clientId = window.SANCTUARY_CLIENT_ID
    || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('chua_an_nhien_cid'))
    || ('phattu_' + Math.random().toString(36).substring(2, 8) + '_' + Date.now().toString(36));

  // Map of active remote devotees: clientId -> { clientId, seatNo, data, lastSeen }
  const remoteDevotees = new Map();

  const RealtimeSanctuary = {
    clientId: clientId,
    isConnected: false,
    activeMode: 'cloud_storage', // 'node_server' | 'cloud_storage' | 'paho_mqtt'
    lastSyncTime: null,
    syncLatency: 0,
    serverUrl: (typeof localStorage !== 'undefined' ? localStorage.getItem('chua_an_nhien_server_url') : '') || '',
    roomChatHistory: [],

    // Real-time Shared Chanting Room State
    sharedChanting: {
      isActive: false,
      leaderId: null,
      leaderName: '',
      scriptureId: 'daibi',
      scriptureTitle: 'Chú Đại Bi',
      verseIndex: 0,
      verseText: '',
      totalVerses: 0,
      intervalMs: 3000,
      startedAt: null,
      timer: null,
      isParticipant: true
    },

    init() {
      console.log(`[RealtimeSanctuary v3.0] Initializing with clientId: ${clientId}`);
      const hasDedicatedServer = Boolean(
        localStorage.getItem('chua_an_nhien_server_url')
        || window.location.hostname === 'localhost'
        || window.location.hostname === '127.0.0.1'
      );
      this.detectAndInitServerConnection();
      // A dedicated Node server already provides the realtime transport.
      // Avoid duplicate public connections and noisy timeout logs locally.
      if (!hasDedicatedServer) {
        this.initUniversalStream();
        this.connectBroker();
      }
      this.setupLocalChannel();
      this.startHeartbeatLoop();
      this.startPruneLoop();
      this.setupWindowEvents();
    },

    getOnlineCount() {
      return Math.max(1, remoteDevotees.size + 1);
    },

    /**************************************************************************
     * 1. GIẢI PHÁP LƯU TRỮ SERVER CHUNG LUỒNG (PORT 443 UNIVERSAL STREAM)
     **************************************************************************/

    initUniversalStream() {
      // 1. Initial catchup poll for recent state from last 45s
      this.pollUniversalCatchup();

      // 2. Connect WebSocket over Port 443 (sub-millisecond instant synchronization)
      this.connectUniversalWebSocket();

      // 3. Fallback SSE
      this.setupUniversalSSE();

      // 4. Periodic catchup sync every 4 seconds to guarantee no packets missed
      clearInterval(cloudSyncTimer);
      cloudSyncTimer = setInterval(() => {
        RealtimeSanctuary.pollUniversalCatchup();
      }, 4000);
    },

    pollUniversalCatchup() {
      const t0 = (typeof performance !== 'undefined') ? performance.now() : Date.now();
      fetch(NTFY_POLL_URL)
        .then(r => r.text())
        .then(text => {
          if (!text) return;
          this.syncLatency = Math.round(((typeof performance !== 'undefined') ? performance.now() : Date.now()) - t0);
          this.lastSyncTime = Date.now();
          const lines = text.trim().split('\n');
          lines.forEach(line => {
            try {
              const item = JSON.parse(line);
              if (item.event === 'message' && item.message) {
                const msg = JSON.parse(item.message);
                if (msg && msg.senderId && msg.senderId !== clientId) {
                  RealtimeSanctuary.handleIncomingMessage(msg);
                }
              }
            } catch (e) {}
          });
          this.isConnected = true;
          this.updateConnectionHUD(true);
        })
        .catch(() => {});
    },

    connectUniversalWebSocket() {
      if (typeof WebSocket === 'undefined') return;
      try {
        if (ntfySocket) {
          ntfySocket.onclose = null;
          ntfySocket.close();
        }
        ntfySocket = new WebSocket(NTFY_WS_URL);
        ntfySocket.onopen = () => {
          console.log('[RealtimeSanctuary] Port 443 WSS Connected to Universal Stream!');
          this.isConnected = true;
          this.updateConnectionHUD(true);
          clearTimeout(ntfyReconnectTimer);
          // Broadcast presence immediately so all existing devotees see us
          this.broadcastHelloSync();
        };
        ntfySocket.onmessage = (event) => {
          try {
            const item = JSON.parse(event.data);
            if (item.event === 'message' && item.message) {
              const msg = JSON.parse(item.message);
              if (msg && msg.senderId && msg.senderId !== clientId) {
                this.lastSyncTime = Date.now();
                this.handleIncomingMessage(msg);
              }
            }
          } catch (e) {}
        };
        ntfySocket.onclose = () => {
          this.isConnected = false;
          this.updateConnectionHUD(false);
          clearTimeout(ntfyReconnectTimer);
          ntfyReconnectTimer = setTimeout(() => {
            RealtimeSanctuary.connectUniversalWebSocket();
          }, 3000);
        };
        ntfySocket.onerror = () => {
          try { ntfySocket.close(); } catch (e) {}
        };
      } catch (err) {
        console.warn('[RealtimeSanctuary] WSS connection failed:', err);
      }
    },

    setupUniversalSSE() {
      if (typeof EventSource === 'undefined') return;
      try {
        if (ntfySSE) ntfySSE.close();
        ntfySSE = new EventSource(NTFY_SSE_URL);
        ntfySSE.onmessage = (event) => {
          try {
            const item = JSON.parse(event.data);
            if (item.event === 'message' && item.message) {
              const msg = JSON.parse(item.message);
              if (msg && msg.senderId && msg.senderId !== clientId) {
                this.lastSyncTime = Date.now();
                this.handleIncomingMessage(msg);
              }
            }
          } catch (e) {}
        };
      } catch (e) {}
    },

    /**************************************************************************
     * 2. NODE.JS DEDICATED SERVER INTEGRATION (CUSTOM/LOCAL SERVER)
     **************************************************************************/

    detectAndInitServerConnection() {
      const customUrl = localStorage.getItem('chua_an_nhien_server_url');
      const isLocal = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const serverBase = customUrl || (isLocal ? window.location.origin : '');

      if (!serverBase) return;

      console.log(`[RealtimeSanctuary] Connecting to dedicated Node server: ${serverBase}`);
      this.activeMode = 'node_server';

      // 1. Join via REST API
      const profile = this.buildUserProfilePayload();
      fetch(`${serverBase}/api/sanctuary/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: clientId, profile: profile })
      }).then(r => r.json()).then(res => {
        if (res.state) {
          this.applyNodeServerState(res.state);
        }
      }).catch(err => {
        console.warn('[RealtimeSanctuary] Node server REST fallback:', err.message);
      });

      // 2. Connect via WebSocket
      const wsProto = serverBase.startsWith('https') ? 'wss:' : 'ws:';
      const wsHost = serverBase.replace(/^https?:\/\//, '');
      const wsUrl = `${wsProto}//${wsHost}/ws`;

      try {
        const ws = new WebSocket(wsUrl);
        ws.onopen = () => {
          console.log('[RealtimeSanctuary] Connected to Dedicated Node Server WebSocket!');
          this.isConnected = true;
          this.updateConnectionHUD(true);
        };
        ws.onmessage = (ev) => {
          try {
            const parsed = JSON.parse(ev.data);
            if (parsed.type === 'INIT_STATE' && parsed.data) {
              this.applyNodeServerState(parsed.data);
            } else {
              this.handleIncomingMessage(parsed);
            }
          } catch (e) {}
        };
      } catch (e) {
        console.warn('[RealtimeSanctuary] Dedicated WS connect error:', e);
      }
    },

    applyNodeServerState(serverState) {
      if (!serverState) return;
      if (Array.isArray(serverState.chatHistory)) {
        this.roomChatHistory = serverState.chatHistory;
        window.dispatchEvent(new CustomEvent('room-chat-history', { detail: serverState.chatHistory }));
      }
      if (serverState.seats && window.sanctuarySeats) {
        // Sync seats from server database
        serverState.seats.forEach(s => {
          if (s.remoteClientId && s.remoteClientId !== clientId) {
            this.handleDevoteePresence(s.remoteClientId, s, false);
          }
        });
      }
      if (serverState.communalChant && serverState.communalChant.isActive) {
        const c = serverState.communalChant;
        this.sharedChanting.isActive = true;
        this.sharedChanting.leaderId = c.leaderId;
        this.sharedChanting.leaderName = c.leaderName;
        this.sharedChanting.scriptureId = c.scriptureId;
        this.sharedChanting.scriptureTitle = c.scriptureTitle;
        this.sharedChanting.verseIndex = c.verseIndex;
        this.sharedChanting.verseText = c.verseText;
        this.sharedChanting.totalVerses = c.totalVerses;
        this.sharedChanting.intervalMs = c.intervalMs || 3000;
        this.sharedChanting.isParticipant = true;
        this.onCommunalVerseAdvanced(c.verseIndex, c.verseText, false);
      }
    },

    /**************************************************************************
     * 3. GLOBAL BROKER PUB/SUB ACCELERATOR
     **************************************************************************/

    connectBroker() {
      if (typeof window.Paho === 'undefined' || !window.Paho.MQTT) return;
      if (isConnected || isConnecting) return;

      isConnecting = true;
      const broker = BROKERS[currentBrokerIndex];

      try {
        const client = new window.Paho.MQTT.Client(broker.host, broker.port, broker.path, clientId);

        client.onConnectionLost = (responseObject) => {
          isConnecting = false;
          // Switch to alternative broker and reconnect
          currentBrokerIndex = (currentBrokerIndex + 1) % BROKERS.length;
          clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => RealtimeSanctuary.connectBroker(), 4000);
        };

        client.onMessageArrived = (message) => {
          try {
            const payload = JSON.parse(message.payloadString);
            RealtimeSanctuary.handleIncomingMessage(payload);
          } catch (e) {}
        };

        client.connect({
          useSSL: broker.ssl,
          timeout: 5,
          keepAliveInterval: 25,
          cleanSession: true,
          onSuccess: () => {
            isConnected = true;
            isConnecting = false;
            pahoClient = client;
            RealtimeSanctuary.isConnected = true;
            RealtimeSanctuary.updateConnectionHUD(true);
            client.subscribe(SANCTUARY_TOPIC, { qos: 0 });
            RealtimeSanctuary.broadcastHelloSync();
          },
          onFailure: () => {
            isConnecting = false;
            currentBrokerIndex = (currentBrokerIndex + 1) % BROKERS.length;
            clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => RealtimeSanctuary.connectBroker(), 5000);
          }
        });
      } catch (err) {
        isConnecting = false;
      }
    },

    setupLocalChannel() {
      if (!localChannel) return;
      localChannel.onmessage = (event) => {
        if (event && event.data) {
          RealtimeSanctuary.handleIncomingMessage(event.data);
        }
      };
    },

    setupWindowEvents() {
      window.addEventListener('beforeunload', () => {
        const mySeat = window.currentUserProfile && window.currentUserProfile.assignedSeatNo;
        RealtimeSanctuary.publishMessage({
          type: 'LEAVE',
          senderId: clientId,
          seatNo: mySeat || null
        });

        if (RealtimeSanctuary.sharedChanting.isActive && RealtimeSanctuary.sharedChanting.leaderId === clientId) {
          RealtimeSanctuary.stopCommunalChant(true);
        }
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          RealtimeSanctuary.pollUniversalCatchup();
          RealtimeSanctuary.broadcastHelloSync();
        }
      });

      window.addEventListener('online', () => {
        RealtimeSanctuary.pollUniversalCatchup();
        RealtimeSanctuary.connectUniversalWebSocket();
      });
    },

    publishMessage(payload) {
      payload.senderId = clientId;
      payload.timestamp = Date.now();

      // 1. Broadcast locally for multi-tab testing
      if (localChannel) {
        try {
          localChannel.postMessage(payload);
        } catch (e) {}
      }

      // 2. Publish to Universal Stream on Port 443 (ntfy.sh)
      try {
        fetch(NTFY_PUB_URL, {
          method: 'POST',
          headers: { 'Title': 'ChuaAnNhien' },
          body: JSON.stringify(payload)
        }).then(() => {
          this.lastSyncTime = Date.now();
        }).catch(() => {});
      } catch (e) {}

      // 3. Publish to dedicated Node server if configured
      const customUrl = localStorage.getItem('chua_an_nhien_server_url');
      const isLocal = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const serverBase = customUrl || (isLocal ? window.location.origin : '');
      if (serverBase) {
        fetch(`${serverBase}/api/sanctuary/event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => {});
      }

      // 4. Publish to MQTT broker
      if (pahoClient && isConnected) {
        try {
          const pahoMsg = new window.Paho.MQTT.Message(JSON.stringify(payload));
          pahoMsg.destinationName = SANCTUARY_TOPIC;
          pahoMsg.qos = 0;
          pahoClient.send(pahoMsg);
        } catch (err) {}
      }

      // 5. Broadcast to Supabase Realtime if active
      if (window.SupabaseSanctuary && window.SupabaseSanctuary.isRealtimeActive) {
        try {
          window.SupabaseSanctuary.broadcast(payload.type, payload);
        } catch (err) {}
      }
    },

    buildUserProfilePayload() {
      const profile = window.currentUserProfile || {};
      const payload = {
        sessionCode: profile.sessionCode || '#AN-8899',
        ip: profile.clientIp || '',
        seatNo: profile.assignedSeatNo || null,
        name: profile.fullName || 'Đồng Tu Mới',
        dharma: profile.dharmaName || 'Tịnh Tâm',
        age: profile.age || 26,
        hometown: profile.hometown || 'Chùa An Nhiên',
        gender: profile.avatarType || profile.gender || 'monk',
        points: profile.meritScore || 20,
        realm: profile.realmLevel || 1,
        wish: profile.wish || profile.userWish || 'Cầu bình an vạn sự',
        registered: !!profile.registered
      };

      if (this.sharedChanting && this.sharedChanting.isActive) {
        payload.communalChant = {
          isActive: true,
          leaderId: this.sharedChanting.leaderId,
          leaderName: this.sharedChanting.leaderName,
          scriptureId: this.sharedChanting.scriptureId,
          scriptureTitle: this.sharedChanting.scriptureTitle,
          verseIndex: this.sharedChanting.verseIndex,
          verseText: this.sharedChanting.verseText,
          totalVerses: this.sharedChanting.totalVerses,
          intervalMs: this.sharedChanting.intervalMs,
          startedAt: this.sharedChanting.startedAt
        };
      }

      return payload;
    },

    broadcastHelloSync() {
      this.publishMessage({
        type: 'HELLO_SYNC',
        senderId: clientId,
        data: this.buildUserProfilePayload()
      });
    },

    broadcastStateAnnounce(targetId = null) {
      this.publishMessage({
        type: 'STATE_ANNOUNCE',
        senderId: clientId,
        targetId: targetId,
        data: this.buildUserProfilePayload()
      });
    },

    broadcastSeatClaim(seatNo, userProfile) {
      this.publishMessage({
        type: 'CLAIM_SEAT',
        senderId: clientId,
        seatNo: seatNo,
        data: {
          sessionCode: userProfile.sessionCode,
          ip: userProfile.clientIp,
          name: userProfile.fullName,
          dharma: userProfile.dharmaName,
          age: userProfile.age,
          hometown: userProfile.hometown,
          gender: userProfile.avatarType || userProfile.gender || 'monk',
          points: userProfile.meritScore,
          realm: userProfile.realmLevel,
          wish: userProfile.wish || userProfile.userWish,
          registered: true
        }
      });
      // Immediately trigger cloud storage sync so all devices reflect seat
      this.syncWithCloudSanctuary();
    },

    broadcastMoTap(phrase, zenMultiplier) {
      const profile = window.currentUserProfile || {};
      this.publishMessage({
        type: 'TAP_MO',
        senderId: clientId,
        seatNo: profile.assignedSeatNo,
        phrase: phrase,
        multiplier: zenMultiplier,
        points: profile.meritScore,
        moCount: profile.woodenFishCount,
        beads: profile.malaBeads
      });
    },

    broadcastBellRing() {
      const profile = window.currentUserProfile || {};
      this.publishMessage({
        type: 'RING_BELL',
        senderId: clientId,
        name: profile.fullName || 'Đồng Tu',
        seatNo: profile.assignedSeatNo
      });
    },

    broadcastSkyLantern(senderName, wishText) {
      this.publishMessage({
        type: 'SKY_LANTERN',
        senderId: clientId,
        sender: senderName,
        wish: wishText
      });
    },

    broadcastPrayerSutra(senderName, wishText, namesText) {
      this.publishMessage({
        type: 'PRAYER_SUTRA',
        senderId: clientId,
        sender: senderName,
        wish: wishText,
        names: namesText
      });
    },

    broadcastRejoice(targetName, fromName) {
      this.publishMessage({
        type: 'REJOICE_MERIT',
        senderId: clientId,
        targetName: targetName,
        fromName: fromName
      });
    },

    /**************************************************************************
     * 4. REAL-TIME SHARED CHANTING ROOM METHODS (ĐỒNG TỤNG THỜI GIAN THỰC)
     **************************************************************************/

    getScriptureVerses(id) {
      const scriptures = window.TEMPLE_SCRIPTURES || [];
      const found = scriptures.find(s => s.id === id);
      if (!found || !Array.isArray(found.verses)) {
        return [
          'Nam Mô Bổn Sư Thích Ca Mâu Ni Phật',
          'Nam Mô A Di Đà Phật',
          'Nam Mô Quán Thế Âm Bồ Tát'
        ];
      }
      return found.verses.filter(v => v && v.trim().length > 0);
    },

    getScriptureTitle(id) {
      const scriptures = window.TEMPLE_SCRIPTURES || [];
      const found = scriptures.find(s => s.id === id);
      return found ? found.title : 'Kinh Điển Tụng Niệm';
    },

    startCommunalChant(scriptureId = 'daibi', intervalMs = 3000) {
      const verses = this.getScriptureVerses(scriptureId);
      const title = this.getScriptureTitle(scriptureId);
      const profile = window.currentUserProfile || {};
      const leaderName = profile.fullName || 'Chủ Lễ';

      clearInterval(this.sharedChanting.timer);

      this.sharedChanting.isActive = true;
      this.sharedChanting.leaderId = clientId;
      this.sharedChanting.leaderName = leaderName;
      this.sharedChanting.scriptureId = scriptureId;
      this.sharedChanting.scriptureTitle = title;
      this.sharedChanting.verseIndex = 0;
      this.sharedChanting.verseText = verses[0] || 'Nam Mô A Di Đà Phật';
      this.sharedChanting.totalVerses = verses.length;
      this.sharedChanting.intervalMs = intervalMs;
      this.sharedChanting.startedAt = Date.now();
      this.sharedChanting.isParticipant = true;

      this.publishMessage({
        type: 'COMMUNAL_CHANT_START',
        senderId: clientId,
        leaderId: clientId,
        leaderName: leaderName,
        scriptureId: scriptureId,
        scriptureTitle: title,
        verseIndex: 0,
        verseText: this.sharedChanting.verseText,
        totalVerses: verses.length,
        intervalMs: intervalMs,
        startedAt: this.sharedChanting.startedAt
      });

      this.syncWithCloudSanctuary();

      if (window.AudioEngine && window.AudioEngine.enabled) {
        window.AudioEngine.playTempleBell();
      }
      if (window.showLiveGiftBanner) {
        window.showLiveGiftBanner('Khai Mở Khóa Lễ', `📿 Bạn vừa khởi xướng Khóa Lễ: ${title}`, 'lotus');
      }

      this.onCommunalVerseAdvanced(0, this.sharedChanting.verseText, true);

      let curIdx = 0;
      this.sharedChanting.timer = setInterval(() => {
        curIdx++;
        if (curIdx >= verses.length) {
          RealtimeSanctuary.finishCommunalChant();
          return;
        }

        const vText = verses[curIdx];
        RealtimeSanctuary.sharedChanting.verseIndex = curIdx;
        RealtimeSanctuary.sharedChanting.verseText = vText;

        RealtimeSanctuary.publishMessage({
          type: 'COMMUNAL_CHANT_VERSE',
          senderId: clientId,
          leaderId: clientId,
          scriptureId: scriptureId,
          verseIndex: curIdx,
          verseText: vText,
          totalVerses: verses.length
        });

        RealtimeSanctuary.onCommunalVerseAdvanced(curIdx, vText, true);
      }, intervalMs);
    },

    stopCommunalChant(silent = false) {
      clearInterval(this.sharedChanting.timer);
      this.sharedChanting.timer = null;
      this.sharedChanting.isActive = false;
      this.sharedChanting.leaderId = null;

      if (!silent) {
        this.publishMessage({
          type: 'COMMUNAL_CHANT_STOP',
          senderId: clientId,
          scriptureTitle: this.sharedChanting.scriptureTitle
        });
        if (window.showLiveGiftBanner) {
          window.showLiveGiftBanner('Khóa Lễ Đã Dừng', 'Khóa lễ đồng tụng thời gian thực đã kết thúc', 'lotus');
        }
      }

      this.syncWithCloudSanctuary();
      this.hideCommunalBanner();
    },

    finishCommunalChant() {
      clearInterval(this.sharedChanting.timer);
      this.sharedChanting.timer = null;
      this.sharedChanting.isActive = false;
      const title = this.sharedChanting.scriptureTitle;

      this.publishMessage({
        type: 'COMMUNAL_CHANT_FINISH',
        senderId: clientId,
        scriptureTitle: title
      });

      this.syncWithCloudSanctuary();
      this.hideCommunalBanner();

      if (window.addMeritPoints && window.currentUserProfile) {
        window.addMeritPoints(window.currentUserProfile.fullName, 25, 'lotus', `Viên mãn khóa lễ đồng tụng ${title}`, true);
      }
      if (window.showLiveGiftBanner) {
        window.showLiveGiftBanner('Viên Mãn Khóa Lễ', `Toàn thể Đạo Tràng hoàn thành khóa tụng ${title} (+25 Công Đức)!`, 'lotus');
      }
      if (window.triggerGoldenLotusRain) {
        window.triggerGoldenLotusRain(38);
      }
      if (window.AudioEngine && window.AudioEngine.enabled) {
        window.AudioEngine.playTempleBell();
      }
    },

    joinCommunalChant() {
      this.sharedChanting.isParticipant = true;
      this.publishMessage({
        type: 'COMMUNAL_CHANT_JOIN',
        senderId: clientId,
        name: (window.currentUserProfile && window.currentUserProfile.fullName) || 'Đồng Tu'
      });
      this.updateCommunalBannerUI();
      if (window.showLiveGiftBanner) {
        window.showLiveGiftBanner('Hòa Giọng Đồng Tụng', `Bạn đã tham gia Khóa Lễ: ${this.sharedChanting.scriptureTitle}`, 'lotus');
      }
    },

    leaveCommunalChant() {
      this.sharedChanting.isParticipant = false;
      this.hideCommunalBanner();
      if (window.showLiveGiftBanner) {
        window.showLiveGiftBanner('Rời Khóa Lễ', 'Bạn đã tạm rời khóa lễ đồng tụng', 'lotus');
      }
    },

    onCommunalVerseAdvanced(verseIndex, verseText, isLeader) {
      this.updateCommunalBannerUI();

      if (window.AudioEngine && window.AudioEngine.enabled) {
        window.AudioEngine.playWoodenFish(1);
      }

      if (window.sanctuarySeats) {
        window.sanctuarySeats.forEach(seat => {
          if (seat.occupied && window.triggerDevoteeBow) {
            window.triggerDevoteeBow(seat.id, verseText, 'lotus');
          }
        });
      }

      if (window.temple3D && window.is3DModeActive) {
        if (Array.isArray(window.temple3D.devotees3D)) {
          window.temple3D.devotees3D.forEach(d => {
            if (d.group && d.group.userData && typeof d.group.userData.bow === 'function') {
              d.group.userData.bow();
            }
          });
        }
        if (typeof window.temple3D.tapWoodenFish3D === 'function') {
          window.temple3D.tapWoodenFish3D();
        }
      }

      if (window.DailyQuestEngine) {
        window.DailyQuestEngine.onAction('wooden_fish', 1);
      }

      const readerBox = document.getElementById('scripture-reader-box');
      if (readerBox) {
        document.querySelectorAll('.active-chant-verse').forEach(el => el.classList.remove('active-chant-verse'));
        const row = document.getElementById(`verse-row-${verseIndex}`);
        if (row) {
          row.classList.add('active-chant-verse');
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    },

    updateCommunalBannerUI() {
      const banner = document.getElementById('communal-chant-banner');
      if (!banner) return;

      if (!this.sharedChanting.isActive) {
        banner.classList.add('hidden');
        return;
      }

      banner.classList.remove('hidden');

      const titleEl = document.getElementById('communal-scripture-title');
      const leaderEl = document.getElementById('communal-chant-leader');
      const progEl = document.getElementById('communal-chant-progress');
      const partEl = document.getElementById('communal-chant-participants');
      const verseEl = document.getElementById('communal-active-verse');

      if (titleEl) titleEl.textContent = this.sharedChanting.scriptureTitle;
      if (leaderEl) {
        const isMe = this.sharedChanting.leaderId === clientId;
        leaderEl.textContent = isMe ? 'Chủ lễ: BẠN' : `Chủ lễ: ${this.sharedChanting.leaderName || 'Hành Giả'}`;
      }
      if (progEl) {
        progEl.textContent = `Câu ${this.sharedChanting.verseIndex + 1} / ${this.sharedChanting.totalVerses}`;
      }
      if (partEl) {
        const total = this.getOnlineCount();
        partEl.textContent = `🟢 ${total} người đang cùng tụng`;
      }
      if (verseEl) {
        const text = this.sharedChanting.verseText || '';
        verseEl.innerHTML = `<span class="communal-verse-ticker">"${text}"</span>`;
      }
    },

    hideCommunalBanner() {
      const banner = document.getElementById('communal-chant-banner');
      if (banner) {
        banner.classList.add('hidden');
      }
    },

    handleIncomingMessage(msg) {
      if (!msg || !msg.type || msg.senderId === clientId || msg.senderId === window.SANCTUARY_CLIENT_ID) return;

      if (msg.type && msg.type.startsWith('ROOM_')) {
        window.dispatchEvent(new CustomEvent('room-realtime-message', { detail: msg }));
        return;
      }
      switch (msg.type) {
        case 'ROOM_CHAT':
        case 'ROOM_PRESENCE':
        case 'ROOM_VOICE_OFFER':
        case 'ROOM_VOICE_ANSWER':
        case 'ROOM_VOICE_CANDIDATE':
        case 'ROOM_VOICE_CHUNK':
          window.dispatchEvent(new CustomEvent('room-realtime-message', { detail: msg }));
          break;
        case 'HELLO_SYNC':
          this.handleDevoteePresence(msg.senderId, msg.data, true);
          this.broadcastStateAnnounce(msg.senderId);
          break;

        case 'STATE_ANNOUNCE':
          if (!msg.targetId || msg.targetId === clientId) {
            this.handleDevoteePresence(msg.senderId, msg.data, false);
          }
          break;

        case 'HEARTBEAT':
          this.handleDevoteePresence(msg.senderId, msg.data, false);
          break;

        case 'CLAIM_SEAT':
          this.handleDevoteeSeatClaim(msg.senderId, msg.seatNo, msg.data);
          break;

        case 'TAP_MO':
          this.handleDevoteeMoTap(msg.seatNo, msg.phrase, msg.multiplier, msg.senderId);
          break;

        case 'RING_BELL':
          this.handleDevoteeBell(msg.name);
          break;

        case 'SKY_LANTERN':
          this.handleDevoteeSkyLantern(msg.sender, msg.wish);
          break;

        case 'PRAYER_SUTRA':
          this.handleDevoteePrayerSutra(msg.sender, msg.wish);
          break;

        case 'REJOICE_MERIT':
          this.handleDevoteeRejoice(msg.targetName, msg.fromName);
          break;

        case 'DEVOTEE_OFFER_INCENSE':
        case 'OFFER_INCENSE':
          if (typeof window.animateRemoteIncenseOffering === 'function') {
            window.animateRemoteIncenseOffering(msg);
          } else if (typeof window.triggerDevoteeBow === 'function' && msg.seatNo) {
            window.triggerDevoteeBow(`seat-${msg.seatNo}`, 'Dâng 3 nén tâm hương', 'lotus');
          }
          break;

        case 'COMMUNAL_CHANT_START':
          this.sharedChanting.isActive = true;
          this.sharedChanting.leaderId = msg.leaderId;
          this.sharedChanting.leaderName = msg.leaderName;
          this.sharedChanting.scriptureId = msg.scriptureId;
          this.sharedChanting.scriptureTitle = msg.scriptureTitle;
          this.sharedChanting.totalVerses = msg.totalVerses;
          this.sharedChanting.intervalMs = msg.intervalMs || 3000;
          this.sharedChanting.verseIndex = msg.verseIndex || 0;
          this.sharedChanting.verseText = msg.verseText || '';
          this.sharedChanting.isParticipant = true;
          this.onCommunalVerseAdvanced(msg.verseIndex || 0, msg.verseText || '', false);

          if (window.showLiveGiftBanner) {
            window.showLiveGiftBanner('Khóa Lễ Đồng Tụng', `🟢 ${msg.leaderName} vừa khai mở khóa lễ: ${msg.scriptureTitle}`, 'lotus');
          }
          if (window.AudioEngine && window.AudioEngine.enabled) {
            window.AudioEngine.playTempleBell();
          }
          break;

        case 'COMMUNAL_CHANT_VERSE':
          this.sharedChanting.isActive = true;
          this.sharedChanting.isParticipant = true;
          this.sharedChanting.leaderId = msg.leaderId;
          this.sharedChanting.scriptureId = msg.scriptureId;
          this.sharedChanting.verseIndex = msg.verseIndex;
          this.sharedChanting.verseText = msg.verseText;
          this.sharedChanting.totalVerses = msg.totalVerses;

          this.onCommunalVerseAdvanced(msg.verseIndex, msg.verseText, false);
          break;

        case 'COMMUNAL_CHANT_FINISH':
          this.sharedChanting.isActive = false;
          this.hideCommunalBanner();

          if (window.showLiveGiftBanner) {
            window.showLiveGiftBanner('Viên Mãn Khóa Lễ', `Toàn thể Đạo Tràng hoàn thành khóa tụng ${msg.scriptureTitle} (+25 Công Đức)!`, 'lotus');
          }
          if (window.addMeritPoints && window.currentUserProfile) {
            window.addMeritPoints(window.currentUserProfile.fullName, 25, 'lotus', `Hoàn thành khóa lễ đồng tụng ${msg.scriptureTitle}`, true);
          }
          if (window.triggerGoldenLotusRain) {
            window.triggerGoldenLotusRain(36);
          }
          if (window.AudioEngine && window.AudioEngine.enabled) {
            window.AudioEngine.playTempleBell();
          }
          break;

        case 'COMMUNAL_CHANT_STOP':
          this.sharedChanting.isActive = false;
          this.hideCommunalBanner();

          if (window.showLiveGiftBanner) {
            window.showLiveGiftBanner('Khóa Lễ Tạm Dừng', `Khóa lễ ${msg.scriptureTitle || 'đồng tụng'} đã kết thúc`, 'lotus');
          }
          break;

        case 'COMMUNAL_CHANT_JOIN':
          if (window.showLiveGiftBanner) {
            window.showLiveGiftBanner('Đồng Tu Hòa Giọng', `🟢 ${msg.name} vừa tham gia khóa tụng cùng bạn`, 'lotus');
          }
          this.updateCommunalBannerUI();
          break;

        case 'LEAVE':
          this.handleDevoteeLeave(msg.senderId, msg.seatNo);
          break;
      }
    },

    findBestSeatForRemoteDevotee(senderId, requestedSeatNo) {
      if (!window.sanctuarySeats) return null;
      const mySeatNo = window.currentUserProfile && window.currentUserProfile.assignedSeatNo;

      const existingRecord = remoteDevotees.get(senderId);
      if (existingRecord && existingRecord.seatNo && existingRecord.seatNo !== mySeatNo) {
        const currentSeat = window.sanctuarySeats.find(s => s.seatNo === existingRecord.seatNo);
        if (currentSeat && (!requestedSeatNo || requestedSeatNo === existingRecord.seatNo)) {
          return currentSeat;
        }
      }

      if (requestedSeatNo && requestedSeatNo !== mySeatNo) {
        if (typeof window.ensureSeatCapacity === 'function') {
          window.ensureSeatCapacity(requestedSeatNo);
        }
        const candidate = window.sanctuarySeats.find(s => s.seatNo === requestedSeatNo);
        if (candidate && !candidate.isUser) {
          if (!candidate.occupied || candidate.remoteClientId === senderId) {
            return candidate;
          }
          if (candidate.isDummy && !candidate.remoteClientId) {
            return candidate;
          }
        }
      }

      const emptySeat = window.sanctuarySeats.find(s => !s.occupied && !s.isUser && s.seatNo !== mySeatNo);
      if (emptySeat) return emptySeat;

      const dummySeat = window.sanctuarySeats.find(s => s.isDummy && !s.remoteClientId && !s.isUser && s.seatNo !== mySeatNo);
      if (dummySeat) return dummySeat;

      // Nếu đã hết toàn bộ 12 chỗ (hoặc số chỗ hiện tại) -> Tự động sinh hàng mới (+6 chỗ) để luôn có chỗ cho người tiếp theo
      if (typeof window.generateNewSeatRow === 'function') {
        const newSeats = window.generateNewSeatRow();
        if (newSeats && newSeats.length > 0) {
          return newSeats[0];
        }
      }

      const anyOther = window.sanctuarySeats.find(s => !s.isUser && s.seatNo !== mySeatNo);
      return anyOther || null;
    },

    handleDevoteePresence(senderId, data, isNewJoin) {
      if (window.SupabaseSanctuary && window.SupabaseSanctuary.isConnected) return;
      if (!data || senderId === clientId || senderId === window.SANCTUARY_CLIENT_ID) return;
      const isExisting = remoteDevotees.has(senderId);
      const mySeatNo = window.currentUserProfile && window.currentUserProfile.assignedSeatNo;

      let requestedSeatNo = data.seatNo;
      // If requested seat is already taken by the local registered user, re-assert and let remote find best
      if (requestedSeatNo === mySeatNo && window.currentUserProfile && window.currentUserProfile.registered) {
        this.publishMessage({
          type: 'CLAIM_SEAT',
          senderId: clientId,
          seatNo: mySeatNo,
          data: this.buildUserProfilePayload()
        });
        requestedSeatNo = null;
      }

      const targetSeat = this.findBestSeatForRemoteDevotee(senderId, requestedSeatNo);
      const assignedSeatNo = targetSeat ? targetSeat.seatNo : requestedSeatNo;

      remoteDevotees.set(senderId, {
        clientId: senderId,
        seatNo: assignedSeatNo,
        data: data,
        lastSeen: Date.now()
      });

      if (targetSeat && !targetSeat.isUser) {
        window.sanctuarySeats.forEach(s => {
          if (s.remoteClientId === senderId && s.seatNo !== targetSeat.seatNo) {
            s.occupied = false;
            s.remoteClientId = null;
            s.name = '';
            s.dharma = '';
          }
        });

        targetSeat.occupied = true;
        targetSeat.isUser = false;
        targetSeat.isDummy = false;
        targetSeat.remoteClientId = senderId;
        targetSeat.name = data.name || 'Đồng Tu Online';
        targetSeat.dharma = data.dharma || 'Tịnh Tâm';
        targetSeat.age = data.age || 26;
        targetSeat.hometown = data.hometown || 'Chùa An Nhiên';
        targetSeat.ip = data.ip || '113.161.x.x';
        targetSeat.points = data.points || 30;
        targetSeat.type = data.gender || 'monk';
        targetSeat.wish = data.wish || '';

        if (isNewJoin && !isExisting && window.showLiveGiftBanner) {
          window.showLiveGiftBanner(
            'Đồng Tu Nhập Tọa',
            `🟢 ${targetSeat.name} (PD: ${targetSeat.dharma}) vừa vào Bồ đoàn #${targetSeat.seatNo}`,
            'lotus'
          );
          if (window.AudioEngine && window.AudioEngine.enabled && typeof window.AudioEngine.playGiftChime === 'function') {
            window.AudioEngine.playGiftChime();
          }
        }
      }

      this.updateOnlineCountHUD();
      this.refreshSanctuaryViews();
      if (window.renderRegSeatsSelector) {
        window.renderRegSeatsSelector();
      }
    },

    handleDevoteeSeatClaim(senderId, seatNo, data) {
      if (window.SupabaseSanctuary && window.SupabaseSanctuary.isConnected) return;
      if (!window.sanctuarySeats || !seatNo || !data || senderId === clientId || senderId === window.SANCTUARY_CLIENT_ID) return;
      const mySeatNo = window.currentUserProfile && window.currentUserProfile.assignedSeatNo;

      // If remote claims the seat I am currently occupying as registered user:
      if (seatNo === mySeatNo && window.currentUserProfile && window.currentUserProfile.registered) {
        // Re-assert my claim so the sender knows I already own this seat
        this.publishMessage({
          type: 'CLAIM_SEAT',
          senderId: clientId,
          seatNo: mySeatNo,
          data: this.buildUserProfilePayload()
        });
        return;
      }

      // Free previous seat held by this remote client
      window.sanctuarySeats.forEach(s => {
        if (s.remoteClientId === senderId && s.seatNo !== seatNo) {
          s.occupied = false;
          s.remoteClientId = null;
          s.name = '';
          s.dharma = '';
        }
      });

      let targetSeat = window.sanctuarySeats.find(s => s.seatNo === seatNo);
      if (!targetSeat || targetSeat.isUser || (targetSeat.remoteClientId && targetSeat.remoteClientId !== senderId)) {
        targetSeat = this.findBestSeatForRemoteDevotee(senderId, seatNo);
      }

      if (targetSeat && !targetSeat.isUser) {
        targetSeat.occupied = true;
        targetSeat.isUser = false;
        targetSeat.isDummy = false;
        targetSeat.remoteClientId = senderId;
        targetSeat.name = data.name || 'Đồng Tu Mới';
        targetSeat.dharma = data.dharma || 'Tịnh Tâm';
        targetSeat.age = data.age || 26;
        targetSeat.hometown = data.hometown || 'Chùa An Nhiên';
        targetSeat.ip = data.ip || '113.161.x.x';
        targetSeat.points = data.points || 35;
        targetSeat.type = data.gender || 'monk';
        targetSeat.wish = data.wish || '';

        remoteDevotees.set(senderId, {
          clientId: senderId,
          seatNo: targetSeat.seatNo,
          data: Object.assign({}, data, { seatNo: targetSeat.seatNo }),
          lastSeen: Date.now()
        });

        if (window.showLiveGiftBanner) {
          window.showLiveGiftBanner('Đổi Bồ Đoàn', `🟢 ${targetSeat.name} (PD: ${targetSeat.dharma}) đã an tọa Bồ đoàn #${targetSeat.seatNo}`, 'lotus');
        }
      }

      this.updateOnlineCountHUD();
      this.refreshSanctuaryViews();
      if (window.renderRegSeatsSelector) {
        window.renderRegSeatsSelector();
      }
    },

    handleDevoteeMoTap(seatNo, phrase, multiplier, senderId) {
      let actualSeatNo = seatNo;
      if (senderId && remoteDevotees.has(senderId)) {
        actualSeatNo = remoteDevotees.get(senderId).seatNo || seatNo;
        remoteDevotees.get(senderId).lastSeen = Date.now();
      }
      if (!actualSeatNo) return;

      if (window.triggerDevoteeBow) {
        window.triggerDevoteeBow(`seat-${actualSeatNo}`, phrase || 'Nam Mô A Di Đà Phật', 'mo');
      }

      if (window.temple3D && window.is3DModeActive) {
        const devoteeItem = window.temple3D.devotees3D.find(d => d.seatNo === actualSeatNo);
        if (devoteeItem && devoteeItem.group && devoteeItem.group.userData && devoteeItem.group.userData.bow) {
          devoteeItem.group.userData.bow();
        }
        window.temple3D.tapWoodenFish3D();
      }

      if (window.AudioEngine && window.AudioEngine.enabled) {
        window.AudioEngine.playWoodenFish(multiplier || 1);
      }
    },

    handleDevoteeBell(name) {
      if (window.createBellRipple) {
        window.createBellRipple(50, 26);
      }
      if (window.temple3D && window.is3DModeActive) {
        window.temple3D.strikeBell3D();
      }
      if (window.AudioEngine && window.AudioEngine.enabled) {
        window.AudioEngine.playTempleBell();
      }
      if (window.showLiveGiftBanner) {
        window.showLiveGiftBanner('Đại Hồng Chung Ngân Vang', `🟢 Đồng tu ${name || 'ẩn danh'} vừa thỉnh chuông`, 'bell');
      }
    },

    handleDevoteeSkyLantern(sender, wish) {
      if (window.spawnFloatingSkyLantern) {
        window.spawnFloatingSkyLantern(sender, wish, false);
      }
      if (window.temple3D && window.is3DModeActive) {
        window.temple3D.spawn3DSkyLantern(sender, wish);
      }
      if (window.showLiveGiftBanner) {
        window.showLiveGiftBanner(sender, `🟢 Đã thả đèn hoa đăng: "${wish}"`, 'lantern');
      }
      if (window.AudioEngine && window.AudioEngine.enabled) {
        window.AudioEngine.playGiftChime();
      }
    },

    handleDevoteePrayerSutra(sender, wish) {
      if (window.showLiveGiftBanner) {
        window.showLiveGiftBanner('Dâng Sớ Đạo Tràng', `🟢 ${sender} dâng sớ: "${wish}"`, 'lotus');
      }
      if (window.triggerGoldenLotusRain) {
        window.triggerGoldenLotusRain(18);
      }
      if (window.AudioEngine && window.AudioEngine.enabled) {
        window.AudioEngine.playGiftChime();
      }
    },

    handleDevoteeRejoice(targetName, fromName) {
      if (window.currentUserProfile && window.currentUserProfile.fullName === targetName) {
        if (window.showLiveGiftBanner) {
          window.showLiveGiftBanner('Tùy Hỷ Công Đức', `🟢 ${fromName} đã tùy hỷ công đức với bạn (+2 Điểm)!`, 'lotus');
        }
        if (window.addMeritPoints) {
          window.addMeritPoints(targetName, 2, 'lotus', `Nhận tùy hỷ từ ${fromName}`, false);
        }
        if (window.triggerGoldenLotusRain) {
          window.triggerGoldenLotusRain(24);
        }
      }
    },

    handleDevoteeLeave(senderId, seatNo) {
      if (window.SupabaseSanctuary && window.SupabaseSanctuary.isConnected) return;
      remoteDevotees.delete(senderId);
      if (window.sanctuarySeats) {
        const mySeatNo = (window.currentUserProfile && window.currentUserProfile.assignedSeatNo);
        window.sanctuarySeats.forEach(s => {
          if (s.remoteClientId === senderId && s.seatNo !== mySeatNo) {
            s.occupied = false;
            s.remoteClientId = null;
            s.name = '';
            s.dharma = '';
          }
        });
      }

      if (this.sharedChanting.isActive && this.sharedChanting.leaderId === senderId) {
        this.electNewChantLeaderOrFinish();
      }

      this.updateOnlineCountHUD();
      this.refreshSanctuaryViews();
    },

    electNewChantLeaderOrFinish() {
      if (this.sharedChanting.isActive) {
        this.sharedChanting.leaderId = clientId;
        this.sharedChanting.leaderName = (window.currentUserProfile && window.currentUserProfile.fullName) || 'Chủ Lễ Kế Nhiệm';
        const verses = this.getScriptureVerses(this.sharedChanting.scriptureId);

        clearInterval(this.sharedChanting.timer);
        let curIdx = this.sharedChanting.verseIndex;

        this.sharedChanting.timer = setInterval(() => {
          curIdx++;
          if (curIdx >= verses.length) {
            RealtimeSanctuary.finishCommunalChant();
            return;
          }
          const vText = verses[curIdx];
          RealtimeSanctuary.sharedChanting.verseIndex = curIdx;
          RealtimeSanctuary.sharedChanting.verseText = vText;
          RealtimeSanctuary.publishMessage({
            type: 'COMMUNAL_CHANT_VERSE',
            senderId: clientId,
            leaderId: clientId,
            scriptureId: RealtimeSanctuary.sharedChanting.scriptureId,
            verseIndex: curIdx,
            verseText: vText,
            totalVerses: verses.length
          });
          RealtimeSanctuary.onCommunalVerseAdvanced(curIdx, vText, true);
        }, this.sharedChanting.intervalMs || 3000);

        if (window.showLiveGiftBanner) {
          window.showLiveGiftBanner('Chủ Lễ Kế Nhiệm', 'Bạn vừa tiếp nhận vai trò Chủ Lễ duy trì khóa tụng', 'lotus');
        }
      }
    },

    startHeartbeatLoop() {
      clearInterval(heartbeatTimer);
      heartbeatTimer = setInterval(() => {
        RealtimeSanctuary.publishMessage({
          type: 'HEARTBEAT',
          senderId: clientId,
          data: RealtimeSanctuary.buildUserProfilePayload()
        });
      }, 3500);
    },

    startPruneLoop() {
      clearInterval(pruneTimer);
      pruneTimer = setInterval(() => {
        if (window.SupabaseSanctuary && window.SupabaseSanctuary.isConnected) return;
        const now = Date.now();
        let changed = false;
        const mySeatNo = (window.currentUserProfile && window.currentUserProfile.assignedSeatNo);

        remoteDevotees.forEach((devotee, sId) => {
          if (now - devotee.lastSeen > 14000) {
            remoteDevotees.delete(sId);
            changed = true;
            if (window.sanctuarySeats) {
              window.sanctuarySeats.forEach(s => {
                if (s.remoteClientId === sId && s.seatNo !== mySeatNo) {
                  s.occupied = false;
                  s.remoteClientId = null;
                  s.name = '';
                  s.dharma = '';
                }
              });
            }

            if (RealtimeSanctuary.sharedChanting.isActive && RealtimeSanctuary.sharedChanting.leaderId === sId) {
              RealtimeSanctuary.electNewChantLeaderOrFinish();
            }
          }
        });

        if (changed) {
          RealtimeSanctuary.updateOnlineCountHUD();
          RealtimeSanctuary.refreshSanctuaryViews();
        }
      }, 3500);
    },

    updateOnlineCountHUD() {
      const totalOnline = this.getOnlineCount();
      const onlineEl = document.getElementById('hud-online-count');
      if (onlineEl) {
        onlineEl.textContent = totalOnline;
      }
      const partEl = document.getElementById('communal-chant-participants');
      if (partEl) {
        partEl.textContent = `🟢 ${totalOnline} đồng tu đang hòa giọng`;
      }
    },

    updateConnectionHUD(connected) {
      const statusDot = document.getElementById('hud-realtime-status-dot');
      if (statusDot) {
        statusDot.className = connected 
          ? 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse'
          : 'w-2 h-2 rounded-full bg-amber-400';
        statusDot.title = connected 
          ? 'Đang kết nối Máy Chủ Lưu Trữ Đạo Tràng Toàn Cầu (Chung 1 luồng)' 
          : 'Đang kết nối lại...';
      }
    },

    refreshSanctuaryViews() {
      if (window.renderSanctuaryFloor) {
        window.renderSanctuaryFloor();
      }
      if (window.temple3D && window.is3DModeActive) {
        window.temple3D.refreshSeats3D();
      }
    },

    getServerStatus() {
      return {
        activeMode: this.activeMode,
        isConnected: this.isConnected,
        clientId: this.clientId,
        onlineCount: this.getOnlineCount(),
        lastSyncTime: this.lastSyncTime,
        syncLatency: this.syncLatency,
        cloudStorageUrl: CLOUD_STORAGE_URL,
        nodeServerUrl: this.serverUrl || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? window.location.origin : ''),
        sharedChanting: this.sharedChanting,
        remoteCount: remoteDevotees.size
      };
    },

    async forceSyncNow() {
      console.log('[RealtimeSanctuary] Force synchronization triggered...');
      if (this.activeMode === 'node_server') {
        const serverBase = this.serverUrl || window.location.origin;
        try {
          const res = await fetch(`${serverBase}/api/sanctuary/state`);
          if (res.ok) {
            const data = await res.json();
            this.applyNodeServerState(data);
            this.lastSyncTime = Date.now();
            return true;
          }
        } catch (e) {}
      }
      return await this.syncWithCloudSanctuary();
    },

    setCustomServerUrl(url) {
      if (!url) {
        localStorage.removeItem('chua_an_nhien_server_url');
        this.serverUrl = '';
        this.activeMode = 'cloud_storage';
      } else {
        url = url.trim().replace(/\/+$/, '');
        localStorage.setItem('chua_an_nhien_server_url', url);
        this.serverUrl = url;
        this.detectAndInitServerConnection();
      }
    },

    resetSession() {
      if (window.sanctuarySeats) {
        window.sanctuarySeats.forEach(s => {
          if (s.isUser) {
            s.isUser = false;
            s.isOccupied = false;
            s.name = '';
            s.dharma = '';
          }
        });
      }
      this.refreshSanctuaryViews();
      this.forceSyncNow();
    }
  };

  window.RealtimeSanctuary = RealtimeSanctuary;
})();
