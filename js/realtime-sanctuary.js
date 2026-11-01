/**
 * Chùa An Nhiên — Real-time Sanctuary Synchronization System
 * Đồng Bộ Hóa Đạo Tràng Trực Tuyến Đa Thiết Bị Thời Gian Thực
 *
 * Cho phép người dùng A và B từ các thiết bị khác nhau (Điện thoại, Máy tính, Tablet)
 * cùng hiện diện trong một Chánh Điện chung thời gian thực:
 * - Nhìn thấy nhau trên các Bồ Đoàn 2D và 3D.
 * - Thấy đồng tu gõ mõ, cúi lạy, tụng kinh.
 * - Thấy tiếng chuông Đại Hồng Chung ngân vang khi đồng tu thỉnh.
 * - Thấy Đèn Hoa Đăng và Lời Chúc bay lên không gian chung.
 * - Tự động phát hiện đồng tu tham gia và rời khỏi đạo tràng.
 */

(function () {
  'use strict';

  const BROKERS = [
    { host: 'broker.emqx.io', port: 8084, path: '/mqtt', ssl: true, label: 'EMQX Global Broker' },
    { host: 'broker.hivemq.com', port: 8884, path: '/mqtt', ssl: true, label: 'HiveMQ AWS Broker' }
  ];

  const SANCTUARY_TOPIC = 'chuanhien/sanctuary/global/v1';
  let currentBrokerIndex = 0;
  let pahoClient = null;
  let isConnected = false;
  let reconnectTimer = null;
  let heartbeatTimer = null;
  let pruneTimer = null;

  // Local BroadcastChannel for multi-tab sync on same device
  const localChannel = (typeof window.BroadcastChannel !== 'undefined')
    ? new window.BroadcastChannel('chua_an_nhien_realtime_channel')
    : null;

  // Unique Client Identity per tab/device
  const clientId = 'phattu_' + Math.random().toString(36).substring(2, 8) + '_' + Date.now().toString(36);

  // Map of active remote devotees: clientId -> { data, lastSeen }
  const remoteDevotees = new Map();

  const RealtimeSanctuary = {
    clientId: clientId,
    isConnected: false,

    init() {
      this.connectBroker();
      this.setupLocalChannel();
      this.startHeartbeatLoop();
      this.startPruneLoop();
      this.setupWindowEvents();
    },

    connectBroker() {
      if (typeof window.Paho === 'undefined' || !window.Paho.MQTT) {
        console.warn('[RealtimeSanctuary] Paho MQTT library not loaded, using local cross-tab channel fallback.');
        return;
      }

      const broker = BROKERS[currentBrokerIndex];
      const client = new window.Paho.MQTT.Client(broker.host, broker.port, broker.path, clientId);

      client.onConnectionLost = (responseObject) => {
        isConnected = false;
        RealtimeSanctuary.isConnected = false;
        RealtimeSanctuary.updateConnectionHUD(false);
        console.warn('[RealtimeSanctuary] Connection lost:', responseObject.errorMessage);
        // Switch to next broker and reconnect
        currentBrokerIndex = (currentBrokerIndex + 1) % BROKERS.length;
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => RealtimeSanctuary.connectBroker(), 4000);
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
        keepAliveInterval: 30,
        cleanSession: true,
        onSuccess: () => {
          isConnected = true;
          pahoClient = client;
          RealtimeSanctuary.isConnected = true;
          RealtimeSanctuary.updateConnectionHUD(true);
          console.log(`[RealtimeSanctuary] Connected to ${broker.label} (${broker.host})`);

          // Subscribe to sanctuary topic
          client.subscribe(SANCTUARY_TOPIC, { qos: 0 });

          // Broadcast Join & Request state
          RealtimeSanctuary.broadcastJoin();
        },
        onFailure: (err) => {
          isConnected = false;
          RealtimeSanctuary.isConnected = false;
          RealtimeSanctuary.updateConnectionHUD(false);
          console.warn(`[RealtimeSanctuary] Failed to connect ${broker.host}:`, err.errorMessage || err);
          currentBrokerIndex = (currentBrokerIndex + 1) % BROKERS.length;
          clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => RealtimeSanctuary.connectBroker(), 5000);
        }
      };

      try {
        client.connect(options);
      } catch (err) {
        console.error('[RealtimeSanctuary] Connect error:', err);
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
        RealtimeSanctuary.publishMessage({
          type: 'LEAVE',
          senderId: clientId,
          seatNo: (window.currentUserProfile && window.currentUserProfile.assignedSeatNo) || null
        });
      });
    },

    publishMessage(payload) {
      payload.senderId = clientId;
      payload.timestamp = Date.now();

      // 1. Send via local BroadcastChannel for instant local tab sync
      if (localChannel) {
        try {
          localChannel.postMessage(payload);
        } catch (e) {
          // ignore
        }
      }

      // 2. Send via MQTT WebSocket broker to internet
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

    broadcastJoin() {
      const profile = window.currentUserProfile || {};
      this.publishMessage({
        type: 'JOIN',
        senderId: clientId,
        data: {
          sessionCode: profile.sessionCode || '#AN-8899',
          ip: profile.clientIp || '',
          seatNo: profile.assignedSeatNo || 10,
          name: profile.fullName || 'Hành Giả Đồng Tu',
          dharma: profile.dharmaName || 'Tịnh Tâm',
          age: profile.age || 26,
          hometown: profile.hometown || 'Chùa An Nhiên',
          gender: profile.gender || 'monk',
          points: profile.meritScore || 20,
          realm: profile.realmLevel || 1,
          wish: profile.userWish || 'Cầu bình an vạn sự'
        }
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
          gender: userProfile.gender || 'monk',
          points: userProfile.meritScore,
          realm: userProfile.realmLevel,
          wish: userProfile.userWish
        }
      });
    },

    broadcastMoTap(phrase, zenMultiplier) {
      const profile = window.currentUserProfile || {};
      this.publishMessage({
        type: 'TAP_MO',
        senderId: clientId,
        seatNo: profile.assignedSeatNo || 10,
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

    handleIncomingMessage(msg) {
      if (!msg || !msg.type || msg.senderId === clientId) return;

      switch (msg.type) {
        case 'HEARTBEAT':
        case 'JOIN':
          this.handleDevoteePresence(msg.senderId, msg.data, msg.type === 'JOIN');
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

        case 'LEAVE':
          this.handleDevoteeLeave(msg.senderId, msg.seatNo);
          break;
      }
    },

    handleDevoteePresence(senderId, data, isNewJoin) {
      if (!data) return;
      const isExisting = remoteDevotees.has(senderId);
      remoteDevotees.set(senderId, {
        clientId: senderId,
        data: data,
        lastSeen: Date.now()
      });

      // Assign to seat in sanctuarySeats
      if (data.seatNo && window.sanctuarySeats) {
        const mySeatNo = (window.currentUserProfile && window.currentUserProfile.assignedSeatNo);
        // Do not overwrite local user's seat
        if (data.seatNo !== mySeatNo) {
          const seat = window.sanctuarySeats.find(s => s.seatNo === data.seatNo);
          if (seat && (!seat.occupied || seat.remoteClientId === senderId)) {
            seat.occupied = true;
            seat.isUser = false;
            seat.name = data.name;
            seat.dharma = data.dharma;
            seat.age = data.age || 25;
            seat.hometown = data.hometown || 'Chùa An Nhiên';
            seat.ip = data.ip || '113.161.x.x';
            seat.points = data.points || 30;
            seat.type = data.gender || 'monk';
            seat.remoteClientId = senderId;
            seat.wish = data.wish || '';
            
            if (isNewJoin && !isExisting && window.showLiveGiftBanner) {
              window.showLiveGiftBanner('Đồng Tu Nhập Tọa', `${data.name} (PD: ${data.dharma}) vừa vào Chánh Điện`, 'lotus');
              if (window.AudioEngine && window.AudioEngine.enabled) window.AudioEngine.playGiftChime();
            }
          }
        }
      }

      this.updateOnlineCountHUD();
      this.refreshSanctuaryViews();
    },

    handleDevoteeSeatClaim(senderId, seatNo, data) {
      if (!window.sanctuarySeats || !seatNo) return;
      const mySeatNo = window.currentUserProfile && window.currentUserProfile.assignedSeatNo;
      if (seatNo === mySeatNo) return;

      // Free previous seat held by this remote client
      window.sanctuarySeats.forEach(s => {
        if (s.remoteClientId === senderId && s.seatNo !== seatNo) {
          s.occupied = false;
          s.remoteClientId = null;
          s.name = '';
        }
      });

      const targetSeat = window.sanctuarySeats.find(s => s.seatNo === seatNo);
      if (targetSeat) {
        targetSeat.occupied = true;
        targetSeat.isUser = false;
        targetSeat.name = data.name;
        targetSeat.dharma = data.dharma;
        targetSeat.age = data.age || 26;
        targetSeat.hometown = data.hometown || 'Chùa An Nhiên';
        targetSeat.ip = data.ip || '113.161.x.x';
        targetSeat.points = data.points || 35;
        targetSeat.type = data.gender || 'monk';
        targetSeat.remoteClientId = senderId;
        targetSeat.wish = data.wish || '';
      }

      remoteDevotees.set(senderId, {
        clientId: senderId,
        data: Object.assign({}, data, { seatNo: seatNo }),
        lastSeen: Date.now()
      });

      if (window.showLiveGiftBanner) {
        window.showLiveGiftBanner('Đổi Bồ Đoàn', `${data.name} đã an tọa Bồ đoàn #${seatNo}`, 'lotus');
      }

      this.updateOnlineCountHUD();
      this.refreshSanctuaryViews();
    },

    handleDevoteeMoTap(seatNo, phrase, multiplier, senderId) {
      if (!seatNo) return;
      if (window.triggerDevoteeBow) {
        window.triggerDevoteeBow(`seat-${seatNo}`, phrase || 'Nam Mô A Di Đà Phật', 'mo');
      }

      // Also animate 3D Devotee if 3D mode is active
      if (window.temple3D && window.is3DModeActive) {
        const devoteeItem = window.temple3D.devotees3D.find(d => d.seatNo === seatNo);
        if (devoteeItem && devoteeItem.group && devoteeItem.group.userData && devoteeItem.group.userData.bow) {
          devoteeItem.group.userData.bow();
        }
        window.temple3D.tapWoodenFish3D();
      }

      if (window.AudioEngine && window.AudioEngine.enabled) {
        window.AudioEngine.playWoodenFish(multiplier || 1);
      }

      // Touch heartbeat
      if (senderId && remoteDevotees.has(senderId)) {
        remoteDevotees.get(senderId).lastSeen = Date.now();
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
        window.showLiveGiftBanner('Đại Hồng Chung Ngân Vang', `Đồng tu ${name || 'ẩn danh'} vừa thỉnh chuông`, 'bell');
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
        window.showLiveGiftBanner(sender, `Đã thả đèn hoa đăng: "${wish}"`, 'lantern');
      }
      if (window.AudioEngine && window.AudioEngine.enabled) {
        window.AudioEngine.playGiftChime();
      }
    },

    handleDevoteePrayerSutra(sender, wish) {
      if (window.showLiveGiftBanner) {
        window.showLiveGiftBanner('Dâng Sớ Đạo Tràng', `${sender} dâng sớ: "${wish}"`, 'lotus');
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
          window.showLiveGiftBanner('Tùy Hỷ Công Đức', `${fromName} đã tùy hỷ công đức với bạn (+2 Điểm)!`, 'lotus');
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
      this.updateOnlineCountHUD();
      this.refreshSanctuaryViews();
    },

    startHeartbeatLoop() {
      clearInterval(heartbeatTimer);
      heartbeatTimer = setInterval(() => {
        const profile = window.currentUserProfile || {};
        RealtimeSanctuary.publishMessage({
          type: 'HEARTBEAT',
          senderId: clientId,
          data: {
            sessionCode: profile.sessionCode,
            ip: profile.clientIp,
            seatNo: profile.assignedSeatNo,
            name: profile.fullName,
            dharma: profile.dharmaName,
            age: profile.age,
            hometown: profile.hometown,
            gender: profile.gender || 'monk',
            points: profile.meritScore,
            realm: profile.realmLevel,
            wish: profile.userWish
          }
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
          // If no heartbeat for 11 seconds, mark as disconnected
          if (now - devotee.lastSeen > 11000) {
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
          }
        });

        if (changed) {
          RealtimeSanctuary.updateOnlineCountHUD();
          RealtimeSanctuary.refreshSanctuaryViews();
        }
      }, 3000);
    },

    updateOnlineCountHUD() {
      const totalOnline = Math.max(1, remoteDevotees.size + 1);
      const onlineEl = document.getElementById('hud-online-count');
      if (onlineEl) {
        onlineEl.textContent = totalOnline;
      }
    },

    updateConnectionHUD(connected) {
      const statusDot = document.getElementById('hud-realtime-status-dot');
      if (statusDot) {
        statusDot.className = connected 
          ? 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse'
          : 'w-2 h-2 rounded-full bg-amber-400';
        statusDot.title = connected ? 'Đang kết nối Máy Chủ Đạo Tràng Toàn Cầu' : 'Đang kết nối lại...';
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
