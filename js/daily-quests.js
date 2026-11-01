/**
 * Chùa An Nhiên — Hệ Thống Nhiệm Vụ Tu Tập & Việc Tốt Mỗi Ngày (Daily Quests & Chanting Timer)
 *
 * Tính Năng:
 * 1. Khung nhỏ đếm ngược thời gian tụng kinh (Floating Chanting Timer Widget):
 *    - Đếm ngược từng giây theo mục tiêu chọn (5p, 15p, 30p, 60p).
 *    - Có thể thu nhỏ / mở rộng / di chuyển, hiển thị rõ ràng trên mọi màn hình.
 * 2. Hệ Thống 6 Việc Lành / Nhiệm Vụ Trong Ngày:
 *    - Việc 1: Tụng kinh đủ phút mỗi ngày (Việc tốt trong ngày).
 *    - Việc 2: Gõ mõ chánh niệm đủ 108 tiếng chuỗi hạt.
 *    - Việc 3: Thỉnh 3 hồi Đại Hồng Chung sớm chiều.
 *    - Việc 4: Thả 1 đèn hoa đăng cầu an cho muôn loài.
 *    - Việc 5: Dâng sớ cầu nguyện hoặc nén tâm hương Tam Bảo.
 *    - Việc 6: Tùy hỷ công đức với ít nhất 2 vị đồng tu.
 * 3. Tự động nhận diện hành động trong game và cập nhật tiến độ tức thì.
 * 4. Tự động reset mỗi ngày mới (theo ngày lịch thực tế YYYY-MM-DD).
 * 5. Tích lũy chuỗi ngày tu tập (Daily Streak) và tặng thưởng Đại Viên Mãn.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'chuanhien_daily_quests_v2';

  function getTodayDateStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function getFormattedDateVN() {
    const d = new Date();
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    return `${days[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  }

  const DEFAULT_STATE = {
    date: getTodayDateStr(),
    streakDays: 1,
    chantingGoalSeconds: 900, // 15 minutes default
    chantingDoneSeconds: 0,
    isChantingActive: false,
    allClaimedBonus: false,
    quests: [
      {
        id: 'chanting_daily',
        title: 'Thời Khóa Tụng Kinh (Việc Tốt Trong Ngày)',
        desc: 'Tụng kinh chánh niệm đủ thời gian khóa lễ mỗi ngày',
        icon: '📿',
        target: 900,
        current: 0,
        unit: 'giây',
        rewardPoints: 50,
        rewardText: '+50 Điểm · Hoa Sen Vàng',
        completed: false,
        claimed: false
      },
      {
        id: 'wooden_fish_108',
        title: 'Niệm Phật Bồ Đề 108 Hạt',
        desc: 'Gõ mõ chánh niệm đủ 108 tiếng tích lũy công đức',
        icon: '🪵',
        target: 108,
        current: 0,
        unit: 'tiếng',
        rewardPoints: 30,
        rewardText: '+30 Điểm · Tâm An Định',
        completed: false,
        claimed: false
      },
      {
        id: 'bell_rings_3',
        title: 'Ba Hồi Đại Hồng Chung',
        desc: 'Thỉnh 3 hồi chuông sớm chiều tỉnh thức tâm trí',
        icon: '🔔',
        target: 3,
        current: 0,
        unit: 'hồi',
        rewardPoints: 20,
        rewardText: '+20 Điểm · Trí Tuệ Sáng',
        completed: false,
        claimed: false
      },
      {
        id: 'sky_lantern_1',
        title: 'Thả Đèn Hoa Đăng Cầu An',
        desc: 'Thả 1 ngọn hoa đăng gửi lời nguyện lành cho muôn loài',
        icon: '🏮',
        target: 1,
        current: 0,
        unit: 'ngọn',
        rewardPoints: 20,
        rewardText: '+20 Điểm · Cát Tường',
        completed: false,
        claimed: false
      },
      {
        id: 'offering_sutra_1',
        title: 'Tâm Hương Dâng Phật & Dâng Sớ',
        desc: 'Dâng sớ cầu an/cầu siêu hoặc nén tâm hương Tam Bảo',
        icon: '📜',
        target: 1,
        current: 0,
        unit: 'lần',
        rewardPoints: 25,
        rewardText: '+25 Điểm · Phúc Lành',
        completed: false,
        claimed: false
      },
      {
        id: 'rejoice_merit_2',
        title: 'Tùy Hỷ Công Đức Đồng Tu',
        desc: 'Tán thán tùy hỷ công đức với 2 vị đạo hữu trong đạo tràng',
        icon: '🙏',
        target: 2,
        current: 0,
        unit: 'lượt',
        rewardPoints: 20,
        rewardText: '+20 Điểm · Hỷ Xả An Vui',
        completed: false,
        claimed: false
      }
    ]
  };

  const DailyQuestEngine = {
    state: null,
    timerInterval: null,
    isWidgetCollapsed: false,

    init() {
      this.loadState();
      this.renderFloatingWidget();
      this.renderQuestModal();
      this.startCountdownLoop();
      this.updateHUD();
    },

    loadState() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const today = getTodayDateStr();
          if (parsed.date === today) {
            this.state = parsed;
            // Sync chanting target with quest target
            const chantQ = this.state.quests.find(q => q.id === 'chanting_daily');
            if (chantQ) {
              chantQ.target = this.state.chantingGoalSeconds;
              chantQ.current = this.state.chantingDoneSeconds;
              if (chantQ.current >= chantQ.target) chantQ.completed = true;
            }
            return;
          } else {
            // New day reset! Check streak
            const lastDate = new Date(parsed.date);
            const todayDate = new Date(today);
            const diffDays = Math.round((todayDate - lastDate) / (1000 * 60 * 60 * 24));
            const newStreak = (diffDays === 1) ? ((parsed.streakDays || 1) + 1) : 1;
            
            this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
            this.state.date = today;
            this.state.streakDays = newStreak;
            this.saveState();
            return;
          }
        }
      } catch (e) {
        console.warn('[DailyQuests] Load state error:', e);
      }
      this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
      this.saveState();
    },

    saveState() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (e) {
        // ignore
      }
    },

    // =========================================================================
    // Action Listeners from Game Events
    // =========================================================================
    onAction(actionType, amount = 1) {
      if (!this.state || !this.state.quests) return;
      let changed = false;

      this.state.quests.forEach(q => {
        let match = false;
        if (actionType === 'wooden_fish' && q.id === 'wooden_fish_108') match = true;
        else if (actionType === 'bell' && q.id === 'bell_rings_3') match = true;
        else if (actionType === 'lantern' && q.id === 'sky_lantern_1') match = true;
        else if (actionType === 'offering' && q.id === 'offering_sutra_1') match = true;
        else if (actionType === 'rejoice' && q.id === 'rejoice_merit_2') match = true;

        if (match) {
          q.current = Math.min(q.target, q.current + amount);
          if (q.current >= q.target && !q.completed) {
            q.completed = true;
            this.notifyQuestCompleted(q);
          }
          changed = true;
        }
      });

      if (changed) {
        this.saveState();
        this.updateHUD();
        this.refreshModalUI();
      }
    },

    setChantingGoal(seconds) {
      this.state.chantingGoalSeconds = seconds;
      const chantQ = this.state.quests.find(q => q.id === 'chanting_daily');
      if (chantQ) {
        chantQ.target = seconds;
        chantQ.completed = (chantQ.current >= chantQ.target);
      }
      this.saveState();
      this.updateHUD();
      this.refreshModalUI();
      if (window.showLiveGiftBanner) {
        window.showLiveGiftBanner('Mục Tiêu Tụng Kinh', `Đã đặt thời khóa tụng kinh: ${Math.round(seconds / 60)} phút mỗi ngày`, 'lotus');
      }
    },

    toggleChantingActive() {
      this.state.isChantingActive = !this.state.isChantingActive;
      this.saveState();
      this.updateHUD();

      // Trigger auto chanting & wooden fish sound if enabled
      if (this.state.isChantingActive) {
        if (window.AudioEngine && !window.AudioEngine.enabled) {
          window.AudioEngine.enabled = true;
        }
        if (window.showLiveGiftBanner) {
          window.showLiveGiftBanner('Khởi Khóa Tụng Kinh', 'Đang đếm ngược thời khóa tu tập chánh niệm mỗi ngày', 'lotus');
        }
        if (window.AudioEngine && window.AudioEngine.enabled) {
          window.AudioEngine.playWoodenFish(1);
        }
      }
    },

    startCountdownLoop() {
      clearInterval(this.timerInterval);
      this.timerInterval = setInterval(() => {
        // Also auto-increment if autochant is running or user is active
        const isAuto = (typeof window.isAutoChanting !== 'undefined' && window.isAutoChanting);
        if (this.state.isChantingActive || isAuto) {
          this.state.chantingDoneSeconds++;
          const chantQ = this.state.quests.find(q => q.id === 'chanting_daily');
          if (chantQ) {
            chantQ.current = this.state.chantingDoneSeconds;
            if (chantQ.current >= chantQ.target && !chantQ.completed) {
              chantQ.completed = true;
              this.notifyQuestCompleted(chantQ);
            }
          }

          // Save state every 10 seconds
          if (this.state.chantingDoneSeconds % 10 === 0) {
            this.saveState();
          }

          this.updateHUD();
        }
      }, 1000);
    },

    notifyQuestCompleted(quest) {
      if (window.AudioEngine && window.AudioEngine.enabled) {
        window.AudioEngine.playTempleBell();
      }
      if (window.triggerGoldenLotusRain) {
        window.triggerGoldenLotusRain(30);
      }
      if (window.showLiveGiftBanner) {
        window.showLiveGiftBanner('🎉 HOÀN THÀNH VIỆC LÀNH!', `${quest.icon} ${quest.title}: Đã đủ điều kiện nhận thưởng!`, 'lotus');
      }
      if (window.RealtimeSanctuary && window.currentUserProfile) {
        window.RealtimeSanctuary.broadcastPrayerSutra(
          window.currentUserProfile.fullName || 'Đồng Tu',
          `Viên mãn việc lành: "${quest.title}"`,
          'Đạo Tràng'
        );
      }
    },

    claimReward(questId) {
      const q = this.state.quests.find(item => item.id === questId);
      if (!q || !q.completed || q.claimed) return;

      q.claimed = true;
      this.saveState();

      const myName = (window.currentUserProfile && window.currentUserProfile.fullName) || 'Hành Giả';
      if (window.addMeritPoints) {
        window.addMeritPoints(myName, q.rewardPoints, 'lotus', `Nhiệm vụ: ${q.title}`, true);
      }
      if (window.triggerGoldenLotusRain) {
        window.triggerGoldenLotusRain(40);
      }
      if (window.AudioEngine && window.AudioEngine.enabled) {
        window.AudioEngine.playGiftChime();
      }
      if (window.showLiveGiftBanner) {
        window.showLiveGiftBanner(myName, `Nhận thưởng: ${q.rewardText} (+${q.rewardPoints} Công Đức)`, 'lotus');
      }

      this.updateHUD();
      this.refreshModalUI();
    },

    claimAllGrandReward() {
      const allDone = this.state.quests.every(q => q.completed);
      if (!allDone || this.state.allClaimedBonus) return;

      this.state.allClaimedBonus = true;
      this.saveState();

      const myName = (window.currentUserProfile && window.currentUserProfile.fullName) || 'Hành Giả';
      if (window.addMeritPoints) {
        window.addMeritPoints(myName, 100, 'lotus', 'Đại Viên Mãn: Hoàn Thành Toàn Bộ 6 Việc Lành Trong Ngày', true);
      }
      if (window.triggerGoldenLotusRain) {
        window.triggerGoldenLotusRain(60);
      }
      if (window.AudioEngine && window.AudioEngine.enabled) {
        window.AudioEngine.playTempleBell();
      }
      if (window.showLiveGiftBanner) {
        window.showLiveGiftBanner(myName, '🏆 ĐẠI VIÊN MÃN 6/6 VIỆC LÀNH! Nhận +100 Công Đức & Chứng Nhận Ngày Vàng!', 'lotus');
      }

      this.updateHUD();
      this.refreshModalUI();
    },

    // =========================================================================
    // Floating Compact Countdown & Quest HUD Widget
    // =========================================================================
    renderFloatingWidget() {
      if (document.getElementById('quest-floating-hud')) return;

      const widget = document.createElement('div');
      widget.id = 'quest-floating-hud';
      widget.className = 'absolute top-11 sm:top-14 right-2 sm:right-5 z-35 flex items-center gap-1 sm:gap-1.5 pointer-events-auto select-none transition-all duration-300';

      widget.innerHTML = `
        <!-- EXPANDED COMPACT PILL -->
        <div id="quest-hud-pill" class="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 rounded-full bg-stone-950/85 hover:bg-stone-900 border border-amber-300/60 shadow-[0_4px_16px_rgba(0,0,0,0.6)] backdrop-blur-md cursor-pointer text-amber-50 active:scale-98 transition">
          
          <!-- Chanting Play / Pause Button -->
          <button id="quest-hud-play-btn" onclick="event.stopPropagation(); DailyQuestEngine.toggleChantingActive();" title="Bật / Dừng đếm ngược tụng kinh"
            class="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-500/25 hover:bg-amber-500/40 border border-amber-300/50 flex items-center justify-center text-amber-200 text-[10px] sm:text-xs transition active:scale-90">
            <span id="quest-hud-play-icon">▶</span>
          </button>

          <!-- Countdown Time Display -->
          <div onclick="DailyQuestEngine.openQuestModal()" class="flex flex-col text-left leading-none" title="Nhấp để xem chi tiết Việc Lành hôm nay">
            <div class="flex items-center gap-1">
              <span id="quest-hud-timer-badge" class="font-mono font-extrabold text-[10px] sm:text-xs text-amber-300 tracking-tight">15:00</span>
              <span id="quest-hud-pulse-dot" class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            </div>
            <span class="text-[7.5px] sm:text-[8.5px] text-amber-200/80 font-medium">Khóa Tụng Kinh</span>
          </div>

          <div class="w-px h-4 bg-amber-300/30 mx-0.5"></div>

          <!-- Quest Counter Badge -->
          <div onclick="DailyQuestEngine.openQuestModal()" class="flex items-center gap-1" title="Nhấp để mở Bảng Việc Lành Hôm Nay">
            <span class="text-[11px] sm:text-xs">🎯</span>
            <span id="quest-hud-count-text" class="text-[9.5px] sm:text-[10.5px] font-bold text-amber-200 whitespace-nowrap">0/6</span>
            <span id="quest-hud-claimable-dot" class="hidden w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
          </div>

          <!-- Toggle Minimize / Maximize -->
          <button onclick="event.stopPropagation(); DailyQuestEngine.toggleCollapseWidget();" title="Thu gọn / Mở rộng"
            class="w-4 h-4 rounded-full text-amber-300/70 hover:text-amber-200 text-[9px] flex items-center justify-center ml-0.5">
            –
          </button>
        </div>

        <!-- COLLAPSED MINI BADGE (Shown when user minimizes) -->
        <button id="quest-hud-minimized" onclick="DailyQuestEngine.toggleCollapseWidget();" title="Mở Nhiệm Vụ & Đếm Giờ Tụng Kinh"
          class="hidden w-8 h-8 rounded-full bg-stone-950/90 border border-amber-300/60 shadow-lg flex items-center justify-center text-amber-200 text-xs active:scale-90 transition relative">
          <span>📿</span>
          <span id="quest-mini-claimable-badge" class="hidden absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border border-white animate-pulse"></span>
        </button>
      `;

      const stage = document.getElementById('temple-stage') || document.body;
      stage.appendChild(widget);
    },

    toggleCollapseWidget() {
      this.isWidgetCollapsed = !this.isWidgetCollapsed;
      const pill = document.getElementById('quest-hud-pill');
      const mini = document.getElementById('quest-hud-minimized');
      if (pill && mini) {
        if (this.isWidgetCollapsed) {
          pill.classList.add('hidden');
          mini.classList.remove('hidden');
        } else {
          pill.classList.remove('hidden');
          mini.classList.add('hidden');
        }
      }
    },

    updateHUD() {
      if (!this.state) return;

      const remaining = Math.max(0, this.state.chantingGoalSeconds - this.state.chantingDoneSeconds);
      const mins = String(Math.floor(remaining / 60)).padStart(2, '0');
      const secs = String(remaining % 60).padStart(2, '0');

      const timerEl = document.getElementById('quest-hud-timer-badge');
      if (timerEl) {
        if (remaining === 0) {
          timerEl.textContent = '✨ Xong';
          timerEl.className = 'font-mono font-extrabold text-[10px] sm:text-xs text-emerald-400 animate-pulse';
        } else {
          timerEl.textContent = `${mins}:${secs}`;
          timerEl.className = this.state.isChantingActive
            ? 'font-mono font-extrabold text-[10px] sm:text-xs text-amber-300 animate-pulse'
            : 'font-mono font-extrabold text-[10px] sm:text-xs text-amber-200/90';
        }
      }

      const pulseDot = document.getElementById('quest-hud-pulse-dot');
      if (pulseDot) {
        pulseDot.className = this.state.isChantingActive
          ? 'w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping'
          : 'w-1.5 h-1.5 rounded-full bg-amber-400';
      }

      const playIcon = document.getElementById('quest-hud-play-icon');
      if (playIcon) {
        playIcon.textContent = this.state.isChantingActive ? '⏸' : '▶';
      }

      // Count completed & claimable quests
      const completedCount = this.state.quests.filter(q => q.completed).length;
      const hasClaimable = this.state.quests.some(q => q.completed && !q.claimed);

      const countText = document.getElementById('quest-hud-count-text');
      if (countText) {
        countText.textContent = `${completedCount}/6`;
      }

      const claimDot = document.getElementById('quest-hud-claimable-dot');
      if (claimDot) {
        if (hasClaimable) claimDot.classList.remove('hidden');
        else claimDot.classList.add('hidden');
      }

      const miniDot = document.getElementById('quest-mini-claimable-badge');
      if (miniDot) {
        if (hasClaimable) miniDot.classList.remove('hidden');
        else miniDot.classList.add('hidden');
      }
    },

    // =========================================================================
    // Daily Quests Detailed Modal
    // =========================================================================
    renderQuestModal() {
      if (document.getElementById('daily-quest-modal')) return;

      const modal = document.createElement('div');
      modal.id = 'daily-quest-modal';
      modal.className = 'hidden fixed inset-0 z-50 bg-black/85 backdrop-blur-md items-center justify-center p-2 sm:p-4';

      modal.innerHTML = `
        <div class="temple-panel w-full max-w-[620px] max-h-[90dvh] overflow-y-auto merit-scroll rounded-2xl p-3 sm:p-5 border-2 border-amber-300/65 text-amber-50 relative shadow-2xl">
          
          <!-- MODAL HEADER -->
          <div class="flex items-center justify-between border-b border-amber-300/25 pb-2.5">
            <div>
              <div class="text-[9px] sm:text-[10.5px] tracking-[0.2em] text-amber-300 uppercase font-bold flex items-center gap-1.5">
                <span>✦ VIỆC LÀNH MỖI NGÀY · TU HỌC TINH TẤN ✦</span>
              </div>
              <h3 class="font-serif-title text-xl sm:text-2xl font-bold text-amber-100 title-glow">
                Nhiệm Vụ Tu Tập Chùa An Nhiên
              </h3>
            </div>
            <button onclick="DailyQuestEngine.closeQuestModal()" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-amber-200 text-sm transition">
              ✕
            </button>
          </div>

          <!-- TOP BANNER: DATE & STREAK -->
          <div class="my-2.5 p-2.5 rounded-xl bg-gradient-to-r from-amber-950/80 via-stone-900/90 to-amber-950/80 border border-amber-300/40 flex items-center justify-between text-xs">
            <div>
              <div class="text-amber-200 font-bold" id="quest-modal-date-label">${getFormattedDateVN()}</div>
              <div class="text-[10.5px] text-amber-100/75 mt-0.5">Tự động làm mới mỗi ngày lúc 00:00</div>
            </div>
            <div class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-300/50 text-amber-300 font-extrabold text-xs">
              <span>🔥 Chuỗi tu tập:</span>
              <span id="quest-modal-streak-count">1</span>
              <span>ngày</span>
            </div>
          </div>

          <!-- CHANTING GOAL SELECTOR -->
          <div class="mb-3 p-2.5 rounded-xl bg-black/55 border border-amber-300/30">
            <div class="flex items-center justify-between text-xs font-bold text-amber-200 mb-1.5">
              <span>⏱️ Mục tiêu thời khóa tụng kinh mỗi ngày:</span>
              <span id="quest-modal-goal-text" class="text-amber-300 font-extrabold">15 Phút</span>
            </div>
            <div class="grid grid-cols-4 gap-1.5 text-center">
              <button onclick="DailyQuestEngine.setChantingGoal(300)" id="goal-btn-300" class="py-1 rounded-lg border border-amber-300/35 bg-amber-950/40 hover:bg-amber-500/25 text-[10.5px] font-bold text-amber-100 transition">5 Phút</button>
              <button onclick="DailyQuestEngine.setChantingGoal(900)" id="goal-btn-900" class="py-1 rounded-lg border border-amber-300/35 bg-amber-950/40 hover:bg-amber-500/25 text-[10.5px] font-bold text-amber-100 transition">15 Phút</button>
              <button onclick="DailyQuestEngine.setChantingGoal(1800)" id="goal-btn-1800" class="py-1 rounded-lg border border-amber-300/35 bg-amber-950/40 hover:bg-amber-500/25 text-[10.5px] font-bold text-amber-100 transition">30 Phút</button>
              <button onclick="DailyQuestEngine.setChantingGoal(3600)" id="goal-btn-3600" class="py-1 rounded-lg border border-amber-300/35 bg-amber-950/40 hover:bg-amber-500/25 text-[10.5px] font-bold text-amber-100 transition">60 Phút</button>
            </div>
          </div>

          <!-- QUEST LIST CONTAINER -->
          <div id="quest-cards-container" class="space-y-2 mb-3">
            <!-- Rendered dynamically -->
          </div>

          <!-- GRAND COMPLETION REWARD -->
          <div id="quest-grand-reward-card" class="p-3 rounded-xl bg-gradient-to-r from-amber-900/90 via-yellow-900/80 to-amber-900/90 border-2 border-amber-300/70 flex items-center justify-between gap-3 shadow-lg">
            <div>
              <div class="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                <span>🏆 ĐẠI VIÊN MÃN 6/6 VIỆC LÀNH TRONG NGÀY</span>
              </div>
              <div class="text-[10px] text-amber-100/85 mt-0.5 leading-tight">
                Hoàn thành tất cả 6 nhiệm vụ hôm nay để nhận thêm +100 Công Đức và Chứng Nhận Ngày Vàng.
              </div>
            </div>
            <button id="btn-claim-grand-bonus" onclick="DailyQuestEngine.claimAllGrandReward()"
              class="px-4 py-2 rounded-xl bg-stone-700/80 text-stone-400 font-bold text-xs shrink-0 cursor-not-allowed">
              Chưa Đạt (0/6)
            </button>
          </div>

        </div>
      `;

      document.body.appendChild(modal);
    },

    openQuestModal() {
      const modal = document.getElementById('daily-quest-modal');
      if (modal) {
        this.refreshModalUI();
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        if (window.AudioEngine && window.AudioEngine.enabled) {
          window.AudioEngine.playGiftChime();
        }
      }
    },

    closeQuestModal() {
      const modal = document.getElementById('daily-quest-modal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    },

    refreshModalUI() {
      if (!this.state) return;

      const dateLabel = document.getElementById('quest-modal-date-label');
      if (dateLabel) dateLabel.textContent = getFormattedDateVN();

      const streakEl = document.getElementById('quest-modal-streak-count');
      if (streakEl) streakEl.textContent = this.state.streakDays || 1;

      const goalText = document.getElementById('quest-modal-goal-text');
      if (goalText) goalText.textContent = `${Math.round(this.state.chantingGoalSeconds / 60)} Phút`;

      // Highlight selected goal button
      [300, 900, 1800, 3600].forEach(sec => {
        const btn = document.getElementById(`goal-btn-${sec}`);
        if (btn) {
          if (this.state.chantingGoalSeconds === sec) {
            btn.className = 'py-1 rounded-lg border-2 border-amber-300 bg-amber-500/40 text-[10.5px] font-extrabold text-amber-100 shadow';
          } else {
            btn.className = 'py-1 rounded-lg border border-amber-300/35 bg-amber-950/40 hover:bg-amber-500/25 text-[10.5px] font-bold text-amber-100 transition';
          }
        }
      });

      // Render cards
      const container = document.getElementById('quest-cards-container');
      if (container) {
        container.innerHTML = this.state.quests.map(q => {
          let progressPercent = Math.min(100, Math.round((q.current / q.target) * 100));
          let progressText = `${q.current}/${q.target} ${q.unit}`;

          if (q.id === 'chanting_daily') {
            const doneM = Math.floor(q.current / 60);
            const doneS = q.current % 60;
            const targetM = Math.floor(q.target / 60);
            progressText = `${doneM}p ${doneS}s / ${targetM} phút`;
          }

          let actionBtnHTML = '';
          if (q.claimed) {
            actionBtnHTML = `
              <span class="px-3 py-1 rounded-lg bg-emerald-950/80 border border-emerald-400/50 text-emerald-300 font-bold text-[10.5px] whitespace-nowrap">
                ✓ Đã Nhận
              </span>
            `;
          } else if (q.completed) {
            actionBtnHTML = `
              <button onclick="DailyQuestEngine.claimReward('${q.id}')"
                class="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-stone-950 font-extrabold text-[10.5px] shadow-lg animate-bounce active:scale-95 whitespace-nowrap">
                🎁 Nhận Quà
              </button>
            `;
          } else if (q.id === 'chanting_daily') {
            const isPlaying = this.state.isChantingActive;
            actionBtnHTML = `
              <button onclick="DailyQuestEngine.toggleChantingActive()"
                class="px-3 py-1 rounded-lg ${isPlaying ? 'bg-amber-500/40 text-amber-200 border border-amber-300' : 'bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold'} text-[10.5px] active:scale-95 whitespace-nowrap transition">
                ${isPlaying ? '⏸ Tạm Dừng' : '▶ Tụng Ngay'}
              </button>
            `;
          } else {
            actionBtnHTML = `
              <span class="px-2.5 py-1 rounded-lg bg-stone-800/80 text-amber-200/50 font-medium text-[10px] whitespace-nowrap">
                Chưa xong
              </span>
            `;
          }

          return `
            <div class="p-2.5 rounded-xl bg-black/60 border ${q.completed ? 'border-amber-300/70 bg-amber-950/20' : 'border-amber-300/25'} flex items-center justify-between gap-2.5 transition">
              <div class="flex items-center gap-2.5 min-w-0 flex-1">
                <span class="text-2xl shrink-0 p-1 rounded-lg bg-amber-500/15 border border-amber-300/30">${q.icon}</span>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-amber-100 truncate">${q.title}</span>
                    <span class="text-[9.5px] text-amber-300 font-extrabold shrink-0">${q.rewardText}</span>
                  </div>
                  <div class="text-[10px] text-amber-200/70 truncate mt-0.5">${q.desc}</div>
                  
                  <!-- PROGRESS BAR -->
                  <div class="w-full bg-stone-800 h-1.5 rounded-full mt-1.5 overflow-hidden flex">
                    <div class="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500" style="width: ${progressPercent}%;"></div>
                  </div>
                  <div class="flex justify-between items-center text-[8.5px] text-amber-200/60 mt-0.5">
                    <span>${progressText}</span>
                    <span>${progressPercent}%</span>
                  </div>
                </div>
              </div>

              <div class="shrink-0 flex items-center">
                ${actionBtnHTML}
              </div>
            </div>
          `;
        }).join('');
      }

      // Grand reward button
      const allDone = this.state.quests.every(q => q.completed);
      const grandBtn = document.getElementById('btn-claim-grand-bonus');
      if (grandBtn) {
        if (this.state.allClaimedBonus) {
          grandBtn.className = 'px-4 py-2 rounded-xl bg-emerald-950/90 border border-emerald-400/60 text-emerald-300 font-extrabold text-xs shrink-0';
          grandBtn.textContent = '✓ Đã Nhận Đại Viên Mãn';
          grandBtn.disabled = true;
        } else if (allDone) {
          grandBtn.className = 'px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 text-stone-950 font-extrabold text-xs shadow-xl animate-bounce active:scale-95 shrink-0 cursor-pointer';
          grandBtn.textContent = '🎁 Nhận Đại Viên Mãn (+100Đ)';
          grandBtn.disabled = false;
        } else {
          const completedCount = this.state.quests.filter(q => q.completed).length;
          grandBtn.className = 'px-4 py-2 rounded-xl bg-stone-700/80 text-stone-400 font-bold text-xs shrink-0 cursor-not-allowed';
          grandBtn.textContent = `Chưa Đạt (${completedCount}/6)`;
          grandBtn.disabled = true;
        }
      }
    }
  };

  window.DailyQuestEngine = DailyQuestEngine;
})();
