import { makeBlobShadowTexture, makeGlowTexture, makeHeartTexture, makeSoftDotTexture } from "./textures";

export const SLIDE_COUNT = 5;
const SPACING = 13;

const PALETTE = {
  plumDark: 0x2a1034,
  plumLight: 0x4a1d5c,
  gold: 0xffb627,
  rose: 0xff5c8a,
  teal: 0x3ddbc0,
  cream: 0xfff3da,
};

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

interface SceneManagerOptions {
  reducedMotion: boolean;
  onSettled?: (index: number) => void;
}

export class SceneManager {
  THREE: any;
  container: HTMLElement;
  reducedMotion: boolean;
  onSettled?: (index: number) => void;

  renderer: any;
  scene: any;
  camera: any;
  clock: any;

  time = 0;
  currentIndex = 0;
  currentX = 0;
  zDist = 9;

  flight: {
    active: boolean;
    start: number;
    duration: number;
    fromX: number;
    toX: number;
    pullBack: number;
    tilt: number;
  } = { active: false, start: 0, duration: 0, fromX: 0, toX: 0, pullBack: 0, tilt: 0 };

  mouse = { x: 0, y: 0 };
  parallax = { x: 0, y: 0 };

  balloons: any[] = [];
  particleLayers: any[] = [];
  confettiPool: any[] = [];
  confettiMaterials: any[] = [];
  confettiGeo: any;

  cakeRefs: any = {};
  starRefs: any = {};
  flowerRefs: any = {};
  giftRefs: any = {};
  heartRefs: any = {};

  rafId: number | null = null;
  disposed = false;

  constructor(container: HTMLElement, THREE: any, opts: SceneManagerOptions) {
    this.container = container;
    this.THREE = THREE;
    this.reducedMotion = opts.reducedMotion;
    this.onSettled = opts.onSettled;

    this.initRenderer();
    this.initScene();
    this.initLights();
    this.initBackgroundParticles();
    this.initBalloons();
    this.initSlide1Cake();
    this.initSlide2Star();
    this.initSlide3Flower();
    this.initSlide4Gift();
    this.initSlide5Heart();
    this.updateCameraDistance();

    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
  }

  // ---------- SETUP ----------

  initRenderer() {
    const THREE = this.THREE;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    if (renderer.outputEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
    this.container.appendChild(renderer.domElement);
    this.renderer = renderer;
  }

  initScene() {
    const THREE = this.THREE;
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(PALETTE.plumDark, 14, 46);
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(
      50,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      200
    );
    camera.position.set(0, 2.6, 9);
    this.camera = camera;
  }

  initLights() {
    const THREE = this.THREE;
    const hemi = new THREE.HemisphereLight(0xffe3b0, 0x3a1550, 0.75);
    this.scene.add(hemi);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(4, 8, 6);
    this.scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0xff5c8a, 0.9);
    rimLight.position.set(-6, 3, -4);
    this.scene.add(rimLight);

    const fillLight = new THREE.PointLight(0x3ddbc0, 0.35, 30);
    fillLight.position.set(0, 2, 6);
    this.scene.add(fillLight);
  }

  addBlobShadow(parent: any, y: number, scale = 1.6) {
    const THREE = this.THREE;
    const tex = makeBlobShadowTexture(THREE);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(3.2 * scale, 1.1 * scale, 1);
    sprite.position.y = y;
    parent.add(sprite);
    return sprite;
  }

  addGlowSprite(parent: any, colorHex: string, size: number, opacity = 0.9) {
    const THREE = this.THREE;
    const tex = makeGlowTexture(THREE, colorHex);
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(size, size, 1);
    parent.add(sprite);
    return sprite;
  }

  // ---------- BACKGROUND DEPTH LAYERS ----------

  initBackgroundParticles() {
    const THREE = this.THREE;
    const dotTex = makeSoftDotTexture(THREE);
    const layerDefs = [
      { color: 0xffffff, count: 140, zMin: -42, zMax: -26, size: 0.5, opacity: 0.55 },
      { color: PALETTE.gold, count: 110, zMin: -26, zMax: -14, size: 0.65, opacity: 0.6 },
      { color: PALETTE.rose, count: 90, zMin: -16, zMax: -6, size: 0.75, opacity: 0.55 },
    ];
    const xMin = -SPACING * 1.5;
    const xMax = SPACING * (SLIDE_COUNT + 0.5);

    layerDefs.forEach((def) => {
      const positions = new Float32Array(def.count * 3);
      for (let i = 0; i < def.count; i++) {
        positions[i * 3] = rand(xMin, xMax);
        positions[i * 3 + 1] = rand(-4, 11);
        positions[i * 3 + 2] = rand(def.zMin, def.zMax);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color: def.color,
        size: def.size,
        map: dotTex,
        transparent: true,
        opacity: def.opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      });
      const points = new THREE.Points(geo, mat);
      this.scene.add(points);
      this.particleLayers.push({ points, speed: rand(0.02, 0.06), phase: rand(0, Math.PI * 2) });
    });
  }

  // ---------- BALLOONS ----------

  createBalloon(color: number, scale: number) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    const bodyGeo = new THREE.SphereGeometry(1, 20, 20);
    const mat = new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.25,
      metalness: 0.05,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2,
      transparent: true,
      opacity: 0.96,
    });
    const body = new THREE.Mesh(bodyGeo, mat);
    body.scale.set(1, 1.25, 1);
    group.add(body);

    const knotGeo = new THREE.ConeGeometry(0.14, 0.26, 8);
    const knot = new THREE.Mesh(knotGeo, mat);
    knot.position.y = -1.28;
    knot.rotation.x = Math.PI;
    group.add(knot);

    const stringMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 });
    const stringPts = [new THREE.Vector3(0, -1.4, 0), new THREE.Vector3(rand(-0.15, 0.15), -2.7, 0)];
    const stringGeo = new THREE.BufferGeometry().setFromPoints(stringPts);
    const string = new THREE.Line(stringGeo, stringMat);
    group.add(string);

    // highlight
    const hl = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })
    );
    hl.position.set(-0.35, 0.5, 0.75);
    group.add(hl);

    group.scale.setScalar(scale);
    return group;
  }

  initBalloons() {
    const colors = [PALETTE.gold, PALETTE.rose, PALETTE.teal, PALETTE.cream, 0xd68fff];
    const xMin = -SPACING * 0.6;
    const xMax = SPACING * (SLIDE_COUNT - 1) + SPACING * 0.6;

    // Scattered mid/background balloons
    for (let i = 0; i < 24; i++) {
      const color = colors[Math.floor(rand(0, colors.length))];
      const scale = rand(0.4, 0.95);
      const balloon = this.createBalloon(color, scale);
      const baseX = rand(xMin, xMax);
      const baseY = rand(-1, 6.5);
      const baseZ = rand(-9, -2.5);
      balloon.position.set(baseX, baseY, baseZ);
      this.scene.add(balloon);
      this.balloons.push({
        mesh: balloon,
        baseX,
        baseY,
        baseZ,
        phase: rand(0, Math.PI * 2),
        speedY: rand(0.25, 0.55),
        swayAmp: rand(0.2, 0.5),
        swaySpeed: rand(0.3, 0.7),
      });
    }

    // Large foreground balloons flanking alternating slides
    const sideSlides = [0, 1, 2, 3, 4];
    sideSlides.forEach((slideIdx, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      const color = colors[i % colors.length];
      const scale = rand(1.5, 1.9);
      const balloon = this.createBalloon(color, scale);
      const baseX = slideIdx * SPACING + side * rand(4.2, 5.2);
      const baseY = rand(-1.5, 1.5);
      const baseZ = rand(1.5, 3.2);
      balloon.position.set(baseX, baseY, baseZ);
      this.scene.add(balloon);
      this.balloons.push({
        mesh: balloon,
        baseX,
        baseY,
        baseZ,
        phase: rand(0, Math.PI * 2),
        speedY: rand(0.2, 0.4),
        swayAmp: rand(0.15, 0.3),
        swaySpeed: rand(0.2, 0.5),
      });
    });
  }

  // ---------- SLIDE 1: CAKE ----------

  initSlide1Cake() {
    const THREE = this.THREE;
    const slideGroup = new THREE.Group();
    slideGroup.position.set(0 * SPACING, 1.3, 0);
    this.scene.add(slideGroup);
    this.addBlobShadow(slideGroup, -2.0, 1.4);

    const cake = new THREE.Group();
    slideGroup.add(cake);

    const tierDefs = [
      { r: 1.9, h: 0.85, color: PALETTE.rose },
      { r: 1.35, h: 0.68, color: PALETTE.gold },
      { r: 0.9, h: 0.55, color: PALETTE.teal },
    ];
    let y = -1.0;
    const topYs: number[] = [];
    tierDefs.forEach((t) => {
      const geo = new THREE.CylinderGeometry(t.r, t.r * 1.03, t.h, 32);
      const mat = new THREE.MeshStandardMaterial({ color: t.color, roughness: 0.45, metalness: 0.1 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = y + t.h / 2;
      cake.add(mesh);

      const ringGeo = new THREE.TorusGeometry(t.r + 0.02, 0.08, 10, 32);
      const ringMat = new THREE.MeshStandardMaterial({ color: PALETTE.cream, roughness: 0.5 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      cake.add(ring);

      y += t.h;
      topYs.push(y);
    });
    const topY = topYs[topYs.length - 1];

    // cherries on top tier edge
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const cherry = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xe23e57, roughness: 0.3, metalness: 0.1 })
      );
      cherry.position.set(Math.cos(angle) * 0.65, topY + 0.12, Math.sin(angle) * 0.65);
      cake.add(cherry);
    }

    // candles + flames
    const candles: any[] = [];
    const flameGroupAll = new THREE.Group();
    cake.add(flameGroupAll);
    const candleLight = new THREE.PointLight(0xffb15e, 1.4, 7, 2);
    candleLight.position.set(0, topY + 0.9, 0);
    cake.add(candleLight);

    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const cx = Math.cos(angle) * 0.35;
      const cz = Math.sin(angle) * 0.35;
      const candle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.5, 10),
        new THREE.MeshStandardMaterial({ color: 0xfff0e0, roughness: 0.5 })
      );
      candle.position.set(cx, topY + 0.25, cz);
      cake.add(candle);

      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.075, 0.22, 10),
        new THREE.MeshStandardMaterial({
          color: 0xffcf6b,
          emissive: 0xff8a2b,
          emissiveIntensity: 1.4,
          roughness: 0.4,
        })
      );
      flame.position.set(cx, topY + 0.6, cz);
      cake.add(flame);

      const glow = this.addGlowSprite(cake, "#ffcf6b", 0.6, 0.85);
      glow.position.set(cx, topY + 0.58, cz);

      candles.push({ flame, glow, baseY: topY + 0.6, lit: true, seed: rand(0, 100) });
    }

    this.cakeRefs = { slideGroup, cake, candles, candleLight, topY };
  }

  blowOutCandles(onDone?: () => void) {
    const { candles, candleLight, slideGroup } = this.cakeRefs;
    candles.forEach((c: any, i: number) => {
      c.lit = false;
      setTimeout(() => {
        if (this.disposed) return;
        c.flame.visible = false;
        c.glow.visible = false;
      }, 150 + i * 70);
    });
    const start = performance.now();
    const fromIntensity = candleLight.intensity;
    const fadeLight = () => {
      if (this.disposed) return;
      const p = Math.min((performance.now() - start) / 500, 1);
      candleLight.intensity = lerp(fromIntensity, 0, p);
      if (p < 1) requestAnimationFrame(fadeLight);
    };
    fadeLight();

    const worldPos = new this.THREE.Vector3();
    slideGroup.getWorldPosition(worldPos);
    worldPos.y += 1.4;
    setTimeout(() => {
      if (!this.disposed) this.spawnConfetti(worldPos, 130);
    }, 350);

    setTimeout(() => {
      if (onDone && !this.disposed) onDone();
    }, this.reducedMotion ? 400 : 1500);
  }

  // ---------- SLIDE 2: STAR ----------

  initSlide2Star() {
    const THREE = this.THREE;
    const slideGroup = new THREE.Group();
    slideGroup.position.set(1 * SPACING, 1.3, 0);
    this.scene.add(slideGroup);
    this.addBlobShadow(slideGroup, -2.0, 1.3);

    const starShape = new THREE.Shape();
    const points = 5;
    const outerR = 1.3;
    const innerR = 0.52;
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) starShape.moveTo(px, py);
      else starShape.lineTo(px, py);
    }
    starShape.closePath();

    const geo = new THREE.ExtrudeGeometry(starShape, {
      depth: 0.45,
      bevelEnabled: true,
      bevelThickness: 0.09,
      bevelSize: 0.09,
      bevelSegments: 4,
      curveSegments: 16,
    });
    geo.center();

    const mat = new THREE.MeshPhysicalMaterial({
      color: PALETTE.gold,
      metalness: 0.75,
      roughness: 0.22,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2,
      emissive: 0x3a2400,
      emissiveIntensity: 0.25,
    });
    const star = new THREE.Mesh(geo, mat);
    slideGroup.add(star);

    this.addGlowSprite(slideGroup, "#ffd98a", 4.6, 0.55);

    const sparkles: any[] = [];
    const sparkleGroup = new THREE.Group();
    slideGroup.add(sparkleGroup);
    for (let i = 0; i < 18; i++) {
      const s = this.addGlowSprite(sparkleGroup, i % 2 === 0 ? "#ffffff" : "#ffd98a", rand(0.25, 0.45), 0.9);
      const angle = (i / 18) * Math.PI * 2;
      const radius = rand(2.0, 2.5);
      s.position.set(Math.cos(angle) * radius, Math.sin(angle * 1.3) * 0.6, Math.sin(angle) * radius);
      sparkles.push({ sprite: s, angle, radius, speed: rand(0.2, 0.5), phase: rand(0, Math.PI * 2) });
    }

    this.starRefs = { slideGroup, star, sparkles, sparkleGroup };
  }

  // ---------- SLIDE 3: FLOWER ----------

  initSlide3Flower() {
    const THREE = this.THREE;
    const slideGroup = new THREE.Group();
    slideGroup.position.set(2 * SPACING, 1.0, 0);
    this.scene.add(slideGroup);
    this.addBlobShadow(slideGroup, -2.2, 1.3);

    const flower = new THREE.Group();
    flower.position.y = 1.35;
    slideGroup.add(flower);

    const petalGeo = new THREE.SphereGeometry(0.55, 14, 14);
    const petalMatOuter = new THREE.MeshStandardMaterial({ color: PALETTE.rose, roughness: 0.5 });
    const petalMatInner = new THREE.MeshStandardMaterial({ color: 0xffd1dd, roughness: 0.45 });

    const ring1 = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const petal = new THREE.Mesh(petalGeo, petalMatOuter);
      petal.scale.set(0.5, 1, 0.22);
      const angle = (i / 8) * Math.PI * 2;
      petal.position.set(Math.cos(angle) * 0.75, Math.sin(angle) * 0.75, 0);
      petal.rotation.z = angle + Math.PI / 2;
      petal.rotation.x = 0.15;
      ring1.add(petal);
    }
    flower.add(ring1);

    const ring2 = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const petal = new THREE.Mesh(petalGeo, petalMatInner);
      petal.scale.set(0.38, 0.75, 0.2);
      const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
      petal.position.set(Math.cos(angle) * 0.42, Math.sin(angle) * 0.42, 0.28);
      petal.rotation.z = angle + Math.PI / 2;
      petal.rotation.x = -0.35;
      ring2.add(petal);
    }
    flower.add(ring2);

    const center = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 18, 18),
      new THREE.MeshStandardMaterial({ color: PALETTE.gold, roughness: 0.4, metalness: 0.2 })
    );
    center.position.z = 0.25;
    flower.add(center);

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.11, 2.6, 10),
      new THREE.MeshStandardMaterial({ color: 0x2f7a4f, roughness: 0.6 })
    );
    stem.position.y = 0.5;
    slideGroup.add(stem);

    const leafGeo = new THREE.SphereGeometry(0.45, 12, 12);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f9b63, roughness: 0.55 });
    const leaf1 = new THREE.Mesh(leafGeo, leafMat);
    leaf1.scale.set(1, 0.35, 0.5);
    leaf1.position.set(0.5, 0.1, 0);
    leaf1.rotation.z = 0.5;
    slideGroup.add(leaf1);

    const leaf2 = new THREE.Mesh(leafGeo, leafMat);
    leaf2.scale.set(1, 0.35, 0.5);
    leaf2.position.set(-0.55, -0.3, 0);
    leaf2.rotation.z = -0.5;
    slideGroup.add(leaf2);

    this.flowerRefs = { slideGroup, flower };
  }

  // ---------- SLIDE 4: GIFT ----------

  initSlide4Gift() {
    const THREE = this.THREE;
    const slideGroup = new THREE.Group();
    slideGroup.position.set(3 * SPACING, 1.3, 0);
    this.scene.add(slideGroup);
    this.addBlobShadow(slideGroup, -2.0, 1.4);

    const gift = new THREE.Group();
    slideGroup.add(gift);

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 1.1, 1.7),
      new THREE.MeshStandardMaterial({ color: PALETTE.rose, roughness: 0.4 })
    );
    gift.add(box);

    const lid = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.32, 1.9),
      new THREE.MeshStandardMaterial({ color: PALETTE.gold, roughness: 0.35, metalness: 0.2 })
    );
    lid.position.y = 1.1 / 2 + 0.32 / 2;
    gift.add(lid);

    const ribbonMat = new THREE.MeshStandardMaterial({ color: PALETTE.cream, roughness: 0.4 });
    const ribbon1 = new THREE.Mesh(new THREE.BoxGeometry(1.74, 1.14, 0.28), ribbonMat);
    gift.add(ribbon1);
    const ribbon2 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.14, 1.74), ribbonMat);
    gift.add(ribbon2);
    const ribbonLid1 = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.34, 0.3), ribbonMat);
    ribbonLid1.position.y = lid.position.y;
    gift.add(ribbonLid1);
    const ribbonLid2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.34, 1.94), ribbonMat);
    ribbonLid2.position.y = lid.position.y;
    gift.add(ribbonLid2);

    const bowMat = new THREE.MeshStandardMaterial({ color: PALETTE.cream, roughness: 0.35 });
    const loopGeo = new THREE.TorusGeometry(0.32, 0.1, 10, 20);
    const loop1 = new THREE.Mesh(loopGeo, bowMat);
    loop1.position.set(-0.22, lid.position.y + 0.22, 0);
    loop1.rotation.y = Math.PI / 2.3;
    gift.add(loop1);
    const loop2 = new THREE.Mesh(loopGeo, bowMat);
    loop2.position.set(0.22, lid.position.y + 0.22, 0);
    loop2.rotation.y = -Math.PI / 2.3;
    gift.add(loop2);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 14), bowMat);
    knot.position.y = lid.position.y + 0.18;
    gift.add(knot);

    gift.position.y = 0;
    this.giftRefs = { slideGroup, gift, baseY: 0 };
  }

  // ---------- SLIDE 5: HEART ----------

  initSlide5Heart() {
    const THREE = this.THREE;
    const slideGroup = new THREE.Group();
    slideGroup.position.set(4 * SPACING, 1.5, 0);
    this.scene.add(slideGroup);
    this.addBlobShadow(slideGroup, -2.2, 1.4);

    const heartShape = new THREE.Shape();
    const x = 0,
      y = 0;
    heartShape.moveTo(x + 0.25, y + 0.25);
    heartShape.bezierCurveTo(x + 0.25, y + 0.25, x + 0.2, y, x, y);
    heartShape.bezierCurveTo(x - 0.3, y, x - 0.3, y + 0.35, x - 0.3, y + 0.35);
    heartShape.bezierCurveTo(x - 0.3, y + 0.55, x - 0.1, y + 0.77, x + 0.25, y + 0.95);
    heartShape.bezierCurveTo(x + 0.6, y + 0.77, x + 0.8, y + 0.55, x + 0.8, y + 0.35);
    heartShape.bezierCurveTo(x + 0.8, y + 0.35, x + 0.8, y, x + 0.5, y);
    heartShape.bezierCurveTo(x + 0.35, y, x + 0.25, y + 0.25, x + 0.25, y + 0.25);

    const geo = new THREE.ExtrudeGeometry(heartShape, {
      depth: 0.3,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.06,
      bevelSegments: 6,
      curveSegments: 20,
    });
    geo.rotateX(Math.PI);
    geo.center();

    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xff3f72,
      roughness: 0.28,
      metalness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      emissive: 0x4a0018,
      emissiveIntensity: 0.15,
    });
    const heart = new THREE.Mesh(geo, mat);
    heart.scale.setScalar(1.7);
    slideGroup.add(heart);

    this.addGlowSprite(slideGroup, "#ff5c8a", 5, 0.5);

    // mini floating hearts
    const miniTex = makeHeartTexture(THREE, "#ffb6c9");
    const miniMat = new THREE.SpriteMaterial({
      map: miniTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const minis: any[] = [];
    const miniGroup = new THREE.Group();
    slideGroup.add(miniGroup);
    for (let i = 0; i < 16; i++) {
      const s = new THREE.Sprite(miniMat.clone());
      const size = rand(0.3, 0.6);
      s.scale.set(size, size, 1);
      s.position.set(rand(-2.4, 2.4), rand(-2.5, 3), rand(-1.5, 1.5));
      miniGroup.add(s);
      minis.push({ sprite: s, speed: rand(0.4, 0.9), startY: s.position.y });
    }

    this.heartRefs = { slideGroup, heart, minis, miniGroup };
  }

  // ---------- CONFETTI ----------

  ensureConfettiAssets() {
    if (this.confettiGeo) return;
    const THREE = this.THREE;
    this.confettiGeo = new THREE.BoxGeometry(0.14, 0.2, 0.02);
    const colors = [PALETTE.gold, PALETTE.rose, PALETTE.teal, PALETTE.cream, 0xffffff];
    this.confettiMaterials = colors.map(
      (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, side: THREE.DoubleSide })
    );
  }

  spawnConfetti(origin: any, count = 120) {
    this.ensureConfettiAssets();
    const THREE = this.THREE;
    for (let i = 0; i < count; i++) {
      const mat = this.confettiMaterials[Math.floor(rand(0, this.confettiMaterials.length))];
      const mesh = new THREE.Mesh(this.confettiGeo, mat);
      mesh.position.copy(origin);
      mesh.position.x += rand(-0.3, 0.3);
      mesh.rotation.set(rand(0, Math.PI), rand(0, Math.PI), rand(0, Math.PI));
      this.scene.add(mesh);
      this.confettiPool.push({
        mesh,
        velocity: new THREE.Vector3(rand(-3.2, 3.2), rand(3.5, 7), rand(-2.2, 2.2)),
        angular: new THREE.Vector3(rand(-6, 6), rand(-6, 6), rand(-6, 6)),
        life: 0,
        maxLife: rand(1.6, 2.6),
      });
    }
  }

  updateConfetti(delta: number) {
    const gravity = 5.2;
    for (let i = this.confettiPool.length - 1; i >= 0; i--) {
      const p = this.confettiPool[i];
      p.life += delta;
      p.velocity.y -= gravity * delta;
      p.mesh.position.addScaledVector(p.velocity, delta);
      p.mesh.rotation.x += p.angular.x * delta;
      p.mesh.rotation.y += p.angular.y * delta;
      p.mesh.rotation.z += p.angular.z * delta;
      const t = p.life / p.maxLife;
      if (p.mesh.material.opacity !== undefined) {
        p.mesh.material.transparent = true;
        p.mesh.material.opacity = Math.max(0, 1 - t);
      }
      if (t >= 1) {
        this.scene.remove(p.mesh);
        this.confettiPool.splice(i, 1);
      }
    }
  }

  celebrateConfetti() {
    const THREE = this.THREE;
    const pos = new THREE.Vector3(this.currentX, 3, 1);
    this.spawnConfetti(pos, 150);
  }

  // ---------- CAMERA / NAVIGATION ----------

  updateCameraDistance() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const aspect = w / h;
    if (aspect < 0.6) this.zDist = 14.5;
    else if (aspect < 0.85) this.zDist = 12.5;
    else if (aspect < 1.1) this.zDist = 10.5;
    else this.zDist = 9;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  resize() {
    if (!this.renderer) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    this.updateCameraDistance();
  }

  setMouse(nx: number, ny: number) {
    this.mouse.x = nx;
    this.mouse.y = ny;
  }

  goToSlide(index: number) {
    const clamped = Math.max(0, Math.min(SLIDE_COUNT - 1, index));
    const toX = clamped * SPACING;
    if (clamped === this.currentIndex && Math.abs(toX - this.currentX) < 0.001) {
      return;
    }
    this.currentIndex = clamped;
    this.flight = {
      active: true,
      start: performance.now(),
      duration: this.reducedMotion ? 350 : 1700,
      fromX: this.currentX,
      toX,
      pullBack: 0,
      tilt: 0,
    };
  }

  updateFlight() {
    if (!this.flight.active) {
      this.currentX = this.currentIndex * SPACING;
      return;
    }
    const now = performance.now();
    const p = Math.min((now - this.flight.start) / this.flight.duration, 1);
    const eased = easeInOutCubic(p);
    this.currentX = lerp(this.flight.fromX, this.flight.toX, eased);
    const arch = Math.sin(p * Math.PI);
    const pullBackAmt = this.reducedMotion ? 0 : 2.4;
    const tiltAmt = this.reducedMotion ? 0 : 0.09;
    const dir = this.flight.toX >= this.flight.fromX ? 1 : -1;
    this.flight.pullBack = arch * pullBackAmt;
    this.flight.tilt = arch * tiltAmt * dir;
    if (p >= 1) {
      this.flight.active = false;
      this.currentX = this.flight.toX;
      this.flight.pullBack = 0;
      this.flight.tilt = 0;
      if (this.onSettled) this.onSettled(this.currentIndex);
    }
  }

  updateCameraTransform() {
    const targetParX = this.reducedMotion ? 0 : this.mouse.x * 0.6;
    const targetParY = this.reducedMotion ? 0 : -this.mouse.y * 0.3;
    const smoothing = 1 - Math.pow(0.0001, this.lastDelta || 0.016);
    this.parallax.x = lerp(this.parallax.x, targetParX, smoothing);
    this.parallax.y = lerp(this.parallax.y, targetParY, smoothing);

    const bob = this.reducedMotion ? 0 : Math.sin(this.time * 0.6) * 0.08;

    this.camera.position.x = this.currentX + this.parallax.x;
    this.camera.position.y = 2.6 + this.parallax.y + bob;
    this.camera.position.z = this.zDist + this.flight.pullBack;
    this.camera.rotation.set(0, 0, 0);
    this.camera.lookAt(this.currentX, 0.3, 0);
    if (this.flight.tilt) this.camera.rotateZ(this.flight.tilt);
  }

  // ---------- PER-FRAME UPDATES ----------

  updateBalloons(_delta: number) {
    this.balloons.forEach((b) => {
      const t = this.time;
      b.mesh.position.y = b.baseY + Math.sin(t * b.speedY + b.phase) * 0.45;
      b.mesh.position.x = b.baseX + Math.sin(t * 0.25 + b.phase) * b.swayAmp * 0.4;
      b.mesh.rotation.z = Math.sin(t * b.swaySpeed + b.phase) * 0.15;
    });
  }

  updateParticles(delta: number) {
    this.particleLayers.forEach((layer) => {
      layer.points.rotation.y += layer.speed * delta * 0.05;
      layer.points.position.y = Math.sin(this.time * 0.05 + layer.phase) * 0.5;
    });
  }

  updateCake(delta: number) {
    const refs = this.cakeRefs;
    if (!refs.cake) return;
    refs.cake.rotation.y += delta * (this.reducedMotion ? 0.03 : 0.18);
    refs.candles.forEach((c: any) => {
      if (!c.lit) return;
      const flick = 1 + Math.sin(this.time * 18 + c.seed) * 0.12 + Math.sin(this.time * 37 + c.seed) * 0.06;
      c.flame.scale.set(flick, flick, flick);
      c.glow.material.opacity = 0.7 + Math.sin(this.time * 14 + c.seed) * 0.15;
    });
    if (refs.candleLight && refs.candles.some((c: any) => c.lit)) {
      refs.candleLight.intensity = 1.3 + Math.sin(this.time * 20) * 0.15;
    }
  }

  updateStar(delta: number) {
    const refs = this.starRefs;
    if (!refs.star) return;
    refs.star.rotation.y += delta * (this.reducedMotion ? 0.08 : 0.5);
    refs.star.rotation.x = Math.sin(this.time * 0.3) * 0.08;
    refs.sparkles.forEach((s: any) => {
      const angle = s.angle + this.time * s.speed * (this.reducedMotion ? 0.2 : 1);
      s.sprite.position.set(
        Math.cos(angle) * s.radius,
        Math.sin(this.time * 0.8 + s.phase) * 0.6,
        Math.sin(angle) * s.radius
      );
      s.sprite.material.opacity = 0.6 + Math.sin(this.time * 3 + s.phase) * 0.35;
    });
  }

  updateFlower(_delta: number) {
    const refs = this.flowerRefs;
    if (!refs.flower) return;
    const t = this.time;
    refs.slideGroup.rotation.z = Math.sin(t * 0.6) * 0.05;
    refs.slideGroup.rotation.x = Math.sin(t * 0.4) * 0.03;
    refs.flower.rotation.y = Math.sin(t * 0.3) * 0.25;
  }

  updateGift(delta: number) {
    const refs = this.giftRefs;
    if (!refs.gift) return;
    refs.gift.position.y = refs.baseY + Math.sin(this.time * 0.8) * 0.22;
    refs.gift.rotation.y += delta * (this.reducedMotion ? 0.05 : 0.35);
  }

  updateHeart(delta: number) {
    const refs = this.heartRefs;
    if (!refs.heart) return;
    const pulse = Math.max(0, Math.sin(this.time * 2.4)) ** 6 * 0.18;
    const s = 1.7 * (1 + pulse);
    refs.heart.scale.setScalar(s);
    refs.heart.rotation.y += delta * (this.reducedMotion ? 0.07 : 0.45);

    refs.minis.forEach((m: any) => {
      m.sprite.position.y += delta * m.speed * (this.reducedMotion ? 0.3 : 1);
      if (m.sprite.position.y > 3.2) m.sprite.position.y = -2.6;
      const h = (m.sprite.position.y + 2.6) / 5.8;
      m.sprite.material.opacity = Math.sin(h * Math.PI) * 0.9;
    });
  }

  // ---------- MAIN LOOP ----------

  lastDelta = 0.016;

  animate() {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.05);
    this.lastDelta = delta;
    this.time += delta;

    this.updateFlight();
    this.updateCameraTransform();
    this.updateBalloons(delta);
    this.updateParticles(delta);
    this.updateCake(delta);
    this.updateStar(delta);
    this.updateFlower(delta);
    this.updateGift(delta);
    this.updateHeart(delta);
    this.updateConfetti(delta);

    this.renderer.render(this.scene, this.camera);
  }

  start() {
    this.clock.start();
    this.animate();
  }

  dispose() {
    this.disposed = true;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }
}
