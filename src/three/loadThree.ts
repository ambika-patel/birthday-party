// Loads three.js r128 from cdnjs at runtime (global THREE, no npm bundle).
const THREE_SRC = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";

declare global {
  interface Window {
    THREE?: any;
  }
}

let threePromise: Promise<any> | null = null;

export function loadThree(): Promise<any> {
  if (window.THREE) return Promise.resolve(window.THREE);
  if (threePromise) return threePromise;

  threePromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${THREE_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.THREE));
      existing.addEventListener("error", () => reject(new Error("Failed to load three.js")));
      return;
    }
    const script = document.createElement("script");
    script.src = THREE_SRC;
    script.async = true;
    script.onload = () => {
      if (window.THREE) resolve(window.THREE);
      else reject(new Error("THREE global not found after script load"));
    };
    script.onerror = () => reject(new Error("Failed to load three.js from cdnjs"));
    document.head.appendChild(script);
  });

  return threePromise;
}

export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") ||
      (canvas.getContext("experimental-webgl") as RenderingContext | null);
    return !!(window as any).WebGLRenderingContext && !!gl;
  } catch (e) {
    return false;
  }
}
