/**
 * Chùa An Nhiên - Web Audio API Synthesizer
 * Tái tạo chân thực tiếng Mõ Chùa, Đại Hồng Chung & Âm thanh Thiền định
 * Không phụ thuộc file mp3 ngoài, hoạt động trơn tru ngoại tuyến và độ trễ 0ms.
 */

class TempleAudioEngine {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.ambientGain = null;
        this.ambientPlaying = false;
        this.ambientOscs = [];
        this.masterVolume = 0.8;
        this.moVolume = 0.9;
        this.bellVolume = 0.85;
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /**
     * Tiếng Mõ Gỗ (Hollow Wooden Fish / Muktak)
     * Âm sắc: Gõ dùi sắc gọn, cộng hưởng buồng gỗ rỗng ấm áp
     */
    playMo() {
        if (this.isMuted) return;
        this.init();

        const now = this.ctx.currentTime;

        // 1. Wood body resonance oscillator (Sine/Triangle)
        const oscBody = this.ctx.createOscillator();
        const oscHarmonic = this.ctx.createOscillator();
        const bodyGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        oscBody.type = 'triangle';
        // Tần số rớt nhẹ mô phỏng lực gõ dùi lên vỏ gỗ
        oscBody.frequency.setValueAtTime(540, now);
        oscBody.frequency.exponentialRampToValueAtTime(420, now + 0.08);

        oscHarmonic.type = 'sine';
        oscHarmonic.frequency.setValueAtTime(1080, now);
        oscHarmonic.frequency.exponentialRampToValueAtTime(840, now + 0.06);

        // Filter cộng hưởng vỏ gỗ (Bandpass)
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(620, now);
        filter.Q.setValueAtTime(6.0, now);

        // Envelope: Attack cực nhanh (1ms), Decay gọn gàng (120ms)
        bodyGain.gain.setValueAtTime(0.001, now);
        bodyGain.gain.linearRampToValueAtTime(this.moVolume * this.masterVolume, now + 0.002);
        bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

        // 2. Click gõ dùi (Wood Mallet Transient)
        const bufferSize = this.ctx.sampleRate * 0.015;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(1200, now);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.4 * this.masterVolume, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);

        // Kết nối mạch âm thanh mõ
        oscBody.connect(filter);
        oscHarmonic.connect(filter);
        filter.connect(bodyGain);
        bodyGain.connect(this.ctx.destination);

        oscBody.start(now);
        oscHarmonic.start(now);
        noise.start(now);

        oscBody.stop(now + 0.18);
        oscHarmonic.stop(now + 0.18);
        noise.stop(now + 0.02);
    }

    /**
     * Tiếng Đại Hồng Chung (Thánh Tích Chuông Chùa)
     * Ngân dài 6-8 giây, họa âm đồng u minh tĩnh lặng
     */
    playBell() {
        if (this.isMuted) return;
        this.init();

        const now = this.ctx.currentTime;
        const baseFreq = 216; // Tần số gốc Solfeggio thiền tịnh (Hz)

        // Các họa âm của chuông đồng cổ truyền (partials)
        const partials = [
            { freq: baseFreq * 0.5, gain: 0.35, decay: 7.0 },  // Tiếng u minh trầm
            { freq: baseFreq * 1.0, gain: 0.55, decay: 6.5 },  // Âm nền
            { freq: baseFreq * 1.22, gain: 0.45, decay: 5.5 }, // Tiếng ngân thánh thót
            { freq: baseFreq * 2.0, gain: 0.30, decay: 4.5 },  // Bát độ
            { freq: baseFreq * 2.76, gain: 0.25, decay: 3.5 }, // Họa âm kim loại
            { freq: baseFreq * 4.1, gain: 0.15, decay: 2.0 },  // Vang sáng trên đỉnh
            { freq: baseFreq * 5.4, gain: 0.08, decay: 1.2 }
        ];

        // LFO tạo hiệu ứng rung gợn sóng ngân chuông (chorus/vibrato tự nhiên)
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.setValueAtTime(2.2, now);
        lfoGain.gain.setValueAtTime(1.5, now);
        lfo.start(now);

        // Mallet strike (Tiếng chày gõ vào thân chuông đồng)
        const strikeSize = this.ctx.sampleRate * 0.04;
        const strikeBuf = this.ctx.createBuffer(1, strikeSize, this.ctx.sampleRate);
        const data = strikeBuf.getChannelData(0);
        for (let i = 0; i < strikeSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / strikeSize, 3);
        }
        const strikeSource = this.ctx.createBufferSource();
        strikeSource.buffer = strikeBuf;
        const strikeGain = this.ctx.createGain();
        strikeGain.gain.setValueAtTime(0.5 * this.masterVolume, now);
        strikeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        strikeSource.connect(strikeGain);
        strikeGain.connect(this.ctx.destination);
        strikeSource.start(now);
        strikeSource.stop(now + 0.05);

        // Tạo từng tầng họa âm ngân nga
        partials.forEach(p => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(p.freq, now);
            lfoGain.connect(osc.frequency);

            gain.gain.setValueAtTime(0.0001, now);
            // Attack cực nhanh
            gain.gain.linearRampToValueAtTime(p.gain * this.bellVolume * this.masterVolume, now + 0.015);
            // Decay dài êm đềm
            gain.gain.exponentialRampToValueAtTime(0.00001, now + p.decay);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + p.decay + 0.1);
        });

        lfo.stop(now + 7.5);
    }

    /**
     * Bật / Tắt Âm thanh Thiền tịnh Nền (Ambient Meditation Drone)
     */
    toggleAmbient(forceState = null) {
        this.init();
        const targetState = forceState !== null ? forceState : !this.ambientPlaying;

        if (targetState) {
            this.startAmbient();
        } else {
            this.stopAmbient();
        }
        return this.ambientPlaying;
    }

    startAmbient() {
        if (this.ambientPlaying) return;
        this.init();

        const now = this.ctx.currentTime;
        this.ambientGain = this.ctx.createGain();
        this.ambientGain.gain.setValueAtTime(0.001, now);
        this.ambientGain.gain.linearRampToValueAtTime(0.18 * this.masterVolume, now + 2.0);
        this.ambientGain.connect(this.ctx.destination);

        // Hợp âm ngũ cung thanh tịnh (F# minor / C# meditation pad: 108Hz, 162Hz, 216Hz, 324Hz, 432Hz)
        const notes = [108, 162, 216, 324, 432];
        this.ambientOscs = notes.map((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

            osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 1.2, now);

            oscGain.gain.value = 1 / (idx + 1.8);

            osc.connect(oscGain);
            if (panner) {
                panner.pan.value = (idx / (notes.length - 1)) * 1.6 - 0.8;
                oscGain.connect(panner);
                panner.connect(this.ambientGain);
            } else {
                oscGain.connect(this.ambientGain);
            }

            osc.start(now);
            return osc;
        });

        this.ambientPlaying = true;
    }

    stopAmbient() {
        if (!this.ambientPlaying || !this.ambientGain) return;
        const now = this.ctx.currentTime;
        this.ambientGain.gain.linearRampToValueAtTime(0.0001, now + 1.2);
        setTimeout(() => {
            this.ambientOscs.forEach(osc => {
                try { osc.stop(); } catch (e) {}
            });
            this.ambientOscs = [];
            this.ambientPlaying = false;
        }, 1300);
    }

    setMute(mute) {
        this.isMuted = mute;
        if (this.ambientGain) {
            this.ambientGain.gain.value = mute ? 0 : 0.18 * this.masterVolume;
        }
    }
}

// Khởi tạo Singleton Engine
window.templeAudio = new TempleAudioEngine();
