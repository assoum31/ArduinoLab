import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Cpu,
  ExternalLink,
  FolderKanban,
  GraduationCap,
  Layers,
  Palette,
  RotateCw,
  Sliders,
  SunMedium,
  Tag,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { tLoc, translations } from '../../i18n/translations';
import { BOARD_PARTS, type BoardPartSpec } from '../../data/boardParts';
import { LESSONS } from '../../data/lessons';
import { ALL_READY_PROJECTS } from '../../data/showcaseProjects';
import { soundEngine } from '../../utils/sound';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import {
  PCB_FINISHES,
  type PcbFinish,
  createBrushedMetalTexture,
  createEsdMatTexture,
  createMcuTopTexture,
  createPcbAlbedoTexture,
  createPcbBumpTexture,
  createUnoPcbGeometry,
} from './pcbMaterials';

type CameraPreset = 'isometric' | 'top' | 'pinout' | 'mcu' | 'side';
type LightingPreset = 'studio' | 'warm' | 'dramatic';

const CAMERA_PRESETS: Record<
  CameraPreset,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  isometric: { pos: [4.5, 4.1, 5.1], target: [0, 0.25, 0] },
  top: { pos: [0, 7.4, 0.15], target: [0, 0.1, 0] },
  pinout: { pos: [0.2, 4.6, 5.1], target: [0.2, 0.2, 0.15] },
  mcu: { pos: [1.65, 2.9, 2.45], target: [0.55, 0.25, 0.55] },
  side: { pos: [-5.2, 1.45, 3.3], target: [-0.2, 0.35, 0.1] },
};

const LIGHTING_CONFIGS: Record<
  LightingPreset,
  {
    hemiSky: number;
    hemiGround: number;
    hemiInt: number;
    keyColor: number;
    keyInt: number;
    keyPos: [number, number, number];
    rimColor: number;
    rimInt: number;
    exposure: number;
  }
> = {
  studio: {
    hemiSky: 0xdbeafe,
    hemiGround: 0x1e293b,
    hemiInt: 0.9,
    keyColor: 0xfffaf0,
    keyInt: 2.3,
    keyPos: [5.5, 8.5, 5.0],
    rimColor: 0x38bdf8,
    rimInt: 1.05,
    exposure: 1.12,
  },
  warm: {
    hemiSky: 0xfef3c7,
    hemiGround: 0x292524,
    hemiInt: 0.78,
    keyColor: 0xffd8a8,
    keyInt: 2.65,
    keyPos: [6.2, 7.2, 4.0],
    rimColor: 0xf59e0b,
    rimInt: 0.95,
    exposure: 1.08,
  },
  dramatic: {
    hemiSky: 0x94a3b8,
    hemiGround: 0x090d16,
    hemiInt: 0.32,
    keyColor: 0xe0f2fe,
    keyInt: 2.9,
    keyPos: [4.2, 6.2, 5.6],
    rimColor: 0x06b6d4,
    rimInt: 2.2,
    exposure: 1.18,
  },
};

// Reusable vectors for zero-GC animation loop
const _targetPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();
const _mouse = new THREE.Vector2();

function createContactShadowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 22, 128, 128, 122);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.62)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.28)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function UnoStudio3D() {
  const { lang, theme, setActiveTab, loadIntoSimulator } = useApp();
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [selectedPart, setSelectedPart] = useState<BoardPartSpec | null>(null);
  const [hoveredPartId, setHoveredPartId] = useState<string | null>(null);
  const [dockOpen, setDockOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
  );
  const [activePreset, setActivePreset] = useState<CameraPreset>('isometric');
  const [pcbFinish, setPcbFinish] = useState<PcbFinish>('teal');
  const [lightingMode, setLightingMode] = useState<LightingPreset>('studio');
  const [explodePct, setExplodePct] = useState(0);
  const [autoSpin, setAutoSpin] = useState(false);
  const [d13Blink, setD13Blink] = useState(true);
  const [d13Manual, setD13Manual] = useState(true);
  const [pwmValue, setPwmValue] = useState(195);
  const [analogValue, setAnalogValue] = useState(512);
  const [showPinBadges, setShowPinBadges] = useState(true);
  const [webglError, setWebglError] = useState(false);
  const [zoomPct, setZoomPct] = useState(100);
  const cameraZoomRef = useRef<{
    dolly: (scaleFactor: number) => void;
    reset: () => void;
  } | null>(null);

  // Refs synced into Three.js animation loop without tearing down renderer
  const liveStateRef = useRef({
    d13Blink,
    d13Manual,
    pwmValue,
    analogValue,
    theme,
    pcbFinish,
    lightingMode,
    explodeAmount: explodePct / 100,
    autoSpin,
    selectedPartId: selectedPart?.id ?? null,
    cameraTransition: null as {
      pos: [number, number, number];
      target: [number, number, number];
    } | null,
  });

  useEffect(() => {
    liveStateRef.current.d13Blink = d13Blink;
    liveStateRef.current.d13Manual = d13Manual;
    liveStateRef.current.pwmValue = pwmValue;
    liveStateRef.current.analogValue = analogValue;
    liveStateRef.current.theme = theme;
    liveStateRef.current.pcbFinish = pcbFinish;
    liveStateRef.current.lightingMode = lightingMode;
    liveStateRef.current.explodeAmount = explodePct / 100;
    liveStateRef.current.autoSpin = autoSpin;
    liveStateRef.current.selectedPartId = selectedPart?.id ?? null;
  }, [
    d13Blink,
    d13Manual,
    pwmValue,
    analogValue,
    theme,
    pcbFinish,
    lightingMode,
    explodePct,
    autoSpin,
    selectedPart,
  ]);

  const setPreset = (preset: CameraPreset) => {
    soundEngine.playSelect();
    setActivePreset(preset);
    liveStateRef.current.cameraTransition = {
      pos: [...CAMERA_PRESETS[preset].pos],
      target: [...CAMERA_PRESETS[preset].target],
    };
  };

  const focusPart = (partId: string) => {
    const spec = BOARD_PARTS[partId];
    if (!spec) return;
    soundEngine.playSelect();
    setSelectedPart(spec);
    liveStateRef.current.cameraTransition = {
      pos: [...spec.focusCamera],
      target: [...spec.focusTarget],
    };
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Software WebGL detection per Three.js guidelines
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError(true);
      return;
    }

    const maxAnisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    const width = container.clientWidth || 960;
    const height = container.clientHeight || 560;
    renderer.setSize(width, height);
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    renderer.domElement.style.touchAction = 'none';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const bgHex = liveStateRef.current.theme === 'dark' ? 0x0b1120 : 0xe9eff6;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, 0.015);

    // Studio IBL Environment Reflections (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 120);
    camera.position.set(...CAMERA_PRESETS.isometric.pos);

    const DEFAULT_CAM_DIST = Math.hypot(
      CAMERA_PRESETS.isometric.pos[0] - CAMERA_PRESETS.isometric.target[0],
      CAMERA_PRESETS.isometric.pos[1] - CAMERA_PRESETS.isometric.target[1],
      CAMERA_PRESETS.isometric.pos[2] - CAMERA_PRESETS.isometric.target[2],
    );
    const MIN_CAM_DIST = 1.8;
    const MAX_CAM_DIST = 26.0;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.enableZoom = true;
    controls.zoomSpeed = 1.15;
    controls.minDistance = MIN_CAM_DIST;
    controls.maxDistance = MAX_CAM_DIST;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.autoRotateSpeed = 1.6;
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    controls.target.set(...CAMERA_PRESETS.isometric.target);
    controls.addEventListener('start', () => {
      liveStateRef.current.cameraTransition = null;
    });

    let lastZoomReport = 0;
    const syncZoomDisplay = () => {
      const now = performance.now();
      if (now - lastZoomReport < 60) return;
      lastZoomReport = now;
      const dist = camera.position.distanceTo(controls.target);
      const pct = Math.round((DEFAULT_CAM_DIST / Math.max(0.1, dist)) * 100);
      setZoomPct(Math.max(25, Math.min(450, pct)));
    };
    controls.addEventListener('change', syncZoomDisplay);

    cameraZoomRef.current = {
      dolly: (scaleFactor: number) => {
        const curTarget = liveStateRef.current.cameraTransition
          ? new THREE.Vector3(...liveStateRef.current.cameraTransition.target)
          : controls.target.clone();
        const curPos = liveStateRef.current.cameraTransition
          ? new THREE.Vector3(...liveStateRef.current.cameraTransition.pos)
          : camera.position.clone();
        const offset = curPos.sub(curTarget);
        const curDist = offset.length() || DEFAULT_CAM_DIST;
        const nextDist = THREE.MathUtils.clamp(
          curDist * scaleFactor,
          MIN_CAM_DIST,
          MAX_CAM_DIST,
        );
        offset.normalize().multiplyScalar(nextDist);
        const nextPos = curTarget.clone().add(offset);
        liveStateRef.current.cameraTransition = {
          pos: [nextPos.x, nextPos.y, nextPos.z],
          target: [curTarget.x, curTarget.y, curTarget.z],
        };
        setZoomPct(
          Math.max(25, Math.min(450, Math.round((DEFAULT_CAM_DIST / nextDist) * 100))),
        );
      },
      reset: () => {
        liveStateRef.current.cameraTransition = {
          pos: [...CAMERA_PRESETS.isometric.pos],
          target: [...CAMERA_PRESETS.isometric.target],
        };
        setActivePreset('isometric');
        setZoomPct(100);
      },
    };

    // Studio Lights (dynamically synced with lightingMode)
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.9);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffaf0, 2.3);
    keyLight.position.set(5.5, 8.5, 5.0);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -5.5;
    keyLight.shadow.camera.right = 5.5;
    keyLight.shadow.camera.top = 5.5;
    keyLight.shadow.camera.bottom = -5.5;
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.05);
    rimLight.position.set(-5.8, 4.2, -4.6);
    scene.add(rimLight);

    // =========================================================================
    // ANTI-STATIC ESD WORKBENCH MAT + CONTACT SHADOW GROUNDING
    // =========================================================================
    const esdDarkTex = createEsdMatTexture(true, maxAnisotropy);
    const esdLightTex = createEsdMatTexture(false, maxAnisotropy);
    const esdMat = new THREE.MeshStandardMaterial({
      map: liveStateRef.current.theme === 'dark' ? esdDarkTex : esdLightTex,
      roughness: 0.84,
      metalness: 0.04,
    });
    const esdPlane = new THREE.Mesh(new THREE.PlaneGeometry(14.5, 11.2), esdMat);
    esdPlane.rotation.x = -Math.PI / 2;
    esdPlane.position.y = -0.015;
    esdPlane.receiveShadow = true;
    scene.add(esdPlane);

    const shadowTex = createContactShadowTexture();
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(8.2, 6.0),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.58,
      }),
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.002;
    scene.add(shadowPlane);

    // =========================================================================
    // COMPOSITE MULTI-PART PHOTOREALISTIC ARDUINO UNO R3 GROUP
    // =========================================================================
    const boardGroup = new THREE.Group();
    boardGroup.position.y = 0.08;
    scene.add(boardGroup);

    const clickableMeshes: THREE.Object3D[] = [];
    const partMaterials = new Map<string, THREE.MeshStandardMaterial[]>();
    const explodableParts: Array<{
      obj: THREE.Object3D;
      baseY: number;
      liftY: number;
    }> = [];

    const registerClickable = (
      obj: THREE.Object3D,
      partId: string,
      mat?: THREE.MeshStandardMaterial,
    ) => {
      obj.userData.partId = partId;
      clickableMeshes.push(obj);
      if (mat) {
        const list = partMaterials.get(partId) || [];
        list.push(mat);
        partMaterials.set(partId, list);
      }
    };

    const registerExplodable = (obj: THREE.Object3D, liftY: number) => {
      explodableParts.push({ obj, baseY: obj.position.y, liftY });
    };

    // Shared PBR Textures & Materials
    const pcbTexCache = new Map<PcbFinish, THREE.CanvasTexture>();
    const getPcbTexture = (finish: PcbFinish) => {
      let tex = pcbTexCache.get(finish);
      if (!tex) {
        tex = createPcbAlbedoTexture(finish, maxAnisotropy);
        pcbTexCache.set(finish, tex);
      }
      return tex;
    };

    const pcbBumpTex = createPcbBumpTexture(maxAnisotropy);
    const brushedTex = createBrushedMetalTexture(maxAnisotropy);
    const mcuTopTex = createMcuTopTexture(maxAnisotropy);

    const brushedSilverMat = new THREE.MeshPhysicalMaterial({
      color: 0xe2e8f0,
      metalness: 0.94,
      roughness: 0.24,
      roughnessMap: brushedTex,
      bumpMap: brushedTex,
      bumpScale: 0.004,
      anisotropy: 0.6,
      envMapIntensity: 1.35,
    });

    const goldPlatedMat = new THREE.MeshPhysicalMaterial({
      color: 0xe6bf47,
      metalness: 0.95,
      roughness: 0.18,
      clearcoat: 0.35,
      clearcoatRoughness: 0.15,
      envMapIntensity: 1.3,
    });

    const darkPolymerMat = new THREE.MeshPhysicalMaterial({
      color: 0x161b24,
      roughness: 0.54,
      metalness: 0.06,
      clearcoat: 0.15,
      clearcoatRoughness: 0.4,
    });

    // 1. Authentic Beveled Notched Arduino Uno R3 PCB (MeshPhysicalMaterial + Clearcoat)
    const initPalette = PCB_FINISHES[liveStateRef.current.pcbFinish];
    const pcbTopMat = new THREE.MeshPhysicalMaterial({
      map: getPcbTexture(liveStateRef.current.pcbFinish),
      bumpMap: pcbBumpTex,
      bumpScale: 0.018,
      roughness: initPalette.roughness,
      metalness: 0.08,
      clearcoat: initPalette.clearcoat,
      clearcoatRoughness: initPalette.clearcoatRoughness,
      reflectivity: 0.9,
      envMapIntensity: 1.15,
    });
    const pcbEdgeMat = new THREE.MeshStandardMaterial({
      color: initPalette.edgeHex,
      roughness: 0.42,
      metalness: 0.12,
    });

    const pcbGeo = createUnoPcbGeometry();
    const pcbMesh = new THREE.Mesh(pcbGeo, [pcbTopMat, pcbEdgeMat]);
    pcbMesh.castShadow = true;
    pcbMesh.receiveShadow = true;
    boardGroup.add(pcbMesh);

    // 4 Gold-Plated Mounting Holes with dark through-hole centers
    const holeCoords: Array<[number, number]> = [
      [-2.35, -1.55],
      [2.42, -1.42],
      [2.42, 1.45],
      [-2.25, 1.6],
    ];
    holeCoords.forEach(([hx, hz]) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.135, 0.036, 12, 24),
        goldPlatedMat,
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(hx, 0.082, hz);
      boardGroup.add(ring);

      const bore = new THREE.Mesh(
        new THREE.CylinderGeometry(0.095, 0.095, 0.165, 16),
        new THREE.MeshStandardMaterial({ color: 0x05080f, roughness: 0.9 }),
      );
      bore.position.set(hx, 0.004, hz);
      boardGroup.add(bore);
    });

    // 2. USB Type-B Anisotropic Brushed Metallic Housing (Multi-Part)
    const usbGroup = new THREE.Group();
    usbGroup.position.set(-2.42, 0.44, -0.78);
    const usbMat = brushedSilverMat.clone();
    const usbOuter = new THREE.Mesh(
      new THREE.BoxGeometry(1.18, 0.72, 0.88),
      usbMat,
    );
    usbOuter.castShadow = true;
    usbOuter.receiveShadow = true;
    usbGroup.add(usbOuter);

    // Stamped steel seam bezel on top of USB shield
    const usbSeam = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.02, 0.64),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.32 }),
    );
    usbSeam.position.set(0.04, 0.365, 0);
    usbGroup.add(usbSeam);

    const usbCavity = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.52, 0.66),
      new THREE.MeshStandardMaterial({ color: 0x0b0f17, roughness: 0.85 }),
    );
    usbCavity.position.set(-0.54, 0, 0);
    usbGroup.add(usbCavity);

    const usbTongue = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.14, 0.36),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.42 }),
    );
    usbTongue.position.set(-0.5, 0, 0);
    usbGroup.add(usbTongue);

    // 4 tiny gold contact stripes inside USB-B
    [-0.1, 0.1].forEach((cz) => {
      const contact = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.03, 0.05),
        goldPlatedMat,
      );
      contact.position.set(-0.5, 0.08, cz);
      usbGroup.add(contact);
    });

    registerClickable(usbOuter, 'usb', usbMat);
    registerExplodable(usbGroup, 0.85);
    boardGroup.add(usbGroup);

    // 2b. Gold PTC Resettable Polyfuse (500mA) beside USB
    const polyfuseGroup = new THREE.Group();
    polyfuseGroup.position.set(-1.72, 0.14, -1.28);
    const fuseBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.12, 0.24),
      goldPlatedMat,
    );
    fuseBody.castShadow = true;
    polyfuseGroup.add(fuseBody);
    [-0.17, 0.17].forEach((fx) => {
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.13, 0.25),
        brushedSilverMat,
      );
      cap.position.x = fx;
      polyfuseGroup.add(cap);
    });
    registerClickable(fuseBody, 'usb', usbMat);
    registerExplodable(polyfuseGroup, 0.55);
    boardGroup.add(polyfuseGroup);

    // 2c. ATmega16U2 USB-to-Serial QFP-32 SMD Microcontroller + 32 Gull-Wing Leads
    const u2Group = new THREE.Group();
    u2Group.position.set(-1.32, 0.13, -0.78);
    const u2Body = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.09, 0.42),
      darkPolymerMat,
    );
    u2Body.castShadow = true;
    u2Group.add(u2Body);
    const u2PinGeo = new THREE.BoxGeometry(0.025, 0.035, 0.08);
    const u2Pins = new THREE.InstancedMesh(u2PinGeo, brushedSilverMat, 32);
    const dummy = new THREE.Object3D();
    let u2Idx = 0;
    for (let i = 0; i < 8; i++) {
      const offset = -0.157 + i * 0.045;
      // Top & Bottom rows
      dummy.rotation.set(0, 0, 0);
      dummy.position.set(offset, -0.02, -0.24);
      dummy.updateMatrix();
      u2Pins.setMatrixAt(u2Idx++, dummy.matrix);

      dummy.position.set(offset, -0.02, 0.24);
      dummy.updateMatrix();
      u2Pins.setMatrixAt(u2Idx++, dummy.matrix);

      // Left & Right rows
      dummy.rotation.set(0, Math.PI / 2, 0);
      dummy.position.set(-0.24, -0.02, offset);
      dummy.updateMatrix();
      u2Pins.setMatrixAt(u2Idx++, dummy.matrix);

      dummy.position.set(0.24, -0.02, offset);
      dummy.updateMatrix();
      u2Pins.setMatrixAt(u2Idx++, dummy.matrix);
    }
    dummy.rotation.set(0, 0, 0);
    u2Pins.computeBoundingSphere();
    u2Group.add(u2Pins);
    registerClickable(u2Body, 'usb', usbMat);
    registerExplodable(u2Group, 0.65);
    boardGroup.add(u2Group);

    // 3. DC Barrel Power Jack (7-12V)
    const barrelGroup = new THREE.Group();
    barrelGroup.position.set(-2.35, 0.4, 1.15);
    const barrelPlasticMat = darkPolymerMat.clone();
    const barrelBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.64, 0.68),
      barrelPlasticMat,
    );
    barrelBody.castShadow = true;
    barrelBody.receiveShadow = true;
    barrelGroup.add(barrelBody);
    const barrelHole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.21, 0.21, 0.2, 20),
      new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.92 }),
    );
    barrelHole.rotation.z = Math.PI / 2;
    barrelHole.position.set(-0.5, 0, 0);
    barrelGroup.add(barrelHole);
    const barrelPin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.28, 14),
      goldPlatedMat,
    );
    barrelPin.rotation.z = Math.PI / 2;
    barrelPin.position.set(-0.48, 0, 0);
    barrelGroup.add(barrelPin);
    registerClickable(barrelBody, 'barrel', barrelPlasticMat);
    registerExplodable(barrelGroup, 0.78);
    boardGroup.add(barrelGroup);

    // 4. ATmega328P DIP-28 Microcontroller (Socket + Laser-Etched Epoxy Top + 28 Legs)
    const mcuGroup = new THREE.Group();
    mcuGroup.position.set(0.65, 0.16, 0.62);

    const mcuSocket = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.15, 0.74),
      new THREE.MeshStandardMaterial({ color: 0x0f131a, roughness: 0.72 }),
    );
    mcuSocket.castShadow = true;
    mcuGroup.add(mcuSocket);

    // Chip itself sits in a sub-group so in Exploded View it rises ABOVE the DIP socket!
    const mcuChipGroup = new THREE.Group();
    mcuChipGroup.position.y = 0.14;
    const mcuSideMat = new THREE.MeshPhysicalMaterial({
      color: 0x1a1f29,
      roughness: 0.48,
      metalness: 0.12,
      clearcoat: 0.18,
      clearcoatRoughness: 0.42,
    });
    const mcuTopMat = new THREE.MeshPhysicalMaterial({
      map: mcuTopTex,
      roughness: 0.44,
      metalness: 0.12,
      clearcoat: 0.22,
      clearcoatRoughness: 0.36,
    });
    const mcuBody = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.22, 0.62), [
      mcuSideMat,
      mcuSideMat,
      mcuTopMat,
      mcuSideMat,
      mcuSideMat,
      mcuSideMat,
    ]);
    mcuBody.castShadow = true;
    mcuBody.receiveShadow = true;
    mcuChipGroup.add(mcuBody);

    // Pin-1 notch indicator
    const mcuNotch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.085, 0.225, 16),
      new THREE.MeshStandardMaterial({ color: 0x090d14, roughness: 0.8 }),
    );
    mcuNotch.position.set(-1.1, 0, 0);
    mcuChipGroup.add(mcuNotch);

    // 28 instanced bent IC legs
    const legGeo = new THREE.BoxGeometry(0.048, 0.2, 0.095);
    const legInst = new THREE.InstancedMesh(legGeo, brushedSilverMat, 28);
    let legIdx = 0;
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 14; i++) {
        dummy.position.set(-1.04 + i * 0.16, -0.09, side * 0.34);
        dummy.updateMatrix();
        legInst.setMatrixAt(legIdx++, dummy.matrix);
      }
    }
    legInst.computeBoundingSphere();
    mcuChipGroup.add(legInst);

    mcuGroup.add(mcuChipGroup);
    registerClickable(mcuBody, 'atmega328p', mcuTopMat);
    registerExplodable(mcuGroup, 0.42);
    registerExplodable(mcuChipGroup, 0.95);
    boardGroup.add(mcuGroup);

    // 5. 16 MHz Metallic Quartz Crystal Oscillator (with metal flange + solder leads)
    const crystalMat = brushedSilverMat.clone();
    crystalMat.roughness = 0.14;
    const crystalGroup = new THREE.Group();
    crystalGroup.position.set(-0.92, 0.21, 0.35);

    const crystalFlange = new THREE.Mesh(
      new THREE.BoxGeometry(0.76, 0.04, 0.24),
      crystalMat,
    );
    crystalFlange.position.y = -0.1;
    crystalGroup.add(crystalFlange);

    const crystalMain = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.135, 0.42, 10, 20),
      crystalMat,
    );
    crystalMain.rotation.z = Math.PI / 2;
    crystalMain.scale.set(1, 1, 0.65);
    crystalMain.castShadow = true;
    crystalGroup.add(crystalMain);

    registerClickable(crystalMain, 'crystal', crystalMat);
    registerExplodable(crystalGroup, 0.92);
    boardGroup.add(crystalGroup);

    // 6. 5V Voltage Regulator (NCP1117) + Dual Detailed Electrolytic Capacitors
    const regGroup = new THREE.Group();
    regGroup.position.set(-1.45, 0.17, 1.12);
    const regMat = darkPolymerMat.clone();
    const regBody = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.18, 0.36), regMat);
    regBody.castShadow = true;
    regGroup.add(regBody);

    const regTab = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.06, 0.22),
      brushedSilverMat,
    );
    regTab.position.set(0, -0.02, 0.25);
    regGroup.add(regTab);

    // 3 solder leads on opposite edge of SOT-223 regulator
    [-0.14, 0, 0.14].forEach((lx) => {
      const lead = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, 0.045, 0.12),
        brushedSilverMat,
      );
      lead.position.set(lx, -0.04, -0.22);
      regGroup.add(lead);
    });

    // 2 Cylindrical SMD Aluminum Electrolytic Capacitors with Black Polarity Bands & Base
    const capBodyMat = brushedSilverMat.clone();
    capBodyMat.roughness = 0.18;
    const capPolarityMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.45,
      metalness: 0.15,
    });
    [-0.5, -0.92].forEach((cx) => {
      const capSub = new THREE.Group();
      capSub.position.set(cx, 0.11, -0.45);

      const base = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.06, 0.36),
        darkPolymerMat,
      );
      base.position.y = -0.17;
      capSub.add(base);

      const can = new THREE.Mesh(
        new THREE.CylinderGeometry(0.155, 0.155, 0.36, 24),
        capBodyMat,
      );
      can.castShadow = true;
      capSub.add(can);

      // Black negative polarity crescent cap on top
      const negBand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.157, 0.157, 0.02, 16, 1, false, 0, Math.PI * 0.72),
        capPolarityMat,
      );
      negBand.position.y = 0.175;
      capSub.add(negBand);

      regGroup.add(capSub);
    });
    registerClickable(regBody, 'regulator', regMat);
    registerExplodable(regGroup, 0.72);
    boardGroup.add(regGroup);

    // 7. Tactile Reset Button (Metallic housing + brass rivets + crimson actuator cap)
    const resetGroup = new THREE.Group();
    resetGroup.position.set(-2.22, 0.18, -1.45);
    const resetHousing = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.16, 0.38),
      brushedSilverMat,
    );
    resetHousing.castShadow = true;
    resetGroup.add(resetHousing);
    const resetCapMat = new THREE.MeshPhysicalMaterial({
      color: 0xdc2626,
      roughness: 0.3,
      metalness: 0.04,
      clearcoat: 0.55,
      clearcoatRoughness: 0.2,
    });
    const resetCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.105, 0.115, 0.15, 20),
      resetCapMat,
    );
    resetCap.position.y = 0.125;
    resetCap.castShadow = true;
    resetGroup.add(resetCap);
    registerClickable(resetCap, 'reset', resetCapMat);
    registerClickable(resetHousing, 'reset', resetCapMat);
    registerExplodable(resetGroup, 0.9);
    boardGroup.add(resetGroup);

    // 8. Female Pin Headers (Digital, Power, Analog) + Gold-Plated Contact Cavities
    const headerMatDigital = darkPolymerMat.clone();
    const headerMatPower = darkPolymerMat.clone();
    const headerMatAnalog = darkPolymerMat.clone();

    const sockGeo = new THREE.BoxGeometry(0.11, 0.045, 0.11);

    // Digital header group (top edge)
    const digitalHeaderGroup = new THREE.Group();
    digitalHeaderGroup.position.set(0.35, 0.3, -1.65);
    const digitalHeader = new THREE.Mesh(
      new THREE.BoxGeometry(4.18, 0.44, 0.26),
      headerMatDigital,
    );
    digitalHeader.castShadow = true;
    digitalHeader.receiveShadow = true;
    digitalHeaderGroup.add(digitalHeader);

    const digSockInst = new THREE.InstancedMesh(sockGeo, goldPlatedMat, 18);
    for (let i = 0; i < 18; i++) {
      dummy.position.set(-1.93 + i * 0.226, 0.22, 0);
      dummy.updateMatrix();
      digSockInst.setMatrixAt(i, dummy.matrix);
    }
    digSockInst.computeBoundingSphere();
    digitalHeaderGroup.add(digSockInst);
    registerClickable(digitalHeader, 'digital', headerMatDigital);
    registerExplodable(digitalHeaderGroup, 0.75);
    boardGroup.add(digitalHeaderGroup);

    // Power header group (bottom-left)
    const powerHeaderGroup = new THREE.Group();
    powerHeaderGroup.position.set(-0.22, 0.3, 1.65);
    const powerHeader = new THREE.Mesh(
      new THREE.BoxGeometry(1.78, 0.44, 0.26),
      headerMatPower,
    );
    powerHeader.castShadow = true;
    powerHeader.receiveShadow = true;
    powerHeaderGroup.add(powerHeader);

    const pwrSockInst = new THREE.InstancedMesh(sockGeo, goldPlatedMat, 8);
    for (let i = 0; i < 8; i++) {
      dummy.position.set(-0.76 + i * 0.22, 0.22, 0);
      dummy.updateMatrix();
      pwrSockInst.setMatrixAt(i, dummy.matrix);
    }
    pwrSockInst.computeBoundingSphere();
    powerHeaderGroup.add(pwrSockInst);
    registerClickable(powerHeader, 'power', headerMatPower);
    registerExplodable(powerHeaderGroup, 0.75);
    boardGroup.add(powerHeaderGroup);

    // Analog header group (bottom-right)
    const analogHeaderGroup = new THREE.Group();
    analogHeaderGroup.position.set(1.58, 0.3, 1.65);
    const analogHeader = new THREE.Mesh(
      new THREE.BoxGeometry(1.42, 0.44, 0.26),
      headerMatAnalog,
    );
    analogHeader.castShadow = true;
    analogHeader.receiveShadow = true;
    analogHeaderGroup.add(analogHeader);

    const anaSockInst = new THREE.InstancedMesh(sockGeo, goldPlatedMat, 6);
    for (let i = 0; i < 6; i++) {
      dummy.position.set(-0.58 + i * 0.23, 0.22, 0);
      dummy.updateMatrix();
      anaSockInst.setMatrixAt(i, dummy.matrix);
    }
    anaSockInst.computeBoundingSphere();
    analogHeaderGroup.add(anaSockInst);
    registerClickable(analogHeader, 'analog', headerMatAnalog);
    registerExplodable(analogHeaderGroup, 0.75);
    boardGroup.add(analogHeaderGroup);

    // 6-pin ICSP Gold Header (right edge) + 6-pin 16U2 ICSP Header
    const icspGroup = new THREE.Group();
    const icspBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.1, 0.52),
      darkPolymerMat,
    );
    icspBase.position.set(2.34, 0.13, -0.04);
    icspGroup.add(icspBase);

    const icspPinGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.36, 10);
    const icspInst = new THREE.InstancedMesh(icspPinGeo, goldPlatedMat, 12);
    let ipIdx = 0;
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        dummy.position.set(2.26 + r * 0.16, 0.26, -0.2 + c * 0.16);
        dummy.updateMatrix();
        icspInst.setMatrixAt(ipIdx++, dummy.matrix);

        dummy.position.set(-0.98 + r * 0.15, 0.24, -1.2 + c * 0.15);
        dummy.updateMatrix();
        icspInst.setMatrixAt(ipIdx++, dummy.matrix);
      }
    }
    icspInst.computeBoundingSphere();
    icspGroup.add(icspInst);
    registerExplodable(icspGroup, 0.62);
    boardGroup.add(icspGroup);

    // Miniature 0805 SMD Resistors & Ceramic Capacitors for macro hardware realism
    const smdCoords: Array<[number, number, boolean]> = [
      [-0.78, -0.82, true],
      [-0.78, -0.62, true],
      [-0.78, -0.42, true],
      [-1.02, -0.1, false],
      [-0.84, -0.1, false],
      [1.22, -0.82, true],
      [1.22, -0.46, true],
      [0.2, 0.02, false],
      [0.42, 0.02, false],
      [0.64, 0.02, false],
      [-1.65, 0.45, false],
      [-1.45, 0.45, false],
    ];
    const smdResMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.45,
      metalness: 0.15,
    });
    const smdCapMat = new THREE.MeshStandardMaterial({
      color: 0xc28e5c,
      roughness: 0.35,
      metalness: 0.1,
    });
    const smdGeo = new THREE.BoxGeometry(0.14, 0.055, 0.08);
    const smdGroup = new THREE.Group();
    smdCoords.forEach(([sx, sz, isRes]) => {
      const m = new THREE.Mesh(smdGeo, isRes ? smdResMat : smdCapMat);
      m.position.set(sx, 0.105, sz);
      smdGroup.add(m);
    });
    registerExplodable(smdGroup, 0.35);
    boardGroup.add(smdGroup);

    // 9. Optical SMD LEDs with White Ceramic Base + Glossy Emissive Lenses + PointLights
    const ledBaseGeo = new THREE.BoxGeometry(0.24, 0.045, 0.15);
    const ledBaseMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.38,
    });

    const makeSmdLed = (
      x: number,
      z: number,
      colorHex: number,
      initialIntensity: number,
    ) => {
      const grp = new THREE.Group();
      grp.position.set(x, 0.105, z);
      const base = new THREE.Mesh(ledBaseGeo, ledBaseMat);
      grp.add(base);
      const mat = new THREE.MeshPhysicalMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: initialIntensity,
        roughness: 0.12,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
      });
      const lens = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.085, 0.11), mat);
      lens.position.y = 0.05;
      grp.add(lens);
      return { grp, lens, mat };
    };

    const ledOn = makeSmdLed(1.52, -0.82, 0x22c55e, 2.4);
    boardGroup.add(ledOn.grp);

    const led13 = makeSmdLed(-0.35, -0.86, 0xf59e0b, 3.0);
    registerClickable(led13.lens, 'led13', led13.mat);
    boardGroup.add(led13.grp);

    const led13Light = new THREE.PointLight(0xf59e0b, 1.5, 2.5);
    led13Light.position.set(-0.35, 0.38, -0.86);
    boardGroup.add(led13Light);

    const ledPwm = makeSmdLed(1.52, -0.46, 0x06b6d4, 1.8);
    registerClickable(ledPwm.lens, 'digital', ledPwm.mat);
    boardGroup.add(ledPwm.grp);

    const ledPwmLight = new THREE.PointLight(0x22d3ee, 1.4, 2.5);
    ledPwmLight.position.set(1.52, 0.38, -0.46);
    boardGroup.add(ledPwmLight);

    const ledTx = makeSmdLed(-0.35, -0.62, 0xfbbf24, 0.35);
    boardGroup.add(ledTx.grp);

    const ledRx = makeSmdLed(-0.35, -0.42, 0xfbbf24, 0.35);
    boardGroup.add(ledRx.grp);

    // Pre-warm shaders on GPU
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycasting for Click & Hover Inspection (with multi-touch pinch guard)
    const raycaster = new THREE.Raycaster();
    let lastHoverTime = 0;
    let pointerDownPos = { x: 0, y: 0 };
    const activeTouchPointers = new Set<number>();
    let wasMultiTouch = false;

    const updateMouseFromEvent = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        activeTouchPointers.add(e.pointerId);
        if (activeTouchPointers.size > 1) {
          wasMultiTouch = true;
          return;
        }
      }
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        activeTouchPointers.delete(e.pointerId);
        if (wasMultiTouch) {
          if (activeTouchPointers.size === 0) wasMultiTouch = false;
          return;
        }
      }
      const dist = Math.hypot(
        e.clientX - pointerDownPos.x,
        e.clientY - pointerDownPos.y,
      );
      if (dist > 6) return;
      updateMouseFromEvent(e);
      raycaster.setFromCamera(_mouse, camera);
      const hits = raycaster.intersectObjects(clickableMeshes, false);
      if (hits.length > 0) {
        const partId = hits[0].object.userData.partId as string | undefined;
        if (partId && BOARD_PARTS[partId]) {
          soundEngine.playSelect();
          const spec = BOARD_PARTS[partId];
          setSelectedPart(spec);
          liveStateRef.current.cameraTransition = {
            pos: [...spec.focusCamera],
            target: [...spec.focusTarget],
          };
        }
      }
    };

    const onPointerCancel = (e: PointerEvent) => {
      activeTouchPointers.delete(e.pointerId);
      if (activeTouchPointers.size === 0) wasMultiTouch = false;
    };

    const onGesturePrevent = (e: Event) => {
      e.preventDefault();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (activeTouchPointers.size > 1) return;
      const now = performance.now();
      if (now - lastHoverTime < 45) return;
      lastHoverTime = now;
      updateMouseFromEvent(e);
      raycaster.setFromCamera(_mouse, camera);
      const hits = raycaster.intersectObjects(clickableMeshes, false);
      if (hits.length > 0) {
        const pid = (hits[0].object.userData.partId as string) || null;
        renderer.domElement.style.cursor = 'pointer';
        setHoveredPartId(pid);
      } else {
        renderer.domElement.style.cursor = 'grab';
        setHoveredPartId(null);
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointercancel', onPointerCancel);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('gesturestart', onGesturePrevent);
    renderer.domElement.addEventListener('gesturechange', onGesturePrevent);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 520;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    // Paced Animation Loop (GPU rAF + Software-WebGL afterDraw pacing)
    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;
    let appliedFinish: PcbFinish = liveStateRef.current.pcbFinish;
    let appliedLighting: LightingPreset = liveStateRef.current.lightingMode;
    let appliedTheme = liveStateRef.current.theme;
    let explodeCurrent = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const st = liveStateRef.current;

      // Sync theme (Scene background + ESD mat)
      if (appliedTheme !== st.theme) {
        appliedTheme = st.theme;
        const desiredBg = st.theme === 'dark' ? 0x0b1120 : 0xe9eff6;
        (scene.background as THREE.Color).setHex(desiredBg);
        if (scene.fog instanceof THREE.FogExp2) {
          scene.fog.color.setHex(desiredBg);
        }
        esdMat.map = st.theme === 'dark' ? esdDarkTex : esdLightTex;
        esdMat.needsUpdate = true;
      }

      // Sync PCB PBR Finish dynamically
      if (appliedFinish !== st.pcbFinish) {
        appliedFinish = st.pcbFinish;
        const pal = PCB_FINISHES[st.pcbFinish];
        pcbTopMat.map = getPcbTexture(st.pcbFinish);
        pcbTopMat.roughness = pal.roughness;
        pcbTopMat.clearcoat = pal.clearcoat;
        pcbTopMat.clearcoatRoughness = pal.clearcoatRoughness;
        pcbTopMat.needsUpdate = true;
        pcbEdgeMat.color.setHex(pal.edgeHex);
      }

      // Sync Studio Lighting Preset dynamically
      if (appliedLighting !== st.lightingMode) {
        appliedLighting = st.lightingMode;
        const cfg = LIGHTING_CONFIGS[st.lightingMode];
        hemiLight.color.setHex(cfg.hemiSky);
        hemiLight.groundColor.setHex(cfg.hemiGround);
        hemiLight.intensity = cfg.hemiInt;
        keyLight.color.setHex(cfg.keyColor);
        keyLight.intensity = cfg.keyInt;
        keyLight.position.set(...cfg.keyPos);
        rimLight.color.setHex(cfg.rimColor);
        rimLight.intensity = cfg.rimInt;
        renderer.toneMappingExposure = cfg.exposure;
      }

      // Smooth Exploded Hardware View damping
      if (Math.abs(explodeCurrent - st.explodeAmount) > 0.0008) {
        explodeCurrent = THREE.MathUtils.damp(
          explodeCurrent,
          st.explodeAmount,
          7.5,
          delta,
        );
        for (let i = 0; i < explodableParts.length; i++) {
          const item = explodableParts[i];
          item.obj.position.y = item.baseY + explodeCurrent * item.liftY;
        }
      }

      // Turntable auto-spin (disabled on software WebGL)
      controls.autoRotate = !isSoftwareGl && st.autoSpin && !st.cameraTransition;

      // Smooth exponential camera preset transition
      if (st.cameraTransition) {
        _targetPos.set(...st.cameraTransition.pos);
        _targetLook.set(...st.cameraTransition.target);
        const lambda = 6.5;
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetPos.x, lambda, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetPos.y, lambda, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetPos.z, lambda, delta);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetLook.x, lambda, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetLook.y, lambda, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetLook.z, lambda, delta);
        if (
          camera.position.distanceTo(_targetPos) < 0.03 &&
          controls.target.distanceTo(_targetLook) < 0.03
        ) {
          st.cameraTransition = null;
        }
      }

      // Live D13 Blink / Manual LED update
      const d13Active = st.d13Blink
        ? Math.floor(elapsed * 2) % 2 === 0
        : st.d13Manual;
      led13.mat.emissiveIntensity = d13Active ? 3.5 : 0.08;
      led13Light.intensity = d13Active ? 1.9 : 0.0;

      // Live PWM D9 Brightness Preview
      const pwmNorm = st.pwmValue / 255;
      ledPwm.mat.emissiveIntensity = 0.06 + pwmNorm * 3.6;
      ledPwmLight.intensity = pwmNorm * 1.75;

      // Subtle TX/RX serial heartbeat proportional to analogValue activity
      const txPulse =
        0.14 + Math.max(0, Math.sin(elapsed * 6.5)) * 0.9 * (st.analogValue / 1023);
      ledTx.mat.emissiveIntensity = txPulse;
      ledRx.mat.emissiveIntensity =
        0.14 + Math.max(0, Math.cos(elapsed * 5.2)) * 0.65 * (st.analogValue / 1023);

      // Highlight selected part subtly via emissive tint
      partMaterials.forEach((mats, pid) => {
        if (pid === 'led13' || pid === 'digital') return;
        const isSel = st.selectedPartId === pid;
        mats.forEach((m) => {
          m.emissive.setHex(isSel ? 0x00878f : 0x000000);
          m.emissiveIntensity = isSel ? 0.35 : 0;
        });
      });

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerCancel);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('gesturestart', onGesturePrevent);
      renderer.domElement.removeEventListener('gesturechange', onGesturePrevent);
      controls.removeEventListener('change', syncZoomDisplay);
      cameraZoomRef.current = null;
      controls.dispose();
      envTex.dispose();
      pcbTexCache.forEach((tex) => tex.dispose());
      pcbBumpTex.dispose();
      brushedTex.dispose();
      mcuTopTex.dispose();
      esdDarkTex.dispose();
      esdLightTex.dispose();
      shadowTex.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, []);

  const analogVoltage = ((analogValue / 1023) * 5).toFixed(2);
  const totalProjectsCount = ALL_READY_PROJECTS.length;
  const quickPartButtons = [
    'atmega328p',
    'digital',
    'analog',
    'power',
    'usb',
    'crystal',
    'regulator',
    'reset',
    'barrel',
    'led13',
  ];

  return (
    <section
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          soundEngine.playSelect();
          cameraZoomRef.current?.dolly(0.8);
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          soundEngine.playSelect();
          cameraZoomRef.current?.dolly(1.25);
        } else if (e.key === '0') {
          e.preventDefault();
          soundEngine.playSelect();
          cameraZoomRef.current?.reset();
        }
      }}
      className="relative w-full h-[calc(100dvh-6.75rem)] md:h-[calc(100dvh-3.5rem)] min-h-[440px] sm:min-h-[580px] overflow-hidden bg-slate-100 dark:bg-[#0B1120] focus:outline-none"
    >
      {/* Dedicated WebGL Mount Container (touch-none for native pinch zoom & zoom-out) */}
      <div ref={mountRef} className="w-full h-full touch-none" />

      {webglError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-slate-900 text-slate-200">
          <Cpu className="w-12 h-12 text-[#00878F] mb-3" />
          <h2 className="text-xl font-bold mb-2">Arduino Uno R3 Hardware Reference</h2>
          <p className="text-sm text-slate-400 max-w-md">
            WebGL is unavailable in this browser context. Select any component below to inspect Uno R3 pinout specifications.
          </p>
        </div>
      )}

      {/* Top Overlay: Compact Spec Card + Direct 1-Click Quick-Launch to Lessons & Projects */}
      <div className="pointer-events-none absolute top-2.5 sm:top-4 start-2.5 sm:start-4 end-2.5 sm:end-4 flex items-start justify-between gap-4 z-10">
        <div className="pointer-events-auto w-full sm:w-auto sm:max-w-lg rounded-2xl sm:rounded-xl border border-slate-200 dark:border-slate-800 bg-white/92 dark:bg-[#111827]/92 backdrop-blur-md px-3 sm:px-4 py-2 sm:py-3 shadow-lg">
          <h1 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white leading-tight truncate">
            {tLoc(translations.studio.title, lang)}
          </h1>
          <p className="hidden sm:block text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            {tLoc(translations.studio.subtitle, lang)}
          </p>

          {/* Direct 1-Click Access to Lessons, Projects & Simulator */}
          <div className="mt-2 sm:mt-2.5 pt-2 sm:pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar sm:flex-wrap">
            <button
              type="button"
              onClick={() => {
                soundEngine.playSelect();
                setActiveTab('lessons');
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#00878F] hover:bg-[#006d73] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <GraduationCap className="w-3.5 h-3.5 shrink-0" />
              <span>{tLoc(translations.studio.quickLessons, lang)}</span>
              <span className="font-mono text-[10px] bg-white/20 px-1.5 py-0.5 rounded">
                {LESSONS.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playSelect();
                setActiveTab('projects');
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
            >
              <FolderKanban className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{tLoc(translations.studio.quickProjects, lang)}</span>
              <span className="font-mono text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded">
                {totalProjectsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playSelect();
                setActiveTab('simulator');
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <Cpu className="w-3.5 h-3.5 text-[#00878F] shrink-0" />
              <span>{tLoc(translations.studio.quickSimulator, lang)}</span>
            </button>
          </div>

          {hoveredPartId && BOARD_PARTS[hoveredPartId] && (
            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-medium text-[#00878F] dark:text-[#22c6cf]">
              <span>{tLoc(BOARD_PARTS[hoveredPartId].name, lang)}</span>
              <span className="font-mono text-[11px]">{BOARD_PARTS[hoveredPartId].voltage}</span>
            </div>
          )}
        </div>

        {/* Quick Pinout Reference Strip (optional toggleable) */}
        {showPinBadges && (
          <div className="pointer-events-auto hidden lg:flex flex-wrap justify-end gap-1.5 max-w-md">
            {quickPartButtons.map((pid) => {
              const part = BOARD_PARTS[pid];
              const isSelected = selectedPart?.id === pid;
              return (
                <button
                  key={pid}
                  type="button"
                  onClick={() => focusPart(pid)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer',
                    isSelected
                      ? 'bg-[#00878F] text-white border-[#00878F]'
                      : 'bg-white/95 dark:bg-[#111827]/95 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-[#00878F]',
                  )}
                >
                  {tLoc(part.name, lang).split('(')[0].trim()}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Dismissible Component Inspector (Bottom Sheet on mobile, floating card on sm+) */}
      {selectedPart && (
        <aside className="absolute inset-x-2.5 bottom-2.5 top-auto sm:inset-auto sm:top-28 sm:end-4 z-30 sm:w-[360px] max-h-[58dvh] sm:max-h-[calc(100%-8.5rem)] flex flex-col rounded-2xl sm:rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] shadow-2xl overflow-hidden">
          <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
            <div>
              <div className="text-[11px] font-semibold text-[#00878F] dark:text-[#22c6cf]">
                {tLoc(translations.studio.inspectorTitle, lang)}
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {tLoc(selectedPart.name, lang)}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tLoc(selectedPart.subtitle, lang)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPart(null)}
              aria-label="Close inspector"
              className="min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 sm:p-1 flex items-center justify-center rounded-xl sm:rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-3 text-xs overflow-y-auto">
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {tLoc(translations.studio.voltage, lang)}
              </span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                {selectedPart.voltage}
              </span>
            </div>

            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              {tLoc(selectedPart.description, lang)}
            </p>

            <div>
              <div className="font-semibold text-slate-900 dark:text-white mb-1.5">
                {tLoc(translations.studio.specs, lang)}
              </div>
              <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                {selectedPart.specs.map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#00878F] font-bold">·</span>
                    <span>{tLoc(s, lang)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-2">
              <Button
                size="sm"
                className="w-full"
                onClick={() => {
                  const targetLesson =
                    selectedPart.id === 'analog'
                      ? LESSONS[4]
                      : selectedPart.id === 'digital'
                        ? LESSONS[3]
                        : LESSONS[0];
                  loadIntoSimulator({
                    title: tLoc(targetLesson.title, lang),
                    code: targetLesson.code,
                    blocks: targetLesson.blocks,
                    circuit: targetLesson.circuit,
                  });
                }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{tLoc(translations.studio.testInSim, lang)}</span>
              </Button>
            </div>
          </div>
        </aside>
      )}

      {/* Unified Collapsible Bottom Studio Control Dock (Zero Viewport Occlusion) */}
      <div className="absolute bottom-2.5 sm:bottom-3 left-1/2 -translate-x-1/2 z-20 w-[min(1080px,95vw)] flex flex-col items-center">
        <button
          type="button"
          onClick={() => {
            soundEngine.playSelect();
            setDockOpen((o) => !o);
          }}
          className="mb-1 inline-flex items-center gap-1.5 min-h-[38px] sm:min-h-0 px-3.5 sm:px-3 py-1.5 sm:py-1 rounded-full sm:rounded-t-lg sm:rounded-b-none border sm:border-b-0 border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-[#00878F] cursor-pointer shadow-md"
        >
          {dockOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          <span>
            {dockOpen
              ? tLoc(translations.studio.hideDock, lang)
              : tLoc(translations.studio.showDock, lang)}
          </span>
        </button>

        {dockOpen && (
          <div className="w-full max-h-[42dvh] sm:max-h-none overflow-y-auto rounded-2xl sm:rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md shadow-2xl px-3 sm:px-4 py-2.5 space-y-2.5">
            {/* Row 1: Studio Camera, PBR PCB Material Finishes, Lighting & Exploded View */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
              {/* Camera Presets */}
              <div className="flex items-center gap-1 flex-wrap">
                <Camera className="w-3.5 h-3.5 text-[#00878F] shrink-0 me-1" />
                {(['isometric', 'top', 'pinout', 'mcu', 'side'] as CameraPreset[]).map((preset) => {
                  const labelMap: Record<CameraPreset, string> = {
                    isometric: tLoc(translations.studio.cameraIsometric, lang),
                    top: tLoc(translations.studio.cameraTop, lang),
                    pinout: tLoc(translations.studio.cameraPinout, lang),
                    mcu: tLoc(translations.studio.cameraMcu, lang),
                    side: tLoc(translations.studio.cameraSide, lang),
                  };
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPreset(preset)}
                      className={cn(
                        'px-2 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer',
                        activePreset === preset
                          ? 'bg-[#00878F] text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
                      )}
                    >
                      {labelMap[preset]}
                    </button>
                  );
                })}
              </div>

              {/* 3D Board Zoom Out / Reset / Zoom In Controls */}
              <div className="flex items-center gap-1 border-s border-slate-200 dark:border-slate-800 ps-3">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playSelect();
                    cameraZoomRef.current?.dolly(1.25);
                  }}
                  title={tLoc(translations.simulator.zoomOut, lang)}
                  className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-[#00878F] transition-colors cursor-pointer"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playSelect();
                    cameraZoomRef.current?.reset();
                  }}
                  title={tLoc(translations.simulator.resetZoom, lang)}
                  className="px-1.5 py-1 rounded-md font-mono tabular-nums text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer min-w-[44px]"
                >
                  {zoomPct}%
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playSelect();
                    cameraZoomRef.current?.dolly(0.8);
                  }}
                  title={tLoc(translations.simulator.zoomIn, lang)}
                  className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-[#00878F] transition-colors cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 4 Live PBR PCB Finishes */}
              <div className="flex items-center gap-1.5 border-s border-slate-200 dark:border-slate-800 ps-3">
                <Palette className="w-3.5 h-3.5 text-[#00878F] shrink-0" />
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 hidden xl:inline">
                  {tLoc(translations.studio.pcbMaterial, lang)}:
                </span>
                {(Object.keys(PCB_FINISHES) as PcbFinish[]).map((fin) => {
                  const item = PCB_FINISHES[fin];
                  const active = pcbFinish === fin;
                  return (
                    <button
                      key={fin}
                      type="button"
                      title={tLoc(item.label, lang)}
                      onClick={() => {
                        soundEngine.playSelect();
                        setPcbFinish(fin);
                      }}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer border',
                        active
                          ? 'border-[#00878F] bg-[#00878F]/10 text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:border-slate-400',
                      )}
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-white/50 shadow-xs shrink-0"
                        style={{ backgroundColor: item.swatch }}
                      />
                      <span className="hidden sm:inline">{tLoc(item.label, lang)}</span>
                    </button>
                  );
                })}
              </div>

              {/* Studio Lighting Presets */}
              <div className="flex items-center gap-1 border-s border-slate-200 dark:border-slate-800 ps-3">
                <SunMedium className="w-3.5 h-3.5 text-amber-500 shrink-0 me-0.5" />
                {(['studio', 'warm', 'dramatic'] as LightingPreset[]).map((mode) => {
                  const lLabel: Record<LightingPreset, string> = {
                    studio: tLoc(translations.studio.lightStudio, lang),
                    warm: tLoc(translations.studio.lightWarm, lang),
                    dramatic: tLoc(translations.studio.lightDramatic, lang),
                  };
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        soundEngine.playSelect();
                        setLightingMode(mode);
                      }}
                      className={cn(
                        'px-2 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer',
                        lightingMode === mode
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
                      )}
                    >
                      {lLabel[mode]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 2: Live Hardware Signals + Exploded View + Turntable + Pin Labels */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              {/* Live D13 Tester */}
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playSelect();
                    setD13Blink((b) => !b);
                  }}
                  className={cn(
                    'px-2 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer',
                    d13Blink
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
                  )}
                >
                  {tLoc(translations.studio.d13Blink, lang)}: {d13Blink ? 'ON' : 'OFF'}
                </button>
                {!d13Blink && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playSelect();
                      setD13Manual((v) => !v);
                    }}
                    className={cn(
                      'px-2 py-1 rounded-md text-[11px] font-mono font-semibold whitespace-nowrap shrink-0 cursor-pointer',
                      d13Manual
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
                    )}
                  >
                    {d13Manual ? 'HIGH' : 'LOW'}
                  </button>
                )}
              </div>

              {/* PWM Brightness Slider (D9) */}
              <div className="flex items-center gap-2 border-s border-slate-200 dark:border-slate-800 ps-3">
                <Sliders className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  {tLoc(translations.studio.pwmSlider, lang)}
                </label>
                <input
                  type="range"
                  min={0}
                  max={255}
                  value={pwmValue}
                  onChange={(e) => setPwmValue(Number(e.target.value))}
                  className="w-20 accent-[#00878F] cursor-pointer"
                />
                <span className="font-mono tabular-nums text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 w-7 text-end">
                  {pwmValue}
                </span>
              </div>

              {/* Analog A0 Simulator */}
              <div className="flex items-center gap-2 border-s border-slate-200 dark:border-slate-800 ps-3">
                <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  A0
                </label>
                <input
                  type="range"
                  min={0}
                  max={1023}
                  value={analogValue}
                  onChange={(e) => setAnalogValue(Number(e.target.value))}
                  className="w-20 accent-emerald-500 cursor-pointer"
                />
                <span className="font-mono tabular-nums text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                  {analogValue} ({analogVoltage}V)
                </span>
              </div>

              {/* Exploded Hardware View Slider */}
              <div className="flex items-center gap-2 border-s border-slate-200 dark:border-slate-800 ps-3">
                <Layers className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  {tLoc(translations.studio.explodeView, lang)}
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={explodePct}
                  onChange={(e) => setExplodePct(Number(e.target.value))}
                  className="w-20 accent-violet-500 cursor-pointer"
                />
                <span className="font-mono tabular-nums text-[11px] font-semibold text-violet-600 dark:text-violet-400 w-8 text-end">
                  {explodePct}%
                </span>
              </div>

              {/* Auto-Spin Turntable & Pin Labels Toggles */}
              <div className="flex items-center gap-1.5 border-s border-slate-200 dark:border-slate-800 ps-3">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playSelect();
                    setAutoSpin((s) => !s);
                  }}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap',
                    autoSpin
                      ? 'bg-[#00878F] text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
                  )}
                >
                  <RotateCw className="w-3 h-3" />
                  <span>{tLoc(translations.studio.autoSpin, lang)}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playSelect();
                    setShowPinBadges((s) => !s);
                  }}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap',
                    showPinBadges
                      ? 'bg-[#00878F]/15 text-[#00878F] dark:text-[#22c6cf]'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
                  )}
                >
                  <Tag className="w-3 h-3" />
                  <span>{tLoc(translations.studio.pinLabels, lang)}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
