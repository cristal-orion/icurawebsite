// Raggruppa i pezzi fermi di una scena in poche mesh, una per materiale.
// Il palazzo è fatto di centinaia di cubetti (montanti, gambe di sedie, scaffali…): ognuno
// sarebbe un comando di disegno a sé, e su un pc modesto è la CPU a non starci dietro, non
// la GPU. Uniti per materiale l'aspetto resta identico e i comandi scendono di un ordine
// di grandezza.
//
// Restano fuori:
//  - gli oggetti segnati con `vivo()` (e tutto quello che contengono): si muovono o servono
//    al clic (radar, cabina dell'ascensore, volumi invisibili dei piani…);
//  - le mesh con un materiale segnato con `vivo()` vengono unite solo con le altre che usano
//    *lo stesso* materiale, perché lo si anima (luci del piano, led…);
//  - i trasparenti che scrivono la profondità: uniti cambierebbero l'ordine di disegno.
import { BufferGeometry, Material, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const vivo = <T extends Object3D | Material>(x: T): T => {
  x.userData.vivo = true;
  return x;
};

// Materiali con gli stessi parametri creati due volte (succede con gli helper `std()`)
// diventano uno solo, così le loro mesh finiscono nello stesso gruppo.
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
  const gruppi = new Map<string, { mat: Material; mesh: Mesh[] }>();

  const visita = (o: Object3D) => {
    if (o.userData.vivo) return;
    const m = o as Mesh;
    if (m.isMesh && !Array.isArray(m.material) && m.visible) {
      const mat = m.material as Material;
      const ok = mat.visible && !(mat.transparent && mat.depthWrite) && !m.geometry.morphAttributes.position;
      if (ok) {
        const k = [firma(mat), m.castShadow, m.receiveShadow, m.renderOrder, m.frustumCulled].join("#");
        const g = gruppi.get(k) ?? { mat, mesh: [] };
        g.mesh.push(m);
        gruppi.set(k, g);
      }
    }
    for (const c of o.children) visita(c);
  };
  visita(root);

  const inversa = root.matrixWorld.clone().invert();
  for (const { mat, mesh } of gruppi.values()) {
    if (mesh.length < 2) continue;
    const nonIndicizzate = mesh.some((m) => !m.geometry.index);
    const nomi = Object.keys(mesh[0].geometry.attributes).sort().join();
    // geometrie con attributi diversi (es. senza uv) non si possono fondere: restano com'erano
    if (mesh.some((m) => Object.keys(m.geometry.attributes).sort().join() !== nomi)) continue;
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
    for (const m of mesh) m.removeFromParent();
    root.add(unita);
  }

  // i gruppi rimasti vuoti non servono più (ognuno costerebbe un aggiornamento a ogni frame)
  const pota = (o: Object3D) => {
    for (const c of [...o.children]) pota(c);
    if (o !== root && !o.userData.vivo && o.type === "Group" && o.children.length === 0) o.removeFromParent();
  };
  pota(root);
}
