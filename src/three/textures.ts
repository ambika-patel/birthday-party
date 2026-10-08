// Canvas-generated textures used for glow sprites, soft blob shadows and mini-heart sprites.

function makeCanvas(size: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  return { canvas, ctx };
}

export function makeGlowTexture(THREE: any, colorHex: string, hardness = 0.15): any {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size);
  const r = size / 2;
  const gradient = ctx.createRadialGradient(r, r, 0, r, r, r);
  gradient.addColorStop(0, colorHex);
  gradient.addColorStop(hardness, colorHex);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function makeSoftDotTexture(THREE: any): any {
  const size = 64;
  const { canvas, ctx } = makeCanvas(size);
  const r = size / 2;
  const gradient = ctx.createRadialGradient(r, r, 0, r, r, r);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.4, "rgba(255,255,255,0.7)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function makeBlobShadowTexture(THREE: any): any {
  const size = 128;
  const { canvas, ctx } = makeCanvas(size);
  const r = size / 2;
  const gradient = ctx.createRadialGradient(r, r, 0, r, r, r);
  gradient.addColorStop(0, "rgba(10,2,16,0.55)");
  gradient.addColorStop(0.6, "rgba(10,2,16,0.3)");
  gradient.addColorStop(1, "rgba(10,2,16,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function makeHeartTexture(THREE: any, colorHex: string): any {
  const size = 128;
  const { canvas, ctx } = makeCanvas(size);
  ctx.save();
  ctx.translate(size / 2, size / 2 + 10);
  ctx.scale(2.1, 2.1);
  ctx.beginPath();
  const topCurveHeight = 14;
  ctx.moveTo(0, topCurveHeight);
  ctx.bezierCurveTo(0, topCurveHeight - 14, -20, topCurveHeight - 14, -20, topCurveHeight);
  ctx.bezierCurveTo(-20, topCurveHeight + 10, 0, topCurveHeight + 24, 0, topCurveHeight + 34);
  ctx.bezierCurveTo(0, topCurveHeight + 24, 20, topCurveHeight + 10, 20, topCurveHeight);
  ctx.bezierCurveTo(20, topCurveHeight - 14, 0, topCurveHeight - 14, 0, topCurveHeight);
  ctx.closePath();
  ctx.fillStyle = colorHex;
  ctx.shadowColor = colorHex;
  ctx.shadowBlur = 18;
  ctx.fill();
  ctx.restore();
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}
