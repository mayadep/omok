import { Application, Container, Graphics, Rectangle, Sprite, Text, Texture, type FederatedPointerEvent } from "pixi.js";
import { BLACK, BOARD_SIZE as N, type Color, type Move, type Point } from "@omok/engine";
import { makeStoneTextures, makeWoodTexture } from "./textures";

export interface BoardState {
  moves: readonly Move[];
  /** 지금 둘 차례인 사람에게 보여줄 금수 자리 */
  forbidden: readonly Point[];
  winLine: readonly Point[] | null;
}

export interface BoardOptions {
  onPlace: (x: number, y: number) => void;
  /** 5목 폭발 연출에서 i번째 돌이 터질 때 (효과음용) */
  onBurst?: (i: number) => void;
}

interface StoneView {
  stone: Sprite;
  shadow: Sprite;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  color: number;
  /** 불꽃(꼬리를 그리며 날아감) / 돌 파편 */
  spark: boolean;
}

interface Flash {
  x: number;
  y: number;
  age: number;
}

const GOLD = 0xf3c969;
/** 5목 폭발: 돌 사이 간격(ms) */
export const BURST_GAP = 300;
/** 5목 폭발: 마지막 돌이 터진 뒤 승리선이 떠오르기까지(ms) */
const BURST_TAIL = 250;
const SPARK_COLORS = [0xf3c969, 0xfff3c4, 0xffb347, 0xff7a3d, 0xffffff];
/** 돌 지름 / 칸 크기. 1보다 작아야 이웃한 돌끼리 겹치지 않는다. */
const STONE_RATIO = 0.9;
/** 화면 폭 = 좌우 반칸 + 10칸. 나머지는 착수/이동 시 자동으로 움직여 보여준다 */
const VISIBLE_CELLS = 11;
/** 터치가 이만큼(px) 움직이면 착수가 아니라 판 이동으로 본다 */
const DRAG_PX = 8;
const key = (x: number, y: number) => y * N + x;

/** PixiJS 로 오목판을 그리고 입력을 받는다. React 와는 setState / setInput 으로만 만난다. */
export class BoardRenderer {
  private app = new Application();
  private host!: HTMLElement;
  private opts!: BoardOptions;
  private destroyed = false;
  private resizeObs?: ResizeObserver;

  private size = 0;
  private cell = 0;
  private world = new Container();
  private pan = { x: 0, y: 0 };
  private panTarget = { x: 0, y: 0 };
  private drag: { gx: number; gy: number; px: number; py: number; moved: boolean } | null = null;
  private res = 1;

  private wood = new Sprite();
  private grid = new Graphics();
  private labels = new Container();
  private shadows = new Container();
  private stones = new Container();
  private forbiddenG = new Graphics();
  private marker = new Graphics();
  private fx = new Graphics();
  private ghost = new Sprite();
  private winG = new Graphics();
  private burstG = new Graphics();

  private views = new Map<number, StoneView>();
  private textures: { black: Texture; white: Texture; shadow: Texture } | null = null;
  private state: BoardState = { moves: [], forbidden: [], winLine: null };
  private known = 0;

  private interactiveColor: Color | null = null;
  private hover: Point | null = null;
  private tweens: { t: number; dur: number; update: (p: number) => void; done?: () => void }[] = [];
  private clock = 0;

  private winKey = "";
  private winGlow = 0;
  private particles: Particle[] = [];
  private flashes: Flash[] = [];
  private shake = 0;

  static async create(host: HTMLElement, opts: BoardOptions): Promise<BoardRenderer> {
    const r = new BoardRenderer();
    await r.init(host, opts);
    return r;
  }

  private async init(host: HTMLElement, opts: BoardOptions) {
    this.host = host;
    this.opts = opts;
    this.res = Math.min(window.devicePixelRatio || 1, 2);
    const size = Math.max(200, Math.floor(host.clientWidth));
    await this.app.init({
      width: size,
      height: size,
      antialias: true,
      backgroundAlpha: 0,
      resolution: this.res,
      autoDensity: true,
    });
    if (this.destroyed) {
      this.app.destroy(true, { children: true, texture: true });
      return;
    }
    host.appendChild(this.app.canvas);
    this.app.canvas.style.display = "block";
    this.app.canvas.style.touchAction = "none";

    const stage = this.app.stage;
    this.ghost.anchor.set(0.5);
    this.ghost.visible = false;
    this.ghost.alpha = 0.5;
    this.world.addChild(this.wood, this.grid, this.labels, this.forbiddenG, this.shadows, this.stones, this.marker, this.fx, this.winG, this.burstG, this.ghost);
    stage.addChild(this.world);

    stage.eventMode = "static";
    stage.on("pointermove", (e) => this.onMove(e));
    stage.on("pointerdown", (e) => this.onMove(e));
    stage.on("pointerup", (e) => this.onUp(e));
    stage.on("pointerupoutside", () => {
      this.drag = null;
      this.setHover(null);
    });
    stage.on("pointerleave", () => this.setHover(null));

    this.app.ticker.add((t) => this.tick(t.deltaMS));
    this.layout(size);

    this.resizeObs = new ResizeObserver(() => {
      const w = Math.floor(host.clientWidth);
      if (w >= 100 && Math.abs(w - this.size) > 1) this.layout(w);
    });
    this.resizeObs.observe(host);
  }

  destroy() {
    this.destroyed = true;
    this.resizeObs?.disconnect();
    if (this.app.renderer) this.app.destroy(true, { children: true, texture: true });
  }

  // ───────────── 외부에서 쓰는 API ─────────────

  setState(state: BoardState) {
    this.state = state;
    if (!this.textures) return;
    this.syncStones();
    this.drawForbidden();
    this.drawWin(true);
  }

  /** color 를 주면 그 색으로 둘 수 있는 상태, null 이면 입력을 받지 않는다 */
  setInput(color: Color | null) {
    this.interactiveColor = color;
    if (color === null) this.setHover(null);
    else this.refreshGhost();
  }

  // ───────────── 배치와 그리기 ─────────────

  private p(i: number) {
    return this.cell * (i + 1);
  }

  private boardPx() {
    return this.cell * (N + 1);
  }

  /** 드래그 중엔 판 안쪽으로만 제한, snap 이면 격자선이 항상 반칸 여백에 맞도록 칸 단위로 맞춘다 */
  private clampPan(v: number, snap = true) {
    const half = this.cell / 2;
    if (!snap) return Math.min(Math.max(half, v), this.boardPx() - this.size - half);
    const s = Math.round((v - half) / this.cell) * this.cell + half;
    return Math.min(Math.max(half, s), this.boardPx() - this.size - half);
  }

  /** 마지막 수(없으면 판 가운데)가 화면 가운데 오도록 이동 */
  private panToLast(animate: boolean) {
    const last = this.state.moves[this.state.moves.length - 1];
    const cx = last ? this.p(last.x) : this.boardPx() / 2;
    const cy = last ? this.p(last.y) : this.boardPx() / 2;
    this.panTarget = { x: this.clampPan(cx - this.size / 2), y: this.clampPan(cy - this.size / 2) };
    if (!animate) {
      this.pan = { ...this.panTarget };
      this.world.position.set(-this.pan.x, -this.pan.y);
    }
  }

  private layout(size: number) {
    this.size = size;
    this.cell = size / VISIBLE_CELLS;
    const board = this.cell * (N + 1);
    this.app.renderer.resize(size, size);
    this.app.stage.hitArea = new Rectangle(0, 0, size, size);

    this.wood.texture = Texture.from(makeWoodTexture(board, this.res));
    this.wood.width = board;
    this.wood.height = board;

    const d = this.cell * STONE_RATIO;
    const t = makeStoneTextures(d, this.res);
    this.textures?.black.destroy(true);
    this.textures?.white.destroy(true);
    this.textures?.shadow.destroy(true);
    this.textures = { black: Texture.from(t.black), white: Texture.from(t.white), shadow: Texture.from(t.shadow) };

    this.drawGrid();
    this.drawLabels();
    this.panToLast(false);

    // 돌 스프라이트를 새 크기와 텍스처로 다시 만든다
    for (const v of this.views.values()) {
      v.stone.destroy();
      v.shadow.destroy();
    }
    this.views.clear();
    this.known = 0;
    this.syncStones(false);
    this.drawForbidden();
    this.drawWin(false);
    this.refreshGhost();
  }

  private drawGrid() {
    const g = this.grid;
    g.clear();
    const c = this.cell;
    const line = Math.max(1, c * 0.045);

    // 판 테두리 안쪽 은은한 홈
    g.rect(c * 0.45, c * 0.45, this.boardPx() - c * 0.9, this.boardPx() - c * 0.9).stroke({ width: line * 1.2, color: 0x6b3d12, alpha: 0.35 });

    for (let i = 0; i < N; i++) {
      g.moveTo(this.p(0), this.p(i)).lineTo(this.p(N - 1), this.p(i));
      g.moveTo(this.p(i), this.p(0)).lineTo(this.p(i), this.p(N - 1));
    }
    g.stroke({ width: line, color: 0x3d2208, alpha: 0.82 });
    g.rect(this.p(0), this.p(0), this.p(N - 1) - this.p(0), this.p(N - 1) - this.p(0)).stroke({ width: line * 1.8, color: 0x3d2208, alpha: 0.9 });

    for (const [x, y] of [[3, 3], [3, 11], [11, 3], [11, 11], [7, 7]]) {
      g.circle(this.p(x), this.p(y), c * 0.11).fill({ color: 0x2f1a06, alpha: 0.9 });
    }
  }

  private drawLabels() {
    for (const child of this.labels.removeChildren()) child.destroy();
    const style = { fontFamily: "Noto Sans KR, sans-serif", fontSize: Math.max(8, this.cell * 0.3), fill: 0x5a3411, fontWeight: "500" as const };
    for (let i = 0; i < N; i++) {
      const col = new Text({ text: String.fromCharCode(65 + i), style });
      col.alpha = 0.6;
      col.anchor.set(0.5);
      col.position.set(this.p(i), this.boardPx() - this.cell * 0.4);
      const row = new Text({ text: String(N - i), style });
      row.alpha = 0.6;
      row.anchor.set(0.5);
      row.position.set(this.cell * 0.4, this.p(i));
      this.labels.addChild(col, row);
    }
  }

  private makeStone(m: Move): StoneView {
    const tex = this.textures!;
    const stone = new Sprite(m.color === BLACK ? tex.black : tex.white);
    stone.anchor.set(0.5);
    // 텍스처는 화면 해상도(res배)로 그려져 있으므로 크기를 칸 기준으로 직접 지정한다
    stone.width = stone.height = this.cell * STONE_RATIO;
    stone.position.set(this.p(m.x), this.p(m.y));
    const shadow = new Sprite(tex.shadow);
    shadow.anchor.set(0.5);
    shadow.width = shadow.height = this.cell * STONE_RATIO * 1.7;
    shadow.position.set(this.p(m.x) + this.cell * 0.07, this.p(m.y) + this.cell * 0.1);
    this.stones.addChild(stone);
    this.shadows.addChild(shadow);
    return { stone, shadow };
  }

  private syncStones(animate = true) {
    const moves = this.state.moves;
    if (moves.length < this.known) {
      for (const v of this.views.values()) {
        v.stone.destroy();
        v.shadow.destroy();
      }
      this.views.clear();
      this.known = 0;
      this.fx.clear();
    }
    for (let i = this.known; i < moves.length; i++) {
      const m = moves[i];
      const view = this.makeStone(m);
      this.views.set(key(m.x, m.y), view);
      if (animate && i === moves.length - 1 && moves.length - this.known === 1) this.animateDrop(view, m);
    }
    if (moves.length !== this.known) this.panToLast(true);
    this.known = moves.length;
    this.drawMarker();
    this.refreshGhost();
  }

  private animateDrop(view: StoneView, m: Move) {
    const { stone, shadow } = view;
    const s0 = stone.scale.x;
    const x = this.p(m.x);
    const y = this.p(m.y);
    stone.alpha = 0;
    this.tween(170, (p) => {
      const e = 1 - Math.pow(1 - p, 3);
      const lift = (1 - e) * this.cell * 0.55;
      stone.alpha = Math.min(1, p * 3);
      stone.scale.set(s0 * (1 + (1 - e) * 0.28));
      stone.position.set(x, y - lift);
      shadow.alpha = 0.35 + e * 0.65;
      shadow.position.set(x + this.cell * 0.07 + (1 - e) * this.cell * 0.2, y + this.cell * 0.1 + (1 - e) * this.cell * 0.28);
    }, () => {
      stone.position.set(x, y);
      stone.scale.set(s0);
      stone.alpha = 1;
      shadow.alpha = 1;
    });
    // 착수 파동
    const color = m.color === BLACK ? 0xf3c969 : 0x5a3411;
    this.tween(520, (p) => {
      this.fx.clear();
      const r = this.cell * (0.45 + p * 0.75);
      this.fx.circle(x, y, r).stroke({ width: Math.max(1, this.cell * 0.05), color, alpha: 0.55 * (1 - p) });
    }, () => this.fx.clear());
  }

  private drawMarker() {
    const g = this.marker;
    g.clear();
    const last = this.state.moves[this.state.moves.length - 1];
    if (!last) return;
    const color = last.color === BLACK ? 0xff6b5e : 0xe0463a;
    g.circle(this.p(last.x), this.p(last.y), this.cell * 0.11).fill({ color });
  }

  private drawForbidden() {
    const g = this.forbiddenG;
    g.clear();
    const a = this.cell * 0.17;
    for (const f of this.state.forbidden) {
      const x = this.p(f.x);
      const y = this.p(f.y);
      g.moveTo(x - a, y - a).lineTo(x + a, y + a).moveTo(x + a, y - a).lineTo(x - a, y + a);
    }
    g.stroke({ width: Math.max(1.5, this.cell * 0.07), color: 0xc2332a, alpha: 0.85, cap: "round" });
  }

  private drawWin(animate: boolean) {
    const g = this.winG;
    g.clear();
    const line = this.state.winLine;
    if (!line || line.length < 2) {
      this.winKey = "";
      this.winGlow = 0;
      return;
    }
    const first = line[0];
    const last = line[line.length - 1];
    const draw = (width: number, alpha: number) => {
      g.moveTo(this.p(first.x), this.p(first.y)).lineTo(this.p(last.x), this.p(last.y)).stroke({ width, color: GOLD, alpha, cap: "round" });
    };
    draw(this.cell * 0.8, 0.14);
    draw(this.cell * 0.5, 0.25);
    draw(this.cell * 0.12, 0.95);
    for (const pt of line) g.circle(this.p(pt.x), this.p(pt.y), this.cell * 0.4).stroke({ width: Math.max(2, this.cell * 0.06), color: GOLD, alpha: 0.9 });

    const k = line.map((pt) => key(pt.x, pt.y)).join(",");
    if (k === this.winKey) return;
    this.winKey = k;
    if (!animate) {
      this.winGlow = 1;
      return;
    }
    // 처음 5목이 생긴 순간: 돌이 하나씩 터진 다음 승리선이 떠오른다
    this.winGlow = 0;
    line.forEach((pt, i) => this.after(i * BURST_GAP, () => this.burst(pt, i)));
    this.after(line.length * BURST_GAP + BURST_TAIL, () => this.tween(500, (p) => (this.winGlow = p)));
  }

  /** 돌 하나가 터지는 연출: 섬광 + 파편 + 돌이 튀었다 돌아옴 + 판 흔들림 */
  private burst(pt: Point, i: number) {
    const view = this.views.get(key(pt.x, pt.y));
    if (!view) return;
    const x = this.p(pt.x);
    const y = this.p(pt.y);
    const c = this.cell;
    const black = view.stone.texture === this.textures?.black;
    const shard = black ? 0x1d1d22 : 0xf4f1ea;

    this.flashes.push({ x, y, age: 0 });
    for (let n = 0; n < 64; n++) {
      const a = Math.random() * Math.PI * 2;
      const spark = n % 4 !== 0;
      const speed = c * (spark ? 5 + Math.random() * 8 : 2.5 + Math.random() * 4);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - c * 2,
        age: 0,
        life: spark ? 700 + Math.random() * 700 : 500 + Math.random() * 400,
        size: c * (spark ? 0.06 + Math.random() * 0.06 : 0.1 + Math.random() * 0.1),
        color: spark ? SPARK_COLORS[(Math.random() * SPARK_COLORS.length) | 0] : shard,
        spark,
      });
    }

    const s0 = view.stone.scale.x;
    this.tween(320, (p) => {
      // 크게 부풀었다가 탄성 있게 제자리로
      const k2 = p < 0.3 ? 1 + (p / 0.3) * 0.38 : 1 + 0.38 * Math.exp(-(p - 0.3) * 9) * Math.cos((p - 0.3) * 18);
      view.stone.scale.set(s0 * k2);
    }, () => view.stone.scale.set(s0));

    this.shake = Math.max(this.shake, c * (0.09 + i * 0.02));
    this.opts.onBurst?.(i);
  }

  private drawBursts(dt: number) {
    const g = this.burstG;
    g.clear();
    if (!this.particles.length && !this.flashes.length) return;
    const c = this.cell;
    const s = dt / 1000;

    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.age += dt;
      const p = f.age / 520;
      if (p >= 1) {
        this.flashes.splice(i, 1);
        continue;
      }
      const e = 1 - Math.pow(1 - p, 3);
      g.circle(f.x, f.y, c * (0.4 + e * 0.9)).fill({ color: 0xfff3c4, alpha: 0.8 * (1 - p) });
      g.circle(f.x, f.y, c * (0.5 + e * 2.4)).stroke({ width: Math.max(2, c * 0.14 * (1 - p)), color: GOLD, alpha: 0.95 * (1 - p) });
      g.circle(f.x, f.y, c * (0.4 + e * 1.6)).stroke({ width: Math.max(1, c * 0.07 * (1 - p)), color: 0xff7a3d, alpha: 0.7 * (1 - p) });
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const q = this.particles[i];
      q.age += dt;
      if (q.age >= q.life) {
        this.particles.splice(i, 1);
        continue;
      }
      q.vx *= Math.pow(0.15, s);
      q.vy = q.vy * Math.pow(0.15, s) + c * 7 * s;
      q.x += q.vx * s;
      q.y += q.vy * s;
      const k = 1 - q.age / q.life;
      const alpha = Math.min(1, k * 1.6);
      if (q.spark) {
        // 속도 방향으로 꼬리를 그려 불꽃처럼 보이게
        const tail = 0.06;
        g.moveTo(q.x - q.vx * tail, q.y - q.vy * tail).lineTo(q.x, q.y).stroke({ width: q.size * (0.5 + 0.5 * k), color: q.color, alpha: alpha * 0.8, cap: "round" });
        g.circle(q.x, q.y, q.size * (0.5 + 0.5 * k)).fill({ color: 0xffffff, alpha });
      } else {
        g.circle(q.x, q.y, q.size * (0.4 + 0.6 * k)).fill({ color: q.color, alpha });
      }
    }
  }

  // ───────────── 입력 ─────────────

  private toGrid(e: FederatedPointerEvent): Point | null {
    const x = Math.round((e.global.x + this.pan.x) / this.cell) - 1;
    const y = Math.round((e.global.y + this.pan.y) / this.cell) - 1;
    if (x < 0 || y < 0 || x >= N || y >= N) return null;
    return { x, y };
  }

  private onMove(e: FederatedPointerEvent) {
    if (e.type === "pointerdown") this.drag = { gx: e.global.x, gy: e.global.y, px: this.pan.x, py: this.pan.y, moved: false };
    const d = this.drag;
    if (d && (d.moved || Math.hypot(e.global.x - d.gx, e.global.y - d.gy) > DRAG_PX)) {
      d.moved = true;
      this.pan = { x: this.clampPan(d.px - (e.global.x - d.gx), false), y: this.clampPan(d.py - (e.global.y - d.gy), false) };
      this.panTarget = { ...this.pan };
      this.world.position.set(-this.pan.x, -this.pan.y);
      this.setHover(null);
      return;
    }
    if (this.interactiveColor === null) return;
    this.setHover(this.toGrid(e));
  }

  private onUp(e: FederatedPointerEvent) {
    const moved = this.drag?.moved;
    this.drag = null;
    if (moved) {
      this.panTarget = { x: this.clampPan(this.pan.x), y: this.clampPan(this.pan.y) };
      return;
    }
    if (this.interactiveColor === null) return;
    const pt = this.toGrid(e);
    if (e.pointerType !== "mouse") this.setHover(null);
    if (!pt || this.views.has(key(pt.x, pt.y))) return;
    this.opts.onPlace(pt.x, pt.y);
  }

  private setHover(pt: Point | null) {
    this.hover = pt;
    this.refreshGhost();
  }

  private refreshGhost() {
    const color = this.interactiveColor;
    const h = this.hover;
    if (!this.textures || color === null || !h || this.views.has(key(h.x, h.y))) {
      this.ghost.visible = false;
      return;
    }
    const forbidden = this.state.forbidden.some((f) => f.x === h.x && f.y === h.y);
    this.ghost.texture = color === BLACK ? this.textures.black : this.textures.white;
    this.ghost.width = this.ghost.height = this.cell * STONE_RATIO;
    this.ghost.position.set(this.p(h.x), this.p(h.y));
    this.ghost.tint = forbidden ? 0xff7a70 : 0xffffff;
    this.ghost.alpha = forbidden ? 0.3 : 0.55;
    this.ghost.visible = true;
  }

  // ───────────── 애니메이션 ─────────────

  private tween(dur: number, update: (p: number) => void, done?: () => void) {
    this.tweens.push({ t: 0, dur, update, done });
  }

  private after(ms: number, fn: () => void) {
    this.tween(ms, () => {}, fn);
  }

  private tick(dt: number) {
    this.clock += dt;
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      if (!tw) continue;
      tw.t += dt;
      const p = Math.min(1, tw.t / tw.dur);
      tw.update(p);
      if (p >= 1) {
        tw.done?.();
        this.tweens.splice(i, 1);
      }
    }
    this.drawBursts(dt);
    if (!this.drag?.moved && (this.pan.x !== this.panTarget.x || this.pan.y !== this.panTarget.y)) {
      const k = 1 - Math.pow(0.001, dt / 1000);
      const ease = (a: number, b: number) => (Math.abs(b - a) < 0.5 ? b : a + (b - a) * k);
      this.pan = { x: ease(this.pan.x, this.panTarget.x), y: ease(this.pan.y, this.panTarget.y) };
      this.world.position.set(-this.pan.x, -this.pan.y);
    }
    if (this.shake > 0.05) {
      this.app.stage.position.set((Math.random() - 0.5) * 2 * this.shake, (Math.random() - 0.5) * 2 * this.shake);
      this.shake *= Math.pow(0.002, dt / 1000);
    } else if (this.shake) {
      this.shake = 0;
      this.app.stage.position.set(0, 0);
    }
    // 승리선은 떠오른 뒤 천천히 숨 쉬듯 빛난다
    if (this.state.winLine) this.winG.alpha = this.winGlow * (0.78 + Math.sin(this.clock / 260) * 0.22);
    // 마지막 수 표시가 살짝 맥박친다
    this.marker.alpha = 0.75 + Math.sin(this.clock / 300) * 0.25;
  }
}
