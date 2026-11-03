/**
 * Chùa An Nhiên - Thiền Thở Chánh Niệm, Hẹn Giờ Khóa Lễ & Nghi Thức Phóng Sanh
 */

class MindfulBreathingEngine {
  constructor() {
    this.isActive = false;
    this.timerInterval = null;
    this.breathPhase = 'inhale'; // inhale, hold, exhale
    this.breathCycleCount = 0;
    this.sessionTimerSeconds = 0;
    this.sessionDuration = 300; // 5 phút mặc định
    this.sessionTimerInterval = null;
  }

  startBreathing(onPhaseChange) {
    this.isActive = true;
    this.breathCycleCount = 0;

    const cycle = () => {
      if (!this.isActive) return;

      // 1. Hít vào (4 giây)
      this.breathPhase = 'inhale';
      if (typeof onPhaseChange === 'function') onPhaseChange('inhale', 'Hít vào... Tâm tĩnh lặng 🌿', 4000);

      this.timerInterval = setTimeout(() => {
        if (!this.isActive) return;

        // 2. Giữ hơi (2 giây)
        this.breathPhase = 'hold';
        if (typeof onPhaseChange === 'function') onPhaseChange('hold', 'Giữ nhẹ hơi thở... An trú trong hiện tại 🌸', 2000);

        this.timerInterval = setTimeout(() => {
          if (!this.isActive) return;

          // 3. Thở ra (6 giây)
          this.breathPhase = 'exhale';
          if (typeof onPhaseChange === 'function') onPhaseChange('exhale', 'Thở ra từ từ... Miệng mỉm cười an nhiên 🌸', 6000);

          this.timerInterval = setTimeout(() => {
            if (!this.isActive) return;
            this.breathCycleCount++;
            if (this.breathCycleCount % 3 === 0) {
              if (window.AudioEngine) window.AudioEngine.playGiftChime();
            }
            cycle();
          }, 6000);
        }, 2000);
      }, 4000);
    };

    cycle();
  }

  stopBreathing() {
    this.isActive = false;
    if (this.timerInterval) clearTimeout(this.timerInterval);
    this.timerInterval = null;
  }

  // Hẹn Giờ Khóa Lễ Tu Tập
  startSessionTimer(durationSeconds, onTick, onFinish) {
    this.stopSessionTimer();
    this.sessionDuration = durationSeconds;
    this.sessionTimerSeconds = durationSeconds;

    this.sessionTimerInterval = setInterval(() => {
      this.sessionTimerSeconds--;
      if (typeof onTick === 'function') {
        const mins = String(Math.floor(this.sessionTimerSeconds / 60)).padStart(2, '0');
        const secs = String(this.sessionTimerSeconds % 60).padStart(2, '0');
        onTick(`${mins}:${secs}`, this.sessionTimerSeconds);
      }

      if (this.sessionTimerSeconds <= 0) {
        this.stopSessionTimer();
        if (typeof onFinish === 'function') onFinish();
      }
    }, 1000);
  }

  stopSessionTimer() {
    if (this.sessionTimerInterval) {
      clearInterval(this.sessionTimerInterval);
      this.sessionTimerInterval = null;
    }
  }

  // Nghi Thức Phóng Sanh Chim Bồ Câu Bay Vút Lên Trời
  triggerReleaseDoves(containerElement) {
    if (!containerElement) return;

    for (let i = 0; i < 7; i++) {
      setTimeout(() => {
        const dove = document.createElement('div');
        dove.className = 'absolute pointer-events-none z-50';
        const startX = 30 + Math.random() * 40;
        const startY = 75;
        dove.style.left = `${startX}%`;
        dove.style.top = `${startY}%`;
        dove.style.transition = 'all 4.8s cubic-bezier(0.2, 0.8, 0.2, 1)';

        dove.innerHTML = `
          <div class="flex items-center gap-1 drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]">
            <svg class="w-8 h-8 text-white fill-current" viewBox="0 0 24 24">
              <path d="M12 2C8 2 4 6 4 10c0 4 3 7 7 8v4h2v-4c4-1 7-4 7-8 0-4-4-8-8-8zm-1 4a2 2 0 114 0 2 2 0 01-4 0z"/>
            </svg>
            <span class="text-[9px] font-bold text-amber-200 bg-black/60 px-1.5 py-0.5 rounded-full whitespace-nowrap">🕊️ Tự Do</span>
          </div>
        `;
        containerElement.appendChild(dove);

        requestAnimationFrame(() => {
          const targetX = startX + (Math.random() - 0.5) * 60;
          const targetY = -15;
          dove.style.left = `${targetX}%`;
          dove.style.top = `${targetY}%`;
          dove.style.transform = `scale(${1.4}) rotate(${(Math.random() - 0.5) * 35}deg)`;
          dove.style.opacity = '0';
        });

        setTimeout(() => dove.remove(), 5200);
      }, i * 380);
    }
  }
}

window.mindfulEngine = new MindfulBreathingEngine();
