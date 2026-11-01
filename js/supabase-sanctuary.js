/**
 * Chùa An Nhiên — Supabase Database & Realtime Presence Engine (v1.0)
 * Đồng Bộ Người Dùng, Vị Trí Bồ Đoàn & Lưu Trữ Phiên Tu Tập Bằng Supabase
 *
 * TÍNH NĂNG CHÍNH:
 * 1. Supabase Realtime Presence (Port 443 WSS):
 *    - Theo dõi thời gian thực mọi đồng tu đang truy cập trên toàn cầu (Mobile 4G/5G, PC, Tablet).
 *    - Khi người mới vào -> Tự động kích hoạt sự kiện 'join', hiện tên và vị trí ngồi đúng bồ đoàn.
 *    - Khi người rời đi -> Tự động kích hoạt 'leave' và giải phóng bồ đoàn.
 * 2. Supabase PostgreSQL Database (Bảng sanctuary_devotees):
 *    - Lưu trữ danh sách đồng tu đã niêm phong sớ cầu an, công đức và lời chúc.
 *    - Người mới truy cập sau sẽ truy vấn ngay danh sách để nhìn thấy các đạo hữu đã an tọa.
 * 3. Tự Động Sinh Hàng Bồ Đoàn Mới Khi Quá 12 Người:
 *    - Khi số lượng người vượt quá 12 chỗ, hệ thống tự động sinh thêm hàng mới (mỗi hàng +6 chỗ)
 *      để người tiếp theo luôn có chỗ ngồi trang nghiêm.
 * 4. Supabase Realtime Broadcast:
 *    - Đồng bộ tiếng chuông, tiếng gõ mõ và từng câu kinh trong khóa lễ chung.
 */

(function () {
  'use strict';

  const STORAGE_KEY_URL = 'chua_an_nhien_supabase_url';
  const STORAGE_KEY_KEY = 'chua_an_nhien_supabase_key';

  // Cấu hình dự án Supabase chính thức của Đạo Tràng
  const DEFAULT_SUPABASE_URL = 'https://oqukilrmabwaovxgtbzy.supabase.co';
  const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_Xn1eLRkvPi9dPyxHmftaAA_oQfxWh6D';

  const SupabaseSanctuary = {
    client: null,
    channel: null,
    isConnected: false,
    isRealtimeActive: false,
    activeDevotees: new Map(), // clientId -> devoteeData
    projectUrl: '',
    anonKey: '',
    lastSyncTime: null,
    reconnectTimer: null,
    myClientId: null,

    getClientId() {
      if (this.myClientId) return this.myClientId;
      this.myClientId = window.SANCTUARY_CLIENT_ID
        || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('chua_an_nhien_cid'))
        || (window.RealtimeSanctuary && window.RealtimeSanctuary.clientId)
        || ('phattu_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36));
      return this.myClientId;
    },

    async init() {
      console.log('[SupabaseSanctuary] Đang khởi tạo kết nối Supabase Database & Realtime...');

      // 1. Đọc cấu hình từ LocalStorage hoặc dùng mặc định
      this.projectUrl = (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY_URL)) || DEFAULT_SUPABASE_URL;
      this.anonKey = (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY_KEY)) || DEFAULT_SUPABASE_ANON_KEY;

      // 2. Kiểm tra thư viện Supabase JS
      if (typeof window.supabase === 'undefined' || typeof window.supabase.createClient !== 'function') {
        console.warn('[SupabaseSanctuary] Chưa tải được thư viện @supabase/supabase-js. Sẽ thử lại sau 300ms.');
        await new Promise(r => setTimeout(r, 300));
        return this.init();
      }

      try {
        this.client = window.supabase.createClient(this.projectUrl, this.anonKey, {
          auth: { persistSession: false },
          realtime: {
            params: {
              eventsPerSecond: 10
            }
          }
        });

        this.isConnected = true;
        console.log('[SupabaseSanctuary] Đã tạo Supabase Client thành công!');

        // 3. Tải danh sách đồng tu từ Database Supabase trước khi xếp chỗ
        await this.fetchDevoteesFromDB();

        // 4. Kết nối Realtime Channel & Lắng nghe Presence & Broadcast (AWAIT để sẵn sàng nhận & gửi ngay)
        await this.setupRealtimeChannel();

        // 5. Lắng nghe sự kiện rời trang để giải phóng ghế
        this.setupUnloadHandlers();

        // 6. Định kỳ cập nhật last_seen lên Database (Heartbeat)
        this.startHeartbeatLoop();

        // 7. Cập nhật giao diện HUD & Modal
        this.updateHUDStatus(true);
      } catch (err) {
        console.warn('[SupabaseSanctuary] Khởi tạo Supabase thất bại:', err);
        this.isConnected = false;
        this.updateHUDStatus(false);
      }
    },

    startHeartbeatLoop() {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = setInterval(async () => {
        if (!this.isConnected || !this.client || !window.currentUserProfile) return;
        const mySeatNo = window.currentUserProfile.assignedSeatNo;
        if (mySeatNo) {
          try {
            await this.client
              .from('sanctuary_devotees')
              .update({ last_seen: new Date().toISOString() })
              .eq('client_id', this.getClientId());
          } catch (e) {}
        }
      }, 30000);
    },

    setupUnloadHandlers() {
      const handleLeave = () => {
        const myClientId = this.getClientId();
        if (this.channel) {
          try { this.channel.untrack(); } catch (e) {}
        }
        if (this.projectUrl && this.anonKey && myClientId) {
          try {
            fetch(`${this.projectUrl}/rest/v1/sanctuary_devotees?client_id=eq.${myClientId}`, {
              method: 'DELETE',
              headers: {
                'apikey': this.anonKey,
                'Authorization': `Bearer ${this.anonKey}`
              },
              keepalive: true
            }).catch(() => {});
          } catch (e) {}
        }
      };

      window.addEventListener('beforeunload', handleLeave);
      window.addEventListener('pagehide', handleLeave);
    },

    /**
     * Thiết lập Supabase Realtime Channel với Presence & Broadcast
     */
    setupRealtimeChannel() {
      if (!this.client) return;

      const myClientId = this.getClientId();

      // Hủy channel cũ nếu có
      if (this.channel) {
        try { this.client.removeChannel(this.channel); } catch (e) {}
      }

      const channelName = 'sanctuary_session_oqukilrmabwaovxgtbzy';
      this.channel = this.client.channel(channelName, {
        config: {
          presence: { key: myClientId },
          broadcast: { self: false }
        }
      });

      // A. LẮNG NGHE REALTIME PRESENCE (Khi có người mới vào hoặc rời đi)
      this.channel
        .on('presence', { event: 'sync' }, () => {
          this.handlePresenceSync();
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          this.handlePresenceJoin(key, newPresences);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          this.handlePresenceLeave(key, leftPresences);
        });

      // B. LẮNG NGHE REALTIME BROADCAST (Chuông, Mõ, Lễ Phật, Dâng Hương, Tùy Hỷ, Khóa lễ tụng kinh, v.v.)
      const ensureSeatRendered = (seatNo, senderId, senderName) => {
        if (!seatNo || !window.sanctuarySeats) return null;
        let s = window.sanctuarySeats.find(item => item.seatNo === seatNo);
        if (s && !s.isUser && (!s.occupied || !s.remoteClientId)) {
          s.occupied = true;
          s.isDummy = false;
          s.remoteClientId = senderId || s.remoteClientId || ('remote_' + seatNo);
          s.name = senderName || s.name || 'Đồng Tu';
          if (typeof window.renderSanctuaryFloor === 'function') {
            window.renderSanctuaryFloor();
          }
        }
        return s;
      };

      const handleBell = (payload) => {
        if (!payload || payload.senderId === this.getClientId()) return;
        if (window.AudioEngine) window.AudioEngine.playTempleBell();
        if (window.createBellRipple) window.createBellRipple(50, 26);
        const name = payload.senderName || payload.name || 'Đồng Tu';
        if (window.showLiveGiftBanner) {
          window.showLiveGiftBanner('Tiếng Đại Hồng Chung', `🔔 Đồng tu ${name} vừa thỉnh Đại Hồng Chung`, 'bell');
        }
        let seatNo = payload.seatNo;
        if (!seatNo && payload.senderId && window.sanctuarySeats) {
          const s = window.sanctuarySeats.find(item => item.remoteClientId === payload.senderId);
          if (s) seatNo = s.seatNo;
        }
        ensureSeatRendered(seatNo, payload.senderId, name);
        if (seatNo && window.triggerDevoteeBow) {
          window.triggerDevoteeBow(`seat-${seatNo}`, 'Nam Mô A Di Đà Phật', 'bell');
        }
      };

      const handleWoodenFish = (payload) => {
        if (!payload || payload.senderId === this.getClientId()) return;
        const mult = payload.multiplier || 1;
        if (window.AudioEngine) window.AudioEngine.playWoodenFish(mult);
        let seatNo = payload.seatNo;
        if (!seatNo && payload.senderId && window.sanctuarySeats) {
          const s = window.sanctuarySeats.find(item => item.remoteClientId === payload.senderId);
          if (s) seatNo = s.seatNo;
        }
        ensureSeatRendered(seatNo, payload.senderId, payload.senderName || payload.name);
        if (seatNo && window.triggerDevoteeBow) {
          window.triggerDevoteeBow(`seat-${seatNo}`, payload.phrase || 'Nam Mô A Di Đà Phật', 'mo');
        }
      };

      const handleBowBuddha = (payload) => {
        if (!payload || payload.senderId === this.getClientId()) return;
        if (window.AudioEngine) window.AudioEngine.playGiftChime();
        let seatNo = payload.seatNo;
        if (!seatNo && payload.senderId && window.sanctuarySeats) {
          const s = window.sanctuarySeats.find(item => item.remoteClientId === payload.senderId);
          if (s) seatNo = s.seatNo;
        }
        ensureSeatRendered(seatNo, payload.senderId, payload.name || payload.senderName);
        if (seatNo && window.triggerDevoteeBow) {
          window.triggerDevoteeBow(`seat-${seatNo}`, 'Con thành tâm đảnh lễ Đức Phật', 'lotus');
        }
        if (window.showLiveGiftBanner) {
          window.showLiveGiftBanner('Lễ Phật Trang Nghiêm', `🙏 Đồng tu ${payload.name || payload.senderName || 'Đồng Tu'} vừa thành tâm đảnh lễ Đức Phật`, 'lotus');
        }
      };

      const handleOfferIncense = (payload) => {
        if (!payload || payload.senderId === this.getClientId()) return;
        if (window.AudioEngine) window.AudioEngine.playGiftChime();
        if (window.triggerGoldenLotusRain) window.triggerGoldenLotusRain(18);
        let seatNo = payload.seatNo;
        if (!seatNo && payload.senderId && window.sanctuarySeats) {
          const s = window.sanctuarySeats.find(item => item.remoteClientId === payload.senderId);
          if (s) seatNo = s.seatNo;
        }
        ensureSeatRendered(seatNo, payload.senderId, payload.name || payload.senderName);
        if (seatNo && window.triggerDevoteeBow) {
          window.triggerDevoteeBow(`seat-${seatNo}`, 'Dâng 3 nén tâm hương', 'lotus');
        }
        if (window.showLiveGiftBanner) {
          window.showLiveGiftBanner('Dâng Hương Cúng Phật', `🪷 Đồng tu ${payload.name || payload.senderName || 'Đồng Tu'} vừa dâng 3 nén tâm hương (+20 Công Đức)`, 'lotus');
        }
      };

      const handleRejoice = (payload) => {
        if (!payload || payload.senderId === this.getClientId()) return;
        if (window.AudioEngine) window.AudioEngine.playGiftChime();
        if (window.triggerGoldenLotusRain) window.triggerGoldenLotusRain(12);

        const myId = this.getClientId();
        const isTargetingMe = (payload.targetClientId && payload.targetClientId === myId)
          || (window.currentUserProfile && payload.targetName && payload.targetName === window.currentUserProfile.fullName);

        if (isTargetingMe) {
          if (window.addMeritPoints && window.currentUserProfile) {
            window.addMeritPoints(window.currentUserProfile.fullName, 5, 'lotus', `Nhận tùy hỷ công đức từ ${payload.fromName}`, true);
          }
          if (window.showLiveGiftBanner) {
            window.showLiveGiftBanner('Tùy Hỷ Công Đức', `🪷 Đạo hữu ${payload.fromName} vừa tùy hỷ tán thán công đức của bạn (+5 Công Đức)!`, 'lotus');
          }
          const mySeatNo = window.currentUserProfile && window.currentUserProfile.assignedSeatNo;
          if (mySeatNo && window.triggerDevoteeBow) {
            window.triggerDevoteeBow(`seat-${mySeatNo}`, '🙏 Cảm niệm tùy hỷ công đức!', 'lotus');
          }
        } else {
          if (window.showLiveGiftBanner) {
            window.showLiveGiftBanner('Tùy Hỷ Công Đức', `🪷 ${payload.fromName || 'Đồng tu'} vừa tán thán công đức của ${payload.targetName || 'quý đạo hữu'}!`, 'lotus');
          }
          if (payload.targetSeatNo && window.triggerDevoteeBow) {
            window.triggerDevoteeBow(`seat-${payload.targetSeatNo}`, '🙏 Cảm niệm công đức!', 'lotus');
          }
        }
      };

      this.channel
        .on('broadcast', { event: 'BELL_RING' }, ({ payload }) => handleBell(payload))
        .on('broadcast', { event: 'RING_BELL' }, ({ payload }) => handleBell(payload))
        .on('broadcast', { event: 'WOODEN_FISH' }, ({ payload }) => handleWoodenFish(payload))
        .on('broadcast', { event: 'TAP_MO' }, ({ payload }) => handleWoodenFish(payload))
        .on('broadcast', { event: 'BOW_BUDDHA' }, ({ payload }) => handleBowBuddha(payload))
        .on('broadcast', { event: 'OFFER_INCENSE' }, ({ payload }) => handleOfferIncense(payload))
        .on('broadcast', { event: 'REJOICE_MERIT' }, ({ payload }) => handleRejoice(payload))
        .on('broadcast', { event: 'CHANT_SYNC' }, ({ payload }) => {
          if (window.RealtimeSanctuary && typeof window.RealtimeSanctuary.applyRemoteChantState === 'function') {
            window.RealtimeSanctuary.applyRemoteChantState(payload);
          }
        })
        .on('broadcast', { event: 'COMMUNAL_CHANT_VERSE' }, ({ payload }) => {
          if (window.RealtimeSanctuary && typeof window.RealtimeSanctuary.onCommunalVerseAdvanced === 'function') {
            window.RealtimeSanctuary.onCommunalVerseAdvanced(payload.verseIndex, payload.verseText, false);
          }
        })
        .on('broadcast', { event: 'GIFT_BLESSING' }, ({ payload }) => {
          if (payload && window.showLiveGiftBanner) {
            window.showLiveGiftBanner(payload.title || 'Công Đức', payload.subtitle || 'Tùy hỷ công đức', payload.icon || 'lotus');
          }
        })
        .on('broadcast', { event: 'SKY_LANTERN' }, ({ payload }) => {
          if (payload && window.spawnFloatingSkyLantern) {
            window.spawnFloatingSkyLantern(payload.sender || 'Đồng Tu', payload.wish || '', false);
          }
          if (payload && window.showLiveGiftBanner) {
            window.showLiveGiftBanner('Đèn Hoa Đăng Cầu An', `${payload.sender || 'Đồng tu'} vừa thả đèn hoa đăng: "${payload.wish || ''}"`, 'lantern');
          }
        })
        .on('broadcast', { event: 'PRAYER_SUTRA' }, ({ payload }) => {
          if (payload && window.showLiveGiftBanner) {
            window.showLiveGiftBanner('Dâng Sớ Cầu An', `Đồng tu ${payload.sender || 'Đồng tu'} vừa thành tâm dâng sớ: "${payload.wish || ''}"`, 'lotus');
          }
        })
        .on('broadcast', { event: 'CLAIM_SEAT' }, ({ payload }) => {
          if (!payload || payload.senderId === this.getClientId()) return;
          console.log('[SupabaseSanctuary] Nhận broadcast CLAIM_SEAT:', payload);
          const data = payload.data || payload;
          const remoteClientId = payload.senderId;
          const targetSeatNo = payload.seatNo;

          // 1. Giải phóng triệt để bồ đoàn cũ của client này trên sàn (tránh bị kẹt 2 ghế)
          if (window.sanctuarySeats) {
            window.sanctuarySeats.forEach(s => {
              if (s.remoteClientId === remoteClientId && s.seatNo !== targetSeatNo) {
                s.occupied = false;
                s.remoteClientId = null;
                s.name = '';
                s.dharma = '';
              }
            });
          }

          // 2. Gán đồng tu vào bồ đoàn mới
          this.applyPresenceDevoteeToSeat({
            clientId: remoteClientId,
            seatNo: targetSeatNo,
            fullName: data.fullName || data.name,
            dharmaName: data.dharmaName || data.dharma,
            avatarType: data.avatarType || data.gender || 'monk',
            age: data.age,
            hometown: data.hometown,
            meritScore: data.meritScore || data.points,
            clientIp: data.clientIp || data.ip,
            wish: data.wish
          });

          if (typeof window.renderSanctuaryFloor === 'function') {
            window.renderSanctuaryFloor();
          }

          if (window.triggerDevoteeBow && targetSeatNo) {
            window.triggerDevoteeBow(`seat-${targetSeatNo}`, data.wish || 'Nam Mô A Di Đà Phật', 'lotus');
          }
        });

      // C. LẮNG NGHE POSTGRES CHANGES (Cập nhật tức thì khi có bản ghi mới trong bảng)
      try {
        this.channel.on('postgres_changes', { event: '*', schema: 'public', table: 'sanctuary_devotees' }, (payload) => {
          console.log('[SupabaseSanctuary] Nhận thay đổi từ Postgres Database:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            this.applyDbDevoteeToSeat(payload.new);
          } else if (payload.eventType === 'DELETE' && payload.old) {
            this.handleDevoteeDelete(payload.old.client_id);
          }
        });
      } catch (e) {}

      // D. ĐĂNG KÝ VÀ THEO DÕI SỰ HIỆN DIỆN CỦA CHÍNH MÌNH (TRACK PRESENCE)
      return new Promise((resolve) => {
        let isDone = false;
        const done = (val) => {
          if (!isDone) {
            isDone = true;
            resolve(val);
          }
        };
        // 2500ms safety timeout để không bị treo nếu mạng yếu
        setTimeout(() => done(this.isRealtimeActive), 2500);

        this.channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            this.isRealtimeActive = true;
            this.lastSyncTime = new Date();
            console.log('[SupabaseSanctuary] Realtime Channel đã SUBSCRIBED thành công!');
            if (window.currentUserProfile && window.currentUserProfile.assignedSeatNo) {
              await this.trackCurrentUserPresence();
            }
            this.updateHUDStatus(true);
            done(true);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('[SupabaseSanctuary] Kênh Realtime gặp lỗi hoặc timeout:', status);
            this.isRealtimeActive = false;
            this.updateHUDStatus(false);
            done(false);
          }
        });
      });
    },

    handleDevoteeDelete(deletedClientId) {
      if (!deletedClientId || !window.sanctuarySeats) return;
      window.sanctuarySeats.forEach(s => {
        if (s.remoteClientId === deletedClientId && !s.isUser) {
          s.occupied = false;
          s.remoteClientId = null;
          s.name = '';
          s.dharma = '';
        }
      });
      if (typeof window.renderSanctuaryFloor === 'function') {
        window.renderSanctuaryFloor();
      }
    },

    /**
     * Báo cáo thông tin của chính mình lên Supabase Realtime Presence
     */
    async trackCurrentUserPresence() {
      if (!this.channel || !this.isRealtimeActive) return;

      const profile = window.currentUserProfile || {};
      const mySeatNo = profile.assignedSeatNo;
      if (!mySeatNo) {
        console.log('[SupabaseSanctuary] Chưa có assignedSeatNo, chờ xếp chỗ trước khi track presence.');
        return;
      }
      const myClientId = this.getClientId();

      const payload = {
        clientId: myClientId,
        seatNo: mySeatNo,
        fullName: profile.fullName || (profile.registered ? 'Đồng Tu' : 'Đồng Tu Mới'),
        dharmaName: profile.dharmaName || 'Tịnh Tâm',
        avatarType: profile.avatarType || 'monk',
        age: profile.age || 28,
        hometown: profile.hometown || 'Việt Nam',
        meritScore: profile.meritScore || 0,
        wish: profile.wish || 'Cầu bình an & sức khỏe',
        clientIp: profile.clientIp || window.currentDetectedIP || '117.5.x.x',
        isLocked: !!profile.isLocked,
        onlineAt: profile.onlineAt || new Date().toISOString()
      };

      try {
        await this.channel.track(payload);
        console.log('[SupabaseSanctuary] Đã track presence thành công:', payload.fullName, `Bồ đoàn #${mySeatNo}`);
      } catch (e) {
        console.warn('[SupabaseSanctuary] Lỗi khi track presence:', e);
      }
    },

    /**
     * Xử lý khi đồng bộ toàn bộ danh sách Presence (Presence Sync)
     */
    handlePresenceSync() {
      if (!this.channel) return;
      const presenceState = this.channel.presenceState();
      const myClientId = this.getClientId();
      console.log('[SupabaseSanctuary] Presence State cập nhật, tổng số client:', Object.keys(presenceState).length);

      const onlineDevotees = [];

      for (const key in presenceState) {
        if (key === myClientId) continue; // Bỏ qua bản thân
        const presences = presenceState[key];
        if (presences && presences.length > 0) {
          const dev = presences[presences.length - 1]; // Lấy trạng thái mới nhất
          if (dev && dev.clientId !== myClientId) {
            onlineDevotees.push(dev);
          }
        }
      }

      // Xóa tất cả các ghế remoteClientId KHÔNG CÒN nằm trong onlineDevotees
      const onlineClientIds = new Set(onlineDevotees.map(d => d.clientId));
      if (window.sanctuarySeats) {
        window.sanctuarySeats.forEach(s => {
          if (s.remoteClientId && !onlineClientIds.has(s.remoteClientId) && !s.isUser) {
            s.occupied = false;
            s.remoteClientId = null;
            s.name = '';
            s.dharma = '';
          }
        });
      }

      // 1. KIỂM TRA SỐ LƯỢNG NGƯỜI DÙNG: NẾU VƯỢT QUÁ SỐ CHỖ HIỆN TẠI -> TỰ ĐỘNG SINH HÀNG MỚI!
      const totalParticipants = onlineDevotees.length + 1; // +1 cho bản thân
      if (typeof window.ensureSeatCapacity === 'function') {
        window.ensureSeatCapacity(totalParticipants + 2); // Luôn dư ít nhất 2 chỗ trống cho người tiếp theo
      }

      // 2. Phân bổ từng đồng tu vào đúng vị trí Bồ Đoàn trên giao diện
      onlineDevotees.forEach(dev => {
        this.applyPresenceDevoteeToSeat(dev);
      });

      // 3. Cập nhật số người online trên HUD
      this.updateOnlineCountHUD(totalParticipants);

      // 4. Render lại sàn Chánh Điện
      if (typeof window.renderSanctuaryFloor === 'function') {
        window.renderSanctuaryFloor();
      }
    },

    /**
     * Xử lý khi có người mới gia nhập (Join)
     */
    handlePresenceJoin(key, newPresences) {
      const myClientId = this.getClientId();
      if (key === myClientId) return;

      newPresences.forEach(dev => {
        if (!dev || dev.clientId === myClientId) return;
        console.log(`[SupabaseSanctuary] 🌟 Đồng tu mới vào Chánh Điện: ${dev.fullName} (Bồ đoàn #${dev.seatNo})`);

        // Đảm bảo đủ chỗ nếu seatNo lớn hơn số chỗ hiện tại
        if (typeof window.ensureSeatCapacity === 'function' && dev.seatNo) {
          window.ensureSeatCapacity(dev.seatNo);
        }

        this.applyPresenceDevoteeToSeat(dev);

        // Hiển thị thông báo đón chào trên màn hình
        if (typeof window.showLiveGiftBanner === 'function') {
          window.showLiveGiftBanner(
            'Đồng Tu Mới An Tọa',
            `🙏 Đạo hữu ${dev.fullName} (PD: ${dev.dharmaName || 'Tịnh Tâm'}) vừa vào Chánh Điện (Bồ đoàn #${dev.seatNo})`,
            'lotus'
          );
        }

        // Ngân chuông chùa nhẹ nhàng
        if (window.AudioEngine && typeof window.AudioEngine.playGiftChime === 'function') {
          window.AudioEngine.playGiftChime();
        }
      });

      if (typeof window.renderSanctuaryFloor === 'function') {
        window.renderSanctuaryFloor();
      }
    },

    /**
     * Xử lý khi một đồng tu thoát hoặc đóng tab (Leave)
     */
    handlePresenceLeave(key, leftPresences) {
      const myClientId = this.getClientId();
      if (key === myClientId) return;
      console.log(`[SupabaseSanctuary] Đồng tu rời khỏi Chánh Điện:`, key);

      leftPresences.forEach(dev => {
        const seatNo = dev ? dev.seatNo : null;
        if (window.sanctuarySeats) {
          window.sanctuarySeats.forEach(s => {
            if (!s.isUser && (s.remoteClientId === key || (seatNo && s.seatNo === seatNo && s.remoteClientId === key))) {
              s.occupied = false;
              s.remoteClientId = null;
              s.name = '';
              s.dharma = '';
            }
          });
        }
        this.activeDevotees.delete(key);
      });

      if (typeof window.renderSanctuaryFloor === 'function') {
        window.renderSanctuaryFloor();
      }
    },

    /**
     * Gắn dữ liệu của đồng tu từ Presence vào Bồ Đoàn trên sàn Chánh Điện
     */
    applyPresenceDevoteeToSeat(dev) {
      if (!window.sanctuarySeats || !dev) return;
      const myClientId = this.getClientId();
      if (dev.clientId === myClientId) return;

      const mySeatNo = window.currentUserProfile && window.currentUserProfile.assignedSeatNo;

      // 1. Giải phóng ghế cũ của dev này nếu họ đã ngồi ở ghế khác (tránh nhân bản)
      window.sanctuarySeats.forEach(s => {
        if (s.remoteClientId === dev.clientId && s.seatNo !== dev.seatNo) {
          s.occupied = false;
          s.remoteClientId = null;
          s.name = '';
          s.dharma = '';
        }
      });

      let targetSeatNo = dev.seatNo;
      // Đảm bảo tồn tại ghế này
      if (typeof window.ensureSeatCapacity === 'function' && targetSeatNo) {
        window.ensureSeatCapacity(targetSeatNo);
      }

      // 2. Xử lý xung đột nếu remote yêu cầu đúng bồ đoàn của người dùng hiện tại
      if (targetSeatNo === mySeatNo) {
        const remoteHasPriority = (dev.isLocked || dev.registered) && !window.currentUserProfile.registered
          || (dev.onlineAt && window.currentUserProfile.onlineAt && dev.onlineAt < window.currentUserProfile.onlineAt)
          || (dev.clientId < myClientId);

        if (remoteHasPriority) {
          console.log(`[SupabaseSanctuary] Nhường bồ đoàn #${mySeatNo} cho ${dev.fullName}, tự động dời sang bồ đoàn trống tiếp theo...`);
          if (typeof window.pickBestAvailableSeat === 'function' && typeof window.assignUserToSeat === 'function') {
            const newSeat = window.pickBestAvailableSeat();
            window.assignUserToSeat(newSeat);
            this.trackCurrentUserPresence();
            this.saveDevoteeToDB(window.currentUserProfile, newSeat);
          }
        } else {
          // Xếp remote sang bồ đoàn trống tiếp theo
          if (typeof window.pickBestAvailableSeat === 'function') {
            targetSeatNo = window.pickBestAvailableSeat();
          }
        }
      }

      let seat = window.sanctuarySeats.find(s => s.seatNo === targetSeatNo);
      // Tránh trùng ghế với người dùng hiện tại hoặc remote khác
      if (!seat || seat.isUser || (seat.remoteClientId && seat.remoteClientId !== dev.clientId)) {
        if (typeof window.pickBestAvailableSeat === 'function') {
          targetSeatNo = window.pickBestAvailableSeat();
          seat = window.sanctuarySeats.find(s => s.seatNo === targetSeatNo);
        }
      }

      if (seat && !seat.isUser) {
        seat.occupied = true;
        seat.isDummy = false;
        seat.remoteClientId = dev.clientId;
        seat.name = dev.fullName || 'Đồng Tu Mới';
        seat.dharma = dev.dharmaName || 'Tịnh Tâm';
        seat.age = dev.age || 25;
        seat.hometown = dev.hometown || 'Việt Nam';
        seat.type = dev.avatarType || 'monk';
        seat.points = dev.meritScore || 20;
        seat.ip = dev.clientIp || '117.5.x.x';

        this.activeDevotees.set(dev.clientId, dev);
      }
    },

    /**
     * Tải danh sách đồng tu đang hoạt động trong Database Supabase (Table: sanctuary_devotees)
     */
    async fetchDevoteesFromDB() {
      if (!this.client) return;

      try {
        console.log('[SupabaseSanctuary] Đang tải danh sách đồng tu từ bảng sanctuary_devotees...');
        // Nạp đồng tu có hoạt động trong vòng 10 phút gần nhất (chống kẹt linh hồn cũ/ghost devotee)
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const { data, error } = await this.client
          .from('sanctuary_devotees')
          .select('*')
          .gte('last_seen', tenMinutesAgo)
          .order('last_seen', { ascending: false })
          .limit(36);

        if (error) {
          console.log('[SupabaseSanctuary] Bảng sanctuary_devotees chưa khởi tạo hoặc dùng chế độ Realtime Presence:', error.message);
          return;
        }

        if (data && data.length > 0) {
          console.log(`[SupabaseSanctuary] Đã tải ${data.length} đồng tu còn hoạt động từ Database Supabase!`);

          // Nếu số người trong database > 12 -> Tự động sinh thêm hàng mới!
          if (typeof window.ensureSeatCapacity === 'function') {
            window.ensureSeatCapacity(data.length + 2);
          }

          data.forEach(item => {
            this.applyDbDevoteeToSeat(item);
          });

          if (typeof window.renderSanctuaryFloor === 'function') {
            window.renderSanctuaryFloor();
          }
        }
      } catch (e) {
        console.log('[SupabaseSanctuary] Bỏ qua truy vấn DB:', e.message);
      }
    },

    /**
     * Gắn dữ liệu từ Supabase PostgreSQL vào Bồ Đoàn
     */
    applyDbDevoteeToSeat(dbRow) {
      if (!window.sanctuarySeats || !dbRow) return;
      const myClientId = this.getClientId();

      if (dbRow.client_id === myClientId) return; // Không ghi đè bản thân

      // 1. Giải phóng ghế cũ của client_id này nếu họ đã ngồi ở ghế khác
      window.sanctuarySeats.forEach(s => {
        if (s.remoteClientId === dbRow.client_id && s.seatNo !== dbRow.seat_no) {
          s.occupied = false;
          s.remoteClientId = null;
          s.name = '';
          s.dharma = '';
        }
      });

      if (typeof window.ensureSeatCapacity === 'function' && dbRow.seat_no) {
        window.ensureSeatCapacity(dbRow.seat_no);
      }

      let seat = window.sanctuarySeats.find(s => s.seatNo === dbRow.seat_no);
      if (!seat || seat.isUser || (seat.remoteClientId && seat.remoteClientId !== dbRow.client_id)) {
        if (typeof window.pickBestAvailableSeat === 'function') {
          const altSeatNo = window.pickBestAvailableSeat();
          seat = window.sanctuarySeats.find(s => s.seatNo === altSeatNo);
        }
      }

      if (seat && !seat.isUser) {
        seat.occupied = true;
        seat.isDummy = false;
        seat.remoteClientId = dbRow.client_id;
        seat.name = dbRow.full_name || 'Đồng Tu';
        seat.dharma = dbRow.dharma_name || 'Tịnh Tâm';
        seat.type = dbRow.avatar_type || 'monk';
        seat.hometown = dbRow.hometown || '';
        seat.age = dbRow.age || 25;
        seat.points = dbRow.merit_score || 0;
        seat.ip = dbRow.client_ip || '';
      }
    },

    /**
     * Lưu thông tin người dùng lên Supabase Database (Khi niêm phong sớ cầu an)
     */
    async saveDevoteeToDB(profile, seatNo) {
      if (!this.client || !profile) return;

      const finalSeatNo = seatNo || profile.assignedSeatNo;
      if (!finalSeatNo) return; // Không ghi nếu chưa có ghế xác định

      const myClientId = this.getClientId();
      const payload = {
        client_id: myClientId,
        full_name: profile.fullName || (profile.registered ? 'Đồng Tu' : 'Đồng Tu Mới'),
        dharma_name: profile.dharmaName || 'Tịnh Tâm',
        avatar_type: profile.avatarType || 'monk',
        seat_no: finalSeatNo,
        hometown: profile.hometown || 'Chùa An Nhiên',
        age: profile.age || 30,
        merit_score: profile.meritScore || 0,
        wish: profile.wish || '',
        client_ip: profile.clientIp || window.currentDetectedIP || '117.5.x.x',
        last_seen: new Date().toISOString()
      };

      try {
        const { error } = await this.client
          .from('sanctuary_devotees')
          .upsert(payload, { onConflict: 'client_id' });

        if (!error) {
          console.log('[SupabaseSanctuary] Đã lưu thông tin sớ cầu an lên Supabase Database thành công!', payload.full_name, `#${finalSeatNo}`);
        }
      } catch (e) {
        console.warn('[SupabaseSanctuary] Ghi Database thất bại (vẫn đồng bộ bình thường qua Realtime Presence):', e.message);
      }

      // Cập nhật lại presence
      await this.trackCurrentUserPresence();
    },

    /**
     * Phát sự kiện Realtime Broadcast qua Supabase
     */
    broadcast(eventName, payload = {}) {
      if (!this.channel) return;
      try {
        this.channel.send({
          type: 'broadcast',
          event: eventName,
          payload: Object.assign({}, payload, {
            senderId: this.getClientId(),
            senderName: (window.currentUserProfile && window.currentUserProfile.fullName) || 'Đồng Tu',
            timestamp: Date.now()
          })
        });
      } catch (e) {
        console.warn('[SupabaseSanctuary] Gửi broadcast thất bại:', e);
      }
    },

    /**
     * Cập nhật số người online trên HUD
     */
    updateOnlineCountHUD(count) {
      const el = document.getElementById('hud-online-count');
      if (el) el.textContent = count;
      const modalCount = document.getElementById('srv-online-count');
      if (modalCount) modalCount.textContent = `${count} đạo hữu`;
    },

    /**
     * Cập nhật trạng thái Supabase trên HUD và Modal
     */
    updateHUDStatus(active) {
      const dot = document.getElementById('hud-realtime-status-dot');
      if (dot) {
        dot.className = active ? 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse' : 'w-2 h-2 rounded-full bg-amber-400';
      }

      const modeText = document.getElementById('srv-mode-text');
      if (modeText) {
        modeText.textContent = active ? 'Supabase Realtime' : 'Cloud Stream';
      }

      const statusBadge = document.getElementById('supabase-status-badge');
      if (statusBadge) {
        statusBadge.innerHTML = active
          ? '<span class="text-emerald-400 font-bold">🟢 Đang Kết Nối Supabase Realtime & DB (Port 443)</span>'
          : '<span class="text-amber-400 font-bold">🟡 Đang Kết Nối Qua Luồng Dự Phòng (Universal Stream)</span>';
      }
    },

    /**
     * Lưu cấu hình URL & Key Supabase riêng do người dùng nhập
     */
    saveCustomCredentials(url, key) {
      if (url) localStorage.setItem(STORAGE_KEY_URL, url.trim());
      if (key) localStorage.setItem(STORAGE_KEY_KEY, key.trim());
      this.projectUrl = url.trim() || DEFAULT_SUPABASE_URL;
      this.anonKey = key.trim() || DEFAULT_SUPABASE_ANON_KEY;
      this.init();
    },

    /**
     * Cú pháp SQL để tạo bảng trong Supabase
     */
    getSQLSchemaScript() {
      return `-- CHÙA AN NHIÊN: CÚ PHÁP TẠO BẢNG SUPABASE DATABASE (COPY VÀO SUPABASE SQL EDITOR)
CREATE TABLE IF NOT EXISTS public.sanctuary_devotees (
    client_id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    dharma_name TEXT,
    avatar_type TEXT DEFAULT 'monk',
    seat_no INTEGER NOT NULL,
    hometown TEXT,
    age INTEGER,
    merit_score INTEGER DEFAULT 0,
    wish TEXT,
    client_ip TEXT,
    last_seen TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Bật RLS và cấp quyền đọc/ghi công khai cho Đạo Tràng
ALTER TABLE public.sanctuary_devotees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Devotees" ON public.sanctuary_devotees FOR SELECT USING (true);
CREATE POLICY "Public Insert Devotees" ON public.sanctuary_devotees FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Devotees" ON public.sanctuary_devotees FOR UPDATE USING (true);
CREATE POLICY "Public Delete Devotees" ON public.sanctuary_devotees FOR DELETE USING (true);

-- Cho phép Supabase Realtime lắng nghe bảng
ALTER PUBLICATION supabase_realtime ADD TABLE public.sanctuary_devotees;`;
    }
  };

  window.SupabaseSanctuary = SupabaseSanctuary;
})();
