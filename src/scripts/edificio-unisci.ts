// Raggruppa i pezzi fermi di una scena in poche mesh, una per materiale.
// Il palazzo è fatto di centinaia di cubetti (montanti, gambe di sedie, scaffali, omini…):
// ognuno sarebbe un comando di disegno a sé, e su un pc modesto è la CPU a non starci
// dietro, non la GPU. Uniti per materiale l'aspetto resta identico e i comandi scendono di
// un ordine di grandezza.
//
// Le parti che si muovono (segnate con `vivo()`) fanno da "ancora": i pezzi fermi rispetto
// a un'ancora si uniscono dentro di lei e si muovono con lei. Così di un omino che cammina
// restano poche mesh (corpo, due gambe, due braccia, testa) invece di una ventina.
//  - un oggetto `vivo` non viene mai fuso (si muove, o serve al clic), ma i suoi figli fermi
//    sì, dentro di lui;
//  - un materiale `vivo` (lo si anima: luci, led…) unisce solo le mesh che lo usano davvero,
//    non quelle con un materiale gemello;
//  - i trasparenti che scrivono la profondità restano fuori: uniti cambierebbe l'ordine
//    di disegno.
import { BufferGeometry, Material, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const vivo = <T extends Object3D | Material>(x: T): T => {
  x.userData.vivo = true;
  return x;
};

// Materiali con gli stessi parametri creati due volte (succede con gli helper `std()`)
// contano come uno solo, così le loro mesh finiscono nello stesso gruppo.
function firma(m: Material): string {
  if (m.userData.vivo || (m.type !== "MeshStandardMaterial" && m.type !== "MeshBasicMaterial")) return m.uuid;
  const s = m as MeshStandardMaterial & MeshBasicMaterial;
  return [
    m.type, s.color?.getHex(), s.emissive?.getHex(), s.emissiveIntensity, s.roughness, s.metalness,
    m.transparent, m.opacity, m.side, m.depthWrite, m.visible, s.map?.uuid, s.emissiveMap?.uuid,
    s.envMapIntensity, s.wireframe, s.flatShading,
  ].join("|");
}

export function unisciStatici(root: Object3D) {
  root.updateMatrixWorld(true);
  const gruppi = new Map<string, { ancora: Object3D; mat: Material; mesh: Mesh[] }>();

  const visita = (o: Object3D, ancora: Object3D) => {
    const m = o as Mesh;
    if (!o.userData.vivo && m.isMesh && !Array.isArray(m.material) && m.visible) {
      const mat = m.material as Material;
      if (mat.visible && !(mat.transparent && mat.depthWrite) && !m.geometry.morphAttributes.position) {
        const attr = Object.keys(m.geometry.attributes).sort().join();
        const k = [ancora.id, firma(mat), attr, m.castShadow, m.receiveShadow, m.renderOrder, m.frustumCulled].join("#");
        const g = gruppi.get(k) ?? { ancora, mat, mesh: [] };
        g.mesh.push(m);
        gruppi.set(k, g);
      }
    }
    const prossima = o.userData.vivo ? o : ancora;
    for (const c of o.children) visita(c, prossima);
  };
  visita(root, root);

  for (const { ancora, mat, mesh } of gruppi.values()) {
    if (mesh.length < 2) continue;
    const inversa = ancora.matrixWorld.clone().invert();
    const nonIndicizzate = mesh.some((m) => !m.geometry.index);
    const geos: BufferGeometry[] = mesh.map((m) => {
      let g = m.geometry.clone();
      if (nonIndicizzate && g.index) g = g.toNonIndexed();
      g.clearGroups();
      return g.applyMatrix4(inversa.clone().multiply(m.matrixWorld));
    });
    const geo = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!geo) continue;
    const unita = new Mesh(geo, mat);
    const primo = mesh[0];
    unita.castShadow = primo.castShadow;
    unita.receiveShadow = primo.receiveShadow;
    unita.renderOrder = primo.renderOrder;
    unita.frustumCulled = primo.frustumCulled;
    // i figli di una mesh fusa (rari) passano all'ancora, al loro posto nel mondo
    for (const m of mesh) {
      for (const c of [...m.children]) ancora.attach(c);
      m.removeFromParent();
    }
    ancora.add(unita);
  }

  // i gruppi rimasti vuoti non servono più (ognuno costerebbe un aggiornamento a ogni frame)
  const pota = (o: Object3D) => {
    for (const c of [...o.children]) pota(c);
    if (o !== root && !o.userData.vivo && o.type === "Group" && o.children.length === 0) o.removeFromParent();
  };
  pota(root);
}

/**
 * Trova da sé che cosa si anima: esegue `anima` a vuoto in istanti e stati diversi e
 * segna `vivo` ogni oggetto la cui posizione/rotazione/scala cambia e ogni materiale i cui
 * parametri cambiano. Poi rimette tutto com'era. Serve dove le animazioni sono tante e
 * sparse (le stanze), così un arredo animato aggiunto domani non va segnato a mano.
 */
export function trovaVivi(root: Object3D, anima: (t: number, stato: number) => void, stati: number[]) {
  const oggetti: Object3D[] = [];
  const materiali = new Set<Material>();
  root.traverse((o) => {
    if (o === root) return;
    oggetti.push(o);
    const m = (o as Mesh).material;
    if (m) (Array.isArray(m) ? m : [m]).forEach((x) => materiali.add(x));
  });
  const posa = (o: Object3D) => [...o.position.toArray(), ...o.quaternion.toArray(), ...o.scale.toArray(), o.visible ? 1 : 0];
  const PARAMS = ["opacity", "emissiveIntensity", "visible", "roughness", "metalness"] as const;
  const params = (m: Material) => {
    const s = m as MeshStandardMaterial;
    return [...PARAMS.map((p) => Number((s as unknown as Record<string, unknown>)[p] ?? 0)), s.color?.getHex() ?? 0, s.emissive?.getHex() ?? 0];
  };
  const pose0 = new Map(oggetti.map((o) => [o, posa(o)]));
  const par0 = new Map([...materiali].map((m) => [m, params(m)]));
  const diverso = (a: number[], b: number[]) => a.some((x, i) => Math.abs(x - b[i]) > 1e-6);

  // il primo stato (nessuno sotto il puntatore) in più istanti, per prendere anche le
  // animazioni lente o a scatti; gli altri bastano pochi istanti (il cambio è immediato)
  stati.forEach((stato, k) => {
    for (const t of k === 0 ? [0.13, 0.77, 1.9, 3.4, 5.25, 8.6, 13.1, 21.7] : [0.31, 2.6, 6.9]) {
      anima(t, stato);
      for (const o of oggetti) if (!o.userData.vivo && diverso(posa(o), pose0.get(o)!)) vivo(o);
      for (const m of materiali) if (!m.userData.vivo && diverso(params(m), par0.get(m)!)) vivo(m);
    }
  });

  for (const o of oggetti) {
    const p = pose0.get(o)!;
    o.position.fromArray(p, 0);
    o.quaternion.fromArray(p, 3);
    o.scale.fromArray(p, 7);
    o.visible = p[10] === 1;
  }
  for (const m of materiali) {
    const p = par0.get(m)!;
    const s = m as MeshStandardMaterial;
    PARAMS.forEach((k, i) => { if (k in s) (s as unknown as Record<string, unknown>)[k] = k === "visible" ? p[i] === 1 : p[i]; });
    s.color?.setHex(p[PARAMS.length]);
    s.emissive?.setHex(p[PARAMS.length + 1]);
  }
}
