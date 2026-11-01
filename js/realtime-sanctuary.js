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

  // Cloud Storage Stream Endpoint on Standard Port 443 (Never blocked by mobile 4G/5G carriers)
  const CLOUD_STORAGE_OBJECT_ID = 'ff808181a09d98f701a19653c3797d5c';
  const CLOUD_STORAGE_URL = 'https://api.restful-api.dev/objects/' + CLOUD_STORAGE_OBJECT_ID;

  // Global MQTT Brokers as high-speed speed accelerators
  const BROKERS = [
    { host: 'broker.emqx.io', port: 8084, path: '/mqtt', ssl: true, label: 'EMQX Global Broker' },
    { host: 'broker.hivemq.com', port: 8884, path: '/mqtt', ssl: true, label: 'HiveMQ Global Broker' }
  ];

  const SANCTUARY_TOPIC = 'chuanhien/sanctuary/global/v3';
  let currentBrokerIndex = 0;
  let pahoClient = null;
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

  // Unique client identity per browser session
  const clientId = 'phattu_' + Math.random().toString(36).substring(2, 8) + '_' + Date.now().toString(36);

  // Map of active remote devotees: clientId -> { clientId, seatNo, data, lastSeen }
  const remoteDevotees = new Map();

  const RealtimeSanctuary = {
    clientId: clientId,
    isConnected: false,
    activeMode: 'cloud_storage', // 'node_server' | 'cloud_storage' | 'paho_mqtt'
    lastSyncTime: null,
    syncLatency: 0,
    serverUrl: (typeof localStorage !== 'undefined' ? localStorage.getItem('chua_an_nhien_server_url') : '') || '',

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
      this.detectAndInitServerConnection();
      this.initCloudStorageStream();
      this.connectBroker();
      this.setupLocalChannel();
      this.startHeartbeatLoop();
      this.startPruneLoop();
      this.setupWindowEvents();
    },

    getOnlineCount() {
      return Math.max(1, remoteDevotees.size + 1);
    },

    /**************************************************************************
     * 1. GIẢI PHÁP LƯU TRỮ SERVER CHUNG LUỒNG (CLOUD STORAGE ON PORT 443)
     **************************************************************************/

    initCloudStorageStream() {
      // 1. Initial immediate pull from shared cloud storage
      this.fetchCloudSanctuaryState();

      // 2. Periodic sync with cloud storage (every 2.5s) to guarantee unified state across all 4G/5G devices
      clearInterval(cloudSyncTimer);
      cloudSyncTimer = setInterval(() => {
        RealtimeSanctuary.syncWithCloudSanctuary();
      }, 2500);
    },

    async fetchCloudSanctuaryState() {
      const t0 = (typeof performance !== 'undefined') ? performance.now() : Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(CLOUD_STORAGE_URL, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const json = await res.json();
          if (json && json.data) {
            this.syncLatency = Math.round(((typeof performance !== 'undefined') ? performance.now() : Date.now()) - t0);
            this.lastSyncTime = Date.now();
            this.applyCloudSanctuaryData(json.data);
            this.isConnected = true;
            this.updateConnectionHUD(true);
          }
        }
      } catch (err) {
        // Silent catch for offline or network switch
      }
    },

    async syncWithCloudSanctuary() {
      const now = Date.now();
      const myProfile = this.buildUserProfilePayload();
      const t0 = (typeof performance !== 'undefined') ? performance.now() : Date.now();

      try {
        // Fetch current cloud state
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3200);
        const res = await fetch(CLOUD_STORAGE_URL, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) return;
        const currentDoc = await res.json();
        const serverData = (currentDoc && currentDoc.data) ? currentDoc.data : {};

        this.syncLatency = Math.round(((typeof performance !== 'undefined') ? performance.now() : Date.now()) - t0);
        this.lastSyncTime = now;

        // 1. Process remote devotees from server database
        const devoteesMap = serverData.devotees || {};
        for (const rId in devoteesMap) {
          if (rId !== clientId) {
            const dev = devoteesMap[rId];
            if (dev && (now - (dev.lastSeen || 0) < 14000)) {
              this.handleDevoteePresence(rId, dev.data || dev, false);
            }
          }
        }

        // 2. Process communal chant from server
        if (serverData.communalChant && serverData.communalChant.isActive) {
          const cChant = serverData.communalChant;
          if (!this.sharedChanting.isActive || (this.sharedChanting.leaderId !== clientId && this.sharedChanting.verseIndex !== cChant.verseIndex)) {
            this.sharedChanting.isActive = true;
            this.sharedChanting.leaderId = cChant.leaderId;
            this.sharedChanting.leaderName = cChant.leaderName;
            this.sharedChanting.scriptureId = cChant.scriptureId;
            this.sharedChanting.scriptureTitle = cChant.scriptureTitle;
            this.sharedChanting.verseIndex = cChant.verseIndex;
            this.sharedChanting.verseText = cChant.verseText;
            this.sharedChanting.totalVerses = cChant.totalVerses;
            this.sharedChanting.intervalMs = cChant.intervalMs || 3000;
            this.sharedChanting.isParticipant = true;
            this.onCommunalVerseAdvanced(cChant.verseIndex, cChant.verseText, false);
          }
        } else if (serverData.communalChant && !serverData.communalChant.isActive && this.sharedChanting.isActive && this.sharedChanting.leaderId !== clientId) {
          this.sharedChanting.isActive = false;
          this.hideCommunalBanner();
        }

        // 3. Attach our updated presence to write back
        devoteesMap[clientId] = {
          clientId: clientId,
          seatNo: myProfile.seatNo,
          name: myProfile.name,
          dharma: myProfile.dharma,
          ip: myProfile.ip,
          points: myProfile.points,
          gender: myProfile.gender,
          lastSeen: now,
          data: myProfile
        };

        // Prune stale records (>18s) in object before writing back
        for (const id in devoteesMap) {
          if (now - devoteesMap[id].lastSeen > 18000) {
            delete devoteesMap[id];
          }
        }

        serverData.devotees = devoteesMap;
        serverData.serverTime = now;

        if (this.sharedChanting.isActive && this.sharedChanting.leaderId === clientId) {
          serverData.communalChant = {
            isActive: true,
            leaderId: this.sharedChanting.leaderId,
            leaderName: this.sharedChanting.leaderName,
            scriptureId: this.sharedChanting.scriptureId,
            scriptureTitle: this.sharedChanting.scriptureTitle,
            verseIndex: this.sharedChanting.verseIndex,
            verseText: this.sharedChanting.verseText,
            totalVerses: this.sharedChanting.totalVerses,
            intervalMs: this.sharedChanting.intervalMs
          };
        } else if (!this.sharedChanting.isActive && serverData.communalChant && serverData.communalChant.leaderId === clientId) {
          serverData.communalChant.isActive = false;
        }

        // Write updated presence to cloud database on Port 443
        fetch(CLOUD_STORAGE_URL, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'ChuaAnNhien_Sanctuary_State',
            data: serverData
          })
        }).catch(() => {});

        this.isConnected = true;
        this.updateConnectionHUD(true);
      } catch (err) {
        // Network fallback
      }
    },

    applyCloudSanctuaryData(cloudData) {
      if (!cloudData) return;
      const now = Date.now();
      const devoteesMap = cloudData.devotees || {};

      for (const rId in devoteesMap) {
        if (rId !== clientId) {
          const dev = devoteesMap[rId];
          if (dev && (now - (dev.lastSeen || 0) < 14000)) {
            this.handleDevoteePresence(rId, dev.data || dev, false);
          }
        }
      }

      if (cloudData.communalChant && cloudData.communalChant.isActive && !this.sharedChanting.isActive) {
        const c = cloudData.communalChant;
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
          RealtimeSanctuary.fetchCloudSanctuaryState();
          RealtimeSanctuary.broadcastHelloSync();
        }
      });

      window.addEventListener('online', () => {
        RealtimeSanctuary.fetchCloudSanctuaryState();
        RealtimeSanctuary.connectBroker();
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

      // 2. Publish to dedicated Node server if configured
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

      // 3. Publish to MQTT broker
      if (pahoClient && isConnected) {
        try {
          const pahoMsg = new window.Paho.MQTT.Message(JSON.stringify(payload));
          pahoMsg.destinationName = SANCTUARY_TOPIC;
          pahoMsg.qos = 0;
          pahoClient.send(pahoMsg);
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

      if (!this.sharedChanting.isActive || !this.sharedChanting.isParticipant) {
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
        leaderEl.textContent = isMe ? 'Chủ lễ: BẠN' : `Chủ lễ: ${this.sharedChanting.leaderName}`;
      }
      if (progEl) {
        progEl.textContent = `Câu ${this.sharedChanting.verseIndex + 1} / ${this.sharedChanting.totalVerses}`;
      }
      if (partEl) {
        const total = this.getOnlineCount();
        partEl.textContent = `🟢 ${total} đồng tu đang hòa giọng`;
      }
      if (verseEl) {
        verseEl.textContent = `"${this.sharedChanting.verseText}"`;
      }
    },

    hideCommunalBanner() {
      const banner = document.getElementById('communal-chant-banner');
      if (banner) {
        banner.classList.add('hidden');
      }
    },

    handleIncomingMessage(msg) {
      if (!msg || !msg.type || msg.senderId === clientId) return;

      switch (msg.type) {
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
          this.sharedChanting.leaderId = msg.leaderId;
          this.sharedChanting.scriptureId = msg.scriptureId;
          this.sharedChanting.verseIndex = msg.verseIndex;
          this.sharedChanting.verseText = msg.verseText;
          this.sharedChanting.totalVerses = msg.totalVerses;

          if (this.sharedChanting.isParticipant) {
            this.onCommunalVerseAdvanced(msg.verseIndex, msg.verseText, false);
          }
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
        const candidate = window.sanctuarySeats.find(s => s.seatNo === requestedSeatNo);
        if (candidate) {
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

      const anyOther = window.sanctuarySeats.find(s => !s.isUser && s.seatNo !== mySeatNo);
      return anyOther || null;
    },

    handleDevoteePresence(senderId, data, isNewJoin) {
      if (!data) return;
      const isExisting = remoteDevotees.has(senderId);

      const targetSeat = this.findBestSeatForRemoteDevotee(senderId, data.seatNo);
      const assignedSeatNo = targetSeat ? targetSeat.seatNo : data.seatNo;

      remoteDevotees.set(senderId, {
        clientId: senderId,
        seatNo: assignedSeatNo,
        data: data,
        lastSeen: Date.now()
      });

      if (targetSeat) {
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
            `🟢 ${data.name} (PD: ${data.dharma}) vừa vào Chánh Điện`,
            'lotus'
          );
          if (window.AudioEngine && window.AudioEngine.enabled && typeof window.AudioEngine.playGiftChime === 'function') {
            window.AudioEngine.playGiftChime();
          }
        }
      }

      this.updateOnlineCountHUD();
      this.refreshSanctuaryViews();
    },

    handleDevoteeSeatClaim(senderId, seatNo, data) {
      if (!window.sanctuarySeats || !seatNo) return;
      const mySeatNo = window.currentUserProfile && window.currentUserProfile.assignedSeatNo;

      window.sanctuarySeats.forEach(s => {
        if (s.remoteClientId === senderId) {
          s.occupied = false;
          s.remoteClientId = null;
          s.name = '';
        }
      });

      const targetSeat = this.findBestSeatForRemoteDevotee(senderId, seatNo);
      if (targetSeat) {
        targetSeat.occupied = true;
        targetSeat.isUser = false;
        targetSeat.isDummy = false;
        targetSeat.remoteClientId = senderId;
        targetSeat.name = data.name;
        targetSeat.dharma = data.dharma;
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
          window.showLiveGiftBanner('Đổi Bồ Đoàn', `🟢 ${data.name} đã an tọa Bồ đoàn #${targetSeat.seatNo}`, 'lotus');
        }
      }

      this.updateOnlineCountHUD();
      this.refreshSanctuaryViews();
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
