/**
 * Chùa An Nhiên — 3D Practitioner Figurine Showcase (Three.js)
 * Khắc họa mô hình 3D nhân vật Hành Giả / Phật Tử phong cách tượng đất nung (Clay Figurine) & Zen Aesthetic
 * Đồng bộ theo giao diện Hồ Sơ Tu Tập hiện đại
 */

class ProfileFigurineViewer3D {
  constructor() {
    this.canvas = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.characterGroup = null;
    this.pedestalMesh = null;
    this.robeMesh = null;
    this.legsMesh = null;
    this.beadsGroup = null;
    this.animationId = null;

    this.currentPose = 'meditate'; // 'meditate' | 'stand'
    this.currentRobeColor = 0x3a628a; // Áo tràng lam
    this.currentBeadColor = 0x6e3b19; // Tràng hạt gỗ
    this.currentCushionType = 'cushion_gray';

    // Drag / Touch rotation state
    this.isDragging = false;
    this.prevPointerX = 0;
    this.targetRotationY = 0.45; // Góc xoay 3/4 nghệ thuật như ảnh mẫu
    this.currentRotationY = 0.45;
    this.rotationVelocity = 0;

    this.clock = new THREE.Clock();
    this.isInitialized = false;
  }

  init(canvasId = 'profile-figurine-3d-canvas') {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return false;

    const width = this.canvas.clientWidth || 360;
    const height = this.canvas.clientHeight || 320;

    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    this.camera.position.set(0, 1.35, 3.4);
    this.camera.lookAt(0, 0.72, 0);

    // 3. Renderer with high quality & preservation for screenshot
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if (this.renderer.outputEncoding) {
      this.renderer.outputEncoding = THREE.sRGBEncoding;
    }

    // 4. Studio Lighting (Mô phỏng ánh sáng phòng chụp chân dung ấm áp)
    const ambientLight = new THREE.AmbientLight(0xffeedd, 0.85);
    this.scene.add(ambientLight);

    // Key Light (Ánh sáng chính góc trên phải)
    const keyLight = new THREE.DirectionalLight(0xfff6e5, 1.4);
    keyLight.position.set(2.4, 4.5, 3.2);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.001;
    this.scene.add(keyLight);

    // Fill Light (Ánh sáng phụ góc trái làm mềm khối)
    const fillLight = new THREE.DirectionalLight(0x9bc2e6, 0.45);
    fillLight.position.set(-2.8, 2.0, 1.8);
    this.scene.add(fillLight);

    // Rim / Back Light (Ánh sáng viền vàng hổ phách từ phía sau)
    const rimLight = new THREE.DirectionalLight(0xf59e0b, 0.85);
    rimLight.position.set(0, 3.2, -3.2);
    this.scene.add(rimLight);

    // Bottom Bounce Light (Hắt sáng nhẹ từ bồ đoàn lên mặt)
    const bounceLight = new THREE.DirectionalLight(0xffd8a8, 0.3);
    bounceLight.position.set(0, -1, 2);
    this.scene.add(bounceLight);

    // 5. Floor shadow receiver
    const shadowGeo = new THREE.PlaneGeometry(3.5, 3.5);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.02;
    shadowPlane.receiveShadow = true;
    this.scene.add(shadowPlane);

    // 6. Character Group
    this.characterGroup = new THREE.Group();
    this.characterGroup.rotation.y = this.currentRotationY;
    this.scene.add(this.characterGroup);

    // 7. Xây dựng mô hình tượng 3D
    this.buildPedestal();
    this.buildFigurineModel();

    // 8. Đăng ký sự kiện kéo xoay nhân vật (Drag to rotate)
    this.bindInteractionEvents();

    this.isInitialized = true;
    this.animate();
    return true;
  }

  /**
   * Tạo Bồ Đoàn / Bệ ngồi tròn bên dưới (Pedestal Cushion)
   */
  buildPedestal() {
    if (this.pedestalMesh) {
      this.characterGroup.remove(this.pedestalMesh);
      this.pedestalMesh = null;
    }

    const pedestalGroup = new THREE.Group();

    let cushionColor = 0x8a6242; // Màu nâu đất / xám gấm
    let roughness = 0.8;
    if (this.currentCushionType === 'cushion_gray') {
      cushionColor = 0x9c7a56;
      roughness = 0.75;
    } else if (this.currentCushionType === 'cushion_lotus') {
      cushionColor = 0xf472b6;
      roughness = 0.55;
    } else if (this.currentCushionType === 'cushion_gold') {
      cushionColor = 0xd97706;
      roughness = 0.4;
    }

    const mat = new THREE.MeshStandardMaterial({
      color: cushionColor,
      roughness: roughness,
      metalness: 0.1
    });

    // Thân bồ đoàn dáng phồng tự nhiên
    const geo = new THREE.CylinderGeometry(0.78, 0.88, 0.14, 32);
    const cushion = new THREE.Mesh(geo, mat);
    cushion.position.y = 0.07;
    cushion.castShadow = true;
    cushion.receiveShadow = true;
    pedestalGroup.add(cushion);

    // Viền bo tròn mềm mại quanh bồ đoàn
    const rimGeo = new THREE.TorusGeometry(0.82, 0.055, 14, 32);
    const rim = new THREE.Mesh(rimGeo, mat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.08;
    pedestalGroup.add(rim);

    // Nếp múi vải tròn quanh đệm bồ đoàn (Pleats)
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const pleatGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.74, 6);
      const pleatMat = new THREE.MeshStandardMaterial({
        color: 0x5a3c26,
        roughness: 0.9
      });
      const pleat = new THREE.Mesh(pleatGeo, pleatMat);
      pleat.rotation.z = Math.PI / 2;
      pleat.rotation.y = angle;
      pleat.position.y = 0.138;
      pedestalGroup.add(pleat);
    }

    this.pedestalMesh = pedestalGroup;
    this.characterGroup.add(this.pedestalMesh);
  }

  /**
   * Tạo mô hình tượng Hành Giả / Phật Tử phong cách Đất Nung Chibi Nhật/Việt
   */
  buildFigurineModel() {
    // Xóa mô hình cũ nếu có
    const toRemove = [];
    this.characterGroup.children.forEach(c => {
      if (c !== this.pedestalMesh) toRemove.push(c);
    });
    toRemove.forEach(c => this.characterGroup.remove(c));

    const figurine = new THREE.Group();
    this.figurine = figurine;

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xf5cfb3,
      roughness: 0.52,
      metalness: 0.02
    });

    const blushMat = new THREE.MeshBasicMaterial({
      color: 0xf472b6,
      transparent: true,
      opacity: 0.45
    });

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x24160e });

    const robeMat = new THREE.MeshStandardMaterial({
      color: this.currentRobeColor,
      roughness: 0.62,
      metalness: 0.04
    });
    this.robeMat = robeMat;

    // Dải y vắt vai (Monastic Stole) màu hổ phách nghệ thuật
    const stoleMat = new THREE.MeshStandardMaterial({
      color: 0xd9822b,
      roughness: 0.55,
      metalness: 0.1
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf3cf65,
      roughness: 0.3,
      metalness: 0.8
    });

    const jadeMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.35,
      metalness: 0.25
    });

    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x1f1610,
      roughness: 0.75,
      metalness: 0.05
    });

    const beadMat = new THREE.MeshStandardMaterial({
      color: this.currentBeadColor,
      roughness: 0.45,
      metalness: 0.12
    });

    const isMeditating = this.currentPose === 'meditate';

    // 1. TỌA TƯ (LEGS / LOWER BODY)
    if (isMeditating) {
      // Tư thế ngồi kiết già trang nghiêm
      const legsGeo = new THREE.CylinderGeometry(0.52, 0.66, 0.32, 24);
      this.legsMesh = new THREE.Mesh(legsGeo, robeMat);
      this.legsMesh.position.y = 0.22;
      this.legsMesh.castShadow = true;
      figurine.add(this.legsMesh);

      // Tà áo trước rủ nhẹ
      const drapeGeo = new THREE.CylinderGeometry(0.24, 0.35, 0.28, 16, 1, false, 0, Math.PI);
      const drape = new THREE.Mesh(drapeGeo, stoleMat);
      drape.position.set(0, 0.20, 0.44);
      drape.rotation.x = 0.18;
      figurine.add(drape);
    } else {
      // Tư thế đứng thanh thoát
      const legsGeo = new THREE.CylinderGeometry(0.38, 0.46, 0.58, 20);
      this.legsMesh = new THREE.Mesh(legsGeo, robeMat);
      this.legsMesh.position.y = 0.35;
      this.legsMesh.castShadow = true;
      figurine.add(this.legsMesh);
    }

    // 2. THÂN TRÊN (TORSO & ROBE)
    const torsoY = isMeditating ? 0.66 : 0.84;
    const torsoGeo = new THREE.CylinderGeometry(0.32, 0.48, 0.64, 22);
    this.robeMesh = new THREE.Mesh(torsoGeo, robeMat);
    this.robeMesh.position.y = torsoY;
    this.robeMesh.castShadow = true;
    figurine.add(this.robeMesh);

    // Cổ áo trắng thanh tịnh bên trong
    const innerCollarGeo = new THREE.ConeGeometry(0.25, 0.28, 12);
    const innerCollarMat = new THREE.MeshStandardMaterial({ color: 0xfffaed, roughness: 0.5 });
    const innerCollar = new THREE.Mesh(innerCollarGeo, innerCollarMat);
    innerCollar.position.set(0, torsoY + 0.25, 0.15);
    innerCollar.rotation.x = 0.22;
    figurine.add(innerCollar);

    // Dải Y Vắt Vai (Saffron Stole) chéo từ vai trái qua hông phải
    const stoleCurve = new THREE.TorusGeometry(0.40, 0.08, 14, 28, Math.PI * 0.95);
    const stoleMesh = new THREE.Mesh(stoleCurve, stoleMat);
    stoleMesh.rotation.z = -Math.PI / 4.2;
    stoleMesh.rotation.x = Math.PI / 7.5;
    stoleMesh.position.set(0, torsoY + 0.04, 0.08);
    figurine.add(stoleMesh);

    // Nẹp chỉ vàng kim dọc dải y
    const goldTrim = new THREE.Mesh(
      new THREE.TorusGeometry(0.41, 0.016, 8, 28, Math.PI * 0.95),
      goldMat
    );
    goldTrim.rotation.z = -Math.PI / 4.2;
    goldTrim.rotation.x = Math.PI / 7.5;
    goldTrim.position.set(0, torsoY + 0.04, 0.095);
    figurine.add(goldTrim);

    // Móc ngọc bích trên vai trái (Jade Buckle)
    const jadeBuckle = new THREE.Mesh(
      new THREE.TorusGeometry(0.055, 0.018, 10, 18),
      jadeMat
    );
    jadeBuckle.position.set(-0.25, torsoY + 0.26, 0.14);
    jadeBuckle.rotation.y = 0.45;
    figurine.add(jadeBuckle);

    // 3. CÁNH TAY & BÀN TAY (ARMS & HANDS)
    const handY = isMeditating ? torsoY - 0.08 : torsoY + 0.02;
    const handZ = isMeditating ? 0.32 : 0.36;

    // Cổ tay & Bàn tay chấp búp sen / đặt thiền
    for (let side of [-1, 1]) {
      // Ống tay áo buông mềm
      const armGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.42, 14);
      const arm = new THREE.Mesh(armGeo, robeMat);
      arm.position.set(side * 0.33, torsoY + 0.08, 0.12);
      arm.rotation.z = side * 0.42;
      arm.rotation.x = 0.58;
      arm.castShadow = true;
      figurine.add(arm);

      // Bàn tay búp sen Anjali
      const handGeo = new THREE.SphereGeometry(0.065, 12, 10);
      handGeo.scale(0.85, 1.25, 0.9);
      const hand = new THREE.Mesh(handGeo, skinMat);
      hand.position.set(side * 0.06, handY, handZ);
      hand.rotation.z = -side * 0.25;
      hand.rotation.x = -0.2;
      figurine.add(hand);
    }

    // 4. TRÀNG HẠT BỒ ĐỀ (108 PRAYER BEADS) QUÀNG QUA TAY
    const beadsGroup = new THREE.Group();
    const beadCount = 28; // Chuỗi hiển thị mỹ thuật
    const ringRadius = 0.22;
    for (let i = 0; i < beadCount; i++) {
      const angle = (i / beadCount) * Math.PI * 2;
      const beadGeo = new THREE.SphereGeometry(0.024, 10, 8);
      const bead = new THREE.Mesh(beadGeo, beadMat);
      bead.position.set(
        Math.cos(angle) * ringRadius,
        Math.sin(angle) * (ringRadius * 0.45),
        0
      );
      beadsGroup.add(bead);
    }
    // Hạt mẹ (Guru bead) & Tua rua
    const guruBead = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 10), goldMat);
    guruBead.position.set(0, -ringRadius * 0.45 - 0.02, 0);
    beadsGroup.add(guruBead);

    const tasselMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.6 });
    const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.08, 8), tasselMat);
    tassel.position.set(0, -ringRadius * 0.45 - 0.07, 0);
    tassel.rotation.x = Math.PI;
    beadsGroup.add(tassel);

    beadsGroup.position.set(0, handY + 0.02, handZ + 0.02);
    beadsGroup.rotation.x = 0.45;
    figurine.add(beadsGroup);
    this.beadsGroup = beadsGroup;

    // 5. CỔ & ĐẦU TƯỢNG (HEAD & SERENE CHIBI FACE)
    const headY = torsoY + 0.62;
    const headGeo = new THREE.SphereGeometry(0.44, 28, 24);
    headGeo.scale(1.0, 1.08, 0.98);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = headY;
    head.castShadow = true;
    figurine.add(head);
    this.headMesh = head;

    // Đôi tai tròn chibi
    for (let side of [-1, 1]) {
      const earGeo = new THREE.SphereGeometry(0.09, 12, 10);
      earGeo.scale(0.5, 1.1, 0.7);
      const ear = new THREE.Mesh(earGeo, skinMat);
      ear.position.set(side * 0.44, headY - 0.02, -0.04);
      ear.rotation.y = side * 0.15;
      figurine.add(ear);
    }

    // Mái tóc đen thanh tịnh / Búi tóc thiền
    const hairCapGeo = new THREE.SphereGeometry(0.452, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.58);
    hairCapGeo.scale(1.01, 1.07, 1.02);
    const hairCap = new THREE.Mesh(hairCapGeo, hairMat);
    hairCap.position.set(0, headY + 0.02, -0.02);
    figurine.add(hairCap);

    // Mái tóc sau buông nhẹ rủ xuống lưng
    const hairBackGeo = new THREE.CylinderGeometry(0.36, 0.42, 0.45, 18, 1, false, 0, Math.PI);
    const hairBack = new THREE.Mesh(hairBackGeo, hairMat);
    hairBack.position.set(0, headY - 0.20, -0.24);
    hairBack.rotation.y = Math.PI;
    figurine.add(hairBack);

    // 6. KHUÔN MẶT THIỀN AN NHIÊN (SERENE MEDITATIVE EYES, BLUSH, SMILE)
    // Đôi mắt khép nhẹ mỉm cười thiền tịnh (Slanted Zen Eyes)
    for (let side of [-1, 1]) {
      // Hàng mi cong nhẹ
      const eyeCurve = new THREE.CylinderGeometry(0.012, 0.012, 0.11, 8);
      const eye = new THREE.Mesh(eyeCurve, eyeMat);
      eye.position.set(side * 0.18, headY - 0.01, 0.42);
      eye.rotation.z = side * 0.22 + Math.PI / 2;
      eye.rotation.x = -0.15;
      figurine.add(eye);

      // Đốm má hồng đào đáng yêu
      const blushGeo = new THREE.CircleGeometry(0.075, 16);
      const blush = new THREE.Mesh(blushGeo, blushMat);
      blush.position.set(side * 0.24, headY - 0.09, 0.40);
      blush.rotation.y = side * 0.38;
      blush.rotation.x = -0.08;
      figurine.add(blush);
    }

    // Nụ cười mỉm từ bi
    const mouthGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.08, 8);
    const mouth = new THREE.Mesh(mouthGeo, eyeMat);
    mouth.position.set(0, headY - 0.12, 0.43);
    mouth.rotation.z = Math.PI / 2;
    figurine.add(mouth);

    // Điểm ngọc minh châu tam điểm trên trán (Urna / Bindi)
    const urna = new THREE.Mesh(
      new THREE.SphereGeometry(0.024, 10, 8),
      goldMat
    );
    urna.position.set(0, headY + 0.14, 0.44);
    figurine.add(urna);

    this.characterGroup.add(figurine);
  }

  /**
   * Đăng ký sự kiện xoay 360 độ mượt mà bằng chuột và cảm ứng trên điện thoại
   */
  bindInteractionEvents() {
    if (!this.canvas) return;

    const onPointerDown = (clientX) => {
      this.isDragging = true;
      this.prevPointerX = clientX;
      this.rotationVelocity = 0;
      if (this.canvas) this.canvas.style.cursor = 'grabbing';
    };

    const onPointerMove = (clientX) => {
      if (!this.isDragging) return;
      const deltaX = clientX - this.prevPointerX;
      this.prevPointerX = clientX;
      this.rotationVelocity = deltaX * 0.009;
      this.targetRotationY += this.rotationVelocity;
    };

    const onPointerUp = () => {
      if (this.isDragging) {
        this.isDragging = false;
        if (this.canvas) this.canvas.style.cursor = 'grab';
      }
    };

    // Mouse Events
    this.canvas.addEventListener('mousedown', (e) => onPointerDown(e.clientX));
    window.addEventListener('mousemove', (e) => onPointerMove(e.clientX));
    window.addEventListener('mouseup', onPointerUp);

    // Touch Events (Mobile)
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length > 0) {
        onPointerDown(e.touches[0].clientX);
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches.length > 0) {
        onPointerMove(e.touches[0].clientX);
      }
    }, { passive: true });

    window.addEventListener('touchend', onPointerUp);
  }

  /**
   * Thay đổi tư thế nhân vật: Ngồi thiền (meditate) hoặc Đứng (stand)
   */
  setPose(pose) {
    if (this.currentPose === pose) return;
    this.currentPose = pose;
    this.buildFigurineModel();
  }

  /**
   * Thay đổi màu y phục (Áo tràng lam, Áo nâu sòng, Y cà sa, Áo trắng)
   */
  setRobe(robeKey) {
    let color = 0x3a628a; // Áo tràng lam
    if (robeKey === 'robe_brown') color = 0x6e4125; // Áo nâu sòng
    else if (robeKey === 'robe_saffron') color = 0xd97706; // Y cà sa vàng
    else if (robeKey === 'robe_white') color = 0xe2e8f0; // Áo trắng thanh tịnh
    this.currentRobeColor = color;
    this.buildFigurineModel();
  }

  /**
   * Thay đổi loại tràng hạt (Hạt gỗ, Hạt bồ đề, Hạt lưu ly, Trầm hương)
   */
  setBeads(beadKey) {
    let color = 0x6e3b19;
    if (beadKey === 'beads_bodhi') color = 0xa16207;
    else if (beadKey === 'beads_crystal') color = 0x38bdf8;
    else if (beadKey === 'beads_agarwood') color = 0x451a03;
    this.currentBeadColor = color;
    this.buildFigurineModel();
  }

  /**
   * Thay đổi bồ đoàn tọa thiền (Bồ đoàn xám, Đài sen ngọc, Tòa sen vàng)
   */
  setCushion(cushionKey) {
    this.currentCushionType = cushionKey;
    this.buildPedestal();
  }

  /**
   * Chụp ảnh lưu niệm tượng 3D tải về máy
   */
  capturePhoto() {
    if (!this.renderer || !this.scene || !this.camera) return null;
    this.renderer.render(this.scene, this.camera);
    try {
      const dataUrl = this.renderer.domElement.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `TuTap_Chibi_HanhGia_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      return true;
    } catch (e) {
      console.error('Lỗi khi chụp ảnh 3D:', e);
      return false;
    }
  }

  /**
   * Điều chỉnh kích thước canvas khi thay đổi cửa sổ hoặc mở modal
   */
  resize() {
    if (!this.canvas || !this.renderer || !this.camera) return;
    const width = this.canvas.clientWidth || 360;
    const height = this.canvas.clientHeight || 320;
    if (width > 0 && height > 0) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height, false);
    }
  }

  /**
   * Vòng lặp Render & Animation thở chánh niệm
   */
  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // Damping quán tính xoay mượt mà
    if (!this.isDragging) {
      this.rotationVelocity *= 0.92;
      this.targetRotationY += this.rotationVelocity;
    }

    // Nội suy xoay êm ái (Lerp rotation)
    this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.12;
    if (this.characterGroup) {
      this.characterGroup.rotation.y = this.currentRotationY;
    }

    // Hiệu ứng thở chánh niệm (Mindful Breathing Idle Animation)
    if (this.figurine && this.headMesh) {
      const breath = Math.sin(elapsedTime * 1.8) * 0.012;
      this.figurine.position.y = breath;
      this.headMesh.position.y = (this.currentPose === 'meditate' ? 1.28 : 1.46) + breath * 0.6;
      this.headMesh.rotation.x = Math.sin(elapsedTime * 1.8) * 0.018;
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

// Global Singleton Instance
window.ProfileFigurineViewer3D = new ProfileFigurineViewer3D();
