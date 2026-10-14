/** 오목판과 돌의 질감을 Canvas 2D로 그려서 텍스처로 쓴다 (이미지 파일 없이). */

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return [c, c.getContext("2d")!];
}

/** 비자나무 느낌의 오목판 바탕 */
export function makeWoodTexture(sizePx: number, res: number): HTMLCanvasElement {
  const S = sizePx * res;
  const [canvas, ctx] = makeCanvas(S, S);
  const rand = rng(20261014);

  const base = ctx.createLinearGradient(0, 0, S, S);
  base.addColorStop(0, "#e8bd72");
  base.addColorStop(0.5, "#d9a55a");
  base.addColorStop(1, "#c98f43");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);

  // 넓고 흐릿한 결 (밝고 어두운 띠)
  for (let i = 0; i < 14; i++) {
    const y = rand() * S;
    const h = (0.03 + rand() * 0.1) * S;
    const g = ctx.createLinearGradient(0, y - h, 0, y + h);
    const dark = rand() > 0.5;
    const col = dark ? "90,50,12" : "255,226,160";
    g.addColorStop(0, `rgba(${col},0)`);
    g.addColorStop(0.5, `rgba(${col},${dark ? 0.1 : 0.12})`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, y - h, S, h * 2);
  }

  // 가는 나뭇결
  ctx.lineCap = "round";
  for (let i = 0; i < 220; i++) {
    const y0 = rand() * S;
    const amp = (1 + rand() * 5) * res;
    const freq = 0.004 + rand() * 0.012;
    const phase = rand() * 10;
    ctx.strokeStyle = `rgba(${rand() > 0.3 ? "112,64,20" : "250,215,150"},${0.04 + rand() * 0.1})`;
    ctx.lineWidth = (0.4 + rand() * 1.6) * res;
    ctx.beginPath();
    for (let x = 0; x <= S; x += 12 * res) {
      const y = y0 + Math.sin(x * freq / res + phase) * amp + Math.sin(x * freq * 2.7 / res + phase * 2) * amp * 0.35;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // 아주 잔 점 노이즈
  for (let i = 0; i < 5000; i++) {
    ctx.fillStyle = `rgba(80,40,10,${rand() * 0.07})`;
    ctx.fillRect(rand() * S, rand() * S, res, res);
  }

  // 가장자리를 살짝 어둡게
  const vg = ctx.createRadialGradient(S / 2, S / 2, S * 0.35, S / 2, S / 2, S * 0.78);
  vg.addColorStop(0, "rgba(60,28,5,0)");
  vg.addColorStop(1, "rgba(60,28,5,0.4)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, S, S);

  // 윗면 은은한 빛
  const light = ctx.createLinearGradient(0, 0, 0, S);
  light.addColorStop(0, "rgba(255,244,214,0.22)");
  light.addColorStop(0.45, "rgba(255,244,214,0)");
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, S, S);

  return canvas;
}

export interface StoneTextures {
  black: HTMLCanvasElement;
  white: HTMLCanvasElement;
  shadow: HTMLCanvasElement;
}

export function makeStoneTextures(diameter: number, res: number): StoneTextures {
  const D = diameter * res;
  const r = D / 2;

  const draw = (kind: "black" | "white") => {
    const [canvas, ctx] = makeCanvas(D, D);
    const g = ctx.createRadialGradient(r * 0.68, r * 0.6, r * 0.04, r * 0.95, r * 0.98, r * 1.02);
    if (kind === "black") {
      g.addColorStop(0, "#74747a");
      g.addColorStop(0.28, "#34343a");
      g.addColorStop(0.7, "#0e0e11");
      g.addColorStop(1, "#000");
    } else {
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.45, "#f1efe8");
      g.addColorStop(0.85, "#c9c5b8");
      g.addColorStop(1, "#a7a295");
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(r, r, r - 0.5 * res, 0, Math.PI * 2);
    ctx.fill();

    // 윗면 반사광
    const hl = ctx.createRadialGradient(r * 0.7, r * 0.55, 0, r * 0.7, r * 0.55, r * 0.5);
    hl.addColorStop(0, kind === "black" ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.9)");
    hl.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = hl;
    ctx.beginPath();
    ctx.ellipse(r * 0.7, r * 0.55, r * 0.5, r * 0.34, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // 테두리 음영
    ctx.lineWidth = 1 * res;
    ctx.strokeStyle = kind === "black" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.arc(r, r, r - 1 * res, 0, Math.PI * 2);
    ctx.stroke();
    return canvas;
  };

  const SD = D * 1.7;
  const [shadow, sctx] = makeCanvas(SD, SD);
  const sg = sctx.createRadialGradient(SD / 2, SD / 2, r * 0.55, SD / 2, SD / 2, SD / 2);
  sg.addColorStop(0, "rgba(30,14,2,0.55)");
  sg.addColorStop(0.55, "rgba(30,14,2,0.22)");
  sg.addColorStop(1, "rgba(30,14,2,0)");
  sctx.fillStyle = sg;
  sctx.fillRect(0, 0, SD, SD);

  return { black: draw("black"), white: draw("white"), shadow };
}
