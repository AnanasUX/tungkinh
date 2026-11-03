/**
 * Chùa An Nhiên - Bộ Tạo Bằng Công Đức & Chứng Nhận Tu Tập (Canvas High-Res PNG)
 */

class TempleCertificateGenerator {
  static generate(userProfile, practiceData) {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 850;
    const ctx = canvas.getContext('2d');

    // 1. Nền Gấm Hoàng Kim Cổ Điển
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 850);
    bgGrad.addColorStop(0, '#fef9e7');
    bgGrad.addColorStop(0.5, '#fbf0c9');
    bgGrad.addColorStop(1, '#f5deb3');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 850);

    // Hoa văn nước nền
    ctx.fillStyle = 'rgba(212, 175, 55, 0.05)';
    for (let x = 0; x < 1200; x += 40) {
      for (let y = 0; y < 850; y += 40) {
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 2. Khung Viền Hoàng Gia & Chữ Vạn
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 14;
    ctx.strokeRect(30, 30, 1140, 790);

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3;
    ctx.strokeRect(46, 46, 1108, 758);

    // 4 Góc hoa văn
    this.drawCornerLotus(ctx, 46, 46);
    this.drawCornerLotus(ctx, 1154, 46);
    this.drawCornerLotus(ctx, 46, 804);
    this.drawCornerLotus(ctx, 1154, 804);

    // 3. Tiêu Đề Phật Giáo
    ctx.fillStyle = '#8b0000';
    ctx.font = 'bold 22px "Cormorant Garamond", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('NAM MÔ BỔN SƯ THÍCH CA MÂU NI PHẬT', 600, 95);

    ctx.fillStyle = '#b8860b';
    ctx.font = 'bold 16px "Be Vietnam Pro", sans-serif';
    ctx.fillText('✦ CHÙA AN NHIÊN · ĐẠO TRÀNG TU TẬP TRỰC TUYẾN ✦', 600, 130);

    // Dải phân cách hoa sen
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(350, 145);
    ctx.lineTo(850, 145);
    ctx.stroke();

    ctx.fillStyle = '#d4af37';
    ctx.font = '24px serif';
    ctx.fillText('🌸', 600, 152);

    // 4. TIÊU ĐỀ BẰNG CÔNG ĐỨC
    ctx.fillStyle = '#7a1c02';
    ctx.font = 'bold 44px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('CHỨNG NHẬN CÔNG ĐỨC TU HỌC', 600, 215);

    ctx.fillStyle = '#555';
    ctx.font = 'italic 16px "Lora", serif';
    ctx.fillText('Ghi nhận tấm lòng chí thành quy hướng Tam Bảo và chuyên cần tu tập chánh niệm', 600, 248);

    // 5. THÔNG TIN HÀNH GIẢ
    const fullName = userProfile.fullName || 'Đạo Hữu An Nhiên';
    const dharmaName = userProfile.dharmaName || 'Minh Tâm';
    const canChi = userProfile.canChi || 'Bính Tý';
    const element = userProfile.element || 'Mệnh Thủy';
    const hometown = userProfile.hometown || 'Việt Nam';

    ctx.fillStyle = '#111';
    ctx.font = '19px "Be Vietnam Pro", sans-serif';
    ctx.fillText('Chứng nhận Đạo hữu:', 600, 310);

    ctx.fillStyle = '#b8334a';
    ctx.font = 'bold 36px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(fullName.toUpperCase(), 600, 355);

    ctx.fillStyle = '#2e5d36';
    ctx.font = 'bold 20px "Be Vietnam Pro", sans-serif';
    ctx.fillText(`Pháp Danh: ${dharmaName}  ·  Quê Quán: ${hometown}`, 600, 395);

    ctx.fillStyle = '#78350f';
    ctx.font = '16px "Be Vietnam Pro", sans-serif';
    ctx.fillText(`Bản Mệnh: ${canChi} (${element})`, 600, 428);

    // 6. THỐNG KÊ CÔNG ĐỨC
    const pts = userProfile.meritScore || practiceData.meritScore || 108;
    const mo = userProfile.woodenFishCount || practiceData.moCount || 108;
    const realm = userProfile.realmName || 'Sơ Tâm';

    ctx.fillStyle = '#2c1105';
    ctx.font = '17px "Lora", serif';
    ctx.fillText(`Đã an tọa trang nghiêm tại Bồ Đoàn Chánh Điện, thành tâm gõ ${mo} tiếng Mõ,`, 600, 480);
    ctx.fillText(`tích lũy được ${pts} Điểm Phước Lành, đắc chứng cấp bậc:`, 600, 510);

    ctx.fillStyle = '#b8860b';
    ctx.font = 'bold 26px "Cormorant Garamond", Georgia, serif';
    ctx.fillText(`✦ ${realm.toUpperCase()} ✦`, 600, 550);

    // 7. LỜI NGUYỆN CẦU
    const wish = userProfile.wish || 'Gia đình bình an, sức khỏe dồi dào, vạn sự cát tường';
    ctx.fillStyle = '#4a2608';
    ctx.font = 'italic 16px "Lora", serif';
    ctx.fillText(`Tâm nguyện: "${wish}"`, 600, 600);

    // 8. NGÀY THÁNG & CHỮ KÝ DẤU ẤN
    const today = new Date();
    const dateStr = `Ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`;
    ctx.fillStyle = '#333';
    ctx.font = '16px "Lora", serif';
    ctx.fillText(dateStr, 880, 660);

    ctx.font = 'bold 18px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = '#7a1c02';
    ctx.fillText('TRỤ TRÌ CHÙA AN NHIÊN', 880, 690);

    ctx.font = 'italic 14px "Lora", serif';
    ctx.fillStyle = '#666';
    ctx.fillText('(Chứng minh công đức)', 880, 715);

    // Dấu ấn triện đỏ Chùa An Nhiên
    this.drawTempleSeal(ctx, 880, 755);

    return canvas.toDataURL('image/png');
  }

  static drawCornerLotus(ctx, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  static drawTempleSeal(ctx, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);
    // Viền triện vuông màu đỏ son
    ctx.strokeStyle = '#c5221f';
    ctx.lineWidth = 4;
    ctx.strokeRect(-45, -45, 90, 90);
    ctx.strokeRect(-40, -40, 80, 80);

    // Chữ triện
    ctx.fillStyle = '#c5221f';
    ctx.font = 'bold 15px "Be Vietnam Pro", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CHÙA', 0, -18);
    ctx.fillText('AN NHIÊN', 0, 2);
    ctx.fillText('TAM BẢO ẤN', 0, 24);
    ctx.restore();
  }

  static downloadCertificate(userProfile, practiceData) {
    const dataUrl = this.generate(userProfile, practiceData);
    const link = document.createElement('a');
    const safeName = (userProfile.fullName || 'Hanh_Gia').replace(/\s+/g, '_');
    link.download = `Bang_Cong_Duc_${safeName}_Chua_An_Nhien.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

window.TempleCertificateGenerator = TempleCertificateGenerator;
