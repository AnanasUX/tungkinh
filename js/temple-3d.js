/**
 * Chùa An Nhiên — 3D Sanctuary Engine (Three.js WebGL)
 * Hệ Thống Chánh Điện 3D Trực Quan & Trải Nghiệm Tu Tập Đỉnh Cao
 *
 * Tính Năng 3D:
 * 1. Kiến trúc Chánh Điện 3D: Cột gỗ son thiếp vàng, vì kèo chạm trổ, thảm đỏ hoa sen.
 * 2. Tượng Bổn Sư Thích Ca dát vàng toạ trên toà sen 3D với vòng hào quang xoay phát sáng.
 * 3. 12 Bồ Đoàn 3D với Chibi hành giả toạ thiền, hiệu ứng thở chánh niệm & bái lễ.
 * 4. Đại Hồng Chung 3D bằng đồng với chày kình đánh chuông tương tác vật lý.
 * 5. Mõ Gỗ 3D với dùi gõ nảy nhịp, phát sáng phước đức & đếm kinh.
 * 6. Lư hương 3D nghi ngút khói trầm hương & cặp chân nến hoa sen lửa bập bùng.
 * 7. Hệ thống Camera Cinematic 5 góc nhìn trực quan (Toàn cảnh, Bồ đoàn POV, Bàn thờ, Chuông, Mõ).
 * 8. Hiệu ứng môi trường: Bình minh, Đêm hoa đăng (đèn trời 3D bay lên), Mưa thiền, Mưa sen vàng.
 */

class Temple3DEngine {
  constructor() {
    this.container = null;
    this.canvas = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.isInitialized = false;
    this.active = false;
    this.animationFrameId = null;

    // Object collections for interaction
    this.interactiveObjects = [];
    this.cushions3D = [];
    this.devotees3D = [];
    this.lanterns3D = [];
    this.lotusRain3D = [];
    this.smokeParticles3D = [];
    this.candles3D = [];
    this.haloDisc = null;
    this.bellMesh = null;
    this.bellStriker = null;
    this.woodenFishMesh = null;
    this.woodenFishMallet = null;

    // Raycaster for 3D clicks & hovers
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hoveredObject = null;

    // Camera view presets
    this.cameraViews = {
      overview: { pos: new THREE.Vector3(0, 5.8, 14.2), target: new THREE.Vector3(0, 3.2, -3.5) },
      userSeat: { pos: new THREE.Vector3(0, 1.9, 4.2),   target: new THREE.Vector3(0, 3.8, -4.5) },
      altar:    { pos: new THREE.Vector3(0, 3.6, -0.8),  target: new THREE.Vector3(0, 4.2, -4.8) },
      bell:     { pos: new THREE.Vector3(-6.2, 3.2, 1.5),target: new THREE.Vector3(-6.0, 3.5, -2.0) },
      mo:       { pos: new THREE.Vector3(5.8, 2.8, 1.2), target: new THREE.Vector3(5.5, 2.2, -2.2) }
    };
    this.currentViewKey = 'overview';
    this.clock = new THREE.Clock();

    // Lighting refs for ambience switching
    this.ambientLight = null;
    this.sunLight = null;
    this.altarLight = null;
    this.haloLight = null;
  }

  init(containerElement) {
    if (this.isInitialized) return;
    this.container = containerElement;

    // 1. Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x180c05);
    this.scene.fog = new THREE.FogExp2(0x241208, 0.024);

    // 2. Camera setup
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(46, aspect, 0.1, 100);
    this.setCameraView('overview', false);

    // 3. Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.container.querySelector('canvas') || undefined,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    if (!this.container.querySelector('canvas')) {
      this.renderer.domElement.id = 'webgl-3d-canvas';
      this.renderer.domElement.className = 'absolute inset-0 w-full h-full z-0';
      this.container.prepend(this.renderer.domElement);
    }
    this.canvas = this.renderer.domElement;

    // 4. OrbitControls
    if (typeof THREE.OrbitControls !== 'undefined') {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.06;
      this.controls.maxPolarAngle = Math.PI / 2 + 0.02;
      this.controls.minDistance = 2.5;
      this.controls.maxDistance = 22;
      this.controls.target.copy(this.cameraViews.overview.target);
    }

    // 5. Build 3D World
    this.setupLighting();
    this.buildSanctuaryHall();
    this.buildBuddhaAndAltar();
    this.buildLotusCushionsAndDevotees();
    this.buildGreatBell3D();
    this.buildWoodenFish3D();
    this.buildIncenseBurner3D();
    this.initAtmosphereParticles();

    // 6. Interaction listeners
    this.setupEventListeners();

    this.isInitialized = true;
  }

  setupLighting() {
    // Ambient soft temple glow
    this.ambientLight = new THREE.AmbientLight(0xffeacc, 0.65);
    this.scene.add(this.ambientLight);

    // Main divine sunbeam / warm spotlight from upper front
    this.sunLight = new THREE.DirectionalLight(0xffdf99, 1.4);
    this.sunLight.position.set(5, 12, 10);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    // Warm golden glow at Buddha Altar
    this.altarLight = new THREE.PointLight(0xffa834, 2.2, 15, 1.2);
    this.altarLight.position.set(0, 4.2, -4.5);
    this.scene.add(this.altarLight);

    // Divine halo point light
    this.haloLight = new THREE.PointLight(0xfff0aa, 2.8, 12, 1.8);
    this.haloLight.position.set(0, 5.2, -5.4);
    this.scene.add(this.haloLight);
  }

  buildSanctuaryHall() {
    const hallGroup = new THREE.Group();

    // Materials
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x3d200f,
      roughness: 0.38,
      metalness: 0.12
    });

    const carpetMat = new THREE.MeshStandardMaterial({
      color: 0x8a1515,
      roughness: 0.75,
      metalness: 0.05
    });

    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xdeb347,
      metalness: 0.85,
      roughness: 0.25
    });

    const columnMat = new THREE.MeshStandardMaterial({
      color: 0x54180a,
      roughness: 0.45,
      metalness: 0.15
    });

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x241006,
      roughness: 0.85
    });

    // 1. Temple Floor (24 x 36)
    const floorGeo = new THREE.PlaneGeometry(24, 32);
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    hallGroup.add(floorMesh);

    // 2. Ceremonial Red Carpet (Central walkway)
    const carpetGeo = new THREE.PlaneGeometry(4.2, 28);
    const carpetMesh = new THREE.Mesh(carpetGeo, carpetMat);
    carpetMesh.rotation.x = -Math.PI / 2;
    carpetMesh.position.set(0, 0.015, 2.0);
    carpetMesh.receiveShadow = true;
    hallGroup.add(carpetMesh);

    // Carpet gold borders
    for (let side of [-2.1, 2.1]) {
      const borderGeo = new THREE.BoxGeometry(0.12, 0.02, 28);
      const borderMesh = new THREE.Mesh(borderGeo, goldTrimMat);
      borderMesh.position.set(side, 0.02, 2.0);
      hallGroup.add(borderMesh);
    }

    // 3. Six Red Columns (Cột son thiếp vàng)
    const columnPositions = [
      [-6.5, -3.5], [-6.5, 3.5], [-6.5, 10.5],
      [ 6.5, -3.5], [ 6.5, 3.5], [ 6.5, 10.5]
    ];

    const colGeo = new THREE.CylinderGeometry(0.48, 0.52, 9, 24);
    const colBaseGeo = new THREE.CylinderGeometry(0.72, 0.78, 0.5, 24);
    const colRingGeo = new THREE.TorusGeometry(0.53, 0.06, 12, 24);

    columnPositions.forEach(([x, z]) => {
      const col = new THREE.Mesh(colGeo, columnMat);
      col.position.set(x, 4.5, z);
      col.castShadow = true;
      col.receiveShadow = true;
      hallGroup.add(col);

      const base = new THREE.Mesh(colBaseGeo, goldTrimMat);
      base.position.set(x, 0.25, z);
      base.receiveShadow = true;
      hallGroup.add(base);

      const ring1 = new THREE.Mesh(colRingGeo, goldTrimMat);
      ring1.rotation.x = Math.PI / 2;
      ring1.position.set(x, 2.2, z);
      hallGroup.add(ring1);

      const ring2 = new THREE.Mesh(colRingGeo, goldTrimMat);
      ring2.rotation.x = Math.PI / 2;
      ring2.position.set(x, 6.8, z);
      hallGroup.add(ring2);
    });

    // 4. Sanctuary Walls (Back wall & side walls)
    const backWallGeo = new THREE.PlaneGeometry(24, 11);
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(0, 5.5, -8.0);
    backWall.receiveShadow = true;
    hallGroup.add(backWall);

    // Decorative Golden Dragon/Lotus Lattice on Back Wall
    const latticeGeo = new THREE.RingGeometry(2.8, 3.2, 32);
    const latticeMesh = new THREE.Mesh(latticeGeo, goldTrimMat);
    latticeMesh.position.set(0, 5.5, -7.95);
    hallGroup.add(latticeMesh);

    // 5. Roof Rafters & Beams (Kèo cột gỗ cổ truyền)
    for (let z = -6; z <= 12; z += 5) {
      const beamGeo = new THREE.BoxGeometry(22, 0.45, 0.45);
      const beam = new THREE.Mesh(beamGeo, columnMat);
      beam.position.set(0, 8.8, z);
      beam.castShadow = true;
      hallGroup.add(beam);
    }

    // 6. Traditional Hanging Red & Gold Temple Silk Lanterns (Đèn Lồng Lục Giác)
    this.hangingLanterns = [];
    const lanternPositions = [
      [-3.8, 8.6, -1], [3.8, 8.6, -1],
      [-3.8, 8.6,  4], [3.8, 8.6,  4],
      [-3.8, 8.6,  9], [3.8, 8.6,  9]
    ];
    const lanternSilkMat = new THREE.MeshStandardMaterial({
      color: 0xd93829,
      emissive: 0x991b1b,
      emissiveIntensity: 0.5,
      roughness: 0.4
    });
    lanternPositions.forEach(([lx, ly, lz], idx) => {
      const lGroup = new THREE.Group();
      lGroup.position.set(lx, ly, lz);

      // Cord
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2, 8), goldTrimMat);
      cord.position.y = -0.6;
      lGroup.add(cord);

      // Lantern body
      const lBody = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.65, 6), lanternSilkMat);
      lBody.position.y = -1.45;
      lGroup.add(lBody);

      // Gold Caps
      const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.32, 0.08, 6), goldTrimMat);
      topCap.position.y = -1.1;
      lGroup.add(topCap);

      const botCap = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.35, 0.08, 6), goldTrimMat);
      botCap.position.y = -1.8;
      lGroup.add(botCap);

      // Tassel
      const lTassel = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.32, 8), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
      lTassel.position.y = -2.0;
      lTassel.rotation.x = Math.PI;
      lGroup.add(lTassel);

      // Light
      const pLight = new THREE.PointLight(0xff7733, 0.65, 5);
      pLight.position.y = -1.45;
      lGroup.add(pLight);

      hallGroup.add(lGroup);
      this.hangingLanterns.push({ group: lGroup, phase: idx * 0.9 });
    });

    this.scene.add(hallGroup);
  }

  buildBuddhaAndAltar() {
    const altarGroup = new THREE.Group();
    altarGroup.position.set(0, 0, -5.2);

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfcc744,
      metalness: 0.88,
      roughness: 0.22,
      emissive: 0x4a3205,
      emissiveIntensity: 0.25
    });

    const woodAltarMat = new THREE.MeshStandardMaterial({
      color: 0x421808,
      roughness: 0.5,
      metalness: 0.2
    });

    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xf5cf67,
      metalness: 0.85,
      roughness: 0.28
    });

    // 1. Altar Table (Bàn Thờ Tam Bảo 3 tầng)
    const altarBaseGeo = new THREE.BoxGeometry(7.2, 0.9, 2.6);
    const altarBase = new THREE.Mesh(altarBaseGeo, woodAltarMat);
    altarBase.position.set(0, 0.45, 0);
    altarBase.castShadow = true;
    altarBase.receiveShadow = true;
    altarGroup.add(altarBase);

    const altarMidGeo = new THREE.BoxGeometry(5.6, 0.65, 2.0);
    const altarMid = new THREE.Mesh(altarMidGeo, woodAltarMat);
    altarMid.position.set(0, 1.2, -0.2);
    altarMid.castShadow = true;
    altarGroup.add(altarMid);

    const altarTrimGeo = new THREE.BoxGeometry(7.3, 0.1, 2.7);
    const altarTrim = new THREE.Mesh(altarTrimGeo, goldTrimMat);
    altarTrim.position.set(0, 0.9, 0);
    altarGroup.add(altarTrim);

    // 2. Lotus Throne (Tòa Sen Dát Vàng)
    const throneBaseGeo = new THREE.CylinderGeometry(1.5, 1.8, 0.5, 32);
    const throneBase = new THREE.Mesh(throneBaseGeo, goldMat);
    throneBase.position.set(0, 1.75, -0.4);
    throneBase.castShadow = true;
    altarGroup.add(throneBase);

    // Lotus Petals (Tầng cánh sen)
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const petalGeo = new THREE.ConeGeometry(0.28, 0.6, 5);
      const petal = new THREE.Mesh(petalGeo, goldMat);
      petal.rotation.x = Math.PI / 3;
      petal.rotation.y = angle;
      petal.position.set(
        Math.cos(angle) * 1.5,
        1.95,
        -0.4 + Math.sin(angle) * 1.5
      );
      petal.castShadow = true;
      altarGroup.add(petal);
    }

    // 3. Seated Great Buddha Statue (Tượng Thích Ca Mâu Ni)
    const buddhaGroup = new THREE.Group();
    buddhaGroup.position.set(0, 2.05, -0.4);

    // Crossed Legs (Full Lotus Position)
    const legsGeo = new THREE.TorusGeometry(0.9, 0.32, 16, 32, Math.PI);
    const legs = new THREE.Mesh(legsGeo, goldMat);
    legs.rotation.x = Math.PI / 2;
    legs.position.set(0, 0.28, 0.1);
    legs.castShadow = true;
    buddhaGroup.add(legs);

    // Torso with Robe (Thân Tượng)
    const torsoGeo = new THREE.CylinderGeometry(0.65, 0.85, 1.55, 24);
    const torso = new THREE.Mesh(torsoGeo, goldMat);
    torso.position.set(0, 1.15, 0);
    torso.castShadow = true;
    buddhaGroup.add(torso);

    // Shoulders & Arms
    const shoulderGeo = new THREE.SphereGeometry(0.85, 24, 16);
    shoulderGeo.scale(1.2, 0.65, 0.8);
    const shoulders = new THREE.Mesh(shoulderGeo, goldMat);
    shoulders.position.set(0, 1.6, 0);
    shoulders.castShadow = true;
    buddhaGroup.add(shoulders);

    // Hands resting in Dhyana Mudra (Ấn Thiền Định)
    const handsGeo = new THREE.BoxGeometry(0.42, 0.18, 0.35);
    const hands = new THREE.Mesh(handsGeo, goldMat);
    hands.position.set(0, 0.52, 0.42);
    buddhaGroup.add(hands);

    // Head (Kim Thân Tướng Hảo)
    const headGeo = new THREE.SphereGeometry(0.48, 28, 24);
    const head = new THREE.Mesh(headGeo, goldMat);
    head.position.set(0, 2.25, 0.05);
    head.castShadow = true;
    buddhaGroup.add(head);

    // Ushnisha (Nhục kế trên đỉnh đầu)
    const ushnishaGeo = new THREE.SphereGeometry(0.22, 16, 16);
    const ushnisha = new THREE.Mesh(ushnishaGeo, goldMat);
    ushnisha.position.set(0, 2.68, 0.05);
    buddhaGroup.add(ushnisha);

    altarGroup.add(buddhaGroup);

    // 4. Rotating Mandala Halo (Vòng Hào Quang Quang Minh)
    const haloGeo = new THREE.RingGeometry(0.8, 2.3, 48);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffe680,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.82
    });
    this.haloDisc = new THREE.Mesh(haloGeo, haloMat);
    this.haloDisc.position.set(0, 4.4, -1.05);
    altarGroup.add(this.haloDisc);

    // 5. Candles with dynamic flickering flames
    const candleMat = new THREE.MeshStandardMaterial({ color: 0x9e1a1a, roughness: 0.4 });
    const candlePositions = [[-2.4, 0.8], [2.4, 0.8], [-1.4, 1.4], [1.4, 1.4]];

    candlePositions.forEach(([cx, cz]) => {
      const candleBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.65, 16), candleMat);
      candleBase.position.set(cx, 1.25, cz);
      candleBase.castShadow = true;
      altarGroup.add(candleBase);

      // Flame
      const flameGeo = new THREE.SphereGeometry(0.06, 12, 12);
      flameGeo.scale(0.8, 2.0, 0.8);
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(cx, 1.65, cz);
      altarGroup.add(flame);

      // Point Light for flame
      const candleLight = new THREE.PointLight(0xffaa22, 0.75, 4.5, 2);
      candleLight.position.set(cx, 1.75, cz);
      altarGroup.add(candleLight);

      this.candles3D.push({ mesh: flame, light: candleLight, baseY: 1.65 });
    });

    // 6. Offering Vases with Pink Lotuses (Bình Hoa Sen Dâng Phật)
    const vaseMat = new THREE.MeshStandardMaterial({ color: 0xb8860b, metalness: 0.85, roughness: 0.25 });
    const lotusFlowerMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.4 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.6 });

    for (let vSide of [-3.2, 3.2]) {
      const vaseGroup = new THREE.Group();
      vaseGroup.position.set(vSide, 0.9, 0.2);

      const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.85, 16), vaseMat);
      vase.position.y = 0.42;
      vase.castShadow = true;
      vaseGroup.add(vase);

      // Lotus Flower
      const blossom = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), lotusFlowerMat);
      blossom.position.set(0, 0.98, 0);
      blossom.scale.set(1, 1.4, 1);
      vaseGroup.add(blossom);

      // Leaf
      const leaf = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.02, 12), leafMat);
      leaf.position.set(0.12, 0.82, 0.05);
      leaf.rotation.z = 0.3;
      vaseGroup.add(leaf);

      altarGroup.add(vaseGroup);
    }

    // Make Buddha interactive (click to view altar)
    buddhaGroup.userData = { type: 'buddha', name: 'Đức Bổn Sư Thích Ca Mâu Ni' };
    this.interactiveObjects.push(buddhaGroup);

    this.scene.add(altarGroup);
  }

  buildLotusCushionsAndDevotees() {
    const seatsData = window.sanctuarySeats || [
      { seatNo: 1,  x: -3.8, z: 1.5, occupied: true,  name: 'Bình An',   dharma: 'Tịnh An',  age: 24, hometown: 'Huế',       type: 'female' },
      { seatNo: 2,  x: -2.3, z: 1.5, occupied: false, name: '',          dharma: '',         age: 0,  hometown: '',          type: 'monk' },
      { seatNo: 3,  x: -0.8, z: 1.5, occupied: true,  name: 'Hoa Sen',   dharma: 'Liên Tâm', age: 19, hometown: 'Hà Nội',    type: 'monk' },
      { seatNo: 4,  x:  0.8, z: 1.5, occupied: false, name: '',          dharma: '',         age: 0,  hometown: '',          type: 'monk' },
      { seatNo: 5,  x:  2.3, z: 1.5, occupied: true,  name: 'Gia Hân',   dharma: 'Tuệ Hân',  age: 22, hometown: 'Đà Nẵng',   type: 'monk' },
      { seatNo: 6,  x:  3.8, z: 1.5, occupied: false, name: '',          dharma: '',         age: 0,  hometown: '',          type: 'female' },
      { seatNo: 7,  x: -4.2, z: 5.5, occupied: true,  name: 'Ngọc Mai',  dharma: 'Diệu Mai', age: 27, hometown: 'TP.HCM',    type: 'female' },
      { seatNo: 8,  x: -2.5, z: 5.5, occupied: true,  name: 'Thiện Tâm', dharma: 'Chánh Tâm',age: 16, hometown: 'Nam Định',  type: 'monk' },
      { seatNo: 9,  x: -0.9, z: 5.5, occupied: true,  name: 'Hải Yến',   dharma: 'Tịnh Yến', age: 29, hometown: 'Hải Phòng', type: 'female' },
      { seatNo: 10, x:  0.9, z: 5.5, occupied: false, name: '',          dharma: '',         age: 0,  hometown: '',          type: 'monk' },
      { seatNo: 11, x:  2.5, z: 5.5, occupied: true,  name: 'Bảo Trân',  dharma: 'Ngọc Trân',age: 23, hometown: 'Cần Thơ',   type: 'female' },
      { seatNo: 12, x:  4.2, z: 5.5, occupied: false, name: '',          dharma: '',         age: 0,  hometown: '',          type: 'female' }
    ];

    seatsData.forEach(seat => {
      const cushionGroup = new THREE.Group();
      cushionGroup.position.set(seat.x, 0, seat.z);

      // Lotus Cushion Mesh (Đệm Bồ Đoàn Hoa Sen Vải Gấm)
      const cushionGeo = new THREE.CylinderGeometry(0.55, 0.64, 0.16, 24);
      const cushionMat = new THREE.MeshStandardMaterial({
        color: seat.occupied ? 0xb8782a : 0x7a4914,
        roughness: 0.65,
        metalness: 0.15
      });
      const cushionMesh = new THREE.Mesh(cushionGeo, cushionMat);
      cushionMesh.position.y = 0.08;
      cushionMesh.receiveShadow = true;
      cushionMesh.castShadow = true;
      cushionGroup.add(cushionMesh);

      // Golden Rim Ring with Swastika / Floral Embroidery Tone
      const rimGeo = new THREE.TorusGeometry(0.58, 0.035, 12, 24);
      const rimMat = new THREE.MeshStandardMaterial({ color: 0xf5cf67, metalness: 0.85, roughness: 0.25 });
      const rimMesh = new THREE.Mesh(rimGeo, rimMat);
      rimMesh.rotation.x = Math.PI / 2;
      rimMesh.position.y = 0.15;
      cushionGroup.add(rimMesh);

      // 8 Sculpted Blooming Lotus Petals around the cushion base
      for (let p = 0; p < 8; p++) {
        const pAngle = (p / 8) * Math.PI * 2;
        const petalGeo = new THREE.ConeGeometry(0.18, 0.28, 4);
        const petalMat = new THREE.MeshStandardMaterial({
          color: seat.occupied ? 0xf59e0b : 0xc2782b,
          roughness: 0.5,
          metalness: 0.2
        });
        const petal = new THREE.Mesh(petalGeo, petalMat);
        petal.rotation.x = Math.PI / 3;
        petal.rotation.y = pAngle;
        petal.position.set(
          Math.cos(pAngle) * 0.58,
          0.06,
          Math.sin(pAngle) * 0.58
        );
        cushionGroup.add(petal);
      }

      // If occupied, render a high-detail 3D Chibi Devotee
      let devoteeMesh = null;
      if (seat.occupied) {
        devoteeMesh = this.createChibiDevotee3D(seat.type, seat.name);
        devoteeMesh.position.set(0, 0.16, 0);
        cushionGroup.add(devoteeMesh);
        this.devotees3D.push({ group: devoteeMesh, seatNo: seat.seatNo });
      }

      // Metadata for raycasting
      cushionGroup.userData = {
        type: 'seat',
        seatNo: seat.seatNo,
        occupied: seat.occupied,
        data: seat,
        mesh: cushionMesh,
        rim: rimMesh,
        devotee: devoteeMesh
      };

      this.cushions3D.push(cushionGroup);
      this.interactiveObjects.push(cushionMesh);
      this.scene.add(cushionGroup);
    });
  }

  createChibiDevotee3D(type = 'monk', name = '') {
    const group = new THREE.Group();

    // Palette & Materials
    const isFemale = type === 'female';
    const mainRobeColor = isFemale ? 0x2b4c6f : 0xa6581b; // Indigo Blue / Buddhist Saffron Amber
    const stoleColor = isFemale ? 0xd9822b : 0x7c380b;    // Saffron Monastic Sash
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdfc4, roughness: 0.42 });
    const blushMat = new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.55 });
    const robeMat = new THREE.MeshStandardMaterial({ color: mainRobeColor, roughness: 0.65, metalness: 0.05 });
    const stoleMat = new THREE.MeshStandardMaterial({ color: stoleColor, roughness: 0.55, metalness: 0.1 });
    const collarMat = new THREE.MeshStandardMaterial({ color: 0xfffaed, roughness: 0.5 });
    const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xf5cf67, metalness: 0.85, roughness: 0.25 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x181008, roughness: 0.7 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x2b1810 });
    const beadMat = new THREE.MeshStandardMaterial({ color: 0x5a2e12, roughness: 0.4 });

    // 1. Crossed Legs wrapped in robe
    const legsGeo = new THREE.CylinderGeometry(0.44, 0.48, 0.24, 20);
    const legs = new THREE.Mesh(legsGeo, robeMat);
    legs.position.y = 0.12;
    legs.castShadow = true;
    group.add(legs);

    // Front robe drape fold
    const drapeGeo = new THREE.CylinderGeometry(0.18, 0.26, 0.22, 12, 1, false, 0, Math.PI);
    const drape = new THREE.Mesh(drapeGeo, stoleMat);
    drape.position.set(0, 0.11, 0.32);
    drape.rotation.x = 0.18;
    group.add(drape);

    // 2. Torso with inner collar & diagonal monastic stole (Dải Y Vắt Vai)
    const bodyGeo = new THREE.CylinderGeometry(0.26, 0.4, 0.55, 18);
    const body = new THREE.Mesh(bodyGeo, robeMat);
    body.position.y = 0.44;
    body.castShadow = true;
    group.add(body);

    // Inner White V-Collar
    const collarGeo = new THREE.ConeGeometry(0.22, 0.25, 8);
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.position.set(0, 0.62, 0.14);
    collar.rotation.x = 0.2;
    group.add(collar);

    // Monastic Stole draped across left shoulder to right hip
    const stoleGeo = new THREE.TorusGeometry(0.34, 0.065, 12, 24, Math.PI * 0.95);
    const stole = new THREE.Mesh(stoleGeo, stoleMat);
    stole.rotation.z = -Math.PI / 4;
    stole.rotation.x = Math.PI / 8;
    stole.position.set(0, 0.48, 0.05);
    group.add(stole);

    // Gold hem edge along stole
    const stoleEdgeGeo = new THREE.TorusGeometry(0.35, 0.015, 8, 24, Math.PI * 0.95);
    const stoleEdge = new THREE.Mesh(stoleEdgeGeo, goldTrimMat);
    stoleEdge.rotation.z = -Math.PI / 4;
    stoleEdge.rotation.x = Math.PI / 8;
    stoleEdge.position.set(0, 0.48, 0.06);
    group.add(stoleEdge);

    // 3. Robe Sleeves (Draped naturally over knees)
    for (let side of [-1, 1]) {
      const sleeveGeo = new THREE.CylinderGeometry(0.1, 0.14, 0.36, 12);
      const sleeve = new THREE.Mesh(sleeveGeo, robeMat);
      sleeve.position.set(side * 0.26, 0.38, 0.1);
      sleeve.rotation.z = -side * 0.45;
      sleeve.rotation.x = 0.3;
      group.add(sleeve);
    }

    // 4. Folded Hands in Anjali Mudra (Chắp Tay Búp Sen)
    const handsGeo = new THREE.SphereGeometry(0.075, 14, 14);
    handsGeo.scale(0.7, 1.4, 0.7);
    const hands = new THREE.Mesh(handsGeo, skinMat);
    hands.position.set(0, 0.46, 0.26);
    hands.rotation.x = 0.2;
    group.add(hands);

    // 5. 3D Mala Prayer Beads (Tràng Hạt Bồ Đề) draped over hands
    const malaGeo = new THREE.TorusGeometry(0.1, 0.022, 10, 20);
    const mala = new THREE.Mesh(malaGeo, beadMat);
    mala.position.set(0, 0.42, 0.28);
    mala.rotation.x = Math.PI / 3;
    group.add(mala);

    // Mala Tassel (Tua rua đỏ)
    const tasselGeo = new THREE.ConeGeometry(0.02, 0.08, 8);
    const tassel = new THREE.Mesh(tasselGeo, new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
    tassel.position.set(0, 0.33, 0.33);
    tassel.rotation.x = Math.PI;
    group.add(tassel);

    // 6. Cute Head & Face with Serene Smile & Peaceful Eyes
    const headGeo = new THREE.SphereGeometry(0.26, 24, 24);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 0.85;
    head.castShadow = true;
    group.add(head);

    // Two Closed Smiling Eyes (Mắt thiền khép nhẹ cười bình an)
    for (let side of [-1, 1]) {
      const eyeGeo = new THREE.TorusGeometry(0.038, 0.007, 8, 14, Math.PI);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.rotation.z = Math.PI; // upside down arch = gentle smile
      eye.position.set(side * 0.09, 0.86, 0.23);
      group.add(eye);

      // Rosy Cheeks (Má hồng thanh tịnh)
      const blushGeo = new THREE.SphereGeometry(0.04, 12, 12);
      blushGeo.scale(1, 0.6, 0.4);
      const blush = new THREE.Mesh(blushGeo, blushMat);
      blush.position.set(side * 0.14, 0.81, 0.21);
      group.add(blush);
    }

    // Peaceful Lip Curve (Miệng mỉm cười an nhiên)
    const lipGeo = new THREE.TorusGeometry(0.022, 0.006, 8, 12, Math.PI * 0.8);
    const lip = new THREE.Mesh(lipGeo, new THREE.MeshBasicMaterial({ color: 0xb55151 }));
    lip.rotation.z = Math.PI * 0.9;
    lip.position.set(0, 0.77, 0.24);
    group.add(lip);

    if (isFemale) {
      // Lustrous Black Hair with side bangs & top bun
      const hairCapGeo = new THREE.SphereGeometry(0.268, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.58);
      const hairCap = new THREE.Mesh(hairCapGeo, hairMat);
      hairCap.position.y = 0.86;
      group.add(hairCap);

      // Lotus Hair Bun
      const bunGeo = new THREE.SphereGeometry(0.125, 16, 16);
      const bun = new THREE.Mesh(bunGeo, hairMat);
      bun.position.set(0, 1.08, -0.06);
      group.add(bun);

      // Golden Hairpin (Trâm cài tóc hoa sen)
      const pinGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.24, 8);
      const pin = new THREE.Mesh(pinGeo, goldTrimMat);
      pin.rotation.z = Math.PI / 3;
      pin.position.set(0.06, 1.09, -0.05);
      group.add(pin);

      const pinJewel = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      pinJewel.position.set(0.16, 1.15, -0.05);
      group.add(pinJewel);
    } else {
      // Monk: Subtle clean hairline & 3 glowing ordination dots (Hương Đảnh)
      for (let i = -1; i <= 1; i++) {
        const dotGeo = new THREE.SphereGeometry(0.012, 8, 8);
        const dot = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color: 0xfff3be }));
        dot.position.set(i * 0.045, 0.98, 0.215);
        group.add(dot);
      }
    }

    // 7. Devotee Meditation Aura (Hào quang thiền định nhẹ nhàng sau lưng)
    const auraGeo = new THREE.RingGeometry(0.28, 0.44, 32);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0xfff0aa,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    const aura = new THREE.Mesh(auraGeo, auraMat);
    aura.position.set(0, 0.85, -0.12);
    group.add(aura);

    return group;
  }

  buildGreatBell3D() {
    const bellGroup = new THREE.Group();
    bellGroup.position.set(-6.2, 0, -1.8);

    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0x8a5822,
      metalness: 0.82,
      roughness: 0.28
    });
    const woodFrameMat = new THREE.MeshStandardMaterial({ color: 0x471b08, roughness: 0.6 });

    // Wooden Bell Tower Arch
    const postGeo = new THREE.CylinderGeometry(0.18, 0.2, 5.2, 16);
    const leftPost = new THREE.Mesh(postGeo, woodFrameMat);
    leftPost.position.set(-0.9, 2.6, 0);
    leftPost.castShadow = true;
    bellGroup.add(leftPost);

    const rightPost = new THREE.Mesh(postGeo, woodFrameMat);
    rightPost.position.set(0.9, 2.6, 0);
    rightPost.castShadow = true;
    bellGroup.add(rightPost);

    const beamGeo = new THREE.BoxGeometry(2.4, 0.35, 0.35);
    const topBeam = new THREE.Mesh(beamGeo, woodFrameMat);
    topBeam.position.set(0, 5.1, 0);
    topBeam.castShadow = true;
    bellGroup.add(topBeam);

    // The Great Bronze Bell (Đại Hồng Chung)
    const bellMeshGroup = new THREE.Group();
    bellMeshGroup.position.set(0, 3.7, 0);

    const bellBodyGeo = new THREE.CylinderGeometry(0.48, 0.92, 1.6, 24, 1, true);
    const bellBody = new THREE.Mesh(bellBodyGeo, bronzeMat);
    bellBody.castShadow = true;
    bellMeshGroup.add(bellBody);

    const bellTopGeo = new THREE.SphereGeometry(0.49, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const bellTop = new THREE.Mesh(bellTopGeo, bronzeMat);
    bellTop.position.y = 0.8;
    bellMeshGroup.add(bellTop);

    // Bell hanger hook
    const hookGeo = new THREE.TorusGeometry(0.15, 0.05, 12, 16);
    const hook = new THREE.Mesh(hookGeo, bronzeMat);
    hook.position.y = 1.35;
    bellMeshGroup.add(hook);

    this.bellMesh = bellMeshGroup;
    bellGroup.add(bellMeshGroup);

    // Wooden Striker (Chày kình)
    const strikerGroup = new THREE.Group();
    strikerGroup.position.set(0.65, 3.4, 0.85);

    const strikerBeamGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.4, 12);
    const strikerBeam = new THREE.Mesh(strikerBeamGeo, woodFrameMat);
    strikerBeam.rotation.x = Math.PI / 2;
    strikerBeam.castShadow = true;
    strikerGroup.add(strikerBeam);

    this.bellStriker = strikerGroup;
    bellGroup.add(strikerGroup);

    // Interactive Raycaster Binding
    bellBody.userData = { type: 'bell', name: 'Đại Hồng Chung 3D' };
    this.interactiveObjects.push(bellBody);

    this.scene.add(bellGroup);
  }

  buildWoodenFish3D() {
    const moGroup = new THREE.Group();
    moGroup.position.set(6.0, 0, -1.8);

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0xad6523,
      metalness: 0.35,
      roughness: 0.38
    });
    const cushionMat = new THREE.MeshStandardMaterial({ color: 0x942222, roughness: 0.7 });
    const stickMat = new THREE.MeshStandardMaterial({ color: 0x54260c, roughness: 0.5 });

    // Cushion stand for Mõ
    const standGeo = new THREE.CylinderGeometry(0.65, 0.72, 0.85, 20);
    const stand = new THREE.Mesh(standGeo, cushionMat);
    stand.position.y = 0.42;
    stand.castShadow = true;
    moGroup.add(stand);

    // The Carved Wooden Fish (Mõ Gỗ)
    const fishGroup = new THREE.Group();
    fishGroup.position.set(0, 1.05, 0);

    const fishBodyGeo = new THREE.SphereGeometry(0.42, 24, 20);
    fishBodyGeo.scale(1.25, 0.88, 1.0);
    const fishBody = new THREE.Mesh(fishBodyGeo, woodMat);
    fishBody.castShadow = true;
    fishGroup.add(fishBody);

    // Carved fish mouth slot
    const slotGeo = new THREE.BoxGeometry(0.55, 0.08, 0.65);
    const slotMat = new THREE.MeshBasicMaterial({ color: 0x241005 });
    const slot = new THREE.Mesh(slotGeo, slotMat);
    slot.position.set(0.12, 0, 0);
    fishGroup.add(slot);

    this.woodenFishMesh = fishGroup;
    moGroup.add(fishGroup);

    // Mallet (Dùi gõ mõ)
    const malletGroup = new THREE.Group();
    malletGroup.position.set(0.4, 1.45, 0.25);
    malletGroup.rotation.z = -Math.PI / 6;

    const stickHandleGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.7, 12);
    const handle = new THREE.Mesh(stickHandleGeo, stickMat);
    handle.position.y = 0.25;
    malletGroup.add(handle);

    const malletHeadGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const malletHead = new THREE.Mesh(malletHeadGeo, woodMat);
    malletHead.position.y = -0.1;
    malletGroup.add(malletHead);

    this.woodenFishMallet = malletGroup;
    moGroup.add(malletGroup);

    // Raycast Binding
    fishBody.userData = { type: 'mo', name: 'Mõ Gỗ 3D' };
    this.interactiveObjects.push(fishBody);

    this.scene.add(moGroup);
  }

  buildIncenseBurner3D() {
    const burnerGroup = new THREE.Group();
    burnerGroup.position.set(0, 1.45, -4.1);

    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0xb5822f,
      metalness: 0.85,
      roughness: 0.25
    });

    // Bowl
    const bowlGeo = new THREE.SphereGeometry(0.42, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const bowl = new THREE.Mesh(bowlGeo, bronzeMat);
    bowl.rotation.x = Math.PI;
    bowl.castShadow = true;
    burnerGroup.add(bowl);

    // Three Legs
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const legGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.35, 12);
      const leg = new THREE.Mesh(legGeo, bronzeMat);
      leg.position.set(Math.cos(angle) * 0.26, -0.3, Math.sin(angle) * 0.26);
      burnerGroup.add(leg);
    }

    // Incense Sticks (3 Nén Tâm Hương)
    const stickMat = new THREE.MeshBasicMaterial({ color: 0x991b1b });
    const emberMat = new THREE.MeshBasicMaterial({ color: 0xff4500 });

    for (let i = -1; i <= 1; i++) {
      const stickGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.65, 8);
      const stick = new THREE.Mesh(stickGeo, stickMat);
      stick.position.set(i * 0.08, 0.2, 0);
      stick.rotation.z = -i * 0.08;
      burnerGroup.add(stick);

      // Glowing Ember Tip
      const emberGeo = new THREE.SphereGeometry(0.025, 8, 8);
      const ember = new THREE.Mesh(emberGeo, emberMat);
      ember.position.set(i * 0.08, 0.52, 0);
      burnerGroup.add(ember);
    }

    burnerGroup.userData = { type: 'burner', name: 'Lư Hương Đồng 3D' };
    this.interactiveObjects.push(burnerGroup);

    this.scene.add(burnerGroup);
  }

  initAtmosphereParticles() {
    // 1. Incense Smoke Particles
    for (let i = 0; i < 35; i++) {
      const p = {
        mesh: new THREE.Mesh(
          new THREE.SphereGeometry(0.08 + Math.random() * 0.08, 8, 8),
          new THREE.MeshBasicMaterial({
            color: 0xf5eedc,
            transparent: true,
            opacity: 0.28
          })
        ),
        vy: 0.018 + Math.random() * 0.022,
        vx: (Math.random() - 0.5) * 0.008,
        vz: (Math.random() - 0.5) * 0.008,
        scaleSpeed: 0.015,
        life: Math.random() * 80,
        maxLife: 90 + Math.random() * 40
      };
      p.mesh.position.set(
        (Math.random() - 0.5) * 0.2,
        2.0 + Math.random() * 3.0,
        -4.1 + (Math.random() - 0.5) * 0.2
      );
      this.scene.add(p.mesh);
      this.smokeParticles3D.push(p);
    }
  }

  // Ring the 3D Bell with physical striker animation & sound
  strikeBell3D() {
    if (window.AudioEngine) {
      window.AudioEngine.playTempleBell();
    }
    if (this.bellStriker) {
      // Swing striker
      const startRot = this.bellStriker.rotation.z;
      let step = 0;
      const anim = () => {
        step++;
        if (step <= 6) {
          this.bellStriker.rotation.z -= 0.08;
        } else if (step <= 16) {
          this.bellStriker.rotation.z += 0.05;
        } else {
          this.bellStriker.rotation.z = startRot;
          return;
        }
        requestAnimationFrame(anim);
      };
      anim();
    }

    // Bell subtle sway
    if (this.bellMesh) {
      let bStep = 0;
      const bAnim = () => {
        bStep++;
        this.bellMesh.rotation.z = Math.sin(bStep * 0.5) * 0.04 * Math.exp(-bStep * 0.05);
        if (bStep < 40) requestAnimationFrame(bAnim);
        else this.bellMesh.rotation.z = 0;
      };
      bAnim();
    }

    this.spawn3DShockwave(-6.2, 3.7, -1.8);
  }

  // Tap the 3D Wooden Fish with physical mallet bounce & sound
  tapWoodenFish3D() {
    if (window.AudioEngine) {
      window.AudioEngine.playWoodenFish(1);
    }
    if (window.performUserWoodenFishTap) {
      window.performUserWoodenFishTap(null, true);
    }

    // Mallet Strike Animation
    if (this.woodenFishMallet) {
      let step = 0;
      const mAnim = () => {
        step++;
        if (step <= 3) {
          this.woodenFishMallet.rotation.z += 0.12;
          this.woodenFishMallet.position.y -= 0.06;
        } else if (step <= 8) {
          this.woodenFishMallet.rotation.z -= 0.07;
          this.woodenFishMallet.position.y += 0.036;
        }
        if (step < 8) requestAnimationFrame(mAnim);
      };
      mAnim();
    }

    // Fish squash & stretch
    if (this.woodenFishMesh) {
      this.woodenFishMesh.scale.set(1.18, 0.82, 1.18);
      setTimeout(() => {
        if (this.woodenFishMesh) this.woodenFishMesh.scale.set(1, 1, 1);
      }, 160);
    }

    this.spawn3DFloatingLotus(6.0, 1.5, -1.8);
  }

  // 3D Visual Effects
  spawn3DShockwave(x, y, z) {
    const ringGeo = new THREE.RingGeometry(0.3, 0.45, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffe680,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95
    });
    const wave = new THREE.Mesh(ringGeo, ringMat);
    wave.position.set(x, y, z);
    wave.rotation.x = Math.PI / 2;
    this.scene.add(wave);

    let progress = 0;
    const expand = () => {
      progress += 0.045;
      wave.scale.setScalar(1 + progress * 14);
      wave.material.opacity = Math.max(0, 0.95 * (1 - progress));
      if (progress < 1) {
        requestAnimationFrame(expand);
      } else {
        this.scene.remove(wave);
      }
    };
    expand();
  }

  spawn3DFloatingLotus(x, y, z) {
    const petalGeo = new THREE.SphereGeometry(0.12, 12, 8);
    petalGeo.scale(1.2, 0.4, 0.8);
    const petalMat = new THREE.MeshBasicMaterial({ color: 0xffd54f });
    const petal = new THREE.Mesh(petalGeo, petalMat);
    petal.position.set(x + (Math.random() - 0.5) * 0.4, y, z + (Math.random() - 0.5) * 0.4);
    this.scene.add(petal);

    let life = 0;
    const floatUp = () => {
      life += 0.03;
      petal.position.y += 0.035;
      petal.rotation.y += 0.05;
      if (life < 1.2) {
        requestAnimationFrame(floatUp);
      } else {
        this.scene.remove(petal);
      }
    };
    floatUp();
  }

  // Release 3D Sky Lantern floating towards ceiling
  spawn3DSkyLantern(sender = 'Hành giả', wish = '') {
    const lanternGroup = new THREE.Group();
    const startX = (Math.random() - 0.5) * 8;
    const startZ = 2 + (Math.random() - 0.5) * 6;
    lanternGroup.position.set(startX, 0.2, startZ);

    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0xff7043,
      emissive: 0xff5722,
      emissiveIntensity: 0.8,
      roughness: 0.3
    });
    const bodyGeo = new THREE.CylinderGeometry(0.28, 0.35, 0.75, 16);
    const body = new THREE.Mesh(bodyGeo, lanternMat);
    lanternGroup.add(body);

    const light = new THREE.PointLight(0xffa726, 1.2, 4);
    light.position.y = 0.2;
    lanternGroup.add(light);

    this.scene.add(lanternGroup);
    this.lanterns3D.push({
      group: lanternGroup,
      vy: 0.025 + Math.random() * 0.02,
      wobble: Math.random() * Math.PI * 2,
      life: 0
    });
  }

  // Camera Presets Switcher
  setCameraView(viewKey, smooth = true) {
    const targetView = this.cameraViews[viewKey];
    if (!targetView) return;
    this.currentViewKey = viewKey;

    if (!smooth || typeof window.TWEEN === 'undefined') {
      this.camera.position.copy(targetView.pos);
      if (this.controls) {
        this.controls.target.copy(targetView.target);
        this.controls.update();
      } else {
        this.camera.lookAt(targetView.target);
      }
      return;
    }

    // Smooth TWEEN transition
    new window.TWEEN.Tween(this.camera.position)
      .to(targetView.pos, 1600)
      .easing(window.TWEEN.Easing.Cubic.InOut)
      .start();

    if (this.controls) {
      new window.TWEEN.Tween(this.controls.target)
        .to(targetView.target, 1600)
        .easing(window.TWEEN.Easing.Cubic.InOut)
        .start();
    }
  }

  // Set Ambience lighting
  setAmbienceMode(modeKey) {
    if (!this.sunLight || !this.ambientLight) return;
    if (modeKey === 'night') {
      this.scene.background.set(0x0a0503);
      this.scene.fog.color.set(0x0e0604);
      this.ambientLight.color.set(0xff9944);
      this.ambientLight.intensity = 0.35;
      this.sunLight.intensity = 0.4;
      this.altarLight.intensity = 3.2;
    } else if (modeKey === 'rain') {
      this.scene.background.set(0x11161a);
      this.scene.fog.color.set(0x141a20);
      this.ambientLight.color.set(0xb0c4de);
      this.ambientLight.intensity = 0.55;
      this.sunLight.intensity = 0.65;
      this.altarLight.intensity = 2.4;
    } else { // dawn / normal
      this.scene.background.set(0x180c05);
      this.scene.fog.color.set(0x241208);
      this.ambientLight.color.set(0xffeacc);
      this.ambientLight.intensity = 0.65;
      this.sunLight.intensity = 1.4;
      this.altarLight.intensity = 2.2;
    }
  }

  setupEventListeners() {
    // Resize handler
    window.addEventListener('resize', () => {
      if (!this.container || !this.camera || !this.renderer) return;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });

    // Pointer Move / Hover Raycaster
    this.canvas.addEventListener('pointermove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.handleHover();
    });

    // Click Raycaster
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.handleClick();
    });
  }

  handleHover() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveObjects, true);

    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj && !obj.userData.type && obj.parent) {
        obj = obj.parent;
      }
      this.canvas.style.cursor = 'pointer';
    } else {
      this.canvas.style.cursor = 'default';
    }
  }

  handleClick() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveObjects, true);

    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj && !obj.userData.type && obj.parent) {
        obj = obj.parent;
      }
      if (!obj || !obj.userData) return;

      const type = obj.userData.type;
      if (type === 'bell') {
        this.strikeBell3D();
      } else if (type === 'mo') {
        this.tapWoodenFish3D();
      } else if (type === 'seat') {
        const seatData = obj.userData.data;
        if (seatData && !seatData.occupied && window.assignSanctuarySeat) {
          window.assignSanctuarySeat(seatData.seatNo);
        } else if (seatData && window.showSeatDetailBadge) {
          window.showSeatDetailBadge(seatData);
        }
      } else if (type === 'buddha' || type === 'burner') {
        this.setCameraView('altar', true);
        if (window.AudioEngine) window.AudioEngine.playGiftChime();
      }
    }
  }

  start() {
    this.active = true;
    const animate = (time) => {
      if (!this.active) return;
      this.animationFrameId = requestAnimationFrame(animate);

      if (typeof window.TWEEN !== 'undefined') {
        window.TWEEN.update(time);
      }

      const delta = this.clock.getDelta();
      const elapsed = this.clock.getElapsedTime();

      // 1. Rotate Buddha Mandala Halo
      if (this.haloDisc) {
        this.haloDisc.rotation.z += 0.005;
      }

      // 2. Flicker Candles
      this.candles3D.forEach((c, idx) => {
        const flicker = Math.sin(elapsed * 9 + idx * 2.3) * 0.012;
        c.mesh.position.y = c.baseY + flicker;
        c.light.intensity = 0.75 + Math.sin(elapsed * 12 + idx) * 0.15;
      });

      // 3. Animate Incense Smoke
      this.smokeParticles3D.forEach(p => {
        p.life++;
        p.mesh.position.y += p.vy;
        p.mesh.position.x += p.vx + Math.sin(elapsed * 2 + p.life) * 0.003;
        p.mesh.position.z += p.vz;
        const progress = p.life / p.maxLife;
        p.mesh.scale.setScalar(1 + progress * 3.5);
        p.mesh.material.opacity = Math.max(0, 0.28 * (1 - progress));

        if (p.life >= p.maxLife) {
          p.life = 0;
          p.mesh.position.set(
            (Math.random() - 0.5) * 0.15,
            2.0,
            -4.1 + (Math.random() - 0.5) * 0.15
          );
        }
      });

      // 4. Animate Floating 3D Sky Lanterns
      for (let i = this.lanterns3D.length - 1; i >= 0; i--) {
        const lt = this.lanterns3D[i];
        lt.life++;
        lt.group.position.y += lt.vy;
        lt.group.position.x += Math.sin(elapsed * 1.5 + lt.wobble) * 0.006;
        if (lt.group.position.y > 11) {
          this.scene.remove(lt.group);
          this.lanterns3D.splice(i, 1);
        }
      }

      // 5. Devotee gentle breathing animation
      this.devotees3D.forEach((d, idx) => {
        const breathe = Math.sin(elapsed * 2.2 + idx * 1.1) * 0.012;
        d.group.position.y = 0.16 + breathe;
      });

      // 5b. Sway Hanging Silk Lanterns
      if (this.hangingLanterns) {
        this.hangingLanterns.forEach(hl => {
          hl.group.rotation.z = Math.sin(elapsed * 1.3 + hl.phase) * 0.045;
          hl.group.rotation.x = Math.cos(elapsed * 0.95 + hl.phase) * 0.03;
        });
      }

      // 6. Update OrbitControls
      if (this.controls) {
        this.controls.update();
      }

      // 7. Render
      this.renderer.render(this.scene, this.camera);
    };

    animate(0);
  }

  stop() {
    this.active = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}

window.Temple3DEngine = Temple3DEngine;
