// Decide se la home può usare il tunnel 3D o se resta la colonna di card.
// Gira prima di caricare three.js: chi non può permetterselo non scarica nemmeno il bundle.
//   "3d"     tunnel three.js
//   "lite"   colonna di card con entrata a scorrimento (WebGL assente/lento, pc vecchio)
//   "static" colonna ferma (il sistema chiede di ridurre il movimento)
export type TunnelMode = "3d" | "lite" | "static";

// Renderer che indicano WebGL in software: gira, ma a pochi fps.
const SOFTWARE_GL = /swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen/i;

const WHY: Record<string, string> = {
  "reduced-motion": "il sistema ha 'riduci movimento' attivo",
  "save-data": "il browser chiede di risparmiare dati",
  "low-end": "dispositivo con poca CPU o memoria",
  "no-webgl2": "WebGL2 non disponibile (accelerazione hardware spenta?)",
  "software-gl": "WebGL gira in software (accelerazione hardware spenta o GPU non supportata)",
  "slow-fps": "il 3D girava sotto i 25 fps",
  "context-lost": "il contesto WebGL è stato perso",
  "scene-error": "scena non creata",
};

export const describeWhy = (why: string) => WHY[why] ?? why;

function glProblem(): "no-webgl2" | "software-gl" | null {
  let gl: WebGL2RenderingContext | null = null;
  try {
    gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return "no-webgl2";
    // Con failIfMajorPerformanceCaveat il browser rifiuta il contesto se sarebbe software.
    // Va su un canvas nuovo: su uno già usato gli attributi verrebbero ignorati.
    const hw = document.createElement("canvas").getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    hw?.getExtension("WEBGL_lose_context")?.loseContext();
    if (!hw) return "software-gl";
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    if (info && SOFTWARE_GL.test(String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)))) return "software-gl";
    return null;
  } catch {
    return "no-webgl2";
  } finally {
    // i contesti di prova non devono restare vivi: i browser ne tengono pochi
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  }
}

export function chooseTunnelMode(): { mode: TunnelMode; why?: string } {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return { mode: "static", why: "reduced-motion" };

  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return { mode: "lite", why: "save-data" };
  if ((nav.hardwareConcurrency || 8) <= 2 || (nav.deviceMemory ?? 8) <= 2) return { mode: "lite", why: "low-end" };

  const why = glProblem();
  return why ? { mode: "lite", why } : { mode: "3d" };
}
