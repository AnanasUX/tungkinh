/**
 * Chùa An Nhiên - Quản Lý Trạng Thái Toàn Cục (State Management)
 * Phân tách nghiêm ngặt 8 phân vùng trạng thái:
 * 1. User Profile  2. Seat State     3. Practice State  4. Merit State
 * 5. Gift State    6. Audio State    7. UI State        8. Session State
 */

const STORAGE_KEY = "CHUA_AN_NHIEN_DATA_V2";

class TempleStateManager {
    constructor() {
        // 1. User Profile State
        this.userProfile = {
            id: null,
            fullName: "",
            dharmaName: "",
            birthDate: "",
            age: null,
            avatarType: "male_layman",
            prayer: "",
            isRegistered: false,
            registeredAt: null,
            updatedAt: null
        };

        // 2. Seat State (16 Bồ đoàn)
        this.seats = [];
        this.currentSeatId = null;
        this.isChangingSeat = false;
        this.lastSeatChangeTime = 0;

        // 3. Practice State
        this.practiceState = {
            moCount: 0,
            bellCount: 0,
            bowCount: 0,
            sessionSeconds: 0,
            totalSeconds: 0,
            isAutoChanting: false,
            chantSpeed: 1800, // ms mỗi nhịp
            activeScriptureId: "daibi",
            currentVerseIndex: 0
        };

        // 4. Merit State
        this.meritState = {
            points: 0,
            hasReceivedRegisterBonus: false,
            logs: []
        };

        // 5. Gift State
        this.giftState = {
            incenseActive: true,
            incenseCount: 1,
            flowerActive: true,
            flowerCount: 1,
            candleActive: true,
            candleCount: 2,
            lampCount: 0
        };

        // 6. Audio State
        this.audioState = {
            isMuted: false,
            masterVolume: 0.8,
            ambientEnabled: false
        };

        // 7. UI State
        this.uiState = {
            activeModal: null,
            isBowAnimating: false,
            isBellAnimating: false,
            isMoAnimating: false,
            notification: null
        };

        // 8. Session State
        this.sessionState = {
            sessionId: "session_" + Date.now() + "_" + Math.floor(Math.random() * 10000),
            sessionStartTime: Date.now()
        };

        // Subscribed listeners
        this.listeners = [];

        this.initSeats();
        this.loadFromStorage();
    }

    /**
     * Khởi tạo 16 Bồ đoàn với vài đồng tu mẫu trang nghiêm
     */
    initSeats() {
        this.seats = [];
        const sampleSangha = [
            { id: 2, name: "Cư Sĩ Tịnh Tâm", avatar: "female_layman" },
            { id: 5, name: "Phật Tử Diệu Âm", avatar: "female_layman" },
            { id: 7, name: "Thiện Nam Trí Dũng", avatar: "male_layman" },
            { id: 10, name: "Thích Tâm Nguyện", avatar: "monk" },
            { id: 13, name: "Diệu Hạnh", avatar: "nun" }
        ];

        for (let i = 1; i <= 16; i++) {
            const occupant = sampleSangha.find(s => s.id === i);
            this.seats.push({
                id: i,
                isOccupied: !!occupant,
                occupantId: occupant ? "sangha_" + i : null,
                occupantName: occupant ? occupant.name : null,
                avatarType: occupant ? occupant.avatar : null,
                isMine: false
            });
        }
    }

    subscribe(callback) {
        if (typeof callback === 'function') {
            this.listeners.push(callback);
        }
    }

    notify(changedDomain) {
        this.saveToStorage();
        this.listeners.forEach(cb => {
            try { cb(changedDomain, this); } catch (e) { console.error("Listener error:", e); }
        });
    }

    // ==========================================
    // CASE 01, 02, 03: USER PROFILE LOGIC
    // ==========================================

    /**
     * Tính tuổi chính xác từ ngày sinh (Không dùng tuổi mặc định ghi đè lỗi)
     */
    calculateAge(birthDateString) {
        if (!birthDateString) return null;
        const birth = new Date(birthDateString);
        if (isNaN(birth.getTime())) return null;

        const today = new Date();
        if (birth > today) return null; // Ngày tương lai không hợp lệ

        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age >= 0 && age <= 125 ? age : null;
    }

    /**
     * Case 02: Người dùng ghi danh
     */
    registerUser(data) {
        const fullName = (data.fullName || "").trim();
        if (fullName.length < 2) {
            return { success: false, message: "Họ và tên phải có ít nhất 2 ký tự." };
        }

        const age = this.calculateAge(data.birthDate);
        if (age === null) {
            return { success: false, message: "Ngày sinh không hợp lệ hoặc nằm trong tương lai." };
        }

        const userId = "hg_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6);

        this.userProfile = {
            id: userId,
            fullName: fullName,
            dharmaName: (data.dharmaName || "").trim() || "An Nhiên",
            birthDate: data.birthDate,
            age: age,
            avatarType: data.avatarType || "male_layman",
            prayer: (data.prayer || "").trim() || "Nguyện cầu quốc thái dân an, gia đạo bình an cát tường.",
            isRegistered: true,
            registeredAt: Date.now(),
            updatedAt: Date.now()
        };

        // Thưởng công đức ghi danh (Chỉ cộng 1 lần duy nhất)
        if (!this.meritState.hasReceivedRegisterBonus) {
            this.addMerit(100, "Ghi danh quy hướng Tam Bảo");
            this.meritState.hasReceivedRegisterBonus = true;
        }

        // Tự động gán Bồ đoàn trống đầu tiên
        const assignedSeat = this.autoAssignSeat();

        this.notify('userProfile');
        return {
            success: true,
            seatId: assignedSeat ? assignedSeat.id : null,
            message: "Ghi danh thành công! Chúc bạn thân tâm thường an lạc."
        };
    }

    /**
     * Case 03: Chỉnh sửa hồ sơ
     * Giữ nguyên ID, giữ nguyên Bồ đoàn, không cộng lại điểm, không reset thời gian tu tập
     */
    updateProfile(data) {
        if (!this.userProfile.isRegistered) {
            return { success: false, message: "Hồ sơ chưa được đăng ký." };
        }

        const fullName = (data.fullName || "").trim();
        if (fullName.length < 2) {
            return { success: false, message: "Họ và tên phải có ít nhất 2 ký tự." };
        }

        const age = this.calculateAge(data.birthDate);
        if (age === null) {
            return { success: false, message: "Ngày sinh không hợp lệ." };
        }

        // Cập nhật thông tin nhưng BẢO TOÀN ID hành giả
        this.userProfile.fullName = fullName;
        this.userProfile.dharmaName = (data.dharmaName || "").trim() || this.userProfile.dharmaName;
        this.userProfile.birthDate = data.birthDate;
        this.userProfile.age = age;
        this.userProfile.avatarType = data.avatarType || this.userProfile.avatarType;
        this.userProfile.prayer = (data.prayer || "").trim() || this.userProfile.prayer;
        this.userProfile.updatedAt = Date.now();

        // Cập nhật thông tin trên Bồ đoàn hiện tại của người dùng nếu có
        if (this.currentSeatId) {
            const mySeat = this.seats.find(s => s.id === this.currentSeatId);
            if (mySeat) {
                mySeat.occupantName = this.userProfile.dharmaName || this.userProfile.fullName;
                mySeat.avatarType = this.userProfile.avatarType;
            }
        }

        this.notify('userProfile');
        return { success: true, message: "Cập nhật hồ sơ tu tập thành công." };
    }

    // ==========================================
    // CASE 04, 05, 06: QUẢN LÝ BỒ ĐOÀN (SEAT STATE)
    // ==========================================

    /**
     * Tự động gán bồ đoàn trống đầu tiên
     */
    autoAssignSeat() {
        const emptySeat = this.seats.find(s => !s.isOccupied);
        if (!emptySeat) return null;

        emptySeat.isOccupied = true;
        emptySeat.occupantId = this.userProfile.id;
        emptySeat.occupantName = this.userProfile.dharmaName || this.userProfile.fullName;
        emptySeat.avatarType = this.userProfile.avatarType;
        emptySeat.isMine = true;
        this.currentSeatId = emptySeat.id;
        return emptySeat;
    }

    /**
     * Case 04, 05, 06: Chọn hoặc Đổi Bồ đoàn
     * - Case 04: Chỉ chọn bồ đoàn trống. Không chiếm chỗ người khác. Giao dịch logic thống nhất.
     * - Case 05: Hết bồ đoàn trống -> thông báo, không ghi đè.
     * - Case 06: Chống nhấp liên tục (Debounce & Throttling).
     */
    changeSeat(targetSeatId) {
        if (!this.userProfile.isRegistered) {
            return { success: false, message: "Quý đạo hữu vui lòng ghi danh trước khi chọn Bồ đoàn." };
        }

        // Case 06: Chống nhấp liên tục (Throttle 600ms)
        const now = Date.now();
        if (this.isChangingSeat || (now - this.lastSeatChangeTime < 600)) {
            return { success: false, message: "Đang chuyển vị trí Bồ đoàn, xin chớ gấp..." };
        }

        const targetSeat = this.seats.find(s => s.id === targetSeatId);
        if (!targetSeat) {
            return { success: false, message: "Bồ đoàn không tồn tại." };
        }

        // Nếu đã ở đúng bồ đoàn này rồi
        if (targetSeat.id === this.currentSeatId) {
            return { success: true, message: "Bạn đang an tọa tại Bồ đoàn này." };
        }

        // Case 04: Kiểm tra nếu bồ đoàn đã có người
        if (targetSeat.isOccupied && !targetSeat.isMine) {
            return {
                success: false,
                message: `Bồ đoàn số ${targetSeatId} đã có đạo hữu ${targetSeat.occupantName || "đồng tu"} an tọa.`
            };
        }

        // Case 05: Kiểm tra còn chỗ trống không (khi chưa có bồ đoàn nào)
        if (!this.currentSeatId && !this.seats.some(s => !s.isOccupied)) {
            return {
                success: false,
                message: "Toàn bộ Bồ đoàn trong Chánh điện đã có người an tọa. Kính mong đạo hữu hoan hỷ chờ đợi."
            };
        }

        // BẮT ĐẦU GIAO DỊCH NGUYÊN TỬ (ATOMIC TRANSACTION)
        this.isChangingSeat = true;
        this.lastSeatChangeTime = now;

        try {
            // Bước 1: Giải phóng Bồ đoàn cũ
            if (this.currentSeatId) {
                const oldSeat = this.seats.find(s => s.id === this.currentSeatId);
                if (oldSeat) {
                    oldSeat.isOccupied = false;
                    oldSeat.occupantId = null;
                    oldSeat.occupantName = null;
                    oldSeat.avatarType = null;
                    oldSeat.isMine = false;
                }
            }

            // Bước 2: Chiếm Bồ đoàn mới
            targetSeat.isOccupied = true;
            targetSeat.occupantId = this.userProfile.id;
            targetSeat.occupantName = this.userProfile.dharmaName || this.userProfile.fullName;
            targetSeat.avatarType = this.userProfile.avatarType;
            targetSeat.isMine = true;
            this.currentSeatId = targetSeat.id;

            this.notify('seats');
            return {
                success: true,
                seatId: targetSeat.id,
                message: `Đã an tọa tại Bồ đoàn số ${targetSeat.id}. Thân tâm thanh tịnh.`
            };
        } finally {
            setTimeout(() => {
                this.isChangingSeat = false;
            }, 500);
        }
    }

    // ==========================================
    // TU TẬP & CÔNG ĐỨC (PRACTICE & MERIT STATE)
    // ==========================================

    recordMoStrike() {
        if (!this.userProfile.isRegistered) return;
        this.practiceState.moCount++;
        this.addMerit(1, "Gõ Mõ định tâm");
        this.notify('practice');
    }

    recordBellRing() {
        if (!this.userProfile.isRegistered) return;
        this.practiceState.bellCount++;
        this.addMerit(5, "Thỉnh Đại Hồng Chung khai mở trí tuệ");
        this.notify('practice');
    }

    recordBow() {
        if (!this.userProfile.isRegistered) return;
        this.practiceState.bowCount++;
        this.addMerit(10, "Đảnh lễ Đức Phật");
        this.notify('practice');
    }

    tickPracticeTime() {
        if (this.userProfile.isRegistered) {
            this.practiceState.sessionSeconds++;
            this.practiceState.totalSeconds++;
            // Mỗi 5 giây thông báo cập nhật HUD nhẹ
            if (this.practiceState.sessionSeconds % 5 === 0) {
                this.notify('practiceTime');
            }
        }
    }

    addMerit(amount, reason) {
        this.meritState.points += amount;
        this.meritState.logs.unshift({
            time: new Date().toLocaleTimeString('vi-VN'),
            amount: amount,
            reason: reason
        });
        if (this.meritState.logs.length > 30) {
            this.meritState.logs.pop();
        }
    }

    // ==========================================
    // CÚNG DƯỜNG (GIFT STATE)
    // ==========================================

    offerIncense() {
        if (!this.userProfile.isRegistered) return { success: false, message: "Vui lòng ghi danh trước." };
        this.giftState.incenseCount++;
        this.addMerit(15, "Dâng nén tâm hương cúng dường Phật");
        this.notify('gifts');
        return { success: true, message: "Hương trầm thanh khiết tỏa ngát Chánh điện. Công đức vô lượng." };
    }

    offerFlowers() {
        if (!this.userProfile.isRegistered) return { success: false, message: "Vui lòng ghi danh trước." };
        this.giftState.flowerCount++;
        this.addMerit(20, "Dâng hoa sen thơm thanh tịnh");
        this.notify('gifts');
        return { success: true, message: "Hoa sen trang nghiêm trước Phật đài. Phước huệ trang nghiêm." };
    }

    offerCandle() {
        if (!this.userProfile.isRegistered) return { success: false, message: "Vui lòng ghi danh trước." };
        this.giftState.lampCount++;
        this.addMerit(25, "Cúng dường Đèn Tâm Đăng tỏa sáng trí tuệ");
        this.notify('gifts');
        return { success: true, message: "Ánh sáng ngọn đèn trí tuệ xua tan vô minh tăm tối." };
    }

    // ==========================================
    // PERSISTENCE (LOCAL STORAGE)
    // ==========================================

    saveToStorage() {
        try {
            const dataToSave = {
                userProfile: this.userProfile,
                currentSeatId: this.currentSeatId,
                practiceState: {
                    moCount: this.practiceState.moCount,
                    bellCount: this.practiceState.bellCount,
                    bowCount: this.practiceState.bowCount,
                    totalSeconds: this.practiceState.totalSeconds,
                    activeScriptureId: this.practiceState.activeScriptureId
                },
                meritState: this.meritState,
                giftState: this.giftState,
                audioState: this.audioState
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        } catch (e) {
            console.warn("Could not save to localStorage", e);
        }
    }

    loadFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);

            if (parsed.userProfile && parsed.userProfile.isRegistered) {
                this.userProfile = Object.assign(this.userProfile, parsed.userProfile);
                // Đảm bảo tính lại tuổi theo ngày sinh đã lưu
                if (this.userProfile.birthDate) {
                    const recalculatedAge = this.calculateAge(this.userProfile.birthDate);
                    if (recalculatedAge !== null) {
                        this.userProfile.age = recalculatedAge;
                    }
                }
            }

            if (parsed.meritState) {
                this.meritState = Object.assign(this.meritState, parsed.meritState);
            }

            if (parsed.practiceState) {
                this.practiceState.moCount = parsed.practiceState.moCount || 0;
                this.practiceState.bellCount = parsed.practiceState.bellCount || 0;
                this.practiceState.bowCount = parsed.practiceState.bowCount || 0;
                this.practiceState.totalSeconds = parsed.practiceState.totalSeconds || 0;
                this.practiceState.activeScriptureId = parsed.practiceState.activeScriptureId || "daibi";
            }

            if (parsed.giftState) {
                this.giftState = Object.assign(this.giftState, parsed.giftState);
            }

            if (parsed.audioState) {
                this.audioState = Object.assign(this.audioState, parsed.audioState);
            }

            // Gán lại Bồ đoàn đã ngồi nếu còn
            if (this.userProfile.isRegistered && parsed.currentSeatId) {
                const seat = this.seats.find(s => s.id === parsed.currentSeatId);
                if (seat && (!seat.isOccupied || seat.occupantId === this.userProfile.id)) {
                    seat.isOccupied = true;
                    seat.occupantId = this.userProfile.id;
                    seat.occupantName = this.userProfile.dharmaName || this.userProfile.fullName;
                    seat.avatarType = this.userProfile.avatarType;
                    seat.isMine = true;
                    this.currentSeatId = seat.id;
                } else {
                    // Nếu vị trí cũ bị chiếm, tự động tìm vị trí mới
                    this.autoAssignSeat();
                }
            }
        } catch (e) {
            console.error("Error loading stored data", e);
        }
    }
}

window.templeState = new TempleStateManager();
