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

    init() {
      console.log('[SupabaseSanctuary] Đang khởi tạo kết nối Supabase Database & Realtime...');

      // 1. Đọc cấu hình từ LocalStorage hoặc dùng mặc định
      this.projectUrl = (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY_URL)) || DEFAULT_SUPABASE_URL;
      this.anonKey = (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY_KEY)) || DEFAULT_SUPABASE_ANON_KEY;

      // 2. Kiểm tra thư viện Supabase JS
      if (typeof window.supabase === 'undefined' || typeof window.supabase.createClient !== 'function') {
        console.warn('[SupabaseSanctuary] Chưa tải được thư viện @supabase/supabase-js. Sẽ thử lại sau 1s.');
        setTimeout(() => this.init(), 1000);
        return;
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

        // 3. Kết nối Realtime Channel & Lắng nghe Presence
        this.setupRealtimeChannel();

        // 4. Tải danh sách đồng tu từ Database Supabase (nếu có bảng sanctuary_devotees)
        this.fetchDevoteesFromDB();

        // 5. Cập nhật giao diện HUD & Modal
        this.updateHUDStatus(true);
      } catch (err) {
        console.warn('[SupabaseSanctuary] Khởi tạo Supabase thất bại, chuyển sang cơ chế dự phòng:', err);
        this.isConnected = false;
        this.updateHUDStatus(false);
      }
    },

    /**
     * Thiết lập Supabase Realtime Channel với Presence & Broadcast
     */
    setupRealtimeChannel() {
      if (!this.client) return;

      const myClientId = (window.RealtimeSanctuary && window.RealtimeSanctuary.clientId)
        || ('phattu_' + Math.random().toString(36).substring(2, 8));

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

      // B. LẮNG NGHE REALTIME BROADCAST (Chuông, Mõ, Khóa lễ tụng kinh)
      this.channel
        .on('broadcast', { event: 'BELL_RING' }, ({ payload }) => {
          if (window.AudioEngine) window.AudioEngine.playTempleBell();
          if (window.createBellRipple) window.createBellRipple(50, 26);
          if (payload && payload.senderName && window.showLiveGiftBanner) {
            window.showLiveGiftBanner('Tiếng Đại Hồng Chung', `Đồng tu ${payload.senderName} vừa thỉnh chuông`, 'bell');
          }
        })
        .on('broadcast', { event: 'WOODEN_FISH' }, ({ payload }) => {
          if (window.AudioEngine) window.AudioEngine.playWoodenFish(payload ? payload.multiplier : 1);
          if (payload && payload.seatNo && window.triggerDevoteeBow) {
            window.triggerDevoteeBow(`seat-${payload.seatNo}`, 'Nam Mô A Di Đà Phật', 'mo');
          }
        })
        .on('broadcast', { event: 'CHANT_SYNC' }, ({ payload }) => {
          if (window.RealtimeSanctuary && typeof window.RealtimeSanctuary.applyRemoteChantState === 'function') {
            window.RealtimeSanctuary.applyRemoteChantState(payload);
          }
        })
        .on('broadcast', { event: 'GIFT_BLESSING' }, ({ payload }) => {
          if (payload && window.showLiveGiftBanner) {
            window.showLiveGiftBanner(payload.title || 'Công Đức', payload.subtitle || 'Tùy hỷ công đức', payload.icon || 'lotus');
          }
        });

      // C. LẮNG NGHE POSTGRES CHANGES (Cập nhật tức thì khi có bản ghi mới trong bảng)
      try {
        this.channel.on('postgres_changes', { event: '*', schema: 'public', table: 'sanctuary_devotees' }, (payload) => {
          console.log('[SupabaseSanctuary] Nhận thay đổi từ Postgres Database:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            this.applyDbDevoteeToSeat(payload.new);
          }
        });
      } catch (e) {}

      // D. ĐĂNG KÝ VÀ THEO DÕI SỰ HIỆN DIỆN CỦA CHÍNH MÌNH (TRACK PRESENCE)
      this.channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          this.isRealtimeActive = true;
          this.lastSyncTime = new Date();
          console.log('[SupabaseSanctuary] Realtime Channel đã SUBSCRIBED thành công!');
          await this.trackCurrentUserPresence();
          this.updateHUDStatus(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[SupabaseSanctuary] Kênh Realtime gặp lỗi hoặc timeout:', status);
          this.isRealtimeActive = false;
          this.updateHUDStatus(false);
        }
      });
    },

    /**
     * Báo cáo thông tin của chính mình lên Supabase Realtime Presence
     */
    async trackCurrentUserPresence() {
      if (!this.channel || !this.isRealtimeActive) return;

      const profile = window.currentUserProfile || {};
      const mySeatNo = profile.assignedSeatNo || 10;
      const myClientId = (window.RealtimeSanctuary && window.RealtimeSanctuary.clientId) || 'phattu_me';

      const payload = {
        clientId: myClientId,
        seatNo: mySeatNo,
        fullName: profile.fullName || 'Đồng Tu Mới',
        dharmaName: profile.dharmaName || 'Tịnh Tâm',
        avatarType: profile.avatarType || 'monk',
        age: profile.age || 28,
        hometown: profile.hometown || 'Việt Nam',
        meritScore: profile.meritScore || 0,
        wish: profile.wish || 'Cầu bình an & sức khỏe',
        clientIp: profile.clientIp || window.currentDetectedIP || '117.5.x.x',
        isLocked: !!profile.isLocked,
        onlineAt: new Date().toISOString()
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
      console.log('[SupabaseSanctuary] Presence State cập nhật, tổng số client:', Object.keys(presenceState).length);

      const myClientId = (window.RealtimeSanctuary && window.RealtimeSanctuary.clientId) || '';
      const onlineDevotees = [];

      for (const key in presenceState) {
        if (key === myClientId) continue; // Bỏ qua bản thân
        const presences = presenceState[key];
        if (presences && presences.length > 0) {
          const dev = presences[presences.length - 1]; // Lấy trạng thái mới nhất
          onlineDevotees.push(dev);
        }
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
      const myClientId = (window.RealtimeSanctuary && window.RealtimeSanctuary.clientId) || '';
      if (key === myClientId) return;

      newPresences.forEach(dev => {
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
      console.log(`[SupabaseSanctuary] Đồng tu rời khỏi Chánh Điện:`, key);

      leftPresences.forEach(dev => {
        const seatNo = dev.seatNo;
        if (window.sanctuarySeats) {
          const seat = window.sanctuarySeats.find(s => s.remoteClientId === key || s.seatNo === seatNo);
          if (seat && !seat.isUser) {
            seat.occupied = false;
            seat.remoteClientId = null;
            seat.name = '';
            seat.dharma = '';
          }
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
      if (!window.sanctuarySeats) return;
      const mySeatNo = window.currentUserProfile && window.currentUserProfile.assignedSeatNo;

      let targetSeatNo = dev.seatNo;
      if (targetSeatNo === mySeatNo) {
        // Tránh trùng ghế với người dùng hiện tại
        if (typeof window.pickBestAvailableSeat === 'function') {
          targetSeatNo = window.pickBestAvailableSeat();
        }
      }

      // Đảm bảo tồn tại ghế này
      if (typeof window.ensureSeatCapacity === 'function') {
        window.ensureSeatCapacity(targetSeatNo);
      }

      let seat = window.sanctuarySeats.find(s => s.seatNo === targetSeatNo);
      if (!seat || seat.isUser) {
        seat = window.sanctuarySeats.find(s => !s.occupied && !s.isUser) || window.sanctuarySeats.find(s => s.isDummy && !s.isUser);
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
     * Tải danh sách đồng tu đã lưu trong Database Supabase (Table: sanctuary_devotees)
     */
    async fetchDevoteesFromDB() {
      if (!this.client) return;

      try {
        console.log('[SupabaseSanctuary] Đang tải danh sách đồng tu từ bảng sanctuary_devotees...');
        const { data, error } = await this.client
          .from('sanctuary_devotees')
          .select('*')
          .order('last_seen', { ascending: false })
          .limit(36);

        if (error) {
          console.log('[SupabaseSanctuary] Bảng sanctuary_devotees chưa khởi tạo hoặc dùng chế độ Realtime Presence:', error.message);
          return;
        }

        if (data && data.length > 0) {
          console.log(`[SupabaseSanctuary] Đã tải ${data.length} đồng tu từ Database Supabase!`);

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
      const mySeatNo = window.currentUserProfile && window.currentUserProfile.assignedSeatNo;
      const myClientId = (window.RealtimeSanctuary && window.RealtimeSanctuary.clientId) || '';

      if (dbRow.client_id === myClientId) return; // Không ghi đè bản thân

      if (typeof window.ensureSeatCapacity === 'function' && dbRow.seat_no) {
        window.ensureSeatCapacity(dbRow.seat_no);
      }

      let seat = window.sanctuarySeats.find(s => s.seatNo === dbRow.seat_no);
      if (!seat || seat.isUser) {
        seat = window.sanctuarySeats.find(s => !s.occupied && !s.isUser);
      }

      if (seat && !seat.isUser) {
        seat.occupied = true;
        seat.isDummy = false;
        seat.remoteClientId = dbRow.client_id;
        seat.name = dbRow.full_name;
        seat.dharma = dbRow.dharma_name;
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

      const myClientId = (window.RealtimeSanctuary && window.RealtimeSanctuary.clientId) || 'phattu_' + Date.now();
      const payload = {
        client_id: myClientId,
        full_name: profile.fullName || 'Đồng Tu Mới',
        dharma_name: profile.dharmaName || 'Minh Tâm',
        avatar_type: profile.avatarType || 'monk',
        seat_no: seatNo || profile.assignedSeatNo || 10,
        hometown: profile.hometown || 'Hà Nội',
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
          console.log('[SupabaseSanctuary] Đã lưu thông tin sớ cầu an lên Supabase Database thành công!');
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
      if (!this.channel || !this.isRealtimeActive) return;
      try {
        this.channel.send({
          type: 'broadcast',
          event: eventName,
          payload: Object.assign({}, payload, {
            senderId: (window.RealtimeSanctuary && window.RealtimeSanctuary.clientId) || 'me',
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
