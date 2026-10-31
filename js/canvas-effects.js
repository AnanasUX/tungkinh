/**
 * Chùa An Nhiên - Canvas Visual Effects Engine
 * Quản lý: Khói trầm hương vật lý, Hạt kim quang thiền tịnh, Hào quang Phật, Sóng chuông ngân
 */

class TempleVisualEffects {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.width = 0;
        this.height = 0;
        this.particles = [];
        this.smokeParticles = [];
        this.shockwaves = [];
        this.blessings = [];
        this.haloAngle = 0;
        this.isRunning = false;
        this.incenseSource = { x: 0.5, y: 0.65 }; // Tọa độ tương đối của lư hương
    }

    init(canvasElement) {
        if (!canvasElement) return;
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.initDustParticles();
        this.start();
    }

    resize() {
        if (!this.canvas) return;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.width = this.canvas.width = rect.width;
        this.height = this.canvas.height = rect.height;
    }

    initDustParticles() {
        this.particles = [];
        const count = Math.min(50, Math.floor(window.innerWidth / 25));
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                radius: Math.random() * 1.8 + 0.6,
                speedY: -(Math.random() * 0.4 + 0.15),
                speedX: (Math.random() - 0.5) * 0.3,
                alpha: Math.random() * 0.6 + 0.2,
                pulse: Math.random() * Math.PI * 2,
                pulseSpeed: Math.random() * 0.03 + 0.01
            });
        }
    }

    /**
     * Kích hoạt sóng âm chuông ngân vàng
     */
    triggerBellShockwave(originX, originY) {
        const x = originX !== undefined ? originX : this.width * 0.22;
        const y = originY !== undefined ? originY : this.height * 0.48;

        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.shockwaves.push({
                    x: x,
                    y: y,
                    radius: 10,
                    maxRadius: Math.max(this.width, this.height) * 0.9,
                    alpha: 0.8,
                    speed: 4.5 - i * 0.5,
                    lineWidth: 3 - i * 0.6
                });
            }, i * 220);
        }
    }

    /**
     * Bay chữ Phúc đức / Hoa sen / Chữ Vạn khi gõ mõ
     */
    triggerBlessing(text = "+1 Phước Đức", originX, originY) {
        const x = originX !== undefined ? originX : this.width * 0.78 + (Math.random() - 0.5) * 40;
        const y = originY !== undefined ? originY : this.height * 0.55;

        this.blessings.push({
            text: text,
            x: x,
            y: y,
            alpha: 1.0,
            vy: -1.8 - Math.random() * 0.8,
            vx: (Math.random() - 0.5) * 1.2,
            scale: 0.8,
            maxScale: 1.3
        });
    }

    /**
     * Sinh hạt khói hương trầm uốn lượn
     */
    spawnIncenseSmoke() {
        if (this.smokeParticles.length > 90) return;
        const originX = this.width * this.incenseSource.x + (Math.random() - 0.5) * 8;
        const originY = this.height * this.incenseSource.y;

        this.smokeParticles.push({
            x: originX,
            y: originY,
            vx: (Math.random() - 0.5) * 0.4,
            vy: - (Math.random() * 0.8 + 0.9),
            radius: Math.random() * 2 + 2,
            maxRadius: Math.random() * 22 + 18,
            alpha: 0.65,
            age: 0,
            maxAge: 160 + Math.random() * 40,
            wavePhase: Math.random() * Math.PI * 2
        });
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        let lastSpawn = 0;

        const loop = (timestamp) => {
            if (!this.isRunning) return;

            // Spawn smoke mỗi 60ms
            if (timestamp - lastSpawn > 55) {
                this.spawnIncenseSmoke();
                lastSpawn = timestamp;
            }

            this.updateAndRender();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    updateAndRender() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 1. Vẽ Hào Quang Đức Phật (Rotational Sacred Glow Rays)
        this.renderBuddhaHalo();

        // 2. Vẽ Sóng Âm Đại Hồng Chung
        this.renderShockwaves();

        // 3. Vẽ Khói Hương Trầm
        this.renderSmoke();

        // 4. Vẽ Hạt Kim Quang Lơ Lửng
        this.renderDust();

        // 5. Vẽ Chữ Phước Đức Bay Lượn
        this.renderBlessings();
    }

    renderBuddhaHalo() {
        const cx = this.width * 0.5;
        const cy = this.height * 0.28;
        const outerRadius = Math.min(this.width, this.height) * 0.28;
        this.haloAngle += 0.0025;

        this.ctx.save();
        this.ctx.translate(cx, cy);

        // Gradient vầng sáng trung tâm
        const grad = this.ctx.createRadialGradient(0, 0, 10, 0, 0, outerRadius);
        grad.addColorStop(0, 'rgba(255, 230, 140, 0.45)');
        grad.addColorStop(0.4, 'rgba(255, 195, 77, 0.22)');
        grad.addColorStop(0.75, 'rgba(230, 140, 30, 0.08)');
        grad.addColorStop(1, 'rgba(255, 215, 0, 0)');

        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
        this.ctx.fill();

        // Các tia hào quang xoay nhẹ nhàng
        this.ctx.rotate(this.haloAngle);
        const rayCount = 18;
        for (let i = 0; i < rayCount; i++) {
            const angle = (i * Math.PI * 2) / rayCount;
            this.ctx.save();
            this.ctx.rotate(angle);
            this.ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 225, 120, 0.045)' : 'rgba(255, 180, 50, 0.03)';
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(outerRadius * 1.2, -outerRadius * 0.12);
            this.ctx.lineTo(outerRadius * 1.2, outerRadius * 0.12);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.restore();
        }

        this.ctx.restore();
    }

    renderShockwaves() {
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.radius += sw.speed;
            sw.alpha *= 0.965;

            if (sw.alpha <= 0.01 || sw.radius >= sw.maxRadius) {
                this.shockwaves.splice(i, 1);
                continue;
            }

            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            this.ctx.strokeStyle = `rgba(255, 220, 120, ${sw.alpha * 0.7})`;
            this.ctx.lineWidth = sw.lineWidth;
            this.ctx.shadowColor = '#ffe082';
            this.ctx.shadowBlur = 12;
            this.ctx.stroke();
            this.ctx.restore();
        }
    }

    renderSmoke() {
        for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
            const p = this.smokeParticles[i];
            p.age++;
            const progress = p.age / p.maxAge;

            // Uốn lượn hình sin tự nhiên
            p.wavePhase += 0.035;
            p.x += Math.sin(p.wavePhase) * 0.6 + p.vx;
            p.y += p.vy;
            p.radius += 0.12;

            const currentAlpha = (1 - progress) * p.alpha;

            if (p.age >= p.maxAge || currentAlpha <= 0.005) {
                this.smokeParticles.splice(i, 1);
                continue;
            }

            const smokeGrad = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
            smokeGrad.addColorStop(0, `rgba(240, 235, 220, ${currentAlpha * 0.75})`);
            smokeGrad.addColorStop(0.5, `rgba(220, 210, 190, ${currentAlpha * 0.35})`);
            smokeGrad.addColorStop(1, 'rgba(200, 190, 175, 0)');

            this.ctx.fillStyle = smokeGrad;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    renderDust() {
        for (let p of this.particles) {
            p.y += p.speedY;
            p.x += p.speedX;
            p.pulse += p.pulseSpeed;

            if (p.y < 0) p.y = this.height;
            if (p.x < 0) p.x = this.width;
            if (p.x > this.width) p.x = 0;

            const dynamicAlpha = p.alpha * (0.6 + 0.4 * Math.sin(p.pulse));

            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 225, 140, ${dynamicAlpha})`;
            this.ctx.shadowColor = '#ffd54f';
            this.ctx.shadowBlur = 6;
            this.ctx.fill();
            this.ctx.restore();
        }
    }

    renderBlessings() {
        for (let i = this.blessings.length - 1; i >= 0; i--) {
            const b = this.blessings[i];
            b.y += b.vy;
            b.x += b.vx;
            b.alpha -= 0.016;
            if (b.scale < b.maxScale) b.scale += 0.03;

            if (b.alpha <= 0) {
                this.blessings.splice(i, 1);
                continue;
            }

            this.ctx.save();
            this.ctx.translate(b.x, b.y);
            this.ctx.scale(b.scale, b.scale);
            this.ctx.font = 'bold 15px "Segoe UI", Tahoma, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = `rgba(255, 235, 150, ${b.alpha})`;
            this.ctx.shadowColor = '#ffb300';
            this.ctx.shadowBlur = 8;
            this.ctx.fillText(b.text, 0, 0);
            this.ctx.restore();
        }
    }
}

window.templeEffects = new TempleVisualEffects();
