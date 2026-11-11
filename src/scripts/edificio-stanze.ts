// Interni dei piani della home "edificio": quando si clicca un piano si entra in una
// stanza 3D dedicata. Ogni argomento del piano (le voci di data/edificio.ts, nello stesso
// ordine) è un oggetto in esposizione su un piedistallo luminoso, disposti ad arco davanti
// alla camera. Le etichette e i link sono HTML (Edificio.astro): da qui escono solo le
// posizioni 3D a cui agganciarle. Unità: metri, pavimento a y = 0.
import {
  BoxGeometry, CanvasTexture, CircleGeometry, ConeGeometry, CylinderGeometry, DoubleSide, Fog, Group,
  IcosahedronGeometry, Material, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PlaneGeometry,
  PointLight, Points, PointsMaterial, BufferGeometry, Float32BufferAttribute, Scene, SphereGeometry,
  SRGBColorSpace, TorusGeometry, Vector3, HemisphereLight, DirectionalLight, Texture, LineSegments,
  EdgesGeometry, LineBasicMaterial,
} from "three";
import type { Kind } from "../data/edificio";
import { arreda, pavimento, popola, soffitto } from "./edificio-persone";
import { unisciStatici, vivo } from "./edificio-unisci";

export interface Stanza {
  scene: Scene;
  /** gruppo di ogni oggetto in esposizione (per clic e passaggio del puntatore) */
  stazioni: Object3D[];
  /** punto sopra ogni oggetto dove agganciare l'etichetta HTML */
  etichette: Vector3[];
  /** da dove entra la camera e dove si ferma, e il punto che guarda */
  camDa: Vector3;
  camA: Vector3;
  guarda: Vector3;
  /** ingombro dell'arco di oggetti: mezza larghezza e z degli oggetti più vicini alla camera */
  mezzaLarghezza: number;
  zEsterno: number;
  /** animazioni: tempo in secondi e oggetto sotto il puntatore (-1 nessuno) */
  aggiorna(t: number, hovered: number): void;
}

// ── materiali e forme ──────────────────────────────────────────────────────
const std = (color: number, roughness = 0.6, metalness = 0, extra: Partial<MeshStandardMaterial> = {}) =>
  new MeshStandardMaterial({ color, roughness, metalness, ...extra });
const glow = (color: number, intensity = 1.6) =>
  new MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveIntensity: intensity, roughness: 1 });

const M = {
  floor: std(0x18202d, 0.32, 0.35),
  dark: std(0x111827, 0.5, 0.3),
  steel: std(0xb8c0cc, 0.3, 0.9),
  steelDark: std(0x4b5563, 0.4, 0.8),
  white: std(0xe5e7eb, 0.5),
  wood: std(0x8a6a4a, 0.55),
  woodLight: std(0xc8a27a, 0.5),
  blue: std(0x1d4ed8, 0.45, 0.3),
  navy: std(0x1e3a8a, 0.7),
  red: std(0xc81e1e, 0.4, 0.2),
  yellow: std(0xeab308, 0.45),
  orange: std(0xea580c, 0.5, 0.2),
  green: std(0x15803d, 0.7),
  leaf: std(0x2f6b3c, 0.85),
  gold: std(0xd4a017, 0.3, 0.9),
  concrete: std(0x8b929c, 0.95),
  fabric: std(0x334155, 0.9),
  glass: new MeshStandardMaterial({ color: 0xbfdbfe, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.25, depthWrite: false, side: DoubleSide }),
};

const box = (w: number, h: number, d: number, mat: Material, x = 0, y = 0, z = 0) => {
  const m = new Mesh(new BoxGeometry(w, h, d), mat);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};
const cyl = (r: number, h: number, mat: Material, x = 0, y = 0, z = 0, seg = 24, rTop = r) => {
  const m = new Mesh(new CylinderGeometry(rTop, r, h, seg), mat);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};
const sfera = (r: number, mat: Material, x = 0, y = 0, z = 0) => {
  const m = new Mesh(new SphereGeometry(r, 24, 16), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
};

/** testo su una texture (per insegne, schermi, monoliti) */
function testo(righe: { t: string; size: number; color: string; weight?: number; y: number }[], w = 512, h = 256, bg = "#0b1222") {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const r of righe) {
    ctx.font = `${r.weight ?? 600} ${r.size}px Inter, 'Helvetica Neue', Arial, sans-serif`;
    ctx.fillStyle = r.color;
    ctx.fillText(r.t, w / 2, r.y);
  }
  const tex = new CanvasTexture(cv);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}
const schermo = (tex: Texture, w: number, h: number, intensity = 1.2) => {
  const m = new Mesh(new PlaneGeometry(w, h), new MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: intensity, roughness: 0.4 }));
  return m;
};
/** grafico a barre disegnato (per monitor e cruscotti) */
function cruscotto(seed: number) {
  const cv = document.createElement("canvas");
  cv.width = 320; cv.height = 200;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#0b1730"; ctx.fillRect(0, 0, 320, 200);
  ctx.fillStyle = "#1e3a8a"; ctx.fillRect(0, 0, 320, 22);
  for (let k = 0; k < 7; k++) {
    const h = 30 + ((seed * 37 + k * 53) % 110);
    ctx.fillStyle = k % 3 === 0 ? "#22d3ee" : "#60a5fa";
    ctx.fillRect(20 + k * 40, 185 - h, 24, h);
  }
  ctx.strokeStyle = "#a5f3fc"; ctx.lineWidth = 3; ctx.beginPath();
  for (let k = 0; k < 8; k++) ctx.lineTo(16 + k * 42, 120 - Math.sin(k + seed) * 40);
  ctx.stroke();
  const t = new CanvasTexture(cv);
  t.colorSpace = SRGBColorSpace;
  return t;
}
/** figura umana stilizzata: corpo a capsula, testa, casco colorato */
function persona(casco: number, abito = M.navy) {
  const g = new Group();
  g.add(cyl(0.16, 0.85, abito, 0, 0, 0, 16, 0.19));
  g.add(sfera(0.13, std(0xd6b28f, 0.7), 0, 1.02, 0));
  const c = new Mesh(new SphereGeometry(0.15, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(casco, 0.4));
  c.position.y = 1.06;
  g.add(c);
  const tesa = new Mesh(new CylinderGeometry(0.19, 0.19, 0.015, 24), std(casco, 0.4));
  tesa.position.y = 1.06;
  g.add(tesa);
  return g;
}
function estintore(scala = 1) {
  const g = new Group();
  g.add(cyl(0.14 * scala, 0.62 * scala, M.red, 0, 0, 0, 24));
  g.add(sfera(0.14 * scala, M.red, 0, 0.62 * scala, 0));
  g.add(cyl(0.04 * scala, 0.12 * scala, M.dark, 0, 0.72 * scala, 0));
  const tubo = new Mesh(new TorusGeometry(0.12 * scala, 0.018 * scala, 8, 24, Math.PI), M.dark);
  tubo.position.set(0.12 * scala, 0.62 * scala, 0);
  tubo.rotation.z = -Math.PI / 2;
  g.add(tubo);
  g.add(box(0.2 * scala, 0.12 * scala, 0.01, M.white, 0, 0.3 * scala, 0.141 * scala));
  return g;
}
function monete(n = 6) {
  const g = new Group();
  for (let k = 0; k < n; k++) {
    const c = new Mesh(new CylinderGeometry(0.22, 0.22, 0.06, 32), M.gold);
    c.position.set(Math.sin(k) * 0.02, 0.03 + k * 0.065, Math.cos(k) * 0.02);
    c.castShadow = true;
    g.add(c);
  }
  return g;
}
function tocco() {
  const g = new Group();
  g.add(cyl(0.16, 0.12, M.dark, 0, 0, 0, 24));
  const p = box(0.46, 0.03, 0.46, M.dark, 0, 0.12, 0);
  p.rotation.y = Math.PI / 4;
  g.add(p);
  g.add(cyl(0.008, 0.18, M.gold, 0.2, -0.03, 0.0, 6));
  return g;
}
function documento(tex?: Texture, w = 0.62, h = 0.84) {
  const g = new Group();
  for (let k = 0; k < 3; k++) {
    const f = new Mesh(new PlaneGeometry(w, h), k === 2 && tex ? new MeshStandardMaterial({ map: tex, roughness: 0.8 }) : M.white);
    f.position.set(k * 0.02, h / 2 + k * 0.01, -k * 0.01);
    f.castShadow = true;
    g.add(f);
  }
  return g;
}

// ── OGGETTI IN ESPOSIZIONE ──────────────────────────────────────────────────
// Ognuno restituisce { g, h, anima? }: gruppo, altezza (per l'etichetta) e animazione.
type Pezzo = { g: Group; h: number; anima?: (t: number, attivo: boolean) => void };
type Fab = () => Pezzo;

const P: Record<string, Fab> = {
  // ── consulenza e sicurezza
  casco() {
    const g = new Group();
    g.add(cyl(0.04, 0.9, M.steelDark, 0, 0, 0, 12));
    const c = new Mesh(new SphereGeometry(0.3, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), std(0xfacc15, 0.35));
    c.position.y = 0.95;
    c.castShadow = true;
    g.add(c);
    const tesa = new Mesh(new CylinderGeometry(0.38, 0.38, 0.03, 32), std(0xfacc15, 0.35));
    tesa.position.y = 0.95;
    g.add(tesa);
    g.add(box(0.06, 0.18, 0.6, std(0xfde047, 0.35), 0, 1.0, 0));
    // gilet alta visibilità sul supporto
    g.add(box(0.5, 0.55, 0.16, std(0xf97316, 0.6), 0, 0.3, 0));
    for (const y of [0.42, 0.5]) g.add(box(0.51, 0.04, 0.165, std(0xe5e7eb, 0.2, 0.6), 0, y, 0));
    return { g, h: 1.3 };
  },
  cantiere() {
    const g = new Group();
    for (const x of [-0.5, 0.5]) for (const z of [-0.25, 0.25]) g.add(cyl(0.025, 1.5, M.steel, x, 0, z, 10));
    for (const y of [0.5, 1.0, 1.45]) {
      g.add(box(1.1, 0.04, 0.55, M.woodLight, 0, y, 0));
      g.add(box(1.0, 0.025, 0.025, M.steel, 0, y + 0.3, 0.25));
    }
    // transenna bianca e rossa
    const cv = document.createElement("canvas");
    cv.width = 256; cv.height = 32;
    const ctx = cv.getContext("2d")!;
    for (let k = 0; k < 8; k++) { ctx.fillStyle = k % 2 ? "#ffffff" : "#dc2626"; ctx.fillRect(k * 32, 0, 32, 32); }
    const t = new CanvasTexture(cv);
    t.colorSpace = SRGBColorSpace;
    g.add(box(1.3, 0.12, 0.04, new MeshStandardMaterial({ map: t, roughness: 0.6 }), 0, 0.35, 0.55));
    for (const x of [-0.6, 0.6]) g.add(box(0.05, 0.5, 0.05, M.white, x, 0, 0.55));
    return { g, h: 1.6 };
  },
  haccp() {
    const g = new Group();
    const acciaio = std(0xd1d5db, 0.25, 0.9);
    g.add(box(1.2, 0.85, 0.6, acciaio, 0, 0, 0));
    g.add(cyl(0.18, 0.22, acciaio, -0.3, 0.85, 0));
    g.add(cyl(0.2, 0.02, acciaio, -0.3, 1.07, 0));
    // termometro con bulbo rosso
    const term = new Group();
    term.add(cyl(0.02, 0.5, M.white, 0, 0, 0, 10));
    term.add(sfera(0.04, glow(0xef4444, 2), 0, 0, 0));
    term.add(cyl(0.012, 0.32, glow(0xef4444, 2), 0, 0, 0.0, 8));
    term.position.set(0.25, 0.92, 0.1);
    term.rotation.z = -0.4;
    g.add(term);
    // cartello con la checklist
    const tex = testo([{ t: "HACCP", size: 70, color: "#fff", y: 70 }, { t: "✓  CCP 1", size: 34, color: "#86efac", y: 140 }, { t: "✓  CCP 2", size: 34, color: "#86efac", y: 190 }], 320, 256);
    const s = schermo(tex, 0.5, 0.4, 0.9);
    s.position.set(0.35, 1.35, -0.28);
    g.add(s);
    g.add(cyl(0.012, 0.5, M.steelDark, 0.35, 0.85, -0.29, 6));
    return { g, h: 1.6 };
  },
  medicina() {
    const g = new Group();
    const croce = new Group();
    croce.add(box(0.7, 0.22, 0.12, glow(0xffffff, 1.4), 0, -0.11, 0));
    croce.add(box(0.22, 0.7, 0.12, glow(0xffffff, 1.4), 0, -0.35, 0));
    croce.add(box(0.62, 0.15, 0.13, glow(0xef4444, 2.2), 0, -0.075, 0));
    croce.add(box(0.15, 0.62, 0.13, glow(0xef4444, 2.2), 0, -0.31, 0));
    croce.position.y = 1.15;
    g.add(croce);
    // monitor del battito
    g.add(cyl(0.03, 0.75, M.steelDark, 0, 0, 0, 10));
    const cv = document.createElement("canvas");
    cv.width = 256; cv.height = 128;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = "#04121c"; ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = "#22c55e"; ctx.lineWidth = 4; ctx.beginPath();
    const pts = [[0, 70], [70, 70], [85, 30], [100, 110], [115, 55], [130, 70], [256, 70]];
    pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    const t = new CanvasTexture(cv);
    t.colorSpace = SRGBColorSpace;
    g.add(box(0.5, 0.3, 0.05, M.dark, 0, 0.6, 0));
    const s = schermo(t, 0.46, 0.26, 1.4);
    s.position.set(0, 0.75, 0.027);
    g.add(s);
    return { g, h: 1.6, anima: (tt) => { croce.rotation.y = Math.sin(tt * 0.7) * 0.4; } };
  },
  gdpr() {
    const g = new Group();
    const lucchetto = new Group();
    lucchetto.add(box(0.6, 0.5, 0.25, M.blue, 0, 0, 0));
    const arco = new Mesh(new TorusGeometry(0.2, 0.05, 12, 32, Math.PI), M.steel);
    arco.position.y = 0.5;
    lucchetto.add(arco);
    lucchetto.add(cyl(0.05, 0.02, M.dark, 0, 0.22, 0.13));
    lucchetto.children[lucchetto.children.length - 1].rotation.x = Math.PI / 2;
    lucchetto.add(box(0.03, 0.1, 0.02, M.dark, 0, 0.1, 0.13));
    lucchetto.position.y = 0.5;
    g.add(lucchetto);
    // scudo luminoso dietro
    const anello = new Mesh(new TorusGeometry(0.62, 0.02, 8, 64), glow(0x60a5fa, 2));
    anello.position.set(0, 0.85, -0.2);
    g.add(anello);
    return { g, h: 1.5, anima: (t) => { lucchetto.rotation.y = Math.sin(t * 0.8) * 0.5; anello.rotation.z = t * 0.3; } };
  },
  ambiente() {
    const g = new Group();
    [[0x16a34a, -0.42], [0x2563eb, 0], [0xeab308, 0.42]].forEach(([c, x]) => {
      g.add(box(0.34, 0.6, 0.4, std(c as number, 0.6), x as number, 0, 0));
      g.add(box(0.36, 0.05, 0.42, std(c as number, 0.5), x as number, 0.6, 0));
    });
    g.add(cyl(0.04, 0.5, std(0x5b4030, 0.9), 0, 0.65, -0.3, 8));
    const chioma = new Mesh(new IcosahedronGeometry(0.32, 1), M.leaf);
    chioma.position.set(0, 1.3, -0.3);
    chioma.castShadow = true;
    g.add(chioma);
    return { g, h: 1.6 };
  },
  aziendale() {
    const g = new Group();
    g.add(box(1.1, 0.04, 0.55, M.wood, 0, 0.72, 0));
    for (const x of [-0.5, 0.5]) for (const z of [-0.22, 0.22]) g.add(box(0.04, 0.72, 0.04, M.steelDark, x, 0, z));
    // organigramma luminoso sospeso
    const org = new Group();
    const nodo = (x: number, y: number) => org.add(box(0.26, 0.14, 0.04, glow(0x60a5fa, 1.6), x, y, 0));
    nodo(0, 0.45);
    [-0.4, 0, 0.4].forEach((x) => nodo(x, 0.1));
    org.add(box(0.82, 0.015, 0.015, glow(0x93c5fd, 1.4), 0, 0.33, 0));
    [-0.4, 0, 0.4].forEach((x) => org.add(box(0.015, 0.1, 0.015, glow(0x93c5fd, 1.4), x, 0.24, 0)));
    org.position.set(0, 1.0, -0.15);
    g.add(org);
    return { g, h: 1.7 };
  },

  // ── engineering
  progetto() {
    const g = new Group();
    for (const x of [-0.45, 0.45]) g.add(box(0.05, 0.85, 0.05, M.steelDark, x, 0, 0));
    const piano = new Group();
    const cv = document.createElement("canvas");
    cv.width = 512; cv.height = 360;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = "#1e3a8a"; ctx.fillRect(0, 0, 512, 360);
    ctx.strokeStyle = "rgba(191,219,254,0.35)"; ctx.lineWidth = 1;
    for (let k = 0; k < 512; k += 24) { ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k, 360); ctx.stroke(); }
    for (let k = 0; k < 360; k += 24) { ctx.beginPath(); ctx.moveTo(0, k); ctx.lineTo(512, k); ctx.stroke(); }
    ctx.strokeStyle = "#e0f2fe"; ctx.lineWidth = 4;
    ctx.strokeRect(80, 70, 350, 220); ctx.strokeRect(80, 70, 160, 120); ctx.strokeRect(240, 190, 190, 100);
    ctx.beginPath(); ctx.arc(240, 190, 50, Math.PI, Math.PI * 1.5); ctx.stroke();
    const t = new CanvasTexture(cv);
    t.colorSpace = SRGBColorSpace;
    const foglio = new Mesh(new PlaneGeometry(1.1, 0.78), new MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.35, roughness: 0.7 }));
    piano.add(box(1.2, 0.03, 0.85, M.white, 0, -0.03, 0));
    foglio.rotation.x = -Math.PI / 2;
    piano.add(foglio);
    piano.position.y = 0.9;
    piano.rotation.x = 0.5;
    g.add(piano);
    // plastico dell'edificio
    const plastico = new Group();
    for (let k = 0; k < 4; k++) plastico.add(box(0.28, 0.1, 0.2, k % 2 ? M.glass : M.white, 0, k * 0.1, 0));
    plastico.position.set(0.35, 0.95, 0.35);
    g.add(plastico);
    return { g, h: 1.45 };
  },
  impianti() {
    const g = new Group();
    const tubo = (len: number, mat: Material, x: number, y: number, z: number, rz = 0, rx = 0) => {
      const m = new Mesh(new CylinderGeometry(0.06, 0.06, len, 16), mat);
      m.position.set(x, y, z);
      m.rotation.set(rx, 0, rz);
      m.castShadow = true;
      g.add(m);
    };
    tubo(1.2, M.blue, -0.3, 0.6, 0);
    tubo(1.2, M.red, 0.3, 0.6, 0);
    tubo(0.9, M.blue, 0.15, 1.2, 0, Math.PI / 2);
    tubo(0.9, M.steel, 0.15, 0.3, 0, Math.PI / 2);
    // valvole a volantino
    const volantini: Mesh[] = [];
    for (const [x, y, c] of [[-0.3, 0.95, 0xdc2626], [0.3, 0.95, 0x2563eb], [0.15, 1.2, 0xdc2626]] as const) {
      const v = new Mesh(new TorusGeometry(0.11, 0.02, 8, 24), std(c, 0.4));
      v.position.set(x, y, 0.12);
      g.add(v);
      volantini.push(v);
    }
    // manometro
    g.add(cyl(0.1, 0.04, M.steel, -0.3, 1.25, 0.04));
    g.children[g.children.length - 1].rotation.x = Math.PI / 2;
    return { g, h: 1.45, anima: (t, a) => volantini.forEach((v, k) => { v.rotation.z = t * (a ? 1.5 : 0.3) * (k % 2 ? 1 : -1); }) };
  },
  antincendio() {
    const g = new Group();
    const e = estintore(1.4);
    e.position.x = -0.25;
    g.add(e);
    // tubo con sprinkler e allarme
    g.add(cyl(0.03, 1.5, M.red, 0.35, 0, -0.1, 12));
    g.add(box(0.5, 0.05, 0.05, M.red, 0.15, 1.45, -0.1));
    const sp = new Mesh(new ConeGeometry(0.06, 0.08, 12), M.steel);
    sp.position.set(-0.05, 1.4, -0.1);
    sp.rotation.x = Math.PI;
    g.add(sp);
    const allarme = box(0.2, 0.2, 0.08, M.red, 0.35, 0.95, -0.02);
    g.add(allarme);
    const luce = glow(0xff3b30, 3);
    g.add(sfera(0.05, luce, 0.35, 1.25, 0.0));
    return { g, h: 1.6, anima: (t) => { luce.emissiveIntensity = Math.sin(t * 6) > 0 ? 4 : 0.3; } };
  },
  collaudi() {
    const g = new Group();
    // teodolite su treppiede
    for (let k = 0; k < 3; k++) {
      const gamba = new Mesh(new CylinderGeometry(0.02, 0.02, 1.15, 8), M.yellow);
      const a = (k / 3) * Math.PI * 2;
      gamba.position.set(Math.sin(a) * 0.2, 0.55, Math.cos(a) * 0.2);
      gamba.rotation.set(Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35);
      g.add(gamba);
    }
    const testa = new Group();
    testa.add(box(0.22, 0.26, 0.16, M.yellow, 0, 0, 0));
    const ottica = new Mesh(new CylinderGeometry(0.05, 0.05, 0.3, 16), M.dark);
    ottica.rotation.x = Math.PI / 2;
    ottica.position.y = 0.16;
    testa.add(ottica);
    testa.position.y = 1.12;
    g.add(testa);
    // casco e cartella appoggiati
    const c = new Mesh(new SphereGeometry(0.16, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(0xffffff, 0.35));
    c.position.set(0.45, 0, 0.2);
    g.add(c);
    return { g, h: 1.5, anima: (t) => { testa.rotation.y = Math.sin(t * 0.6) * 0.8; } };
  },
  materiali() {
    const g = new Group();
    for (const x of [-0.35, 0.35]) g.add(cyl(0.05, 1.3, M.steel, x, 0, 0, 16));
    g.add(box(0.9, 0.12, 0.5, M.steelDark, 0, 0, 0));
    g.add(box(0.9, 0.12, 0.5, M.steelDark, 0, 1.2, 0));
    const piatto = box(0.4, 0.06, 0.4, M.steel, 0, 0.62, 0);
    g.add(piatto);
    const cubo = box(0.28, 0.28, 0.28, M.concrete, 0, 0.12, 0);
    g.add(cubo);
    g.add(cyl(0.08, 0.5, M.steel, 0, 0.68, 0));
    return { g, h: 1.5, anima: (t, a) => { piatto.position.y = 0.43 + (a ? 0.03 * Math.sin(t * 2) : 0.03); } };
  },
  pratiche() {
    const g = new Group();
    g.add(box(0.9, 0.7, 0.5, M.wood, 0, 0, 0));
    for (let k = 0; k < 3; k++) g.add(box(0.5, 0.05 + k * 0.02, 0.36, M.white, -0.12 + k * 0.05, 0.7 + k * 0.08, 0));
    const timbro = new Group();
    timbro.add(cyl(0.08, 0.06, M.red, 0, 0, 0));
    timbro.add(cyl(0.025, 0.14, M.wood, 0, 0.06, 0));
    timbro.add(sfera(0.05, M.wood, 0, 0.22, 0));
    timbro.position.set(0.25, 1.05, 0.05);
    g.add(timbro);
    return { g, h: 1.4, anima: (t, a) => { timbro.position.y = 1.05 + (a ? Math.abs(Math.sin(t * 3)) * 0.12 : 0.06); } };
  },

  // ── formazione
  banchi() {
    const g = new Group();
    for (const [x, z] of [[-0.35, 0.2], [0.35, 0.2], [-0.35, -0.4], [0.35, -0.4]]) {
      g.add(box(0.55, 0.03, 0.35, M.white, x, 0.7, z));
      for (const dx of [-0.24, 0.24]) g.add(box(0.025, 0.7, 0.025, M.steelDark, x + dx, 0, z));
      g.add(box(0.36, 0.04, 0.32, M.blue, x, 0.42, z + 0.35));
      g.add(box(0.36, 0.4, 0.04, M.blue, x, 0.44, z + 0.5));
    }
    const tex = cruscotto(3);
    const s = schermo(tex, 0.8, 0.5, 1.1);
    s.position.set(0, 1.35, -0.8);
    g.add(s);
    return { g, h: 1.7 };
  },
  ruoli() {
    const g = new Group();
    [[0xffffff, -0.5, "RSPP"], [0xeab308, 0, "Preposto"], [0x2563eb, 0.5, "RLS"]].forEach(([c, x]) => {
      const p = persona(c as number);
      p.position.x = x as number;
      g.add(p);
    });
    return { g, h: 1.3 };
  },
  emergenze() {
    const g = new Group();
    const e = estintore(1.2);
    e.position.x = -0.35;
    g.add(e);
    // cassetta di pronto soccorso
    const kit = new Group();
    kit.add(box(0.55, 0.4, 0.2, M.white, 0, 0, 0));
    kit.add(box(0.2, 0.06, 0.01, M.red, 0, 0.17, 0.101));
    kit.add(box(0.06, 0.2, 0.01, M.red, 0, 0.1, 0.101));
    kit.add(box(0.16, 0.04, 0.06, M.dark, 0, 0.4, 0));
    kit.position.set(0.3, 0.2, 0);
    g.add(kit);
    return { g, h: 1.2 };
  },
  attrezzature() {
    const g = new Group();
    // muletto
    const m = new Group();
    m.add(box(0.7, 0.35, 0.45, M.yellow, 0, 0.1, 0));
    m.add(box(0.32, 0.5, 0.4, M.dark, -0.15, 0.45, 0));
    for (const z of [-0.17, 0.17]) m.add(box(0.04, 1.0, 0.04, M.steelDark, 0.38, 0.1, z));
    for (const z of [-0.1, 0.1]) m.add(box(0.45, 0.025, 0.06, M.steelDark, 0.6, 0.15, z));
    for (const [x, z] of [[-0.22, -0.24], [-0.22, 0.24], [0.22, -0.24], [0.22, 0.24]]) {
      const r = new Mesh(new CylinderGeometry(0.1, 0.1, 0.08, 16), M.dark);
      r.rotation.x = Math.PI / 2;
      r.position.set(x, 0.1, z);
      m.add(r);
    }
    m.scale.setScalar(0.85);
    m.position.set(-0.3, 0, 0.1);
    m.rotation.y = 0.5;
    g.add(m);
    // piattaforma aerea (pantografo)
    const ple = new Group();
    ple.add(box(0.5, 0.15, 0.35, M.orange, 0, 0.05, 0));
    for (let k = 0; k < 3; k++) {
      const a = box(0.6, 0.03, 0.03, M.steelDark, 0, 0.25 + k * 0.25, 0.15);
      a.rotation.z = k % 2 ? 0.5 : -0.5;
      ple.add(a);
    }
    ple.add(box(0.55, 0.05, 0.38, M.orange, 0, 0.95, 0));
    ple.add(box(0.55, 0.25, 0.02, M.steel, 0, 1.0, 0.18));
    ple.position.set(0.45, 0, -0.25);
    g.add(ple);
    return { g, h: 1.4 };
  },
  fondi() {
    const g = new Group();
    const m1 = monete(7);
    m1.position.set(-0.2, 0, 0);
    g.add(m1);
    const m2 = monete(4);
    m2.position.set(0.25, 0, 0.15);
    g.add(m2);
    const t = tocco();
    t.position.set(-0.2, 0.47, 0);
    g.add(t);
    // freccia che sale
    const freccia = new Group();
    freccia.add(box(0.06, 0.6, 0.06, glow(0x22d3ee, 2), 0, 0, 0));
    const punta = new Mesh(new ConeGeometry(0.12, 0.2, 16), glow(0x22d3ee, 2));
    punta.position.y = 0.7;
    freccia.add(punta);
    freccia.position.set(0.3, 0.5, -0.2);
    g.add(freccia);
    return { g, h: 1.5, anima: (tt) => { freccia.position.y = 0.5 + Math.sin(tt * 2) * 0.08; } };
  },

  // ── digitale
  processi() {
    const g = new Group();
    g.add(box(1.6, 0.08, 0.5, M.dark, 0, 0.55, 0));
    for (const x of [-0.7, 0.7]) g.add(box(0.06, 0.55, 0.45, M.steelDark, x, 0, 0));
    const pezzi: Mesh[] = [];
    for (let k = 0; k < 5; k++) {
      const p = box(0.18, 0.18, 0.18, M.white, 0, 0.63, 0);
      pezzi.push(p);
      g.add(p);
    }
    const blu = glow(0x38bdf8, 1.8);
    return {
      g, h: 1.0,
      anima: (t) => pezzi.forEach((p, k) => {
        const f = (t * 0.25 + k / 5) % 1;
        p.position.x = -0.7 + f * 1.4;
        p.material = f > 0.5 ? blu : M.white; // il foglio diventa dato
        p.rotation.y = f * Math.PI;
      }),
    };
  },
  app() {
    const g = new Group();
    const tel = new Group();
    tel.add(box(0.62, 1.2, 0.07, M.dark, 0, 0, 0));
    const cv = document.createElement("canvas");
    cv.width = 240; cv.height = 460;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = "#0b1730"; ctx.fillRect(0, 0, 240, 460);
    ctx.fillStyle = "#2563eb"; ctx.fillRect(0, 0, 240, 70);
    for (let k = 0; k < 4; k++) { ctx.fillStyle = k % 2 ? "#1e3a8a" : "#1d4ed8"; ctx.fillRect(18, 90 + k * 82, 204, 66); }
    ctx.fillStyle = "#22d3ee"; ctx.beginPath(); ctx.arc(200, 420, 22, 0, Math.PI * 2); ctx.fill();
    const t = new CanvasTexture(cv);
    t.colorSpace = SRGBColorSpace;
    const s = schermo(t, 0.56, 1.1, 1.2);
    s.position.set(0, 0.6, 0.037);
    tel.add(s);
    tel.position.y = 0.2;
    tel.rotation.y = -0.25;
    g.add(tel);
    return { g, h: 1.5, anima: (tt) => { tel.position.y = 0.2 + Math.sin(tt * 1.2) * 0.04; } };
  },
  gestionali() {
    const g = new Group();
    g.add(box(1.4, 0.04, 0.5, M.white, 0, 0.72, 0));
    for (const x of [-0.6, 0.6]) g.add(box(0.04, 0.72, 0.45, M.steelDark, x, 0, 0));
    [-0.45, 0, 0.45].forEach((x, k) => {
      const mon = new Group();
      mon.add(box(0.42, 0.28, 0.03, M.dark, 0, 0, 0));
      const s = schermo(cruscotto(k + 1), 0.39, 0.25, 1.2);
      s.position.set(0, 0.14, 0.016);
      mon.add(s);
      mon.add(box(0.03, 0.12, 0.03, M.steelDark, 0, -0.12, -0.02));
      mon.position.set(x, 0.86, -0.05);
      mon.rotation.y = -x * 0.5;
      g.add(mon);
    });
    return { g, h: 1.3 };
  },
  ia() {
    const g = new Group();
    const sfera1 = new Mesh(new IcosahedronGeometry(0.35, 1), glow(0x38bdf8, 1.4));
    sfera1.position.y = 1.0;
    g.add(sfera1);
    const rete = new LineSegments(new EdgesGeometry(new IcosahedronGeometry(0.52, 1)), new LineBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.7 }));
    rete.position.y = 1.0;
    g.add(rete);
    const anelli = [0, 1].map((k) => {
      const r = new Mesh(new TorusGeometry(0.7, 0.012, 8, 64), glow(0x22d3ee, 2));
      r.position.y = 1.0;
      r.rotation.x = Math.PI / 2 + k * 0.6;
      g.add(r);
      return r;
    });
    g.add(cyl(0.2, 0.4, M.dark, 0, 0, 0, 24, 0.12));
    return {
      g, h: 1.6,
      anima: (t) => {
        sfera1.rotation.y = t * 0.6;
        rete.rotation.y = -t * 0.3;
        rete.rotation.x = t * 0.2;
        anelli.forEach((a, k) => { a.rotation.z = t * (k ? 0.7 : -0.5); });
        (sfera1.material as MeshStandardMaterial).emissiveIntensity = 1.2 + Math.sin(t * 2) * 0.4;
      },
    };
  },

  // ── finanza agevolata
  isi() {
    const g = new Group();
    const tex = testo([{ t: "BANDO", size: 40, color: "#1e3a8a", y: 60 }, { t: "ISI", size: 120, color: "#1d4ed8", weight: 800, y: 150 }, { t: "INAIL", size: 40, color: "#475569", y: 235 }], 300, 300, "#f8fafc");
    const d = documento(tex, 0.7, 0.85);
    d.position.y = 0.35;
    d.rotation.x = -0.1;
    g.add(d);
    g.add(box(0.8, 0.35, 0.3, M.wood, 0, 0, 0.05));
    const sigillo = new Mesh(new CylinderGeometry(0.1, 0.1, 0.02, 24), M.gold);
    sigillo.rotation.x = Math.PI / 2;
    sigillo.position.set(0.22, 0.55, 0.06);
    g.add(sigillo);
    return { g, h: 1.4 };
  },
  zes() {
    const g = new Group();
    // mappa stilizzata del Mezzogiorno su un leggio
    const cv = document.createElement("canvas");
    cv.width = 400; cv.height = 400;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = "#0b1730"; ctx.fillRect(0, 0, 400, 400);
    ctx.fillStyle = "#1d4ed8";
    ctx.beginPath();
    [[60, 40], [150, 60], [230, 130], [300, 190], [360, 230], [330, 260], [260, 230], [250, 290], [300, 350], [260, 380], [220, 320], [190, 250], [130, 190], [80, 120]].forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(170, 360, 60, 22, -0.2, 0, Math.PI * 2); ctx.fill(); // Sicilia
    ctx.fillStyle = "#93c5fd"; ctx.font = "700 46px Inter, Arial"; ctx.fillText("ZES", 270, 80);
    const t = new CanvasTexture(cv);
    t.colorSpace = SRGBColorSpace;
    const mappa = new Mesh(new PlaneGeometry(1.0, 1.0), new MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.6 }));
    mappa.position.y = 0.85;
    mappa.rotation.x = -0.9;
    g.add(mappa);
    g.add(cyl(0.05, 0.75, M.steelDark, 0, 0, 0.1, 10));
    // segnaposto su Napoli
    const pin = new Group();
    const cono = new Mesh(new ConeGeometry(0.06, 0.2, 16), glow(0xef4444, 2));
    cono.rotation.x = Math.PI;
    pin.add(cono);
    pin.add(sfera(0.075, glow(0xef4444, 2), 0, 0.13, 0));
    pin.position.set(-0.05, 1.0, -0.12);
    g.add(pin);
    return { g, h: 1.4, anima: (tt) => { pin.position.y = 1.0 + Math.abs(Math.sin(tt * 2.5)) * 0.1; } };
  },
  ot23() {
    const g = new Group();
    const barre = [1.0, 0.82, 0.64, 0.46];
    barre.forEach((h, k) => g.add(box(0.2, h, 0.25, k === 3 ? glow(0x22d3ee, 1.6) : M.blue, -0.42 + k * 0.28, 0, 0)));
    const freccia = new Group();
    freccia.add(box(0.9, 0.05, 0.05, glow(0x22d3ee, 2), 0, 0, 0));
    const punta = new Mesh(new ConeGeometry(0.08, 0.16, 12), glow(0x22d3ee, 2));
    punta.rotation.z = -Math.PI / 2;
    punta.position.x = 0.5;
    freccia.add(punta);
    freccia.position.set(0, 1.15, 0.15);
    freccia.rotation.z = -0.35;
    g.add(freccia);
    return { g, h: 1.4 };
  },
  iper() {
    const g = new Group();
    // macchinario con braccio robotico
    g.add(box(0.8, 0.5, 0.6, std(0xe5e7eb, 0.4, 0.3), -0.2, 0, 0));
    g.add(box(0.5, 0.2, 0.02, glow(0x22c55e, 1), -0.2, 0.25, 0.31));
    const braccio = new Group();
    braccio.add(cyl(0.08, 0.3, M.orange, 0, 0, 0));
    const b1 = box(0.08, 0.5, 0.08, M.orange, 0, 0, 0);
    b1.position.set(0, 0.5, 0);
    b1.rotation.z = 0.5;
    braccio.add(b1);
    braccio.position.set(-0.2, 0.5, 0);
    g.add(braccio);
    // barre che salgono
    const barre = [0.3, 0.5, 0.75, 1.0].map((h, k) => {
      const b = new Mesh(new BoxGeometry(0.14, 1, 0.14), k === 3 ? glow(0x22d3ee, 1.6) : glow(0x60a5fa, 1.2));
      b.geometry.translate(0, 0.5, 0);
      b.position.set(0.35 + k * 0.16, 0, 0.1);
      b.scale.y = h;
      g.add(b);
      return { b, h };
    });
    return {
      g, h: 1.4,
      anima: (t) => {
        braccio.rotation.y = Math.sin(t * 0.8) * 0.9;
        barre.forEach(({ b, h }, k) => { b.scale.y = h * (0.85 + 0.15 * Math.sin(t * 1.5 + k)); });
      },
    };
  },

  // ── chi siamo: i quattro passi
  ascolto() {
    const g = new Group();
    const poltrona = (x: number, ry: number) => {
      const p = new Group();
      p.add(box(0.55, 0.35, 0.55, M.fabric, 0, 0, 0));
      p.add(box(0.55, 0.45, 0.12, M.fabric, 0, 0.35, -0.22));
      for (const s of [-1, 1]) p.add(box(0.1, 0.2, 0.55, M.fabric, s * 0.24, 0.35, 0));
      p.position.x = x;
      p.rotation.y = ry;
      g.add(p);
    };
    poltrona(-0.5, Math.PI / 2);
    poltrona(0.5, -Math.PI / 2);
    g.add(cyl(0.22, 0.4, M.woodLight, 0, 0, 0, 24));
    // fumetti di dialogo
    const f = new Mesh(new SphereGeometry(0.16, 20, 12), glow(0x93c5fd, 1.3));
    f.scale.set(1.3, 0.8, 0.4);
    f.position.set(-0.25, 1.15, 0);
    g.add(f);
    const f2 = f.clone();
    f2.position.set(0.25, 1.35, 0);
    g.add(f2);
    return { g, h: 1.5, anima: (t) => { f.position.y = 1.15 + Math.sin(t * 1.6) * 0.05; f2.position.y = 1.35 + Math.cos(t * 1.6) * 0.05; } };
  },
  priorita() {
    const g = new Group();
    [[0.9, "1", 0x22d3ee], [0.6, "2", 0x60a5fa], [0.35, "3", 0x3b82f6]].forEach(([h, n, c], k) => {
      const x = (k - 1) * 0.42;
      g.add(box(0.36, h as number, 0.36, std(0x1e293b, 0.5), x, 0, 0));
      const tex = testo([{ t: n as string, size: 180, color: "#fff", weight: 800, y: 130 }], 256, 256, "#" + (c as number).toString(16).padStart(6, "0"));
      const s = schermo(tex, 0.3, 0.3, 1.0);
      s.position.set(x, (h as number) - 0.2, 0.181);
      g.add(s);
    });
    return { g, h: 1.1 };
  },
  progettoInsieme() {
    const g = new Group();
    g.add(box(1.0, 0.04, 0.7, M.wood, 0, 0.72, 0));
    for (const x of [-0.45, 0.45]) for (const z of [-0.3, 0.3]) g.add(box(0.04, 0.72, 0.04, M.steelDark, x, 0, z));
    const plastico = new Group();
    for (let k = 0; k < 5; k++) plastico.add(box(0.36, 0.12, 0.26, k % 2 ? M.glass : M.white, 0, k * 0.12, 0));
    plastico.position.set(0, 0.76, 0);
    g.add(plastico);
    return { g, h: 1.5, anima: (t) => { plastico.rotation.y = t * 0.4; } };
  },
  nelTempo() {
    const g = new Group();
    // orologio con lancette che girano
    const orologio = new Group();
    orologio.add(cyl(0.45, 0.06, M.white, 0, 0, 0, 48));
    orologio.children[0].rotation.x = Math.PI / 2;
    const anello = new Mesh(new TorusGeometry(0.45, 0.03, 8, 48), M.steelDark);
    orologio.add(anello);
    const ore = box(0.03, 0.22, 0.02, M.dark, 0, 0, 0.05);
    ore.geometry.translate(0, 0, 0);
    const min = box(0.02, 0.34, 0.02, M.blue, 0, 0, 0.06);
    const pOre = new Group(); pOre.add(ore); ore.position.y = 0.11 - 0.11;
    const pMin = new Group(); pMin.add(min); min.position.y = 0;
    orologio.add(pOre, pMin);
    orologio.position.y = 1.0;
    g.add(orologio);
    g.add(cyl(0.035, 0.6, M.steelDark, 0, 0, 0, 10));
    return { g, h: 1.5, anima: (t) => { pMin.rotation.z = -t * 1.2; pOre.rotation.z = -t * 0.1; } };
  },
};

// Piedistallo luminoso sotto ogni oggetto.
function piedistallo() {
  const g = new Group();
  g.add(cyl(0.85, 0.12, M.dark, 0, 0, 0, 48));
  const anello = new Mesh(new TorusGeometry(0.86, 0.015, 8, 96), glow(0x22d3ee, 0.6));
  anello.rotation.x = Math.PI / 2;
  anello.position.y = 0.12;
  g.add(anello);
  const alone = new Mesh(new CircleGeometry(1.4, 48), new MeshBasicMaterial({ color: 0x1d4ed8, transparent: true, opacity: 0.08, depthWrite: false }));
  alone.rotation.x = -Math.PI / 2;
  alone.position.y = 0.005;
  g.add(alone);
  return { g, anello: anello.material as MeshStandardMaterial, alone: alone.material as MeshBasicMaterial };
}

// Quale oggetto per ogni voce, nello stesso ordine delle voci in data/edificio.ts.
const PEZZI: Record<Kind, string[]> = {
  impianti: ["progetto", "impianti", "antincendio", "collaudi", "materiali", "pratiche"],
  hall: ["ascolto", "priorita", "progettoInsieme", "nelTempo"],
  sicurezza: ["casco", "cantiere", "haccp", "medicina", "gdpr", "ambiente", "aziendale"],
  aule: ["banchi", "ruoli", "emergenze", "attrezzature", "fondi"],
  archivio: ["iso:9001:Qualità:spunta", "iso:14001:Ambiente:foglia", "iso:45001:Salute e sicurezza:scudo", "iso:27001:Sicurezza informazioni:lucchetto", "iso:37001:Anticorruzione:bilancia", "iso:PdR 125:Parità di genere:parita", "iso:SOA:Qualificazione appalti:gru"],
  server: ["processi", "app", "gestionali", "ia"],
  riunioni: ["isi", "zes", "ot23", "iper", "fondi"],
  osservatorio: ["segnale:on", "segnale:on", "segnale:open", "segnale:off", "segnale:next"],
};

/** monolite luminoso di una certificazione, col suo simbolo disegnato */
function monolite(codice: string, nome: string, simbolo: string): Pezzo {
  const g = new Group();
  g.add(box(0.7, 1.7, 0.18, std(0x0f172a, 0.3, 0.6), 0, 0, 0));
  const cv = document.createElement("canvas");
  cv.width = 280; cv.height = 680;
  const ctx = cv.getContext("2d")!;
  const gr = ctx.createLinearGradient(0, 0, 0, 680);
  gr.addColorStop(0, "#1e3a8a"); gr.addColorStop(1, "#0b1222");
  ctx.fillStyle = gr; ctx.fillRect(0, 0, 280, 680);
  ctx.strokeStyle = "#67e8f9"; ctx.fillStyle = "#67e8f9"; ctx.lineWidth = 10; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.save(); ctx.translate(140, 200);
  const disegni: Record<string, () => void> = {
    spunta: () => { ctx.beginPath(); ctx.moveTo(-60, 0); ctx.lineTo(-15, 45); ctx.lineTo(65, -45); ctx.stroke(); },
    foglia: () => { ctx.beginPath(); ctx.ellipse(0, 0, 45, 80, 0.6, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-40, 60); ctx.lineTo(35, -55); ctx.stroke(); },
    scudo: () => { ctx.beginPath(); ctx.moveTo(0, -75); ctx.lineTo(60, -50); ctx.lineTo(55, 20); ctx.lineTo(0, 75); ctx.lineTo(-55, 20); ctx.lineTo(-60, -50); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-25, 0); ctx.lineTo(-5, 22); ctx.lineTo(30, -20); ctx.stroke(); },
    lucchetto: () => { ctx.strokeRect(-55, -10, 110, 80); ctx.beginPath(); ctx.arc(0, -10, 38, Math.PI, 0); ctx.stroke(); },
    bilancia: () => { ctx.beginPath(); ctx.moveTo(0, -70); ctx.lineTo(0, 65); ctx.moveTo(-70, -45); ctx.lineTo(70, -45); ctx.moveTo(-40, 65); ctx.lineTo(40, 65); ctx.stroke(); for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 70, -45); ctx.lineTo(s * 45, 10); ctx.lineTo(s * 95, 10); ctx.closePath(); ctx.stroke(); } },
    parita: () => { for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 42, -40, 22, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(s * 42, -15); ctx.lineTo(s * 42, 55); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(-18, 5); ctx.lineTo(18, 5); ctx.moveTo(-18, 25); ctx.lineTo(18, 25); ctx.stroke(); },
    gru: () => { ctx.beginPath(); ctx.moveTo(-30, 75); ctx.lineTo(-30, -70); ctx.lineTo(75, -70); ctx.moveTo(-60, -70); ctx.lineTo(-30, -70); ctx.moveTo(55, -70); ctx.lineTo(55, -10); ctx.stroke(); ctx.strokeRect(40, -10, 30, 22); },
  };
  disegni[simbolo]?.();
  ctx.restore();
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 ${/^\d/.test(codice) || codice.length > 4 ? 46 : 64}px Inter, Arial`;
  ctx.fillText(codice.length <= 5 && /^\d/.test(codice) ? `ISO ${codice}` : codice, 140, 400);
  ctx.fillStyle = "#93c5fd";
  ctx.font = "500 26px Inter, Arial";
  const parole = nome.split(" ");
  let riga = "", y = 470;
  for (const p of parole) {
    if (ctx.measureText(riga + " " + p).width > 230 && riga) { ctx.fillText(riga, 140, y); riga = p; y += 34; } else riga = riga ? riga + " " + p : p;
  }
  ctx.fillText(riga, 140, y);
  const t = new CanvasTexture(cv);
  t.colorSpace = SRGBColorSpace;
  const faccia = schermo(t, 0.62, 1.5, 1.0);
  faccia.position.set(0, 0.85, 0.091);
  g.add(faccia);
  const filo = box(0.72, 0.02, 0.2, glow(0x22d3ee, 2), 0, 1.7, 0);
  g.add(filo);
  return { g, h: 1.85, anima: (tt, a) => { (faccia.material as MeshStandardMaterial).emissiveIntensity = a ? 1.6 : 1.0 + Math.sin(tt * 1.2) * 0.1; } };
}

/** antenna di segnalazione dell'osservatorio: luce del colore dello stato del bando */
function segnale(stato: string): Pezzo {
  const colori: Record<string, number> = { on: 0x22c55e, open: 0x22c55e, off: 0x94a3b8, next: 0xf59e0b };
  const c = colori[stato] ?? 0x22d3ee;
  const g = new Group();
  g.add(cyl(0.03, 1.5, M.steel, 0, 0, 0, 10));
  for (let k = 1; k < 4; k++) {
    const r = box(0.3 - k * 0.05, 0.015, 0.015, M.steel, 0, k * 0.35, 0);
    g.add(r);
  }
  const luce = glow(c, 3);
  g.add(sfera(0.09, luce, 0, 1.56, 0));
  const onda = new Mesh(new TorusGeometry(0.2, 0.01, 8, 48), new MeshBasicMaterial({ color: c, transparent: true, depthWrite: false }));
  onda.position.y = 1.56;
  onda.rotation.x = Math.PI / 2;
  g.add(onda);
  const pl = new PointLight(c, 0.8, 2.5, 2);
  pl.position.y = 1.5;
  g.add(pl);
  return {
    g, h: 1.7,
    anima: (t, a) => {
      const f = (t * 0.6) % 1;
      onda.scale.setScalar(1 + f * 3);
      (onda.material as MeshBasicMaterial).opacity = (1 - f) * (a ? 0.9 : 0.5);
      luce.emissiveIntensity = stato === "off" ? 1 : 2 + Math.sin(t * 4) * (a ? 1.5 : 0.8);
    },
  };
}

function fabbrica(nome: string): Pezzo {
  if (nome.startsWith("iso:")) {
    const [, codice, titolo, simbolo] = nome.split(":");
    return monolite(codice, titolo, simbolo);
  }
  if (nome.startsWith("segnale:")) return segnale(nome.split(":")[1]);
  return (P[nome] ?? P.pratiche)();
}

// ── GUSCIO DELLA STANZA ─────────────────────────────────────────────────────
function cieloNotte() {
  const cv = document.createElement("canvas");
  cv.width = 4; cv.height = 256;
  const ctx = cv.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#050914"); g.addColorStop(0.55, "#0f1d3a"); g.addColorStop(0.7, "#1d3357"); g.addColorStop(1, "#0b1222");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 256);
  const t = new CanvasTexture(cv);
  t.colorSpace = SRGBColorSpace;
  return t;
}
/** facciate della città fuori dalle vetrate, con finestre accese */
function skyline(scene: Scene, zMin: number) {
  const cv = document.createElement("canvas");
  cv.width = 64; cv.height = 128;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#0b1222"; ctx.fillRect(0, 0, 64, 128);
  for (let y = 4; y < 128; y += 8) for (let x = 4; x < 64; x += 8) {
    if (Math.random() < 0.35) { ctx.fillStyle = Math.random() < 0.7 ? "#fde68a" : "#bfdbfe"; ctx.fillRect(x, y, 4, 4); }
  }
  const t = new CanvasTexture(cv);
  t.colorSpace = SRGBColorSpace;
  const mat = new MeshStandardMaterial({ color: 0x1e293b, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.6, roughness: 0.8 });
  for (let k = 0; k < 26; k++) {
    const w = 2 + Math.random() * 4, h = 6 + Math.random() * 22, d = 2 + Math.random() * 3;
    const ang = -Math.PI * 0.9 + (k / 25) * Math.PI * 0.8;
    const r = Math.abs(zMin) + 8 + Math.random() * 14;
    const b = new Mesh(new BoxGeometry(w, h, d), mat);
    b.position.set(Math.cos(ang) * r, h / 2 - 12, Math.sin(ang) * r);
    scene.add(b);
  }
}

/** costruisce la stanza di un piano */
export function creaStanza(kind: Kind, titoloPiano: string, area: string, env: Texture): Stanza {
  const scene = new Scene();
  scene.background = cieloNotte();
  scene.environment = env;
  scene.environmentIntensity = 0.4;
  scene.fog = new Fog(0x0f1d3a, 14, 40);
  const tetto = kind === "osservatorio";

  scene.add(new HemisphereLight(0xbcd3ff, 0x111827, tetto ? 0.5 : 0.75));
  const key = new DirectionalLight(0xffe4c4, tetto ? 0.5 : 1.0);
  key.position.set(-4, 8, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -6, near: 1, far: 30 });
  key.shadow.bias = -0.0005;
  scene.add(key);

  // pavimento lucido
  scene.add(pavimento(kind));

  const HZ = 3.6; // altezza del soffitto
  if (!tetto) {
    // soffitto con pannelli luminosi e luci calde
    scene.add(soffitto(HZ));
    arreda(scene, kind, HZ);
    const pannello = glow(0xfff1d6, 1.6);
    for (let x = -6; x <= 6; x += 3) for (let z = -4; z <= 6; z += 2.5) {
      const p = new Mesh(new PlaneGeometry(1.4, 0.3), pannello);
      p.rotation.x = Math.PI / 2;
      p.position.set(x, HZ - 0.01, z);
      scene.add(p);
    }
    for (const [x, z] of [[-4, 0], [4, 0], [0, -3], [0, 4]]) {
      const l = new PointLight(0xffe2b8, 1.6, 9, 1.6);
      l.position.set(x, HZ - 0.4, z);
      scene.add(l);
    }
    // vetrate su tre lati con montanti, e la città fuori
    const vetro = (w: number, x: number, z: number, ry: number) => {
      const p = new Mesh(new PlaneGeometry(w, HZ), M.glass);
      p.position.set(x, HZ / 2, z);
      p.rotation.y = ry;
      scene.add(p);
      for (let k = 0; k <= Math.round(w / 1.6); k++) {
        const o = -w / 2 + k * (w / Math.round(w / 1.6));
        const m = box(0.06, HZ, 0.1, M.steel, 0, 0, 0);
        m.position.set(x + Math.cos(ry) * o, HZ / 2, z - Math.sin(ry) * o);
        m.rotation.y = ry;
        scene.add(m);
      }
    };
    vetro(20, 0, -6.5, 0);
    vetro(14, -10, -0.5, Math.PI / 2);
    vetro(14, 10, -0.5, Math.PI / 2);
    skyline(scene, -6.5);
  } else {
    // terrazza: parapetto, radar e cielo stellato
    for (const [w, d, x, z] of [[20, 0.2, 0, -6.5], [0.2, 14, -10, -0.5], [0.2, 14, 10, -0.5]] as const) scene.add(box(w, 0.9, d, M.concrete, x, 0, z));
    skyline(scene, -6.5);
    const radar = vivo(new Group());
    radar.add(cyl(0.15, 3.2, M.steel, 0, 0, 0, 16));
    const dish = new Mesh(new SphereGeometry(1.4, 40, 20, 0, Math.PI * 2, 0, Math.PI / 3), std(0xf1f5f9, 0.35, 0.3, { side: DoubleSide }));
    dish.rotation.x = -Math.PI / 2 - 0.5;
    dish.position.y = 3.3;
    radar.add(dish);
    radar.position.set(6.2, 0, -8.5);
    radar.scale.setScalar(1.35);
    scene.add(radar);
    const stelle = new Float32Array(600 * 3);
    for (let k = 0; k < 600; k++) {
      const a = Math.random() * Math.PI * 2, e = 0.25 + Math.random() * 1.1, r = 35;
      stelle.set([Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r], k * 3);
    }
    const sg = new BufferGeometry();
    sg.setAttribute("position", new Float32BufferAttribute(stelle, 3));
    scene.add(new Points(sg, new PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0.8 })));
    (scene.userData as { radar?: Group }).radar = radar;
  }

  // insegna del piano sopra gli oggetti
  {
    const tex = testo([{ t: titoloPiano.toUpperCase(), size: 34, color: "#67e8f9", weight: 600, y: 60 }, { t: area, size: 76, color: "#ffffff", weight: 700, y: 140 }], 1024, 200, "#0b1222");
    const s = schermo(tex, 4.4, 0.85, 1.1);
    s.position.set(0, tetto ? 4.9 : 3.15, tetto ? -6.0 : -6.3);
    scene.add(s);
  }
  // fin qui la stanza è ferma (tranne il radar): la si unisce per materiale prima di
  // aggiungere persone e oggetti in esposizione, che si animano
  unisciStatici(scene);

  // persone sparse, dietro e ai lati degli oggetti
  const persone = popola(scene, kind);

  // oggetti in esposizione, ad arco davanti alla camera
  const nomi = PEZZI[kind];
  const n = nomi.length;
  const R = n > 5 ? 5.2 : 4.4;
  const A = Math.min(1.15, 0.32 * (n - 1));
  const centro = new Vector3(0, 0, 1.6);
  const camA = new Vector3(0, 1.65, 7.6);
  const stazioni: Object3D[] = [];
  const etichette: Vector3[] = [];
  const anime: { a?: Pezzo["anima"]; anello: MeshStandardMaterial; alone: MeshBasicMaterial; g: Group }[] = [];
  nomi.forEach((nome, k) => {
    const th = n === 1 ? 0 : -A + (2 * A * k) / (n - 1);
    const st = new Group();
    st.position.set(centro.x + Math.sin(th) * R, 0, centro.z - Math.cos(th) * R);
    st.lookAt(camA.x, 0, camA.z);
    const ped = piedistallo();
    st.add(ped.g);
    const pezzo = fabbrica(nome);
    pezzo.g.position.y = 0.12;
    pezzo.g.traverse((o) => { if ((o as Mesh).isMesh) { (o as Mesh).castShadow = true; } });
    st.add(pezzo.g);
    st.userData.indice = k;
    scene.add(st);
    stazioni.push(st);
    etichette.push(new Vector3(st.position.x, 0.12 + pezzo.h + 0.35, st.position.z));
    anime.push({ a: pezzo.anima, anello: ped.anello, alone: ped.alone, g: pezzo.g });
  });

  return {
    scene,
    stazioni,
    etichette,
    camDa: new Vector3(0, 2.3, 13.5),
    camA,
    guarda: new Vector3(0, 1.15, -0.6),
    mezzaLarghezza: Math.max(...stazioni.map((x) => Math.abs(x.position.x))) + 1.1,
    zEsterno: Math.max(...stazioni.map((x) => x.position.z)),
    aggiorna(t, hovered) {
      anime.forEach((x, k) => {
        const on = hovered === k;
        x.a?.(t, on);
        x.anello.emissiveIntensity += ((on ? 3 : 0.6) - x.anello.emissiveIntensity) * 0.15;
        x.alone.opacity += ((on ? 0.3 : 0.08) - x.alone.opacity) * 0.15;
        const s = on ? 1.06 : 1;
        x.g.scale.setScalar(x.g.scale.x + (s - x.g.scale.x) * 0.15);
      });
      for (const p of persone) p(t);
      const radar = (scene.userData as { radar?: Group }).radar;
      if (radar) radar.rotation.y = t * 0.5;
    },
  };
}
