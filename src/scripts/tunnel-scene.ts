// Scena three.js del tunnel in home: un tubo wireframe lungo una curva, anelli
// colorati con la palette del brand, pulviscolo e nebbia navy. La camera percorre
// la curva in base a `progress` (0 → 1), che arriva dallo scroll (TunnelHome.astro).
// Le card NON sono nella scena: restano HTML sopra il canvas.
import {
  BufferAttribute, BufferGeometry, CatmullRomCurve3, Color, FogExp2, LineBasicMaterial,
  LineSegments, Mesh, MeshBasicMaterial, PerspectiveCamera, Points, PointsMaterial, Scene,
  TorusGeometry, TubeGeometry, CanvasTexture, Vector3, WebGLRenderer, WireframeGeometry, AdditiveBlending,
} from "three";

const INK = 0x0f172a; // = --color-ink: hero, header e tunnel dello stesso navy
const PALETTE = ["#3b82f6", "#0ea5e9", "#6366f1", "#2563eb", "#06b6d4", "#8b5cf6"].map((c) => new Color(c));

export function createTunnelScene(canvas: HTMLCanvasElement, stations: number) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(INK, 1);

  const scene = new Scene();
  scene.fog = new FogExp2(INK, 0.045);
  const camera = new PerspectiveCamera(70, 1, 0.1, 140);

  // Curva: più lunga quante più sono le tappe, con curve morbide (non da ottovolante).
  const segs = stations + 4;
  const pts: Vector3[] = [];
  for (let i = 0; i <= segs; i++) {
    pts.push(new Vector3(Math.sin(i * 0.55) * 5, Math.cos(i * 0.42) * 3.5, -i * 13));
  }
  const curve = new CatmullRomCurve3(pts);

  // Tubo wireframe
  const tube = new TubeGeometry(curve, segs * 40, 3.4, 22, false);
  const wire = new LineSegments(
    new WireframeGeometry(tube),
    new LineBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.22 }),
  );
  scene.add(wire);

  // Anelli perpendicolari alla curva, colore che scorre lungo la palette.
  const RINGS = segs * 5;
  const ringGeo = new TorusGeometry(2.9, 0.035, 8, 96);
  const rings: Mesh[] = [];
  for (let i = 0; i < RINGS; i++) {
    const t = i / RINGS;
    const f = t * (PALETTE.length - 1);
    const c = PALETTE[Math.floor(f)].clone().lerp(PALETTE[Math.min(Math.ceil(f), PALETTE.length - 1)], f % 1);
    const ring = new Mesh(ringGeo, new MeshBasicMaterial({ color: c, transparent: true, opacity: i % 5 === 0 ? 0.95 : 0.35 }));
    const p = curve.getPointAt(t);
    ring.position.copy(p);
    ring.lookAt(p.clone().add(curve.getTangentAt(t)));
    if (i % 5 === 0) ring.scale.setScalar(1.06);
    scene.add(ring);
    rings.push(ring);
  }

  // Pulviscolo dentro il tubo
  const DUST = 1400;
  const pos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) {
    const t = Math.random();
    const p = curve.getPointAt(t);
    const a = Math.random() * Math.PI * 2;
    const r = 0.6 + Math.random() * 2.4;
    pos.set([p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, p.z + (Math.random() - 0.5) * 4], i * 3);
  }
  const dustGeo = new BufferGeometry();
  dustGeo.setAttribute("position", new BufferAttribute(pos, 3));
  // sprite rotondo (senza, i punti sono quadrati)
  const dot = document.createElement("canvas");
  dot.width = dot.height = 64;
  const g = dot.getContext("2d")!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.35, "rgba(255,255,255,0.55)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const dotTex = new CanvasTexture(dot);
  const dust = new Points(dustGeo, new PointsMaterial({
    map: dotTex, color: 0x93c5fd, size: 0.12, transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false,
  }));
  scene.add(dust);

  let progress = 0;
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  const up = new Vector3(0, 1, 0);
  const look = new Vector3();
  let raf = 0;
  let running = false;
  let last = performance.now();

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function frame(now: number) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    pointer.sx += (pointer.x - pointer.sx) * (1 - Math.exp(-dt * 4));
    pointer.sy += (pointer.y - pointer.sy) * (1 - Math.exp(-dt * 4));

    const t = Math.min(Math.max(progress, 0.0001), 0.97);
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t);
    camera.position.copy(p);
    // Il mouse sposta leggermente lo sguardo: profondità anche da fermi.
    look.copy(curve.getPointAt(Math.min(t + 0.015, 1)));
    look.x += pointer.sx * 1.6;
    look.y -= pointer.sy * 1.1;
    // Inclinazione in curva, presa dalla tangente (non dal tempo).
    up.set(-tan.x * 0.6, 1, 0).normalize();
    camera.up.copy(up);
    camera.lookAt(look);

    // Gli anelli più vicini respirano piano.
    const pulse = 0.5 + 0.5 * Math.sin(now / 900);
    (wire.material as LineBasicMaterial).opacity = 0.18 + pulse * 0.08;
    dust.rotation.z = now / 40000;

    renderer.render(scene, camera);
    if (running) raf = requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener("resize", resize);

  return {
    setProgress(v: number) { progress = v; },
    setPointer(x: number, y: number) { pointer.x = x; pointer.y = y; },
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    stop() { running = false; cancelAnimationFrame(raf); },
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      tube.dispose(); ringGeo.dispose(); dustGeo.dispose(); dotTex.dispose();
      wire.geometry.dispose();
      (wire.material as LineBasicMaterial).dispose();
      rings.forEach((r) => (r.material as MeshBasicMaterial).dispose());
      (dust.material as PointsMaterial).dispose();
      renderer.dispose();
      // libera subito il contesto GPU (i browser ne concedono pochi)
      renderer.forceContextLoss();
    },
  };
}
