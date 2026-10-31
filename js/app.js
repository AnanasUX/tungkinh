/**
 * Chùa An Nhiên - Application Controller & User Interface Logic
 * Xử lý toàn bộ tương tác người dùng, phím tắt, HUD và các Case nghiệp vụ
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Khởi tạo Canvas Effects
    const canvas = document.getElementById('templeCanvas');
    if (canvas && window.templeEffects) {
        window.templeEffects.init(canvas);
    }

    // 2. DOM Elements
    const elements = {
        // HUD Elements
        userProfileBadge: document.getElementById('userProfileBadge'),
        userDisplayName: document.getElementById('userDisplayName'),
        userAgeTag: document.getElementById('userAgeTag'),
        userSeatTag: document.getElementById('userSeatTag'),
        userAvatarIcon: document.getElementById('userAvatarIcon'),
        practiceTimer: document.getElementById('practiceTimer'),
        hudMoCount: document.getElementById('hudMoCount'),
        hudBellCount: document.getElementById('hudBellCount'),
        hudMeritCount: document.getElementById('hudMeritCount'),
        prayerBanner: document.getElementById('prayerBanner'),
        currentPrayerText: document.getElementById('currentPrayerText'),

        // Altar & Instruments
        moTarget: document.getElementById('moTarget'),
        moMallet: document.getElementById('moMallet'),
        moBody: document.getElementById('moBody'),
        bellTarget: document.getElementById('bellTarget'),
        bellBody: document.getElementById('bellBody'),
        bellStriker: document.getElementById('bellStriker'),
        incenseCenser: document.getElementById('incenseCenser'),
        seatsGrid: document.getElementById('seatsGrid'),
        bowingOverlay: document.getElementById('bowingOverlay'),

        // Action Bar Buttons
        btnActionMo: document.getElementById('btnActionMo'),
        btnActionBell: document.getElementById('btnActionBell'),
        btnActionBow: document.getElementById('btnActionBow'),
        btnActionScripture: document.getElementById('btnActionScripture'),
        btnActionOffering: document.getElementById('btnActionOffering'),
        btnActionMeritBook: document.getElementById('btnActionMeritBook'),

        // Header Control Buttons
        btnEditProfile: document.getElementById('btnEditProfile'),
        btnToggleAudio: document.getElementById('btnToggleAudio'),
        btnToggleAmbient: document.getElementById('btnToggleAmbient'),
        btnOpenHelp: document.getElementById('btnOpenHelp'),
        btnFullscreen: document.getElementById('btnFullscreen'),
        audioIcon: document.getElementById('audioIcon'),
        ambientIcon: document.getElementById('ambientIcon'),
        fullscreenIcon: document.getElementById('fullscreenIcon'),

        // Modals
        modalRegister: document.getElementById('modalRegister'),
        formRegister: document.getElementById('formRegister'),
        regFullName: document.getElementById('regFullName'),
        regDharmaName: document.getElementById('regDharmaName'),
        regBirthDate: document.getElementById('regBirthDate'),
        regPrayer: document.getElementById('regPrayer'),
        errRegFullName: document.getElementById('errRegFullName'),
        errRegBirthDate: document.getElementById('errRegBirthDate'),

        modalEditProfile: document.getElementById('modalEditProfile'),
        formEditProfile: document.getElementById('formEditProfile'),
        editFullName: document.getElementById('editFullName'),
        editDharmaName: document.getElementById('editDharmaName'),
        editBirthDate: document.getElementById('editBirthDate'),
        editPrayer: document.getElementById('editPrayer'),
        errEditFullName: document.getElementById('errEditFullName'),
        errEditBirthDate: document.getElementById('errEditBirthDate'),
        btnCloseEditModal: document.getElementById('btnCloseEditModal'),
        btnCancelEdit: document.getElementById('btnCancelEdit'),

        modalScripture: document.getElementById('modalScripture'),
        btnCloseScriptureModal: document.getElementById('btnCloseScriptureModal'),
        selectScripture: document.getElementById('selectScripture'),
        scriptureVerses: document.getElementById('scriptureVerses'),
        scriptureCategoryDesc: document.getElementById('scriptureCategoryDesc'),
        btnToggleAutoChant: document.getElementById('btnToggleAutoChant'),
        autoChantIcon: document.getElementById('autoChantIcon'),
        autoChantTxt: document.getElementById('autoChantTxt'),
        rangeChantSpeed: document.getElementById('rangeChantSpeed'),
        speedDisplayLabel: document.getElementById('speedDisplayLabel'),
        scriptureViewport: document.getElementById('scriptureViewport'),
        btnFontSize: document.getElementById('btnFontSize'),

        modalOffering: document.getElementById('modalOffering'),
        btnCloseOfferingModal: document.getElementById('btnCloseOfferingModal'),
        btnDoOfferIncense: document.getElementById('btnDoOfferIncense'),
        btnDoOfferFlower: document.getElementById('btnDoOfferFlower'),
        btnDoOfferCandle: document.getElementById('btnDoOfferCandle'),

        modalMeritBook: document.getElementById('modalMeritBook'),
        btnCloseMeritModal: document.getElementById('btnCloseMeritModal'),
        meritTotalPoints: document.getElementById('meritTotalPoints'),
        meritTotalTime: document.getElementById('meritTotalTime'),
        meritTotalMo: document.getElementById('meritTotalMo'),
        meritLogsList: document.getElementById('meritLogsList'),

        modalHelp: document.getElementById('modalHelp'),
        btnCloseHelpModal: document.getElementById('btnCloseHelpModal'),

        toastNotification: document.getElementById('toastNotification'),
        toastMessage: document.getElementById('toastMessage')
    };

    // Auto chanting timer
    let autoChantInterval = null;
    let toastTimeout = null;
    let scriptureFontSizeState = 0; // 0: normal, 1: large, 2: extra large

    // Helper Avatar Mapping
    const AVATAR_MAP = {
        'male_layman': '🧘‍♂️',
        'female_layman': '🧘‍♀️',
        'monk': '🦲',
        'nun': '🧕',
        'lotus': '🪷'
    };

    // ==========================================
    // KHỞI TẠO & KIỂM TRA TRUY CẬP (CASE 01)
    // ==========================================
    function checkInitialAccess() {
        if (!window.templeState.userProfile.isRegistered) {
            // Hiển thị modal ghi danh ngay lần đầu
            openModal(elements.modalRegister);
        } else {
            updateHUD();
            updatePrayerBanner();
        }
        renderSeats();
    }

    // ==========================================
    // TOAST NOTIFICATION
    // ==========================================
    function showToast(msg, duration = 3000) {
        if (!elements.toastNotification) return;
        elements.toastMessage.textContent = msg;
        elements.toastNotification.classList.add('show');

        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            elements.toastNotification.classList.remove('show');
        }, duration);
    }

    // ==========================================
    // MODAL HELPERS
    // ==========================================
    function openModal(modalEl) {
        if (!modalEl) return;
        modalEl.style.display = 'flex';
    }

    function closeModal(modalEl) {
        if (!modalEl) return;
        modalEl.style.display = 'none';

        // Dừng tụng kinh tự động nếu đóng modal kinh thư
        if (modalEl === elements.modalScripture && window.templeState.practiceState.isAutoChanting) {
            stopAutoChant();
        }
    }

    function closeAllModals() {
        const modals = [
            elements.modalEditProfile,
            elements.modalScripture,
            elements.modalOffering,
            elements.modalMeritBook,
            elements.modalHelp
        ];
        modals.forEach(m => closeModal(m));
    }

    // ==========================================
    // RENDER BỒ ĐOÀN (SEATS GRID)
    // ==========================================
    function renderSeats() {
        if (!elements.seatsGrid) return;
        elements.seatsGrid.innerHTML = '';

        window.templeState.seats.forEach(seat => {
            const card = document.createElement('div');
            card.className = 'seat-card';
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('data-seat-id', seat.id);

            if (seat.isMine) {
                card.classList.add('is-mine');
            } else if (seat.isOccupied) {
                card.classList.add('is-occupied');
            }

            const avatarIcon = seat.avatarType ? (AVATAR_MAP[seat.avatarType] || '🧘') : '';

            card.innerHTML = `
                <div class="seat-cushion-render">
                    <div class="cushion-shape">
                        <span class="cushion-lotus-mark">卐</span>
                    </div>
                    ${seat.isOccupied ? `<span class="seat-occupant-avatar">${avatarIcon}</span>` : ''}
                </div>
                <div class="seat-number">#${seat.id}</div>
                <div class="seat-occupant-name">
                    ${seat.isMine ? 'Bạn' : (seat.isOccupied ? seat.occupantName : '<span class="seat-status-empty">Trống</span>')}
                </div>
            `;

            // Click chọn Bồ đoàn
            card.addEventListener('click', () => handleSelectSeat(seat.id));
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectSeat(seat.id);
                }
            });

            elements.seatsGrid.appendChild(card);
        });

        // Cập nhật vị trí bồ đoàn trên HUD
        if (elements.userSeatTag) {
            elements.userSeatTag.textContent = window.templeState.currentSeatId 
                ? `Bồ đoàn: #${window.templeState.currentSeatId}` 
                : 'Bồ đoàn: Chưa chọn';
        }
    }

    function handleSelectSeat(seatId) {
        if (!window.templeState.userProfile.isRegistered) {
            showToast("Quý hành giả vui lòng ghi danh trước khi an tọa Bồ đoàn.");
            openModal(elements.modalRegister);
            return;
        }

        const res = window.templeState.changeSeat(seatId);
        showToast(res.message);

        if (res.success) {
            window.templeAudio.playMo();
            if (window.templeEffects) {
                window.templeEffects.triggerBlessing("An Tọa Thanh Tịnh");
            }
            renderSeats();
        }
    }

    // ==========================================
    // CẬP NHẬT HUD & TRẠNG THÁI
    // ==========================================
    function updateHUD() {
        const profile = window.templeState.userProfile;
        if (!profile.isRegistered) {
            if (elements.userProfileBadge) elements.userProfileBadge.style.display = 'none';
            return;
        }

        if (elements.userProfileBadge) elements.userProfileBadge.style.display = 'flex';
        if (elements.userDisplayName) elements.userDisplayName.textContent = profile.dharmaName || profile.fullName;
        if (elements.userAgeTag) elements.userAgeTag.textContent = profile.age !== null ? `${profile.age} tuổi` : '';
        if (elements.userAvatarIcon) elements.userAvatarIcon.textContent = AVATAR_MAP[profile.avatarType] || '🧘‍♂️';

        if (elements.hudMoCount) elements.hudMoCount.textContent = window.templeState.practiceState.moCount;
        if (elements.hudBellCount) elements.hudBellCount.textContent = window.templeState.practiceState.bellCount;
        if (elements.hudMeritCount) elements.hudMeritCount.textContent = window.templeState.meritState.points;
    }

    function updatePracticeTimer() {
        const secs = window.templeState.practiceState.sessionSeconds;
        const h = String(Math.floor(secs / 3600)).padStart(2, '0');
        const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
        const s = String(secs % 60).padStart(2, '0');
        if (elements.practiceTimer) {
            elements.practiceTimer.textContent = `${h}:${m}:${s}`;
        }
    }

    function updatePrayerBanner() {
        if (elements.currentPrayerText && window.templeState.userProfile.prayer) {
            elements.currentPrayerText.textContent = `"${window.templeState.userProfile.prayer}"`;
        }
    }

    // ==========================================
    // THAO TÁC TU TẬP: GÕ MÕ & THỈNH CHUÔNG & ĐẢNH LỄ
    // ==========================================
    function triggerMo() {
        if (!window.templeState.userProfile.isRegistered) {
            showToast("Kính mời quý hành giả hoan hỷ ghi danh trước khi bắt đầu tu tập.");
            openModal(elements.modalRegister);
            return;
        }

        // Âm thanh
        window.templeAudio.playMo();

        // Animation gõ dùi mõ
        if (elements.moMallet) {
            elements.moMallet.classList.remove('hitting');
            void elements.moMallet.offsetWidth; // Trigger reflow
            elements.moMallet.classList.add('hitting');
        }
        if (elements.moBody) {
            elements.moBody.classList.remove('struck');
            void elements.moBody.offsetWidth;
            elements.moBody.classList.add('struck');
        }

        // Tác động State
        window.templeState.recordMoStrike();

        // Hiệu ứng chữ phước đức bay lên
        if (window.templeEffects) {
            const rect = elements.moTarget ? elements.moTarget.getBoundingClientRect() : null;
            const x = rect ? rect.left + rect.width / 2 : undefined;
            const y = rect ? rect.top : undefined;
            window.templeEffects.triggerBlessing("+1 Phước Đức", x, y);
        }

        updateHUD();
    }

    function triggerBell() {
        if (!window.templeState.userProfile.isRegistered) {
            showToast("Kính mời quý hành giả hoan hỷ ghi danh trước khi bắt đầu tu tập.");
            openModal(elements.modalRegister);
            return;
        }

        // Âm thanh
        window.templeAudio.playBell();

        // Animation chuông rung và chày gõ
        if (elements.bellStriker) {
            elements.bellStriker.classList.remove('striking');
            void elements.bellStriker.offsetWidth;
            elements.bellStriker.classList.add('striking');
        }
        if (elements.bellBody) {
            elements.bellBody.classList.remove('ringing');
            void elements.bellBody.offsetWidth;
            elements.bellBody.classList.add('ringing');
        }

        // Tác động State
        window.templeState.recordBellRing();

        // Hiệu ứng sóng âm chuông
        if (window.templeEffects) {
            const rect = elements.bellTarget ? elements.bellTarget.getBoundingClientRect() : null;
            const x = rect ? rect.left + rect.width / 2 : undefined;
            const y = rect ? rect.top + rect.height / 2 : undefined;
            window.templeEffects.triggerBellShockwave(x, y);
        }

        showToast("Chuông u minh ngân vang – Tiêu trừ phiền não.");
        updateHUD();
    }

    function triggerBow() {
        if (!window.templeState.userProfile.isRegistered) {
            showToast("Kính mời quý hành giả hoan hỷ ghi danh trước khi bắt đầu tu tập.");
            openModal(elements.modalRegister);
            return;
        }

        window.templeAudio.playBell();
        window.templeState.recordBow();

        if (elements.bowingOverlay) {
            elements.bowingOverlay.classList.add('active');
            setTimeout(() => {
                elements.bowingOverlay.classList.remove('active');
            }, 1800);
        }

        if (window.templeEffects) {
            window.templeEffects.triggerBlessing("Đảnh Lễ Tam Bảo (+10 Phước)");
        }

        updateHUD();
    }

    // ==========================================
    // CASE 02: FORM GHI DANH
    // ==========================================
    if (elements.formRegister) {
        elements.formRegister.addEventListener('submit', (e) => {
            e.preventDefault();
            elements.errRegFullName.textContent = '';
            elements.errRegBirthDate.textContent = '';

            const fullName = elements.regFullName.value.trim();
            const dharmaName = elements.regDharmaName.value.trim();
            const birthDate = elements.regBirthDate.value;
            const prayer = elements.regPrayer.value.trim();
            const avatarChoice = document.querySelector('input[name="regAvatar"]:checked');
            const avatarType = avatarChoice ? avatarChoice.value : 'male_layman';

            if (fullName.length < 2) {
                elements.errRegFullName.textContent = 'Họ và tên cần ít nhất 2 ký tự.';
                return;
            }

            if (!birthDate) {
                elements.errRegBirthDate.textContent = 'Vui lòng chọn ngày tháng năm sinh.';
                return;
            }

            const res = window.templeState.registerUser({
                fullName,
                dharmaName,
                birthDate,
                avatarType,
                prayer
            });

            if (!res.success) {
                elements.errRegBirthDate.textContent = res.message;
                return;
            }

            closeModal(elements.modalRegister);
            showToast(res.message);
            updateHUD();
            updatePrayerBanner();
            renderSeats();

            if (window.templeEffects) {
                window.templeEffects.triggerBlessing("Quy Y Tam Bảo");
            }
        });
    }

    // ==========================================
    // CASE 03: FORM CHỈNH SỬA HỒ SƠ
    // ==========================================
    if (elements.btnEditProfile) {
        elements.btnEditProfile.addEventListener('click', () => {
            const p = window.templeState.userProfile;
            if (!p.isRegistered) return;

            elements.editFullName.value = p.fullName || '';
            elements.editDharmaName.value = p.dharmaName || '';
            elements.editBirthDate.value = p.birthDate || '';
            elements.editPrayer.value = p.prayer || '';
            elements.errEditFullName.textContent = '';
            elements.errEditBirthDate.textContent = '';

            const radio = document.querySelector(`input[name="editAvatar"][value="${p.avatarType}"]`);
            if (radio) radio.checked = true;

            openModal(elements.modalEditProfile);
        });
    }

    if (elements.formEditProfile) {
        elements.formEditProfile.addEventListener('submit', (e) => {
            e.preventDefault();
            elements.errEditFullName.textContent = '';
            elements.errEditBirthDate.textContent = '';

            const fullName = elements.editFullName.value.trim();
            const dharmaName = elements.editDharmaName.value.trim();
            const birthDate = elements.editBirthDate.value;
            const prayer = elements.editPrayer.value.trim();
            const avatarChoice = document.querySelector('input[name="editAvatar"]:checked');
            const avatarType = avatarChoice ? avatarChoice.value : 'male_layman';

            const res = window.templeState.updateProfile({
                fullName,
                dharmaName,
                birthDate,
                avatarType,
                prayer
            });

            if (!res.success) {
                elements.errEditBirthDate.textContent = res.message;
                return;
            }

            closeModal(elements.modalEditProfile);
            showToast(res.message);
            updateHUD();
            updatePrayerBanner();
            renderSeats();
        });
    }

    if (elements.btnCloseEditModal) {
        elements.btnCloseEditModal.addEventListener('click', () => closeModal(elements.modalEditProfile));
    }
    if (elements.btnCancelEdit) {
        elements.btnCancelEdit.addEventListener('click', () => closeModal(elements.modalEditProfile));
    }

    // ==========================================
    // KINH THƯ & TỤNG KINH TỰ ĐỘNG
    // ==========================================
    function initScriptures() {
        if (!elements.selectScripture || !window.TEMPLE_SCRIPTURES) return;
        elements.selectScripture.innerHTML = '';

        window.TEMPLE_SCRIPTURES.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = `${s.title} (${s.category})`;
            elements.selectScripture.appendChild(opt);
        });

        elements.selectScripture.value = window.templeState.practiceState.activeScriptureId;
        renderCurrentScripture();

        elements.selectScripture.addEventListener('change', (e) => {
            window.templeState.practiceState.activeScriptureId = e.target.value;
            window.templeState.practiceState.currentVerseIndex = 0;
            renderCurrentScripture();
        });
    }

    function renderCurrentScripture() {
        const id = window.templeState.practiceState.activeScriptureId;
        const item = window.TEMPLE_SCRIPTURES.find(s => s.id === id) || window.TEMPLE_SCRIPTURES[0];
        if (!item) return;

        if (elements.scriptureCategoryDesc) {
            elements.scriptureCategoryDesc.textContent = item.description;
        }

        if (elements.scriptureVerses) {
            elements.scriptureVerses.innerHTML = '';
            item.verses.forEach((verse, idx) => {
                const p = document.createElement('p');
                p.className = 'scripture-verse';
                p.id = `verse_${idx}`;
                p.textContent = verse || '—';
                elements.scriptureVerses.appendChild(p);
            });
        }
    }

    function toggleAutoChant() {
        if (window.templeState.practiceState.isAutoChanting) {
            stopAutoChant();
        } else {
            startAutoChant();
        }
    }

    function startAutoChant() {
        window.templeState.practiceState.isAutoChanting = true;
        elements.autoChantIcon.textContent = '⏸';
        elements.autoChantTxt.textContent = 'Tạm Dừng Tụng Kinh';
        elements.btnToggleAutoChant.style.background = 'linear-gradient(135deg, #e65100, #bf360c)';

        const speed = parseInt(elements.rangeChantSpeed.value, 10) || 1800;
        stepAutoChant();

        autoChantInterval = setInterval(() => {
            stepAutoChant();
        }, speed);
    }

    function stepAutoChant() {
        const id = window.templeState.practiceState.activeScriptureId;
        const item = window.TEMPLE_SCRIPTURES.find(s => s.id === id);
        if (!item) return;

        // Bỏ highlight cũ
        const allVerses = document.querySelectorAll('.scripture-verse');
        allVerses.forEach(v => v.classList.remove('active-chant'));

        const curIdx = window.templeState.practiceState.currentVerseIndex;
        const curEl = document.getElementById(`verse_${curIdx}`);
        if (curEl) {
            curEl.classList.add('active-chant');
            curEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // Gõ mõ nhịp nhàng
        triggerMo();

        // Chuyển câu tiếp theo
        window.templeState.practiceState.currentVerseIndex++;
        if (window.templeState.practiceState.currentVerseIndex >= item.verses.length) {
            window.templeState.practiceState.currentVerseIndex = 0; // Hết bài tự quay lại đầu
        }
    }

    function stopAutoChant() {
        window.templeState.practiceState.isAutoChanting = false;
        if (autoChantInterval) clearInterval(autoChantInterval);
        autoChantInterval = null;

        elements.autoChantIcon.textContent = '▶';
        elements.autoChantTxt.textContent = 'Tụng Tự Động & Gõ Mõ';
        elements.btnToggleAutoChant.style.background = '';

        const allVerses = document.querySelectorAll('.scripture-verse');
        allVerses.forEach(v => v.classList.remove('active-chant'));
    }

    if (elements.btnToggleAutoChant) {
        elements.btnToggleAutoChant.addEventListener('click', toggleAutoChant);
    }

    if (elements.rangeChantSpeed) {
        elements.rangeChantSpeed.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            elements.speedDisplayLabel.textContent = val < 1400 ? 'Nhanh' : (val > 2200 ? 'Chậm' : 'Vừa');
            if (window.templeState.practiceState.isAutoChanting) {
                stopAutoChant();
                startAutoChant();
            }
        });
    }

    if (elements.btnFontSize) {
        elements.btnFontSize.addEventListener('click', () => {
            scriptureFontSizeState = (scriptureFontSizeState + 1) % 3;
            const sizes = ['1.05rem', '1.25rem', '1.45rem'];
            if (elements.scriptureVerses) {
                elements.scriptureVerses.style.fontSize = sizes[scriptureFontSizeState];
            }
        });
    }

    // ==========================================
    // CÚNG DƯỜNG (OFFERINGS)
    // ==========================================
    if (elements.btnDoOfferIncense) {
        elements.btnDoOfferIncense.addEventListener('click', () => {
            const res = window.templeState.offerIncense();
            showToast(res.message);
            if (res.success && window.templeEffects) {
                window.templeEffects.triggerBlessing("Dâng Hương Trầm");
            }
            updateHUD();
        });
    }

    if (elements.btnDoOfferFlower) {
        elements.btnDoOfferFlower.addEventListener('click', () => {
            const res = window.templeState.offerFlowers();
            showToast(res.message);
            if (res.success && window.templeEffects) {
                window.templeEffects.triggerBlessing("Dâng Hoa Sen Thơm");
            }
            updateHUD();
        });
    }

    if (elements.btnDoOfferCandle) {
        elements.btnDoOfferCandle.addEventListener('click', () => {
            const res = window.templeState.offerCandle();
            showToast(res.message);
            if (res.success && window.templeEffects) {
                window.templeEffects.triggerBlessing("Đèn Tâm Đăng Tỏa Sáng");
            }
            updateHUD();
        });
    }

    // ==========================================
    // SỔ VÀNG CÔNG ĐỨC
    // ==========================================
    function renderMeritBook() {
        if (!elements.meritTotalPoints) return;
        elements.meritTotalPoints.textContent = window.templeState.meritState.points;
        const totalMinutes = Math.floor(window.templeState.practiceState.totalSeconds / 60);
        elements.meritTotalTime.textContent = `${totalMinutes} phút`;
        elements.meritTotalMo.textContent = window.templeState.practiceState.moCount;

        elements.meritLogsList.innerHTML = '';
        const logs = window.templeState.meritState.logs;
        if (logs.length === 0) {
            elements.meritLogsList.innerHTML = '<p style="color:var(--text-muted);font-size:0.8rem;">Chưa có ghi chép tu tập.</p>';
            return;
        }

        logs.forEach(log => {
            const item = document.createElement('div');
            item.className = 'log-item';
            item.innerHTML = `
                <span>${log.reason} <small style="color:var(--text-muted)">(${log.time})</small></span>
                <span class="log-amount">+${log.amount}</span>
            `;
            elements.meritLogsList.appendChild(item);
        });
    }

    // ==========================================
    // ĐIỀU KHIỂN ÂM THANH & FULLSCREEN
    // ==========================================
    if (elements.btnToggleAudio) {
        elements.btnToggleAudio.addEventListener('click', () => {
            const muted = !window.templeAudio.isMuted;
            window.templeAudio.setMute(muted);
            elements.audioIcon.textContent = muted ? '🔇' : '🔊';
            showToast(muted ? "Đã tắt âm thanh." : "Đã bật âm thanh.");
        });
    }

    if (elements.btnToggleAmbient) {
        elements.btnToggleAmbient.addEventListener('click', () => {
            const isPlaying = window.templeAudio.toggleAmbient();
            elements.ambientIcon.textContent = isPlaying ? '🎶' : '🎵';
            showToast(isPlaying ? "Bật âm thanh thiền định tĩnh lặng." : "Đã tắt âm thiền nền.");
        });
    }

    if (elements.btnFullscreen) {
        elements.btnFullscreen.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
                elements.fullscreenIcon.textContent = '🗗';
            } else {
                document.exitFullscreen().catch(() => {});
                elements.fullscreenIcon.textContent = '⛶';
            }
        });
    }

    // ==========================================
    // MODAL BUTTON CLICK HANDLERS
    // ==========================================
    if (elements.btnActionMo) elements.btnActionMo.addEventListener('click', triggerMo);
    if (elements.btnActionBell) elements.btnActionBell.addEventListener('click', triggerBell);
    if (elements.btnActionBow) elements.btnActionBow.addEventListener('click', triggerBow);

    if (elements.moTarget) elements.moTarget.addEventListener('click', triggerMo);
    if (elements.bellTarget) elements.bellTarget.addEventListener('click', triggerBell);
    if (elements.incenseCenser) {
        elements.incenseCenser.addEventListener('click', () => {
            openModal(elements.modalOffering);
        });
    }

    if (elements.btnActionScripture) {
        elements.btnActionScripture.addEventListener('click', () => {
            renderCurrentScripture();
            openModal(elements.modalScripture);
        });
    }
    if (elements.btnCloseScriptureModal) {
        elements.btnCloseScriptureModal.addEventListener('click', () => closeModal(elements.modalScripture));
    }

    if (elements.btnActionOffering) {
        elements.btnActionOffering.addEventListener('click', () => openModal(elements.modalOffering));
    }
    if (elements.btnCloseOfferingModal) {
        elements.btnCloseOfferingModal.addEventListener('click', () => closeModal(elements.modalOffering));
    }

    if (elements.btnActionMeritBook) {
        elements.btnActionMeritBook.addEventListener('click', () => {
            renderMeritBook();
            openModal(elements.modalMeritBook);
        });
    }
    if (elements.btnCloseMeritModal) {
        elements.btnCloseMeritModal.addEventListener('click', () => closeModal(elements.modalMeritBook));
    }

    if (elements.btnOpenHelp) {
        elements.btnOpenHelp.addEventListener('click', () => openModal(elements.modalHelp));
    }
    if (elements.btnCloseHelpModal) {
        elements.btnCloseHelpModal.addEventListener('click', () => closeModal(elements.modalHelp));
    }

    // ==========================================
    // KEYBOARD NAVIGATION & SHORTCUTS
    // ==========================================
    window.addEventListener('keydown', (e) => {
        // Nếu đang gõ text trong input hoặc textarea, không chặn phím
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
            return;
        }

        const key = e.key.toUpperCase();

        if (e.key === ' ' || key === 'M') {
            e.preventDefault();
            triggerMo();
        } else if (key === 'C') {
            e.preventDefault();
            triggerBell();
        } else if (key === 'L') {
            e.preventDefault();
            triggerBow();
        } else if (key === 'K') {
            e.preventDefault();
            renderCurrentScripture();
            openModal(elements.modalScripture);
        } else if (key === 'H') {
            e.preventDefault();
            openModal(elements.modalOffering);
        } else if (key === 'B') {
            e.preventDefault();
            renderMeritBook();
            openModal(elements.modalMeritBook);
        } else if (e.key === 'Escape') {
            closeAllModals();
        }
    });

    // ==========================================
    // TICK TIMER MỖI GIÂY
    // ==========================================
    setInterval(() => {
        window.templeState.tickPracticeTime();
        updatePracticeTimer();
    }, 1000);

    // Lắng nghe thay đổi trạng thái
    window.templeState.subscribe((domain) => {
        if (domain === 'userProfile' || domain === 'practice' || domain === 'gifts') {
            updateHUD();
        }
        if (domain === 'seats') {
            renderSeats();
        }
    });

    // Khởi động
    initScriptures();
    checkInitialAccess();
});
