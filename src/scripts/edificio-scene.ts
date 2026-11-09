// Scena three.js della home "edificio", in versione realistica: un palazzo per uffici
// all'ora blu. Curtain wall di vetro con montanti in alluminio, solai e fasce marcapiano,
// luci calde negli uffici, ombre, riflessi ambientali (RoomEnvironment) e un leggero
// bagliore sulle sorgenti luminose (bloom). L'interrato è in sezione: uno scavo con muri
// di contenimento lascia vedere il piano −1. Ogni piano è arredato secondo l'area che
// ospita (vedi data/edificio.ts). Il piano scelto accende le sue luci, gli altri le abbassano.
// Il testo NON è nella scena: pulsantiera, etichette e scheda sono HTML (Edificio.astro).
import {
  ACESFilmicToneMapping, BoxGeometry, BufferGeometry, CanvasTexture, CylinderGeometry, DirectionalLight,
  DoubleSide, Float32BufferAttribute, Fog, Group, HemisphereLight, IcosahedronGeometry, Material, Mesh,
  MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, PCFSoftShadowMap, PerspectiveCamera,
  PlaneGeometry, PMREMGenerator, PointLight, Points, PointsMaterial, Raycaster, RepeatWrapping, Scene, Shape,
  ShapeGeometry, SphereGeometry, SRGBColorSpace, TorusGeometry, Vector2, Vector3, WebGLRenderer, Path,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import type { Kind } from "../data/edificio";
import { creaStanza, type Stanza } from "./edificio-stanze";

/** cosa scrivere sull'insegna dentro ogni piano */
export interface InfoPiano { piano: string; area: string }

// Scala: 1 unità ≈ 3,5 m (un interpiano). Arredi in proporzione.
const W = 3.4; // larghezza del palazzo
const D = 2.4; // profondità
const H = 1; // interpiano
const SLAB = 0.07; // spessore del solaio
const CEIL = H - SLAB; // altezza libera

export interface EdificioScene {
  /** `instant`: la camera va subito al piano, senza volo (es. arrivando da un link) */
  select(i: number | null, instant?: boolean): void;
  highlight(ids: number[]): void;
  hover(i: number): void;
  pick(clientX: number, clientY: number): number;
  /** posizione a schermo (px nel canvas) del punto dove attaccare l'etichetta di ogni piano */
  anchors(): { x: number; y: number }[];
  resize(): void;
  start(): void;
  stop(): void;
  onFrame(fn: () => void): void;
  /** gira la vista intorno all'edificio (radianti, positivo = verso destra) */
  rotate(delta: number): void;
  /** true se l'ultimo gesto sul canvas è stato un trascinamento (quindi non un clic) */
  dragged(): boolean;
  /** vola dentro il piano attraverso la vetrata (si risolve quando la camera è dentro) */
  tuffo(i: number): Promise<void>;
  /** mostra la stanza del piano (dopo il tuffo) */
  entra(i: number): void;
  /** torna all'edificio, con la camera che si riallontana dal piano */
  esci(): void;
  dentro(): boolean;
  /** posizioni a schermo delle etichette degli oggetti nella stanza */
  ancoreStanza(): { x: number; y: number; dietro: boolean }[];
  pickStanza(clientX: number, clientY: number): number;
  hoverStanza(i: number): void;
}

export function createEdificioScene(canvas: HTMLCanvasElement, kinds: Kind[], info: InfoPiano[] = []): EdificioScene {
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 120);

  // ── cielo dell'ora blu, nebbia e riflessi ambientali ──
  {
    const cv = document.createElement("canvas");
    cv.width = 4; cv.height = 512;
    const ctx = cv.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, "#060b18");
    g.addColorStop(0.45, "#0f1d3a");
    g.addColorStop(0.62, "#1d3357");
    g.addColorStop(0.7, "#2a3f63");
    g.addColorStop(1, "#0f172a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 512);
    const sky = new CanvasTexture(cv);
    sky.colorSpace = SRGBColorSpace;
    scene.background = sky;
  }
  scene.fog = new Fog(0x16233d, 16, 42);
  const pmrem = new PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.35;

  // ── luci: cielo freddo, luce calda bassa che fa ombra, controluce azzurro ──
  scene.add(new HemisphereLight(0x8fb3ff, 0x111827, 0.55));
  const sun = new DirectionalLight(0xffc89a, 1.6);
  sun.position.set(-7, 9, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 10, bottom: -3, near: 1, far: 30 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  const rim = new DirectionalLight(0x6ea8ff, 0.6);
  rim.position.set(8, 5, -6);
  scene.add(rim);

  // ── materiali ──
  const std = (color: number, roughness = 0.7, metalness = 0, extra: Partial<MeshStandardMaterial> = {}) =>
    new MeshStandardMaterial({ color, roughness, metalness, ...extra });
  const M = {
    concrete: std(0x6b7280, 0.95),
    concreteDark: std(0x3a414c, 0.95),
    slab: std(0x9aa3ae, 0.9),
    floor: std(0x2a3240, 0.6),
    spandrel: std(0x1f2633, 0.45, 0.6),
    alu: std(0xb8c0cc, 0.35, 0.85),
    aluDark: std(0x4b5563, 0.4, 0.8),
    wood: std(0x8a6a4a, 0.55),
    woodLight: std(0xc8a27a, 0.5),
    white: std(0xe5e7eb, 0.55),
    offwhite: std(0xcbd5e1, 0.6),
    fabricBlue: std(0x1e3a8a, 0.85),
    fabricGrey: std(0x374151, 0.9),
    black: std(0x0b0f17, 0.4, 0.3),
    steelBlue: std(0x1d4ed8, 0.5, 0.4),
    orange: std(0xea580c, 0.55, 0.2),
    red: std(0xb91c1c, 0.4, 0.2),
    yellow: std(0xeab308, 0.6),
    cardboard: std(0xa16207, 0.9),
    leaf: std(0x1f5130, 0.9),
    leafLight: std(0x2f6b3c, 0.9),
    bark: std(0x4a3426, 0.9),
    pipeBlue: std(0x1e40af, 0.45, 0.5),
    pipeGrey: std(0x9ca3af, 0.35, 0.8),
    tank: std(0xd1d5db, 0.3, 0.8),
  };
  const glow = (color: number, intensity = 1.5) =>
    new MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveIntensity: intensity, roughness: 1 });
  const screenMat = (color = 0x60a5fa, i = 1.6) => glow(color, i);

  // geometrie riusate (molti oggetti uguali: si risparmia memoria)
  const geoCache = new Map<string, BoxGeometry>();
  const boxGeo = (w: number, h: number, d: number) => {
    const k = `${w}|${h}|${d}`;
    if (!geoCache.has(k)) geoCache.set(k, new BoxGeometry(w, h, d));
    return geoCache.get(k)!;
  };
  const box = (w: number, h: number, d: number, mat: Material, x = 0, y = 0, z = 0, shadow = true) => {
    const m = new Mesh(boxGeo(w, h, d), mat);
    m.position.set(x, y + h / 2, z);
    m.castShadow = shadow;
    m.receiveShadow = true;
    return m;
  };
  const cyl = (r: number, h: number, mat: Material, x = 0, y = 0, z = 0, seg = 16) => {
    const m = new Mesh(new CylinderGeometry(r, r, h, seg), mat);
    m.position.set(x, y + h / 2, z);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  // ── pezzi d'arredo ricorrenti ──
  const IW = W / 2 - 0.16; // mezza larghezza utile
  const ID = D / 2 - 0.16; // mezza profondità utile

  /** scrivania con piano e gambe */
  const scrivania = (g: Group, x: number, z: number, w = 0.4, d = 0.2, top: Material = M.woodLight) => {
    const s = new Group();
    s.add(box(w, 0.012, d, top, 0, 0.2, 0));
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) s.add(box(0.012, 0.2, 0.012, M.aluDark, dx * (w / 2 - 0.02), 0, dz * (d / 2 - 0.02), false));
    s.position.set(x, 0, z);
    g.add(s);
    return s;
  };
  /** sedia da ufficio: seduta, schienale, colonna e base */
  const sedia = (g: Group, x: number, z: number, faccia = 0, mat: Material = M.fabricGrey) => {
    const s = new Group();
    s.add(box(0.1, 0.02, 0.1, mat, 0, 0.12, 0));
    s.add(box(0.1, 0.12, 0.018, mat, 0, 0.14, 0.05));
    s.add(cyl(0.008, 0.11, M.aluDark, 0, 0.01, 0, 6));
    s.add(cyl(0.045, 0.01, M.black, 0, 0, 0, 10));
    s.position.set(x, 0, z);
    s.rotation.y = faccia;
    g.add(s);
  };
  /** monitor acceso su una scrivania */
  const monitor = (g: Group, x: number, z: number, faccia = 0) => {
    const m = new Group();
    m.add(box(0.13, 0.08, 0.008, M.black, 0, 0.235, 0, false));
    const sc = new Mesh(new PlaneGeometry(0.12, 0.07), screenMat(0x93c5fd, 1.1));
    sc.position.set(0, 0.275, 0.0045);
    m.add(sc);
    m.add(box(0.01, 0.025, 0.01, M.aluDark, 0, 0.212, -0.01, false));
    m.position.set(x, 0, z);
    m.rotation.y = faccia;
    g.add(m);
  };
  const pianta = (g: Group, x: number, z: number, h = 0.32) => {
    g.add(cyl(0.05, 0.08, M.concreteDark, x, 0, z, 12));
    const f = new Mesh(new IcosahedronGeometry(0.1, 1), M.leafLight);
    f.position.set(x, 0.08 + h * 0.55, z);
    f.scale.set(1, h / 0.2, 1);
    f.castShadow = true;
    g.add(f);
  };

  // Animazioni degli arredi (radar, led, grafico…): ricevono il tempo e la luce del piano.
  let piano = 0;
  const animators: { i: number; fn: (t: number, light: number) => void }[] = [];
  const anima = (fn: (t: number, light: number) => void) => animators.push({ i: piano, fn });

  // ── ARREDI PER TIPO DI PIANO ─────────────────────────────────────────────
  const arredi: Record<Kind, (g: Group) => void> = {
    impianti(g) {
      // tubazioni con flange lungo la parete di fondo
      const tubo = (y: number, z: number, r: number, mat: Material) => {
        const p = new Mesh(new CylinderGeometry(r, r, W - 0.4, 14), mat);
        p.rotation.z = Math.PI / 2;
        p.position.set(0, y, z);
        p.castShadow = true;
        g.add(p);
        for (let k = -2; k <= 2; k++) {
          const fl = new Mesh(new CylinderGeometry(r * 1.5, r * 1.5, 0.02, 14), M.pipeGrey);
          fl.rotation.z = Math.PI / 2;
          fl.position.set(k * 0.6, y, z);
          g.add(fl);
        }
      };
      tubo(0.72, -ID + 0.05, 0.04, M.pipeBlue);
      tubo(0.6, -ID + 0.15, 0.035, M.pipeGrey);
      tubo(0.48, -ID + 0.05, 0.045, M.red);
      // serbatoi verticali e una pompa
      g.add(cyl(0.22, 0.6, M.tank, -IW + 0.3, 0, ID - 0.35, 24));
      g.add(cyl(0.18, 0.5, M.tank, -IW + 0.78, 0, ID - 0.3, 24));
      g.add(box(0.35, 0.2, 0.22, M.steelBlue, -0.2, 0, ID - 0.3));
      g.add(cyl(0.05, 0.25, M.pipeGrey, -0.2, 0.2, ID - 0.3));
      // quadri elettrici con spie
      for (let k = 0; k < 3; k++) {
        const x = IW - 0.2 - k * 0.32;
        g.add(box(0.28, 0.6, 0.1, M.offwhite, x, 0, -ID + 0.3));
        g.add(box(0.03, 0.015, 0.005, glow(k === 1 ? 0xef4444 : 0x22c55e, 2.4), x + 0.08, 0.5, -ID + 0.353, false));
      }
      // idrante e pilastri strutturali
      g.add(cyl(0.05, 0.3, M.red, IW - 0.15, 0, 0.2, 12));
      for (const x of [-W / 6, W / 6]) g.add(box(0.12, CEIL, 0.12, M.concrete, x, 0, 0));
    },
    hall(g) {
      // pavimento in pietra chiara
      g.add(box(W - 0.05, 0.004, D - 0.05, std(0xd6d3cd, 0.35, 0.05), 0, 0.001, 0, false));
      // banco reception in legno con top bianco e filo luminoso
      g.add(box(1.1, 0.3, 0.26, M.wood, 0.3, 0, 0.1));
      g.add(box(1.14, 0.02, 0.3, M.white, 0.3, 0.3, 0.1));
      g.add(box(1.06, 0.012, 0.01, glow(0xfff1d6, 2.2), 0.3, 0.05, 0.236, false));
      monitor(g, 0.5, -0.02, Math.PI);
      sedia(g, 0.3, -0.12, 0, M.fabricBlue);
      // parete-logo dietro il banco
      g.add(box(1.6, 0.6, 0.04, M.wood, 0.3, 0.02, -ID + 0.02));
      g.add(box(0.7, 0.08, 0.005, glow(0x60a5fa, 2.6), 0.3, 0.4, -ID + 0.045, false));
      // area d'attesa: divano e tavolino
      g.add(box(0.5, 0.08, 0.2, M.fabricBlue, -IW + 0.4, 0, ID - 0.25));
      g.add(box(0.5, 0.12, 0.05, M.fabricBlue, -IW + 0.4, 0.04, ID - 0.15));
      g.add(box(0.25, 0.08, 0.15, M.woodLight, -IW + 0.4, 0, ID - 0.55));
      pianta(g, -IW + 0.05, ID - 0.05);
      pianta(g, IW - 0.05, ID - 0.05, 0.4);
      pianta(g, IW - 0.05, -ID + 0.1, 0.36);
    },
    sicurezza(g) {
      // scaffalature industriali: montanti blu, correnti arancioni, pallet e colli
      const scaffale = (x: number) => {
        for (const dx of [-0.42, 0, 0.42]) for (const dz of [-0.13, 0.13]) g.add(box(0.025, 0.78, 0.025, M.steelBlue, x + dx, 0, -ID + 0.18 + dz));
        for (const y of [0.02, 0.28, 0.54]) {
          for (const dz of [-0.13, 0.13]) g.add(box(0.86, 0.025, 0.02, M.orange, x, y + 0.03, -ID + 0.18 + dz, false));
          for (const dx of [-0.21, 0.21]) {
            g.add(box(0.34, 0.025, 0.26, M.woodLight, x + dx, y + 0.055, -ID + 0.18));
            g.add(box(0.28, 0.12 + (Math.round((dx + y) * 10) % 3) * 0.02, 0.22, M.cardboard, x + dx, y + 0.08, -ID + 0.18));
          }
        }
      };
      scaffale(-0.75);
      scaffale(0.55);
      // estintori a parete con cartello
      for (const z of [-0.45, 0.25]) {
        g.add(cyl(0.035, 0.16, M.red, IW - 0.04, 0.05, z, 14));
        g.add(box(0.005, 0.08, 0.08, glow(0xef4444, 0.8), IW + 0.005, 0.3, z, false));
      }
      // corsia pedonale gialla
      const cv = document.createElement("canvas");
      cv.width = 256; cv.height = 32;
      const ctx = cv.getContext("2d")!;
      ctx.fillStyle = "#2a3240"; ctx.fillRect(0, 0, 256, 32);
      ctx.fillStyle = "#eab308"; ctx.fillRect(0, 0, 256, 4); ctx.fillRect(0, 28, 256, 4);
      for (let k = 0; k < 16; k++) { ctx.fillStyle = k % 2 ? "#111827" : "#eab308"; ctx.fillRect(k * 16, 8, 8, 16); }
      const tex = new CanvasTexture(cv);
      tex.colorSpace = SRGBColorSpace;
      tex.wrapS = RepeatWrapping;
      tex.repeat.set(3, 1);
      const corsia = new Mesh(new PlaneGeometry(W - 0.3, 0.12), new MeshStandardMaterial({ map: tex, roughness: 0.8 }));
      corsia.rotation.x = -Math.PI / 2;
      corsia.position.set(0, 0.004, 0.2);
      corsia.receiveShadow = true;
      g.add(corsia);
      // muletto: scocca, cabina, montante e forche
      const m = new Group();
      m.add(box(0.22, 0.1, 0.14, M.yellow, 0, 0.02, 0));
      m.add(box(0.1, 0.1, 0.12, M.black, -0.05, 0.12, 0));
      for (const z of [-0.06, 0.06]) m.add(box(0.012, 0.32, 0.012, M.aluDark, 0.12, 0.02, z));
      for (const z of [-0.035, 0.035]) m.add(box(0.14, 0.008, 0.015, M.aluDark, 0.2, 0.04, z));
      for (const [x, z] of [[-0.07, -0.075], [-0.07, 0.075], [0.07, -0.075], [0.07, 0.075]]) {
        const w = new Mesh(new CylinderGeometry(0.03, 0.03, 0.02, 12), M.black);
        w.rotation.x = Math.PI / 2;
        w.position.set(x, 0.03, z);
        m.add(w);
      }
      m.position.set(-0.3, 0, ID - 0.35);
      m.rotation.y = 0.5;
      g.add(m);
      // postazione del responsabile sicurezza con casco
      scrivania(g, 0.75, ID - 0.25, 0.36, 0.18);
      const casco = new Mesh(new SphereGeometry(0.04, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(0xfacc15, 0.4));
      casco.position.set(0.65, 0.212, ID - 0.25);
      g.add(casco);
      monitor(g, 0.82, ID - 0.29);
    },
    aule(g) {
      // schermo di proiezione e cattedra
      const tela = new Mesh(new PlaneGeometry(1.3, 0.48), screenMat(0xbfdbfe, 1.3));
      tela.position.set(0, 0.48, -ID + 0.01);
      g.add(tela);
      g.add(box(1.36, 0.03, 0.03, M.aluDark, 0, 0.73, -ID + 0.01, false));
      scrivania(g, -0.9, -ID + 0.35, 0.36, 0.18, M.wood);
      monitor(g, -0.9, -ID + 0.33, Math.PI);
      // tre file di banchi rivolti allo schermo
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        const x = (c - 1) * 0.95, z = -0.12 + r * 0.42;
        scrivania(g, x, z, 0.62, 0.16, M.white);
        sedia(g, x - 0.16, z + 0.15, 0, M.fabricBlue);
        sedia(g, x + 0.16, z + 0.15, 0, M.fabricBlue);
      }
      anima((t, light) => { (tela.material as MeshStandardMaterial).emissiveIntensity = 0.4 + 1.1 * light + Math.sin(t * 0.8) * 0.05; });
    },
    archivio(g) {
      // armadi di archivio con maniglie
      for (let k = 0; k < 6; k++) {
        const x = -IW + 0.25 + k * 0.48;
        g.add(box(0.44, 0.62, 0.3, std(0x6b7280, 0.5, 0.4), x, 0, -ID + 0.16));
        for (const y of [0.12, 0.3, 0.48]) g.add(box(0.12, 0.012, 0.012, M.alu, x, y, -ID + 0.315, false));
      }
      // certificati incorniciati
      for (const z of [-0.35, 0.05, 0.45]) {
        g.add(box(0.012, 0.2, 0.28, M.wood, -IW + 0.005, 0.32, z, false));
        g.add(box(0.004, 0.16, 0.24, M.white, -IW + 0.014, 0.34, z, false));
      }
      // tavolo d'audit con documenti e portatili
      g.add(box(1.2, 0.012, 0.55, M.wood, 0.35, 0.2, 0.45));
      for (const [x, z] of [[-0.2, 0.25], [0.9, 0.25], [-0.2, 0.65], [0.9, 0.65]]) g.add(box(0.012, 0.2, 0.012, M.aluDark, x, 0, z, false));
      for (const [x, h] of [[0.0, 0.03], [0.12, 0.05], [0.55, 0.025]]) g.add(box(0.1, h, 0.14, M.white, x, 0.212, 0.42));
      monitor(g, 0.3, 0.5);
      monitor(g, 0.75, 0.42, -0.3);
      for (const [x, z, r] of [[0.0, 0.85, Math.PI], [0.45, 0.85, Math.PI], [0.85, 0.85, Math.PI], [0.25, 0.08, 0]]) sedia(g, x, z, r);
      pianta(g, IW - 0.08, ID - 0.08);
    },
    server(g) {
      // due file di armadi rack con sportello in vetro e led
      const leds: MeshStandardMaterial[] = [];
      for (const z of [-0.42, 0.32]) for (let k = 0; k < 5; k++) {
        const x = -IW + 0.3 + k * 0.56;
        g.add(box(0.4, 0.74, 0.34, M.black, x, 0, z));
        const porta = new Mesh(new PlaneGeometry(0.36, 0.68), new MeshPhysicalMaterial({ color: 0x1f2937, metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.4 }));
        porta.position.set(x, 0.38, z + 0.171);
        g.add(porta);
        for (let l = 0; l < 7; l++) {
          const mat = glow(l % 3 === 0 ? 0x22c55e : 0x38bdf8, 2);
          leds.push(mat);
          g.add(box(0.26, 0.008, 0.004, mat, x, 0.08 + l * 0.09, z + 0.168, false));
        }
      }
      // passerella cavi a soffitto e pavimento flottante
      g.add(box(W - 0.4, 0.025, 0.16, M.aluDark, 0, CEIL - 0.1, -0.05, false));
      g.add(box(W - 0.05, 0.004, D - 0.05, std(0x9ca3af, 0.6, 0.2), 0, 0.001, 0, false));
      anima((t) => leds.forEach((m, k) => { m.emissiveIntensity = Math.sin(t * (2 + (k % 5)) + k * 1.7) > 0.2 ? 2.2 : 0.3; }));
    },
    riunioni(g) {
      // tavolo riunioni in legno con sedie
      g.add(box(1.7, 0.014, 0.5, M.wood, -0.35, 0.2, 0.2));
      for (const x of [-1.1, 0.4]) g.add(box(0.06, 0.2, 0.3, M.aluDark, x, 0, 0.2, false));
      for (let k = 0; k < 4; k++) for (const s of [-1, 1]) sedia(g, -1.0 + k * 0.43, 0.2 + s * 0.36, s > 0 ? 0 : Math.PI, M.fabricGrey);
      monitor(g, -0.6, 0.18);
      // schermo a parete
      g.add(box(1.0, 0.42, 0.03, M.black, -0.35, 0.28, -ID + 0.02));
      const tv = new Mesh(new PlaneGeometry(0.94, 0.36), screenMat(0x1e3a8a, 1));
      tv.position.set(-0.35, 0.49, -ID + 0.036);
      g.add(tv);
      // grafico a barre in rilievo vicino alla vetrata: le risorse che crescono
      const barre: Mesh[] = [];
      for (let k = 0; k < 5; k++) {
        const b = new Mesh(new BoxGeometry(0.1, 1, 0.1), glow(k === 4 ? 0x22d3ee : 0x60a5fa, 1.4));
        b.geometry.translate(0, 0.5, 0);
        b.position.set(IW - 0.8 + k * 0.15, 0.02, -0.3);
        b.scale.y = 0.1;
        barre.push(b);
        g.add(b);
      }
      g.add(box(0.85, 0.02, 0.2, M.aluDark, IW - 0.5, 0, -0.3));
      pianta(g, IW - 0.08, ID - 0.08, 0.4);
      anima((t, light) => barre.forEach((b, k) => {
        const target = (0.12 + k * 0.09) * (0.5 + 0.5 * light);
        b.scale.y += (target + Math.sin(t * 1.4 + k) * 0.01 - b.scale.y) * 0.08;
      }));
    },
    osservatorio(g) {
      // parapetto in cemento
      for (const [w, d, x, z] of [[W, 0.06, 0, D / 2 - 0.03], [W, 0.06, 0, -D / 2 + 0.03], [0.06, D, W / 2 - 0.03, 0], [0.06, D, -W / 2 + 0.03, 0]] as const) {
        g.add(box(w, 0.12, d, M.concrete, x, 0, z));
      }
      // impianti sul tetto: unità di trattamento aria con ventole
      g.add(box(0.8, 0.22, 0.45, M.offwhite, -0.85, 0, -0.55));
      for (let k = 0; k < 2; k++) {
        const v = new Mesh(new CylinderGeometry(0.1, 0.1, 0.02, 20), M.aluDark);
        v.position.set(-1.05 + k * 0.4, 0.231, -0.55);
        g.add(v);
      }
      g.add(box(0.4, 0.16, 0.3, M.offwhite, 1.1, 0, 0.6));
      // traliccio con radar che ruota
      g.add(cyl(0.035, 0.85, M.alu, 0.55, 0, -0.15, 10));
      const radar = new Group();
      radar.position.set(0.55, 0.85, -0.15);
      const dish = new Mesh(new SphereGeometry(0.3, 28, 14, 0, Math.PI * 2, 0, Math.PI / 3), std(0xf1f5f9, 0.35, 0.3, { side: DoubleSide }));
      dish.rotation.x = -Math.PI / 2 - 0.5;
      dish.castShadow = true;
      radar.add(dish);
      const feed = cyl(0.012, 0.28, M.aluDark, 0, 0, 0.1);
      feed.rotation.x = 1.0;
      radar.add(feed);
      g.add(radar);
      // antenna con luce di segnalazione rossa
      g.add(cyl(0.015, 0.75, M.alu, -0.2, 0, 0.45, 8));
      const beaconMat = glow(0xff3b30, 4);
      const beacon = new Mesh(new SphereGeometry(0.035, 12, 8), beaconMat);
      beacon.position.set(-0.2, 0.78, 0.45);
      g.add(beacon);
      // onde del radar
      const onde = [0, 1, 2].map(() => {
        const r = new Mesh(new TorusGeometry(0.3, 0.006, 6, 64), new MeshBasicMaterial({ color: 0x67e8f9, transparent: true, depthWrite: false }));
        r.position.copy(radar.position);
        r.rotation.x = Math.PI / 2;
        g.add(r);
        return r;
      });
      anima((t, light) => {
        radar.rotation.y = t * 0.7;
        beaconMat.emissiveIntensity = Math.sin(t * 3.5) > 0.4 ? 5 : 0.2;
        onde.forEach((o, k) => {
          const f = (t * 0.4 + k / 3) % 1;
          o.scale.setScalar(1 + f * 3.2);
          (o.material as MeshBasicMaterial).opacity = (1 - f) * (0.25 + 0.5 * light);
        });
      });
    },
  };

  // ── IL PALAZZO ──────────────────────────────────────────────────────────
  const N = kinds.length;
  const palazzo = new Group();
  scene.add(palazzo);

  const glass = new MeshPhysicalMaterial({
    color: 0xa9c8ef, metalness: 0.15, roughness: 0.06, transparent: true, opacity: 0.2,
    envMapIntensity: 1.6, side: DoubleSide, depthWrite: false,
  });

  type FloorFx = { ceil: MeshStandardMaterial; lamp: PointLight; accent: MeshStandardMaterial };
  const fx: FloorFx[] = [];
  const hitboxes: Mesh[] = [];

  kinds.forEach((kind, i) => {
    const g = new Group();
    g.position.y = i * H;
    palazzo.add(g);
    const tetto = kind === "osservatorio";

    // solaio e pavimento
    g.add(box(W + 0.06, SLAB, D + 0.06, M.slab, 0, -SLAB, 0));
    g.add(box(W - 0.02, 0.003, D - 0.02, M.floor, 0, 0, 0, false));
    // fascia marcapiano all'esterno del solaio
    for (const z of [D / 2 + 0.04, -D / 2 - 0.04]) g.add(box(W + 0.14, 0.12, 0.02, M.spandrel, 0, -SLAB - 0.03, z));
    for (const x of [W / 2 + 0.04, -W / 2 - 0.04]) g.add(box(0.02, 0.12, D + 0.1, M.spandrel, x, -SLAB - 0.03, 0));

    // filo luminoso sul bordo del solaio: segna il piano scelto (spento negli altri)
    const accent = glow(0x22d3ee, 0);
    g.add(box(W + 0.16, 0.014, 0.014, accent, 0, -SLAB - 0.04, D / 2 + 0.058, false));
    g.add(box(0.014, 0.014, D + 0.12, accent, W / 2 + 0.058, -SLAB - 0.04, 0, false));

    // luci a soffitto (pannelli) e luce del piano
    const ceil = glow(0xfff1d6, 1.6);
    const lamp = new PointLight(0xffe2b8, 1.2, 4.2, 1.6);
    if (!tetto) {
      for (const x of [-1.1, 0, 1.1]) for (const z of [-0.5, 0.45]) {
        const p = new Mesh(new PlaneGeometry(0.42, 0.1), ceil);
        p.rotation.x = Math.PI / 2;
        p.position.set(x, CEIL - 0.004, z);
        g.add(p);
      }
      lamp.position.set(0, CEIL - 0.15, 0.2);
      g.add(lamp);

      // facciata continua: vetro sui quattro lati, montanti e traversi in alluminio, pilastri d'angolo
      const lastra = (w: number, x: number, z: number, ry: number) => {
        const p = new Mesh(new PlaneGeometry(w, CEIL), glass);
        p.position.set(x, CEIL / 2, z);
        p.rotation.y = ry;
        p.renderOrder = 2;
        g.add(p);
      };
      lastra(W, 0, D / 2, 0);
      lastra(W, 0, -D / 2, 0);
      lastra(D, W / 2, 0, Math.PI / 2);
      lastra(D, -W / 2, 0, Math.PI / 2);
      const montante = (x: number, z: number) => g.add(box(0.025, CEIL, 0.045, M.alu, x, 0, z, false));
      for (let k = 1; k < 8; k++) {
        const x = -W / 2 + (k * W) / 8;
        montante(x, D / 2 + 0.012);
        montante(x, -D / 2 - 0.012);
      }
      for (let k = 1; k < 5; k++) {
        const z = -D / 2 + (k * D) / 5;
        g.add(box(0.045, CEIL, 0.025, M.alu, W / 2 + 0.012, 0, z, false));
        g.add(box(0.045, CEIL, 0.025, M.alu, -W / 2 - 0.012, 0, z, false));
      }
      // traverso del sopraluce
      for (const z of [D / 2 + 0.012, -D / 2 - 0.012]) g.add(box(W, 0.015, 0.035, M.alu, 0, CEIL * 0.78, z, false));
      for (const [x, z] of [[W / 2, D / 2], [-W / 2, D / 2], [W / 2, -D / 2], [-W / 2, -D / 2]]) g.add(box(0.08, CEIL, 0.08, M.aluDark, x, 0, z));
    }

    piano = i;
    arredi[kind](g);

    // volume invisibile per il clic
    const hit = new Mesh(new BoxGeometry(W + 0.2, H, D + 0.2), new MeshBasicMaterial({ visible: false }));
    hit.position.y = H / 2 - SLAB;
    hit.userData.floor = i;
    g.add(hit);
    hitboxes.push(hit);

    fx.push({ ceil, lamp, accent });
  });

  // insegna sopra l'ingresso (fronte del piano terra) e pensilina
  {
    const cv = document.createElement("canvas");
    cv.width = 1024; cv.height = 160;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = "#0b1222"; ctx.fillRect(0, 0, 1024, 160);
    ctx.font = "600 96px Inter, 'Helvetica Neue', Arial, sans-serif";
    ctx.textBaseline = "middle";
    const a = "iCura", b = "Impresa";
    const wa = ctx.measureText(a).width, wb = ctx.measureText(b).width;
    const x0 = (1024 - wa - wb) / 2;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(a, x0, 84);
    ctx.fillStyle = "#93c5fd";
    ctx.fillText(b, x0 + wa, 84);
    const tex = new CanvasTexture(cv);
    tex.colorSpace = SRGBColorSpace;
    const sign = new Mesh(new PlaneGeometry(1.2, 0.19), new MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.9, roughness: 0.6 }));
    sign.position.set(-0.6, H + CEIL - 0.05, D / 2 + 0.07);
    palazzo.add(sign);
    palazzo.add(box(1.3, 0.025, 0.35, M.aluDark, -0.6, H + CEIL * 0.74, D / 2 + 0.17));
  }

  // ascensore panoramico esterno: telaio in alluminio, vetro, cabina illuminata
  const SX = W / 2 + 0.34;
  const SZ = 0.35;
  const vanoH = (N - 1) * H + 0.25;
  const vano = new Group();
  vano.position.set(SX, -SLAB, SZ);
  palazzo.add(vano);
  for (const [x, z] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) vano.add(box(0.03, vanoH, 0.03, M.alu, x, 0, z));
  for (let k = 0; k <= N - 1; k++) vano.add(box(0.47, 0.02, 0.47, M.aluDark, 0, k * H, 0, false));
  const vetroVano = new Mesh(new BoxGeometry(0.44, vanoH, 0.44), new MeshPhysicalMaterial({ color: 0xa9c8ef, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.12, depthWrite: false, envMapIntensity: 1.4 }));
  vetroVano.position.y = vanoH / 2;
  vano.add(vetroVano);
  const cabina = new Group();
  cabina.add(box(0.36, 0.56, 0.36, new MeshPhysicalMaterial({ color: 0xdbeafe, roughness: 0.1, transparent: true, opacity: 0.35, depthWrite: false }), 0, 0, 0, false));
  cabina.add(box(0.37, 0.03, 0.37, M.aluDark, 0, 0, 0));
  cabina.add(box(0.37, 0.03, 0.37, M.aluDark, 0, 0.55, 0));
  cabina.add(box(0.3, 0.01, 0.3, glow(0xfff1d6, 2.6), 0, 0.53, 0, false));
  const cabLight = new PointLight(0xfff1d6, 0.6, 1.2, 2);
  cabLight.position.y = 0.4;
  cabina.add(cabLight);
  cabina.position.set(SX, H, SZ);
  palazzo.add(cabina);

  // ── TERRENO: CORTE ALL'INGLESE ──────────────────────────────────────────
  // Piazza alla quota del piano terra con uno scavo largo tutto intorno al palazzo
  // (corte all'inglese): muri di contenimento, ringhiera in vetro, una scala che scende
  // e faretti che illuminano dal basso la facciata dell'interrato. Così il −1 si vede
  // da qualunque lato; quando lo si sceglie (o ci si passa sopra) piazza e muri diventano
  // trasparenti e l'interrato si vede per intero.
  const GY = H - SLAB; // quota del piazzale
  const terra: { mat: MeshStandardMaterial; base: number }[] = [];
  const traslucido = (mat: MeshStandardMaterial, base = 1) => {
    mat.transparent = true;
    mat.opacity = base;
    terra.push({ mat, base });
    return mat;
  };
  const MARGINE = 1.25; // larghezza della corte
  const x0 = -W / 2 - MARGINE, x1 = W / 2 + MARGINE, z0 = -D / 2 - MARGINE, z1 = D / 2 + MARGINE;
  {
    const R = 11;
    const forma = new Shape();
    forma.absarc(0, 0, R, 0, Math.PI * 2, false);
    // la forma sta nel piano XY, poi ruota di -90° su X: la y della forma diventa -z
    const buco = new Path();
    buco.moveTo(x0, -z0); buco.lineTo(x0, -z1); buco.lineTo(x1, -z1); buco.lineTo(x1, -z0); buco.lineTo(x0, -z0);
    forma.holes.push(buco);
    // pavimentazione a lastre
    const S = 1024;
    const cv = document.createElement("canvas");
    cv.width = cv.height = S;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = "#3b4352"; ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = "rgba(15,23,42,0.55)"; ctx.lineWidth = 2;
    for (let k = 0; k <= S; k += S / 64) {
      ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k, S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, k); ctx.lineTo(S, k); ctx.stroke();
    }
    const tex = new CanvasTexture(cv);
    tex.colorSpace = SRGBColorSpace;
    const geo = new ShapeGeometry(forma, 64);
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    for (let k = 0; k < pos.count; k++) uv.setXY(k, (pos.getX(k) + R) / (2 * R), (pos.getY(k) + R) / (2 * R));
    const piazza = new Mesh(geo, traslucido(new MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0 })));
    piazza.rotation.x = -Math.PI / 2;
    piazza.position.y = GY;
    piazza.receiveShadow = true;
    scene.add(piazza);

    // fondo della corte (pavimento esterno in pietra) e muri di contenimento con cordolo
    const fondo = -SLAB;
    const hMuro = GY - fondo;
    const fondoMat = std(0x56606e, 0.85);
    scene.add(box(x1 - x0, 0.03, z1 - z0, fondoMat, 0, fondo - 0.03, 0));
    const muroMat = traslucido(std(0x7b8390, 0.95));
    const cordolo = traslucido(std(0xb8bec7, 0.7));
    for (const [w, d, x, z] of [
      [0.1, z1 - z0 + 0.2, x0 - 0.05, 0], [0.1, z1 - z0 + 0.2, x1 + 0.05, 0],
      [x1 - x0, 0.1, 0, z0 - 0.05], [x1 - x0, 0.1, 0, z1 + 0.05],
    ] as const) {
      scene.add(box(w, hMuro, d, muroMat, x, fondo, z));
      scene.add(box(w + 0.02, 0.025, d + 0.02, cordolo, x, GY, z, false));
    }

    // ringhiera in vetro sui quattro lati
    const ringhiera = new MeshPhysicalMaterial({ color: 0xa9c8ef, roughness: 0.05, transparent: true, opacity: 0.18, depthWrite: false, side: DoubleSide });
    terra.push({ mat: ringhiera, base: 0.18 });
    const corrimano = traslucido(std(0xb8c0cc, 0.35, 0.85));
    const lato = (w: number, x: number, z: number, ry: number) => {
      const p = new Mesh(new PlaneGeometry(w, 0.14), ringhiera);
      p.position.set(x, GY + 0.095, z);
      p.rotation.y = ry;
      scene.add(p);
      scene.add(box(ry ? 0.014 : w, 0.014, ry ? w : 0.014, corrimano, x, GY + 0.165, z, false));
    };
    lato(x1 - x0, 0, z1 + 0.05, 0);
    lato(x1 - x0, 0, z0 - 0.05, 0);
    lato(z1 - z0, x1 + 0.05, 0, Math.PI / 2);
    lato(z1 - z0 - 0.6, x0 - 0.05, -0.3, Math.PI / 2); // a sinistra lascia il varco della scala

    // scala che scende nella corte, lungo il muro di sinistra
    const GRADINI = 10;
    const alzata = hMuro / GRADINI;
    const pedata = 0.16;
    const scalaMat = std(0xa3abb6, 0.8);
    for (let k = 0; k < GRADINI; k++) {
      const top = GY - k * alzata;
      scene.add(box(0.42, top - fondo, pedata, scalaMat, x0 + 0.22, fondo, z1 - 0.1 - k * pedata));
    }

    // faretti a terra che illuminano dal basso la facciata dell'interrato
    const faretto = glow(0xdbeafe, 3);
    for (const [w, d, x, z] of [
      [W - 0.2, 0.03, 0, D / 2 + 0.25], [W - 0.2, 0.03, 0, -D / 2 - 0.25],
      [0.03, D - 0.2, W / 2 + 0.25, 0], [0.03, D - 0.2, -W / 2 - 0.25, 0],
    ] as const) scene.add(box(w, 0.01, d, faretto, x, fondo, z, false));
    for (const [x, z] of [[0, D / 2 + 0.5], [0, -D / 2 - 0.5], [W / 2 + 0.5, 0], [-W / 2 - 0.5, 0]]) {
      const l = new PointLight(0xcfe3ff, 1.1, 2.4, 1.8);
      l.position.set(x, fondo + 0.25, z);
      scene.add(l);
    }
    // qualche pianta nella corte
    for (const [x, z] of [[x1 - 0.35, z1 - 0.35], [x1 - 0.35, z0 + 0.35], [x0 + 0.9, z0 + 0.35]]) {
      scene.add(box(0.36, 0.14, 0.36, std(0x374151, 0.8), x, fondo, z));
      const f = new Mesh(new IcosahedronGeometry(0.17, 1), M.leafLight);
      f.position.set(x, fondo + 0.3, z);
      f.castShadow = true;
      scene.add(f);
    }

    // alberi e lampioni intorno alla piazza (fuori dalla corte)
    const albero = (x: number, z: number, s = 1) => {
      scene.add(cyl(0.03 * s, 0.32 * s, M.bark, x, GY, z, 8));
      for (const [dy, r, m] of [[0.42, 0.22, M.leaf], [0.6, 0.16, M.leafLight]] as const) {
        const c = new Mesh(new IcosahedronGeometry(r * s, 1), m);
        c.position.set(x, GY + dy * s, z);
        c.castShadow = true;
        scene.add(c);
      }
    };
    [[-4.4, 2.2, 1.1], [-3.9, -2.4, 0.95], [4.2, -2.1, 1], [-5.0, -0.2, 0.85], [4.8, -3.7, 1.05], [3.9, 2.8, 0.9]].forEach(([x, z, s]) => albero(x, z, s));
    const lampione = (x: number, z: number) => {
      scene.add(cyl(0.015, 0.6, M.aluDark, x, GY, z, 8));
      scene.add(box(0.12, 0.02, 0.05, M.aluDark, x + 0.05, GY + 0.6, z, false));
      scene.add(box(0.1, 0.008, 0.035, glow(0xffd9a0, 6), x + 0.06, GY + 0.592, z, false));
      const l = new PointLight(0xffc98a, 0.8, 1.6, 2);
      l.position.set(x + 0.06, GY + 0.55, z);
      scene.add(l);
    };
    [[-3.4, 2.9], [3.4, 2.9], [-3.4, -2.9]].forEach(([x, z]) => lampione(x, z));
    // marciapiede e strada davanti
    scene.add(box(14, 0.012, 0.6, std(0x4b5563, 0.9), 0, GY - 0.006, 3.5, false));
    scene.add(box(14, 0.01, 1.6, std(0x1f2430, 0.95), 0, GY - 0.012, 4.6, false));
    for (let k = -6; k <= 6; k++) scene.add(box(0.4, 0.004, 0.04, std(0xe5e7eb, 0.7), k * 1.1, GY - 0.006, 4.6, false));
  }

  // pulviscolo nell'aria
  {
    const DUST = 350;
    const pos = new Float32Array(DUST * 3);
    for (let k = 0; k < DUST; k++) {
      pos[k * 3] = (Math.random() - 0.5) * 18;
      pos[k * 3 + 1] = Math.random() * 10;
      pos[k * 3 + 2] = (Math.random() - 0.5) * 18;
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new Float32BufferAttribute(pos, 3));
    scene.add(new Points(geo, new PointsMaterial({ color: 0x93c5fd, size: 0.018, transparent: true, opacity: 0.35, depthWrite: false })));
  }

  // ── post-produzione: bagliore sulle luci ──
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // ── STANZE (interni dei piani) ──
  // modo: "fuori" = edificio, "tuffo" = la camera vola dentro il piano, "dentro" = stanza
  let modo: "fuori" | "tuffo" | "dentro" = "fuori";
  const stanze: (Stanza | undefined)[] = [];
  let stanza: Stanza | null = null;
  let stanzaT0 = 0;
  let hoverSt = -1;
  const stanzaOrb = { az: 0, azT: 0, el: 0, elT: 0 };
  const tuffoDa = new Vector3(), tuffoA = new Vector3(), tuffoGuarda = new Vector3();
  let tuffoT0 = 0;
  let tuffoFine: (() => void) | null = null;
  const TUFFO_MS = 950;
  const liscio = (x: number) => x * x * (3 - 2 * x);
  const asseY = new Vector3(0, 1, 0);
  const bloom = new UnrealBloomPass(new Vector2(256, 256), 0.42, 0.45, 0.88);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ── CAMERA, STATO, INTERAZIONE ──────────────────────────────────────────
  let selected: number | null = null;
  let lit = new Set<number>();
  let hovered = -1;
  const light = kinds.map(() => 0.7);
  const mark = kinds.map(() => 0);
  let xray = 0;

  const cam = { y: 0, r: 0, az: -0.62, el: 0.2 };
  const want = { ...cam };
  // Rotazione libera intorno all'edificio: trascinamento (con inerzia), pulsanti e,
  // quando nessuno tocca niente, un giro lento automatico sulla panoramica.
  const orbit = { az: 0, azT: 0, el: 0, vel: 0 };
  let drag: { id: number; x: number; y: number; t: number; moved: boolean } | null = null;
  let lastDrag = false;
  let idleSince = performance.now();
  let aspect = 1;
  // quanto ci si può girare nella stanza: in verticale la camera resta vicina (oggetti grandi),
  // quindi serve un arco più ampio perché anche gli oggetti alle estremità arrivino a schermo
  const limiteGiro = () => (aspect < 1 ? 1.25 : 0.75);

  const fit = (halfH: number, halfW: number) => {
    const vf = (camera.fov * Math.PI) / 180;
    const hf = 2 * Math.atan(Math.tan(vf / 2) * aspect);
    return Math.max(halfH / Math.tan(vf / 2), halfW / Math.tan(hf / 2));
  };
  const target = () => {
    if (selected === null) {
      want.y = (N * H) / 2 - 0.35;
      want.r = fit((N * H) / 2 + 0.7, W / 2 + 1.5);
      want.az = -0.62;
      want.el = 0.26;
    } else if (selected === 0) {
      // interrato: la camera sta più in alto e guarda giù dentro lo scavo
      want.y = 0.12;
      want.r = fit(H / 2 + 0.6, W / 2 + 0.7);
      want.az = -0.38;
      want.el = 0.36;
    } else {
      want.y = selected * H + CEIL / 2;
      want.r = fit(H / 2 + 0.55, W / 2 + 0.35);
      want.az = -0.45;
      want.el = 0.13;
    }
  };

  // Alla prima misura valida la camera parte già inquadrata (niente volo da dentro il palazzo).
  let misurato = false;
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    aspect = w / h;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    target();
    if (!misurato) { misurato = true; Object.assign(cam, want); }
  }
  target();
  Object.assign(cam, want);
  resize();

  const listeners: (() => void)[] = [];
  const v = new Vector3();
  // L'etichetta di ogni piano si attacca allo spigolo che a schermo sta più a sinistra:
  // così resta sul fianco sinistro dell'edificio da qualunque lato lo si guardi.
  const spigoli = [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([sx, sz]) => [sx * (W / 2 + 0.05), sz * (D / 2 + 0.05)]);
  function anchors() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    return kinds.map((_, i) => {
      let best = { x: Infinity, y: 0 };
      for (const [x, z] of spigoli) {
        v.set(x, i * H + CEIL * 0.45, z).project(camera);
        const p = { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h };
        if (p.x < best.x) best = p;
      }
      return best;
    });
  }

  let raf = 0, last = performance.now(), running = false;
  const t0 = performance.now();
  function frame(now: number) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const t = (now - t0) / 1000;
    const k = 1 - Math.exp(-dt * 3.2);

    // dentro un piano: la camera entra nella stanza e ci si guarda intorno trascinando
    if (modo === "dentro" && stanza) {
      const f = liscio(Math.min((now - stanzaT0) / 1600, 1));
      stanzaOrb.az += (stanzaOrb.azT - stanzaOrb.az) * (1 - Math.exp(-dt * 8));
      stanzaOrb.el += (stanzaOrb.elT - stanzaOrb.el) * (1 - Math.exp(-dt * 8));
      // la camera si allontana quanto serve perché tutto l'arco di oggetti entri nello schermo
      const hf = 2 * Math.atan(Math.tan((camera.fov * Math.PI) / 360) * aspect);
      const zServe = stanza.zEsterno + stanza.mezzaLarghezza / Math.tan(hf / 2);
      // su schermi verticali non si allontana troppo: ci si gira trascinando, gli oggetti restano grandi
      const scala = Math.min(Math.max(1, (zServe - stanza.guarda.z) / (stanza.camA.z - stanza.guarda.z)), aspect < 1 ? 1.35 : 4);
      const off = stanza.camDa.clone().lerp(stanza.camA, f).sub(stanza.guarda).multiplyScalar(scala);
      off.applyAxisAngle(asseY, stanzaOrb.az + Math.sin(t * 0.25) * 0.03);
      off.y += stanzaOrb.el;
      camera.position.copy(stanza.guarda).add(off);
      camera.lookAt(stanza.guarda);
      stanza.aggiorna(t, hoverSt);
      composer.render();
      listeners.forEach((fn) => fn());
      return;
    }

    // rotazione: inerzia dopo il trascinamento, giro lento se si resta a guardare
    if (!drag) {
      orbit.azT += orbit.vel * dt;
      orbit.vel *= Math.exp(-dt * 2.6);
      if (selected === null && now - idleSince > 4000) orbit.azT += dt * 0.07;
    }
    orbit.az += (orbit.azT - orbit.az) * (drag ? 1 : 1 - Math.exp(-dt * 6));

    // camera verso il bersaglio
    cam.y += (want.y - cam.y) * k;
    cam.r += (want.r - cam.r) * k;
    cam.az += (want.az + orbit.az - cam.az) * (drag?.moved ? 1 - Math.exp(-dt * 14) : k);
    const el = Math.min(Math.max(want.el + orbit.el, 0.03), 0.85);
    cam.el += (el - cam.el) * k;
    camera.position.set(Math.sin(cam.az) * Math.cos(cam.el) * cam.r, cam.y + Math.sin(cam.el) * cam.r, Math.cos(cam.az) * Math.cos(cam.el) * cam.r);
    camera.lookAt(0, cam.y, 0);
    // tuffo: la camera attraversa la vetrata del piano scelto, accelerando
    if (modo === "tuffo") {
      const f = Math.min((now - tuffoT0) / TUFFO_MS, 1);
      camera.position.copy(tuffoDa).lerp(tuffoA, f * f * f);
      camera.lookAt(tuffoGuarda);
      if (f >= 1 && tuffoFine) { const fine = tuffoFine; tuffoFine = null; fine(); }
    }

    // luci dei piani: il piano scelto (o quelli dell'obiettivo) a piena luce, gli altri bassi
    const kl = 1 - Math.exp(-dt * 5);
    fx.forEach((f, i) => {
      const on = selected === i || lit.has(i);
      const dim = selected !== null || lit.size > 0;
      const l = (on ? 1 : dim ? 0.06 : 0.7) + (hovered === i && !on ? 0.3 : 0);
      light[i] += (l - light[i]) * kl;
      mark[i] += ((on ? 1 : hovered === i ? 0.45 : 0) - mark[i]) * kl;
      f.ceil.emissiveIntensity = 0.05 + 2.0 * light[i];
      f.lamp.intensity = 0.02 + 1.8 * light[i] + (i === 0 ? 0.6 : 0);
      f.accent.emissiveIntensity = 3.2 * mark[i];
    });

    // interrato scelto o sotto il puntatore: piazza, muri e ringhiere diventano trasparenti
    xray += ((selected === 0 || (hovered === 0 && selected === null) ? 1 : 0) - xray) * kl;
    for (const t of terra) t.mat.opacity = t.base * (1 - 0.85 * xray);

    // la cabina dell'ascensore va al piano scelto (o resta al piano terra)
    const cy = (selected ?? 1) * H;
    cabina.position.y += (cy - cabina.position.y) * (1 - Math.exp(-dt * 2.4));

    animators.forEach((a) => a.fn(t, light[a.i]));
    composer.render();
    listeners.forEach((fn) => fn());
  }

  const raycaster = new Raycaster();
  const ndc = new Vector2();
  function pick(clientX: number, clientY: number) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(hitboxes, false)[0];
    return hit ? (hit.object.userData.floor as number) : -1;
  }

  // Trascinamento: in orizzontale gira intorno, in verticale alza o abbassa lo sguardo.
  // Sotto i 5 px è un clic (lo gestisce Edificio.astro); sui touch lo scorrimento verticale
  // della pagina resta libero (touch-action: pan-y sul canvas).
  canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
    orbit.vel = 0;
    idleSince = performance.now();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    if (!drag.moved) {
      drag.moved = true;
      try { canvas.setPointerCapture(e.pointerId); } catch { /* puntatore già rilasciato: si continua senza cattura */ }
      canvas.classList.add("is-dragging");
    }
    const now = performance.now();
    const ddt = Math.max((now - drag.t) / 1000, 0.008);
    const da = -dx * 0.0085;
    if (modo === "dentro") {
      // nella stanza ci si guarda intorno, entro un arco
      stanzaOrb.azT = Math.min(Math.max(stanzaOrb.azT + da, -limiteGiro()), limiteGiro());
      if (e.pointerType !== "touch") stanzaOrb.elT = Math.min(Math.max(stanzaOrb.elT + dy * 0.01, -0.8), 2.2);
    } else {
      orbit.azT += da;
      orbit.az = orbit.azT;
      orbit.vel = orbit.vel * 0.4 + (da / ddt) * 0.6;
      if (e.pointerType !== "touch") orbit.el = Math.min(Math.max(orbit.el + dy * 0.004, -0.15), 0.6);
    }
    drag.x = e.clientX; drag.y = e.clientY; drag.t = now;
    idleSince = now;
  });
  const fine = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    lastDrag = drag.moved;
    if (performance.now() - drag.t > 80) orbit.vel = 0; // fermo prima di lasciare: niente inerzia
    drag = null;
    canvas.classList.remove("is-dragging");
    idleSince = performance.now();
  };
  canvas.addEventListener("pointerup", fine);
  canvas.addEventListener("pointercancel", fine);

  return {
    select(i, instant = false) { selected = i; target(); idleSince = performance.now(); if (instant) Object.assign(cam, want); },
    highlight(ids) { lit = new Set(ids); },
    hover(i) { hovered = i; },
    pick,
    anchors,
    resize,
    start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); },
    onFrame(fn) { listeners.push(fn); },
    rotate(delta) {
      if (modo === "dentro") { stanzaOrb.azT = Math.min(Math.max(stanzaOrb.azT + delta * 0.6, -limiteGiro()), limiteGiro()); return; }
      orbit.vel = 0; orbit.azT += delta; idleSince = performance.now();
    },
    tuffo(i) {
      selected = i;
      target();
      // dal punto in cui si trova la camera, dritti verso il centro del piano
      const c = new Vector3(0, i * H + CEIL * 0.5, 0);
      const dir = new Vector3(camera.position.x, 0, camera.position.z).normalize();
      tuffoDa.copy(camera.position);
      tuffoA.copy(c).addScaledVector(dir, D * 0.15);
      tuffoGuarda.copy(c).addScaledVector(dir, -2);
      tuffoT0 = performance.now();
      modo = "tuffo";
      return new Promise<void>((r) => { tuffoFine = r; });
    },
    entra(i) {
      if (!stanze[i]) stanze[i] = creaStanza(kinds[i], info[i]?.piano ?? "", info[i]?.area ?? "", envTex);
      stanza = stanze[i]!;
      renderPass.scene = stanza.scene;
      stanzaOrb.az = stanzaOrb.azT = stanzaOrb.el = stanzaOrb.elT = 0;
      hoverSt = -1;
      stanzaT0 = performance.now();
      camera.fov = 44; // dentro, un obiettivo più largo
      camera.updateProjectionMatrix();
      modo = "dentro";
    },
    esci() {
      renderPass.scene = scene;
      camera.fov = 30;
      camera.updateProjectionMatrix();
      modo = "fuori";
      stanza = null;
      // la camera riparte vicina al piano e si allontana fino alla sua inquadratura
      cam.r = want.r * 0.3;
      cam.y = want.y;
      idleSince = performance.now();
    },
    dentro() { return modo === "dentro"; },
    ancoreStanza() {
      if (!stanza) return [];
      const w = canvas.clientWidth, h = canvas.clientHeight;
      return stanza.etichette.map((p) => {
        v.copy(p).project(camera);
        return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, dietro: v.z > 1 };
      });
    },
    pickStanza(clientX, clientY) {
      if (!stanza) return -1;
      const r = canvas.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      for (const hit of raycaster.intersectObjects(stanza.stazioni, true)) {
        let o: typeof hit.object | null = hit.object;
        while (o && o.userData.indice === undefined) o = o.parent;
        if (o) return o.userData.indice as number;
      }
      return -1;
    },
    hoverStanza(i) { hoverSt = i; },
    dragged() { const d = lastDrag; lastDrag = false; return d; },
  };
}
