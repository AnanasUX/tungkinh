/**
 * Chùa An Nhiên — Real-time Sanctuary Synchronization System (v2.5)
 * Đạo Tràng Trực Tuyến & Phòng Đồng Tụng Thời Gian Thực (Real-time Shared Room)
 *
 * Cho phép mọi người dùng truy cập https://ananasux.github.io/tungkinh/
 * từ các thiết bị khác nhau cùng chung 1 không gian Chánh Điện thời gian thực:
 * - ĐỒNG BỘ PHÒNG ĐỒNG TỤNG THỜI GIAN THỰC (Real-time Shared Chanting Room):
 *   + Đồng bộ từng câu kinh, nhịp gõ mõ và động tác đảnh lễ của chư đồng tu.
 *   + Thanh Khóa Lễ Đồng Tụng phát sáng hiển thị câu kinh đang tụng trực tiếp.
 *   + Tự động cuộn bản kinh trong kho kinh điển cho mọi thiết bị.
 *   + Cộng điểm công đức chung (+25 Điểm) khi viên mãn khóa lễ.
 * - Tự động đồng bộ trạng thái khi vào (HELLO_SYNC & STATE_ANNOUNCE handshake).
 * - Giải quyết xung đột vị trí Bồ Đoàn (Seat Conflict Resolution), ưu tiên người dùng thật.
 * - Hiển thị huy hiệu "🟢 Live • PD" cho người thật đang trực tuyến.
 * - Đồng bộ mọi hành vi: Gõ mõ, Thỉnh chuông, Thả hoa đăng, Dâng sớ, Tùy hỷ công đức.
 * - Tự động khôi phục kết nối khi chuyển tab hoặc mở khóa màn hình điện thoại.
 */

(function () {
  'use strict';

  const BROKERS = [
    { host: 'broker.emqx.io', port: 8084, path: '/mqtt', ssl: true, label: 'EMQX Global Broker' },
    { host: 'broker.hivemq.com', port: 8884, path: '/mqtt', ssl: true, label: 'HiveMQ Global Broker' }
  ];

  const SANCTUARY_TOPIC = 'chuanhien/sanctuary/global/v2';
  let currentBrokerIndex = 0;
  let pahoClient = null;
  let isConnected = false;
  let isConnecting = false;
  let reconnectTimer = null;
  let heartbeatTimer = null;
  let pruneTimer = null;

  // Local BroadcastChannel for instant zero-latency multi-tab sync on same device
  const localChannel = (typeof window.BroadcastChannel !== 'undefined')
    ? new window.BroadcastChannel('chua_an_nhien_realtime_channel_v2')
    : null;

  // Unique client identity per browser session
  const clientId = 'phattu_' + Math.random().toString(36).substring(2, 8) + '_' + Date.now().toString(36);

  // Map of active remote devotees: clientId -> { clientId, seatNo, data, lastSeen }
  const remoteDevotees = new Map();

  const RealtimeSanctuary = {
    clientId: clientId,
    isConnected: false,

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
      console.log(`[RealtimeSanctuary] Initializing with clientId: ${clientId}`);
      this.connectBroker();
      this.setupLocalChannel();
      this.startHeartbeatLoop();
      this.startPruneLoop();
      this.setupWindowEvents();
    },

    getOnlineCount() {
      // 1 (current local user) + number of verified active remote devotees
      return Math.max(1, remoteDevotees.size + 1);
    },

    connectBroker() {
      if (typeof window.Paho === 'undefined' || !window.Paho.MQTT) {
        console.warn('[RealtimeSanctuary] Paho MQTT library not loaded, using local cross-tab channel fallback.');
        return;
      }
      if (isConnected || isConnecting) return;

      isConnecting = true;
      const broker = BROKERS[currentBrokerIndex];
      console.log(`[RealtimeSanctuary] Connecting to ${broker.label} (${broker.host}:${broker.port})...`);

      const client = new window.Paho.MQTT.Client(broker.host, broker.port, broker.path, clientId);

      client.onConnectionLost = (responseObject) => {
        isConnected = false;
        isConnecting = false;
        RealtimeSanctuary.isConnected = false;
        RealtimeSanctuary.updateConnectionHUD(false);
        console.warn('[RealtimeSanctuary] Connection lost:', responseObject.errorMessage);

        // Switch to alternative broker and reconnect
        currentBrokerIndex = (currentBrokerIndex + 1) % BROKERS.length;
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => RealtimeSanctuary.connectBroker(), 3500);
      };

      client.onMessageArrived = (message) => {
        try {
          const payload = JSON.parse(message.payloadString);
          RealtimeSanctuary.handleIncomingMessage(payload);
        } catch (e) {
          console.error('[RealtimeSanctuary] Parse message error:', e);
        }
      };

      const options = {
        useSSL: broker.ssl,
        timeout: 6,
        keepAliveInterval: 25,
        cleanSession: true,
        onSuccess: () => {
          isConnected = true;
          isConnecting = false;
          pahoClient = client;
          RealtimeSanctuary.isConnected = true;
          RealtimeSanctuary.updateConnectionHUD(true);
          console.log(`[RealtimeSanctuary] Connected successfully to ${broker.label}!`);

          // Subscribe to shared sanctuary channel
          client.subscribe(SANCTUARY_TOPIC, { qos: 0 });

          // Broadcast Join Handshake immediately
          RealtimeSanctuary.broadcastHelloSync();
        },
        onFailure: (err) => {
          isConnected = false;
          isConnecting = false;
          RealtimeSanctuary.isConnected = false;
          RealtimeSanctuary.updateConnectionHUD(false);
          console.warn(`[RealtimeSanctuary] Failed to connect ${broker.host}:`, err.errorMessage || err);

          currentBrokerIndex = (currentBrokerIndex + 1) % BROKERS.length;
          clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => RealtimeSanctuary.connectBroker(), 4000);
        }
      };

      try {
        client.connect(options);
      } catch (err) {
        isConnecting = false;
        console.error('[RealtimeSanctuary] Connect exception:', err);
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
      // Notify leaving when closing page
      window.addEventListener('beforeunload', () => {
        const mySeat = window.currentUserProfile && window.currentUserProfile.assignedSeatNo;
        RealtimeSanctuary.publishMessage({
          type: 'LEAVE',
          senderId: clientId,
          seatNo: mySeat || null
        });

        // If leaving while leading communal chant, stop or yield
        if (RealtimeSanctuary.sharedChanting.isActive && RealtimeSanctuary.sharedChanting.leaderId === clientId) {
          RealtimeSanctuary.stopCommunalChant(true);
        }
      });

      // Mobile lifecycle: resume on screen unlock or tab focus
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          if (!isConnected && !isConnecting) {
            RealtimeSanctuary.connectBroker();
          } else if (isConnected) {
            RealtimeSanctuary.broadcastHelloSync();
          }
        }
      });

      // Network online event
      window.addEventListener('online', () => {
        if (!isConnected && !isConnecting) {
          RealtimeSanctuary.connectBroker();
        }
      });
    },

    publishMessage(payload) {
      payload.senderId = clientId;
      payload.timestamp = Date.now();

      // 1. Broadcast locally for multi-tab testing
      if (localChannel) {
        try {
          localChannel.postMessage(payload);
        } catch (e) {
          // ignore
        }
      }

      // 2. Publish to MQTT WebSocket broker for global internet sync
      if (pahoClient && isConnected) {
        try {
          const pahoMsg = new window.Paho.MQTT.Message(JSON.stringify(payload));
          pahoMsg.destinationName = SANCTUARY_TOPIC;
          pahoMsg.qos = 0;
          pahoClient.send(pahoMsg);
        } catch (err) {
          console.warn('[RealtimeSanctuary] Publish error:', err);
        }
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

      // Attach active shared chanting session state if in progress
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
     * REAL-TIME SHARED CHANTING ROOM METHODS (ĐỒNG TỤNG THỜI GIAN THỰC)
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
      // Filter out empty rows used only for spacing
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

      // Publish start event to global broker
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

      // Sound bell chime to inaugurate chant
      if (window.AudioEngine && window.AudioEngine.enabled) {
        window.AudioEngine.playTempleBell();
      }
      if (window.showLiveGiftBanner) {
        window.showLiveGiftBanner('Khai Mở Khóa Lễ', `📿 Bạn vừa khởi xướng Khóa Lễ: ${title}`, 'lotus');
      }

      this.onCommunalVerseAdvanced(0, this.sharedChanting.verseText, true);

      // Start stepping timer
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

      this.hideCommunalBanner();

      // Award leader and local user merit bonus (+25 Merit points)
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
      // 1. Update UI Banner in DOM
      this.updateCommunalBannerUI();

      // 2. Play synchronized wooden fish sound
      if (window.AudioEngine && window.AudioEngine.enabled) {
        window.AudioEngine.playWoodenFish(1);
      }

      // 3. Animate all seated devotees bowing together with the sacred verse in 2D
      if (window.sanctuarySeats) {
        window.sanctuarySeats.forEach(seat => {
          if (seat.occupied && window.triggerDevoteeBow) {
            window.triggerDevoteeBow(seat.id, verseText, 'lotus');
          }
        });
      }

      // 4. Animate 3D Devotees and 3D Wooden Fish
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

      // 5. Accumulate Daily Quests progress
      if (window.DailyQuestEngine) {
        window.DailyQuestEngine.onAction('wooden_fish', 1);
      }

      // 6. Highlight active verse inside scripture reader modal if open
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
          // Remote devotee joined, answer with our current state (including shared chanting)
          this.handleDevoteePresence(msg.senderId, msg.data, true);
          this.broadcastStateAnnounce(msg.senderId);
          break;

        case 'STATE_ANNOUNCE':
          // If targeted to someone else, we still can learn about their presence
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

    /**
     * Resolve seat assignment for remote devotee.
     * Ensures real human devotees are ALWAYS visible and never dropped due to collisions!
     */
    findBestSeatForRemoteDevotee(senderId, requestedSeatNo) {
      if (!window.sanctuarySeats) return null;
      const mySeatNo = window.currentUserProfile && window.currentUserProfile.assignedSeatNo;

      // 1. If this remote client is already assigned to a valid seat, preserve it unless requested new
      const existingRecord = remoteDevotees.get(senderId);
      if (existingRecord && existingRecord.seatNo && existingRecord.seatNo !== mySeatNo) {
        const currentSeat = window.sanctuarySeats.find(s => s.seatNo === existingRecord.seatNo);
        if (currentSeat && (!requestedSeatNo || requestedSeatNo === existingRecord.seatNo)) {
          return currentSeat;
        }
      }

      // 2. Try the requested seat if provided and not local user's seat
      if (requestedSeatNo && requestedSeatNo !== mySeatNo) {
        const candidate = window.sanctuarySeats.find(s => s.seatNo === requestedSeatNo);
        if (candidate) {
          // If empty or already owned by this remote client, take it
          if (!candidate.occupied || candidate.remoteClientId === senderId) {
            return candidate;
          }
          // If occupied by an AI dummy devotee, real devotee takes priority!
          if (candidate.isDummy && !candidate.remoteClientId) {
            return candidate;
          }
        }
      }

      // 3. Fallback: Search for any completely unoccupied seat (that is not local user's)
      const emptySeat = window.sanctuarySeats.find(s => !s.occupied && !s.isUser && s.seatNo !== mySeatNo);
      if (emptySeat) return emptySeat;

      // 4. Fallback: Replace an AI dummy placeholder devotee
      const dummySeat = window.sanctuarySeats.find(s => s.isDummy && !s.remoteClientId && !s.isUser && s.seatNo !== mySeatNo);
      if (dummySeat) return dummySeat;

      // 5. Ultimate fallback: Any seat not currently occupied by local user
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
        // Free any previous seat held by this remote client
        window.sanctuarySeats.forEach(s => {
          if (s.remoteClientId === senderId && s.seatNo !== targetSeat.seatNo) {
            s.occupied = false;
            s.remoteClientId = null;
            s.name = '';
            s.dharma = '';
          }
        });

        // Occupy seat with remote devotee data
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

      // Check if remote client announced an active communal chant we haven't joined
      if (data.communalChant && data.communalChant.isActive && !this.sharedChanting.isActive) {
        this.sharedChanting.isActive = true;
        this.sharedChanting.leaderId = data.communalChant.leaderId;
        this.sharedChanting.leaderName = data.communalChant.leaderName;
        this.sharedChanting.scriptureId = data.communalChant.scriptureId;
        this.sharedChanting.scriptureTitle = data.communalChant.scriptureTitle;
        this.sharedChanting.verseIndex = data.communalChant.verseIndex;
        this.sharedChanting.verseText = data.communalChant.verseText;
        this.sharedChanting.totalVerses = data.communalChant.totalVerses;
        this.sharedChanting.intervalMs = data.communalChant.intervalMs || 3000;
        this.sharedChanting.isParticipant = true;
        this.onCommunalVerseAdvanced(data.communalChant.verseIndex, data.communalChant.verseText, false);
      }

      this.updateOnlineCountHUD();
      this.refreshSanctuaryViews();
    },

    handleDevoteeSeatClaim(senderId, seatNo, data) {
      if (!window.sanctuarySeats || !seatNo) return;
      const mySeatNo = window.currentUserProfile && window.currentUserProfile.assignedSeatNo;

      // Free previous seat held by this remote client
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
      // Find actual seat where this remote devotee is placed
      let actualSeatNo = seatNo;
      if (senderId && remoteDevotees.has(senderId)) {
        actualSeatNo = remoteDevotees.get(senderId).seatNo || seatNo;
        remoteDevotees.get(senderId).lastSeen = Date.now();
      }
      if (!actualSeatNo) return;

      // 2D Chibi Bow & Speech Bubble
      if (window.triggerDevoteeBow) {
        window.triggerDevoteeBow(`seat-${actualSeatNo}`, phrase || 'Nam Mô A Di Đà Phật', 'mo');
      }

      // 3D Devotee Bow
      if (window.temple3D && window.is3DModeActive) {
        const devoteeItem = window.temple3D.devotees3D.find(d => d.seatNo === actualSeatNo);
        if (devoteeItem && devoteeItem.group && devoteeItem.group.userData && devoteeItem.group.userData.bow) {
          devoteeItem.group.userData.bow();
        }
        window.temple3D.tapWoodenFish3D();
      }

      // Audio tap
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

      // If leader leaves during communal chant, elect new leader or conclude
      if (this.sharedChanting.isActive && this.sharedChanting.leaderId === senderId) {
        this.electNewChantLeaderOrFinish();
      }

      this.updateOnlineCountHUD();
      this.refreshSanctuaryViews();
    },

    electNewChantLeaderOrFinish() {
      // Local user takes over if still active
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
        if (!isConnected && !localChannel) return;
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
          // If no message or heartbeat for 12 seconds, consider client disconnected
          if (now - devotee.lastSeen > 12000) {
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
      }, 3000);
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
        statusDot.title = connected ? 'Đang kết nối Máy Chủ Đạo Tràng Toàn Cầu (Thời gian thực)' : 'Đang kết nối lại...';
      }
    },

    refreshSanctuaryViews() {
      if (window.renderSanctuaryFloor) {
        window.renderSanctuaryFloor();
      }
      if (window.temple3D && window.is3DModeActive) {
        window.temple3D.refreshSeats3D();
      }
    }
  };

  window.RealtimeSanctuary = RealtimeSanctuary;
})();
