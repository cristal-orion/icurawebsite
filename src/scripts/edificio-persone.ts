// Persone e arredi d'ambiente per gli interni dei piani (vedi edificio-stanze.ts).
// Le persone sono figure articolate (gambe con ginocchio, braccia con gomito, testa e
// capelli), vestite in modo diverso a seconda del piano: camminano, guardano, indicano,
// parlano o stanno sedute. Stanno dietro e ai lati degli oggetti in esposizione, mai
// davanti, così non coprono quello che si deve vedere. Unità: metri, pavimento a y = 0.
import {
  BoxGeometry, CanvasTexture, CapsuleGeometry, CylinderGeometry, Group, IcosahedronGeometry, TorusGeometry, Material, Mesh,
  MeshStandardMaterial, PlaneGeometry, RepeatWrapping, Scene, SphereGeometry, SRGBColorSpace,
} from "three";
import type { Kind } from "../data/edificio";

const std = (color: number, roughness = 0.7, metalness = 0) => new MeshStandardMaterial({ color, roughness, metalness });
const cache = new Map<number, MeshStandardMaterial>();
const mat = (color: number, roughness = 0.75) => {
  const k = color * 10 + Math.round(roughness * 10);
  if (!cache.has(k)) cache.set(k, std(color, roughness));
  return cache.get(k)!;
};
const ombra = <T extends Mesh>(m: T) => { m.castShadow = true; m.receiveShadow = true; return m; };
const box = (w: number, h: number, d: number, m: Material, x = 0, y = 0, z = 0) => {
  const b = ombra(new Mesh(new BoxGeometry(w, h, d), m));
  b.position.set(x, y + h / 2, z);
  return b;
};

// ── PERSONE ──────────────────────────────────────────────────────────────
export type Posa = "piedi" | "cammina" | "seduto" | "indica" | "parla";
export interface Abito {
  pelle: number; capelli: number; giacca: number; pantaloni: number;
  camicia?: number; scarpe?: number; casco?: number; gilet?: boolean; lunghi?: boolean;
  oggetto?: "cartella" | "portatile" | "fascicolo"; seme?: number;
}

const PELLE = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac, 0xd8a47f];
const CAPELLI = [0x2b1d14, 0x0f0f0f, 0x6b4423, 0xa67c45, 0x9ca3af, 0x3b2a1f];
const GIACCHE = [0x1e3a8a, 0xb91c1c, 0x1f2937, 0x166534, 0x2563eb, 0x57534e, 0x7c2d12];
const PANTALONI = [0x111827, 0x1f2937, 0x374151, 0x44403c];

/** abito casuale ma stabile (stesso seme, stessa persona) */
export function abito(seme: number, extra: Partial<Abito> = {}): Abito {
  const p = (arr: number[], k: number) => arr[(Math.imul(seme * 31 + k, 2654435761) >>> 0) % 997 % arr.length];
  return { pelle: p(PELLE, 1), capelli: p(CAPELLI, 2), giacca: p(GIACCHE, 3), pantaloni: p(PANTALONI, 4), camicia: 0xf1f5f9, scarpe: 0x0b0f17, lunghi: seme % 3 === 1, seme, ...extra };
}

/** un omino a blocchetti: origine ai piedi, guarda verso +z */
export function persona(a: Abito, posa: Posa) {
  const radice = new Group();
  const g = new Group();
  g.scale.setScalar(1.22); // da omino giocattolo ad altezza umana (circa 1,75 m)
  radice.add(g);
  const seduto = posa === "seduto";
  const hipY = seduto ? 0.4 : 0.56;
  const plastica = (c: number) => mat(c, 0.32);
  const pelle = plastica(GIALLO);
  const mesh = <T extends Mesh>(m: T, x: number, y: number, z: number) => { m.position.set(x, y, z); return ombra(m); };

  // gambe squadrate, senza ginocchio: ruotano tutte intere dall'anca
  const gambe = [-1, 1].map((s) => {
    const anca = new Group();
    anca.position.set(s * 0.09, hipY, 0);
    anca.add(mesh(new Mesh(new BoxGeometry(0.17, 0.46, 0.2), plastica(a.pantaloni)), 0, -0.25, 0));
    anca.add(mesh(new Mesh(new BoxGeometry(0.17, 0.08, 0.26), plastica(a.pantaloni)), 0, -0.52, 0.03));
    if (seduto) anca.rotation.x = -Math.PI / 2;
    g.add(anca);
    return anca;
  });
  // bacino
  g.add(mesh(new Mesh(new BoxGeometry(0.36, 0.1, 0.2), plastica(a.pantaloni)), 0, hipY + 0.02, 0));
  const perno = mesh(new Mesh(new CylinderGeometry(0.035, 0.035, 0.37, 12), plastica(a.pantaloni)), 0, hipY - 0.03, 0);
  perno.rotation.z = Math.PI / 2;
  g.add(perno);

  // busto a tronco di piramide, con stampa davanti
  const bustoY = hipY + 0.07;
  // tronco di piramide a base quadrata, poi schiacciato in profondità
  const tronco = (rt: number, rb: number, h: number, m: Material, y: number, sz: number, aperto = false) => {
    const t = new Group();
    const k = ombra(new Mesh(new CylinderGeometry(rt, rb, h, 4, 1, aperto), m));
    k.rotation.y = Math.PI / 4;
    t.add(k);
    t.position.y = y;
    t.scale.z = sz;
    g.add(t);
    return t;
  };
  tronco(0.2, 0.27, 0.46, plastica(a.giacca), bustoY + 0.23, 0.55);
  const stampa = new Mesh(new PlaneGeometry(0.3, 0.44), new MeshStandardMaterial({ map: texBusto(a), transparent: true, roughness: 0.32 }));
  stampa.position.set(0, bustoY + 0.23, 0.1);
  stampa.rotation.x = -0.06;
  g.add(stampa);
  if (a.gilet) {
    tronco(0.22, 0.278, 0.36, plastica(0xf97316), bustoY + 0.2, 0.57, true);
    for (const dy of [0.1, 0.24]) {
      tronco(0.284 - dy * 0.15, 0.286 - dy * 0.15, 0.03, std(0xe5e7eb, 0.2, 0.6), bustoY + dy, 0.58, true);
    }
  }

  // braccia: spalla tonda, braccio inclinato, mano a pinza
  const braccia = [-1, 1].map((s) => {
    const spalla = new Group();
    spalla.position.set(s * 0.17, bustoY + 0.4, 0);
    spalla.rotation.z = s * 0.12;
    spalla.add(mesh(new Mesh(new SphereGeometry(0.06, 14, 10), plastica(a.giacca)), 0, 0, 0));
    const braccio = mesh(new Mesh(new CylinderGeometry(0.055, 0.06, 0.3, 14), plastica(a.giacca)), s * 0.03, -0.15, 0);
    braccio.rotation.z = s * 0.15;
    spalla.add(braccio);
    const polso = mesh(new Mesh(new CylinderGeometry(0.03, 0.03, 0.06, 10), pelle), s * 0.055, -0.32, 0.01);
    spalla.add(polso);
    const mano = new Group();
    mano.position.set(s * 0.06, -0.38, 0.03);
    const pinza = ombra(new Mesh(new TorusGeometry(0.045, 0.02, 10, 20, Math.PI * 1.55), pelle));
    pinza.rotation.set(Math.PI / 2, 0, Math.PI * 0.72);
    mano.add(pinza);
    spalla.add(mano);
    g.add(spalla);
    return { spalla, mano };
  });

  // collo, testa cilindrica con bottoncino, viso
  const testaG = new Group();
  testaG.position.y = bustoY + 0.46;
  g.add(testaG);
  testaG.add(mesh(new Mesh(new CylinderGeometry(0.06, 0.06, 0.04, 14), pelle), 0, 0.02, 0));
  const testa = mesh(new Mesh(new CapsuleGeometry(0.11, 0.1, 6, 20), pelle), 0, 0.15, 0);
  testa.scale.set(1, 0.72, 1);
  testaG.add(testa);
  testaG.add(mesh(new Mesh(new CylinderGeometry(0.06, 0.06, 0.05, 16), pelle), 0, 0.27, 0));
  const viso = new Mesh(new PlaneGeometry(0.16, 0.12), new MeshStandardMaterial({ map: texViso(a.seme ?? 0), transparent: true, roughness: 0.32 }));
  viso.position.set(0, 0.15, 0.112);
  testaG.add(viso);
  if (a.casco !== undefined) {
    testaG.add(mesh(new Mesh(new SphereGeometry(0.14, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), plastica(a.casco)), 0, 0.2, 0));
    testaG.add(mesh(new Mesh(new CylinderGeometry(0.17, 0.17, 0.015, 26), plastica(a.casco)), 0, 0.2, 0.02));
  } else {
    // capelli a calotta, che lasciano scoperta la fronte
    const cap = mesh(new Mesh(new SphereGeometry(0.128, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), plastica(a.capelli)), 0, 0.18, -0.012);
    cap.rotation.x = -0.32;
    testaG.add(cap);
    if (a.lunghi) testaG.add(mesh(new Mesh(new BoxGeometry(0.25, 0.26, 0.09), plastica(a.capelli)), 0, 0.07, -0.08));
  }

  // oggetto nella mano destra
  const destra = braccia[1];
  if (a.oggetto === "cartella") destra.mano.add(mesh(new Mesh(new BoxGeometry(0.16, 0.22, 0.012), plastica(0xd6c7a8)), 0, -0.1, 0.03));
  if (a.oggetto === "fascicolo") destra.mano.add(mesh(new Mesh(new BoxGeometry(0.05, 0.22, 0.17), plastica(0x1d4ed8)), 0, -0.1, 0));
  if (a.oggetto === "portatile") {
    for (const b of braccia) b.spalla.rotation.x = -1.0;
    const pc = new Group();
    pc.add(mesh(new Mesh(new BoxGeometry(0.28, 0.014, 0.2), plastica(0x9ca3af)), 0, 0, 0));
    const sc = mesh(new Mesh(new BoxGeometry(0.28, 0.18, 0.012), plastica(0x111827)), 0, 0.09, -0.1);
    sc.rotation.x = -0.3;
    pc.add(sc);
    pc.position.set(0, bustoY + 0.3, 0.3);
    g.add(pc);
  }

  // pose fisse
  if (seduto) for (const b of braccia) b.spalla.rotation.x = -0.7;
  if (posa === "indica") braccia[1].spalla.rotation.set(-1.4, 0, 0.12);

  const fase = Math.random() * 10;
  const anima = (t: number, passo = 0) => {
    const tt = t + fase;
    if (posa === "cammina") {
      const sw = Math.sin(passo);
      gambe[0].rotation.x = sw * 0.5;
      gambe[1].rotation.x = -sw * 0.5;
      if (a.oggetto !== "portatile") {
        braccia[0].spalla.rotation.x = -sw * 0.45;
        braccia[1].spalla.rotation.x = sw * 0.45;
      }
      radice.position.y = Math.abs(Math.cos(passo)) * 0.02;
    } else if (posa === "parla") {
      braccia[1].spalla.rotation.x = -0.6 + Math.sin(tt * 1.8) * 0.3;
      testaG.rotation.y = Math.sin(tt * 0.6) * 0.25;
    } else {
      testaG.rotation.y = Math.sin(tt * 0.35) * 0.35;
    }
  };
  return { g: radice, anima };
}

const GIALLO = 0xf5c518;
function texViso(seme: number) {
  const cv = document.createElement("canvas");
  cv.width = 128; cv.height = 96;
  const c = cv.getContext("2d")!;
  c.fillStyle = "#111"; c.strokeStyle = "#111"; c.lineCap = "round";
  for (const x of [44, 84]) { c.beginPath(); c.ellipse(x, 36, 6, 8, 0, 0, Math.PI * 2); c.fill(); }
  c.lineWidth = 5;
  if (seme % 4 === 1) { c.beginPath(); c.moveTo(36, 18); c.lineTo(52, 16); c.moveTo(76, 16); c.lineTo(92, 18); c.stroke(); } // sopracciglia
  c.beginPath();
  if (seme % 3 === 2) { c.moveTo(48, 66); c.lineTo(80, 66); } else c.arc(64, 52, 20, 0.2 * Math.PI, 0.8 * Math.PI);
  c.stroke();
  const t = new CanvasTexture(cv);
  t.colorSpace = SRGBColorSpace;
  return t;
}
function texBusto(a: Abito) {
  const cv = document.createElement("canvas");
  cv.width = 128; cv.height = 160;
  const c = cv.getContext("2d")!;
  if (a.gilet) {
    // maglietta sotto il gilet: solo il colletto
    c.fillStyle = "#e5e7eb"; c.beginPath(); c.moveTo(48, 0); c.lineTo(64, 18); c.lineTo(80, 0); c.fill();
  } else {
    // giacca aperta su camicia e cravatta
    c.fillStyle = "#f1f5f9"; c.beginPath(); c.moveTo(40, 0); c.lineTo(64, 80); c.lineTo(88, 0); c.fill();
    if ((a.seme ?? 0) % 2 === 0) {
      c.fillStyle = ["#b91c1c", "#1d4ed8", "#0f766e", "#7c3aed"][(a.seme ?? 0) % 4];
      c.beginPath(); c.moveTo(58, 6); c.lineTo(70, 6); c.lineTo(74, 60); c.lineTo(64, 74); c.lineTo(54, 60); c.fill();
    }
    c.strokeStyle = "rgba(0,0,0,0.35)"; c.lineWidth = 3;
    c.beginPath(); c.moveTo(40, 0); c.lineTo(64, 80); c.lineTo(88, 0); c.stroke();
    c.fillStyle = "rgba(0,0,0,0.3)"; c.fillRect(86, 52, 22, 3); // taschino
  }
  const t = new CanvasTexture(cv);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** sedia da ufficio (per chi sta seduto) */
function sedia(colore = 0x1f2937) {
  const g = new Group();
  g.add(box(0.46, 0.06, 0.44, mat(colore), 0, 0.42, 0));
  g.add(box(0.44, 0.5, 0.06, mat(colore), 0, 0.5, -0.22));
  g.add(box(0.04, 0.4, 0.04, mat(0x4b5563, 0.4), 0, 0.02, 0));
  g.add(ombra(new Mesh(new CylinderGeometry(0.26, 0.26, 0.03, 16), mat(0x111827, 0.4))));
  return g;
}

// ── PAVIMENTI ────────────────────────────────────────────────────────────
function texPavimento(kind: Kind) {
  const S = 512;
  const cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const ctx = cv.getContext("2d")!;
  const rumore = (alfa: number) => {
    for (let k = 0; k < 9000; k++) {
      ctx.fillStyle = `rgba(${Math.random() < 0.5 ? "255,255,255" : "0,0,0"},${Math.random() * alfa})`;
      ctx.fillRect(Math.random() * S, Math.random() * S, 2, 2);
    }
  };
  if (kind === "hall") {
    // lastre di pietra chiara
    ctx.fillStyle = "#cfcac2"; ctx.fillRect(0, 0, S, S);
    rumore(0.06);
    ctx.strokeStyle = "rgba(90,85,78,0.35)"; ctx.lineWidth = 2;
    for (let k = 0; k <= S; k += S / 4) { ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k, S); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, k); ctx.lineTo(S, k); ctx.stroke(); }
  } else if (kind === "server") {
    // pavimento flottante a quadrotte
    ctx.fillStyle = "#9aa2ad"; ctx.fillRect(0, 0, S, S);
    rumore(0.05);
    ctx.strokeStyle = "rgba(40,45,55,0.6)"; ctx.lineWidth = 3;
    for (let k = 0; k <= S; k += S / 8) { ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k, S); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, k); ctx.lineTo(S, k); ctx.stroke(); }
    ctx.fillStyle = "rgba(40,45,55,0.35)";
    for (let x = S / 16; x < S; x += S / 8) for (let y = S / 16; y < S; y += S / 8) ctx.fillRect(x - 10, y - 10, 20, 20);
  } else if (kind === "impianti" || kind === "osservatorio") {
    // resina industriale / cemento
    ctx.fillStyle = kind === "impianti" ? "#5b6472" : "#4b5260"; ctx.fillRect(0, 0, S, S);
    rumore(0.09);
  } else {
    // parquet a doghe
    ctx.fillStyle = "#6b4c34"; ctx.fillRect(0, 0, S, S);
    const H = S / 8;
    for (let r = 0; r < 8; r++) {
      let x = -((r * 97) % 200);
      while (x < S) {
        const w = 160 + ((x * 13 + r * 31) % 120);
        const l = 40 + ((x + r * 17) % 25);
        ctx.fillStyle = `hsl(28, 35%, ${l * 0.6}%)`;
        ctx.fillRect(x, r * H, w - 2, H - 2);
        x += w;
      }
    }
    rumore(0.07);
  }
  const t = new CanvasTexture(cv);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  const [rx, rz] = kind === "hall" ? [12, 9] : kind === "server" ? [14, 10] : kind === "impianti" || kind === "osservatorio" ? [8, 6] : [18, 13];
  t.repeat.set(rx, rz);
  t.anisotropy = 8;
  return t;
}
export function pavimento(kind: Kind) {
  const m = new MeshStandardMaterial({ map: texPavimento(kind), roughness: kind === "hall" ? 0.25 : 0.45, metalness: 0.05 });
  const p = new Mesh(new PlaneGeometry(40, 30), m);
  p.rotation.x = -Math.PI / 2;
  p.receiveShadow = true;
  return p;
}
export function soffitto(HZ: number) {
  const S = 256;
  const cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#d4d4d4"; ctx.fillRect(0, 0, S, S);
  for (let k = 0; k < 3000; k++) { ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`; ctx.fillRect(Math.random() * S, Math.random() * S, 1, 1); }
  ctx.strokeStyle = "#9ca3af"; ctx.lineWidth = 4; ctx.strokeRect(0, 0, S, S);
  const t = new CanvasTexture(cv);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(36, 26);
  const s = new Mesh(new PlaneGeometry(22, 16), new MeshStandardMaterial({ map: t, color: 0x6b7280, roughness: 0.95 }));
  s.rotation.x = Math.PI / 2;
  s.position.y = HZ;
  return s;
}

// ── ARREDI D'AMBIENTE ────────────────────────────────────────────────────
function pianta(x: number, z: number, h = 1.5) {
  const g = new Group();
  g.add(box(0.5, 0.45, 0.5, mat(0xe5e7eb, 0.5), 0, 0, 0));
  for (let k = 0; k < 3; k++) {
    const f = ombra(new Mesh(new IcosahedronGeometry(0.32 - k * 0.05, 1), mat(k % 2 ? 0x2f6b3c : 0x24553a, 0.85)));
    f.position.set(Math.sin(k * 2.1) * 0.08, 0.6 + k * (h - 0.6) / 3, Math.cos(k * 2.1) * 0.08);
    f.scale.y = 1.3;
    g.add(f);
  }
  g.position.set(x, 0, z);
  return g;
}
function salotto(x: number, z: number, ry: number) {
  const g = new Group();
  const tappeto = new Mesh(new PlaneGeometry(3, 2.2), mat(0x334155, 0.95));
  tappeto.rotation.x = -Math.PI / 2;
  tappeto.position.y = 0.006;
  tappeto.receiveShadow = true;
  g.add(tappeto);
  g.add(box(2.0, 0.42, 0.8, mat(0x475569, 0.9), 0, 0, -0.65));
  g.add(box(2.0, 0.45, 0.2, mat(0x475569, 0.9), 0, 0.4, -0.98));
  for (const s of [-1, 1]) g.add(box(0.2, 0.25, 0.8, mat(0x475569, 0.9), s * 0.95, 0.4, -0.65));
  g.add(box(1.0, 0.36, 0.55, mat(0x8a6a4a, 0.5), 0, 0, 0.35));
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  return g;
}
function colonna(x: number, z: number, HZ: number) {
  return box(0.5, HZ, 0.5, mat(0x9ca3af, 0.95), x, 0, z);
}
function scrivania(x: number, z: number, ry = 0) {
  const g = new Group();
  g.add(box(1.4, 0.04, 0.7, mat(0xc8a27a, 0.5), 0, 0.72, 0));
  for (const dx of [-0.65, 0.65]) g.add(box(0.05, 0.72, 0.6, mat(0x4b5563, 0.4), dx, 0, 0));
  g.add(box(0.5, 0.32, 0.03, mat(0x111827, 0.4), 0, 0.78, -0.2));
  const sc = new Mesh(new PlaneGeometry(0.46, 0.28), new MeshStandardMaterial({ color: 0x000000, emissive: 0x60a5fa, emissiveIntensity: 0.9 }));
  sc.position.set(0, 0.94, -0.183);
  g.add(sc);
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  return g;
}

/** arredi comuni a tutti i piani chiusi, più qualche dettaglio per tipo */
export function arreda(scene: Scene, kind: Kind, HZ: number) {
  for (const [x, z] of [[-9.3, -3.6], [9.3, -3.6], [-9.3, 3.4], [9.3, 3.4]]) scene.add(colonna(x, z, HZ));
  for (const [x, z, h] of [[-9.2, -5.8, 1.6], [9.2, -5.8, 1.4], [-9.2, 5.5, 1.5], [9.2, 5.5, 1.7], [-3.8, -6.1, 1.2], [3.8, -6.1, 1.3]] as const) scene.add(pianta(x, z, h));
  if (kind !== "riunioni") scene.add(salotto(-7.6, 4.4, Math.PI / 2));
  if (kind === "hall") {
    // banco reception sul fondo a destra
    const r = new Group();
    r.add(box(2.6, 1.05, 0.7, mat(0x8a6a4a, 0.5), 0, 0, 0));
    r.add(box(2.7, 0.05, 0.8, mat(0xf1f5f9, 0.4), 0, 1.05, 0));
    r.add(box(2.5, 0.03, 0.02, new MeshStandardMaterial({ color: 0, emissive: 0xfff1d6, emissiveIntensity: 2 }), 0, 0.15, 0.36));
    r.position.set(6.4, 0, -4.6);
    scene.add(r);
  }
  if (kind === "riunioni") {
    // tavolo riunioni sul fondo a destra
    scene.add(box(2.8, 0.05, 1.2, mat(0x8a6a4a, 0.45), 6.6, 0.72, -4.2));
    for (const dx of [-1.2, 1.2]) scene.add(box(0.1, 0.72, 0.9, mat(0x4b5563, 0.4), 6.6 + dx, 0, -4.2));
  }
  if (kind === "server") {
    // file di rack lungo la vetrata di fondo
    for (let k = 0; k < 8; k++) {
      const x = -8 + k * 2.3;
      if (Math.abs(x) < 2.6) continue;
      scene.add(box(0.7, 2.1, 1.0, mat(0x0b0f17, 0.4), x, 0, -5.7));
      for (let l = 0; l < 6; l++) scene.add(box(0.5, 0.02, 0.01, new MeshStandardMaterial({ color: 0, emissive: l % 2 ? 0x22c55e : 0x38bdf8, emissiveIntensity: 2 }), x, 0.4 + l * 0.25, -5.19));
    }
  }
  if (kind === "impianti") {
    // tubazioni lungo il fondo e strisce gialle a terra
    for (const [y, c] of [[0.85, 0x1e40af], [0.55, 0xb91c1c], [0.25, 0x9ca3af]] as const) {
      const p = ombra(new Mesh(new CylinderGeometry(0.09, 0.09, 19, 16), std(c, 0.45, 0.5)));
      p.rotation.z = Math.PI / 2;
      p.position.set(0, y, -6.25);
      scene.add(p);
    }
    for (const z of [-4.2, 5.4]) {
      const s = new Mesh(new PlaneGeometry(18, 0.12), mat(0xeab308, 0.6));
      s.rotation.x = -Math.PI / 2;
      s.position.set(0, 0.008, z);
      scene.add(s);
    }
  }
  if (kind === "aule" || kind === "archivio" || kind === "sicurezza") {
    scene.add(scrivania(7.0, -4.6, Math.PI));
  }
}

// ── CHI C'È SU OGNI PIANO ────────────────────────────────────────────────
type Comparsa = { x: number; z: number; ry?: number; posa: Posa; a: Partial<Abito>; seme: number; verso?: [number, number]; vel?: number; sedia?: boolean };
const CASCO = { casco: 0xfacc15, gilet: true };
// La camera guarda dal fondo verso la vetrata: la fascia visibile e libera è dietro
// l'arco degli oggetti (z tra -3.5 e -6) con |x| fino a circa 7.5.
const CHI: Record<Kind, Comparsa[]> = {
  impianti: [
    { x: -6.5, z: -5.4, posa: "cammina", seme: 1, a: { ...CASCO, oggetto: "cartella" }, verso: [5.5, -5.4], vel: 0.9 },
    { x: 5.6, z: -3.9, ry: -2.5, posa: "indica", seme: 2, a: { ...CASCO, casco: 0xffffff } },
    { x: 6.4, z: -4.5, ry: -2.0, posa: "piedi", seme: 3, a: { ...CASCO, oggetto: "cartella" } },
    { x: -6.4, z: -3.8, ry: 1.0, posa: "parla", seme: 4, a: {} },
    { x: -5.75, z: -4.30, ry: -2.1, posa: "parla", seme: 5, a: { ...CASCO } },
    { x: 3.0, z: -5.9, ry: 0.3, posa: "piedi", seme: 6, a: { ...CASCO } },
  ],
  hall: [
    { x: 6.4, z: -5.35, ry: 0, posa: "piedi", seme: 7, a: { giacca: 0x1e3a8a } },
    { x: -7.0, z: -5.6, posa: "cammina", seme: 8, a: {}, verso: [4.2, -5.6], vel: 1.0 },
    { x: -6.8, z: -2.6, posa: "cammina", seme: 9, a: { oggetto: "fascicolo" }, verso: [-6.8, -4.8], vel: 0.7 },
    { x: 6.0, z: -3.85, ry: Math.PI, posa: "parla", seme: 12, a: {} },
    { x: -4.9, z: -4.5, ry: 1.0, posa: "parla", seme: 10, a: {} },
    { x: -4.25, z: -5.00, ry: -2.1, posa: "parla", seme: 11, a: {} },
  ],
  sicurezza: [
    { x: -6.8, z: -5.4, posa: "cammina", seme: 13, a: { ...CASCO }, verso: [5.0, -5.4], vel: 0.9 },
    { x: 5.4, z: -3.6, ry: -2.4, posa: "indica", seme: 14, a: { oggetto: "cartella" } },
    { x: 7.0, z: -5.3, posa: "seduto", seme: 15, a: {}, sedia: true, ry: 0 },
    { x: -6.3, z: -3.8, ry: 1.0, posa: "parla", seme: 16, a: {} },
    { x: -5.65, z: -4.30, ry: -2.1, posa: "parla", seme: 17, a: { ...CASCO, casco: 0xffffff } },
    { x: 2.8, z: -5.9, ry: 0.4, posa: "piedi", seme: 18, a: {} },
  ],
  aule: [
    ...[-7.4, -6.6, -5.8].flatMap((x, k) => [
      { x, z: -4.0, ry: Math.PI, posa: "seduto" as Posa, seme: 19 + k, a: {}, sedia: true },
      { x: x + 0.3, z: -5.0, ry: Math.PI, posa: "seduto" as Posa, seme: 23 + k, a: { lunghi: k === 1 }, sedia: true },
    ]),
    { x: -6.4, z: -6.0, ry: 0, posa: "indica", seme: 27, a: { giacca: 0x1e3a8a } },
    { x: 7.0, z: -5.3, posa: "seduto", seme: 28, a: {}, sedia: true, ry: 0 },
    { x: 4.5, z: -4.3, posa: "cammina", seme: 29, a: { oggetto: "fascicolo" }, verso: [-3.0, -4.3], vel: 0.8 },
  ],
  archivio: [
    { x: -6.6, z: -5.4, posa: "cammina", seme: 30, a: { oggetto: "fascicolo" }, verso: [5.5, -5.4], vel: 0.85 },
    { x: 7.0, z: -5.3, posa: "seduto", seme: 31, a: {}, sedia: true, ry: 0 },
    { x: 5.4, z: -3.6, ry: -2.1, posa: "indica", seme: 32, a: { oggetto: "cartella" } },
    { x: -6.3, z: -3.8, ry: 1.0, posa: "parla", seme: 33, a: {} },
    { x: -5.65, z: -4.30, ry: -2.1, posa: "parla", seme: 34, a: { lunghi: true } },
  ],
  server: [
    { x: -4.2, z: -4.6, ry: Math.PI, posa: "piedi", seme: 35, a: { oggetto: "portatile", giacca: 0x0f766e } },
    { x: 6.8, z: -4.4, posa: "cammina", seme: 36, a: {}, verso: [3.2, -4.4], vel: 0.8 },
    { x: 5.9, z: -3.4, ry: -2.3, posa: "piedi", seme: 37, a: { oggetto: "portatile" } },
    { x: -7.2, z: -3.8, ry: 1.0, posa: "parla", seme: 38, a: {} },
    { x: -6.55, z: -4.30, ry: -2.1, posa: "parla", seme: 39, a: {} },
  ],
  riunioni: [
    ...[[5.6, -3.4, Math.PI], [7.6, -3.4, Math.PI], [5.6, -5.0, 0], [7.6, -5.0, 0]].map(([x, z, ry], k) => ({ x, z, ry, posa: "seduto" as Posa, seme: 40 + k, a: { lunghi: k === 2 }, sedia: true })),
    { x: -6.6, z: -5.6, posa: "cammina", seme: 45, a: { oggetto: "fascicolo" }, verso: [3.4, -5.6], vel: 0.85 },
    { x: -6.3, z: -3.8, ry: 1.0, posa: "parla", seme: 46, a: {} },
    { x: -5.65, z: -4.30, ry: -2.1, posa: "parla", seme: 47, a: {} },
  ],
  osservatorio: [
    { x: -6.4, z: -5.8, ry: Math.PI, posa: "piedi", seme: 48, a: {} },
    { x: -5.7, z: -5.8, ry: Math.PI + 0.3, posa: "parla", seme: 49, a: { lunghi: true } },
    { x: 6.4, z: -2.8, posa: "cammina", seme: 50, a: { giacca: 0x1e293b }, verso: [6.4, -5.4], vel: 0.7 },
    { x: 3.4, z: -5.8, ry: Math.PI - 0.2, posa: "piedi", seme: 51, a: {} },
  ],
};

/** mette le persone nella stanza e restituisce la loro animazione */
export function popola(scene: Scene, kind: Kind) {
  const anime: ((t: number) => void)[] = [];
  for (const c of CHI[kind]) {
    const p = persona(abito(c.seme, c.a), c.posa);
    const radice = new Group();
    radice.add(p.g);
    radice.position.set(c.x, 0, c.z);
    radice.rotation.y = c.ry ?? 0;
    if (c.sedia) {
      const s = sedia();
      s.position.z = -0.08;
      radice.add(s);
      p.g.position.z = 0.06;
    }
    scene.add(radice);
    if (c.posa === "cammina" && c.verso) {
      // avanti e indietro tra due punti, girandosi in fondo
      const [x0, z0] = [c.x, c.z];
      const [x1, z1] = c.verso;
      const dist = Math.hypot(x1 - x0, z1 - z0);
      const vel = c.vel ?? 0.8;
      const sfas = Math.random() * dist * 2;
      anime.push((t) => {
        const s = (t * vel + sfas) % (dist * 2);
        const avanti = s < dist;
        const f = (avanti ? s : dist * 2 - s) / dist;
        radice.position.set(x0 + (x1 - x0) * f, 0, z0 + (z1 - z0) * f);
        const dx = (x1 - x0) * (avanti ? 1 : -1), dz = (z1 - z0) * (avanti ? 1 : -1);
        const voluto = Math.atan2(dx, dz);
        let d = voluto - radice.rotation.y;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        radice.rotation.y += d * 0.12;
        p.anima(t, (t * vel + sfas) * 5.2);
      });
    } else {
      anime.push((t) => p.anima(t));
    }
  }
  return anime;
}
