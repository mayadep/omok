import {
  BLACK,
  BOARD_SIZE,
  EMPTY,
  checkWin,
  idx,
  isForbidden,
  opponent,
  stoneAt,
  type Board,
  type Color,
  type Point,
  type Rule,
} from "@omok/engine";
import { FIVE_SCORE, evaluate, moveHeuristic } from "./patterns";
import type { AiLevel } from "./levels";

const WIN = 10_000_000;

class TimeUp extends Error {}

interface Ctx {
  rule: Rule;
  width: number;
  deadline: number;
  nodes: number;
  now: () => number;
}

/** 돌 주변 2칸 안의 빈 칸 */
function nearbyEmpty(board: Board): Point[] {
  const seen = new Uint8Array(BOARD_SIZE * BOARD_SIZE);
  const result: Point[] = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[idx(x, y)] === EMPTY) continue;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (stoneAt(board, nx, ny) !== EMPTY || seen[idx(nx, ny)]) continue;
          seen[idx(nx, ny)] = 1;
          result.push({ x: nx, y: ny });
        }
      }
    }
  }
  return result;
}

const isBlackRenju = (color: Color, rule: Rule) => color === BLACK && rule === "renju";

/**
 * 후보 수를 점수순으로 정렬해 돌려준다.
 * 바로 이길 수 있으면 그 수만, 상대가 바로 이기는 자리가 있으면 그 자리들만 돌려준다.
 */
function candidates(board: Board, color: Color, ctx: Ctx, limit = ctx.width): Point[] {
  const cells = nearbyEmpty(board);
  if (cells.length === 0) return [{ x: (BOARD_SIZE - 1) >> 1, y: (BOARD_SIZE - 1) >> 1 }];

  const scored: { p: Point; total: number; attack: number; defense: number }[] = [];
  for (const p of cells) {
    if (isBlackRenju(color, ctx.rule) && isForbidden(board, p.x, p.y)) continue;
    const h = moveHeuristic(board, p.x, p.y, color);
    scored.push({ p, ...h });
  }
  scored.sort((a, b) => b.total - a.total);

  const win = scored.find((s) => s.attack >= FIVE_SCORE);
  if (win) return [win.p];
  const blocks = scored.filter((s) => s.defense >= FIVE_SCORE);
  if (blocks.length) return blocks.map((s) => s.p);
  return scored.slice(0, limit).map((s) => s.p);
}

function negamax(board: Board, color: Color, depth: number, alpha: number, beta: number, ply: number, ctx: Ctx): number {
  if ((++ctx.nodes & 127) === 0 && ctx.now() > ctx.deadline) throw new TimeUp();
  if (depth === 0) return evaluate(board, color);

  const moves = candidates(board, color, ctx);
  if (moves.length === 0) return evaluate(board, color);

  let best = -Infinity;
  for (const m of moves) {
    board[idx(m.x, m.y)] = color;
    let score: number;
    if (checkWin(board, m.x, m.y, color, ctx.rule)) score = WIN - ply;
    else score = -negamax(board, opponent(color), depth - 1, -beta, -alpha, ply + 1, ctx);
    board[idx(m.x, m.y)] = EMPTY;

    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

export interface FindMoveOptions {
  rng?: () => number;
  now?: () => number;
}

/** color가 둘 다음 수를 고른다. board는 건드리지 않는다. */
export function findMove(boardIn: Board, color: Color, rule: Rule, level: AiLevel, options: FindMoveOptions = {}): Point {
  const rng = options.rng ?? Math.random;
  const now = options.now ?? (() => Date.now());
  const board = boardIn.slice();
  const ctx: Ctx = { rule, width: level.width, deadline: now() + level.timeMs, nodes: 0, now };

  const stones = board.reduce((n, c) => n + (c === EMPTY ? 0 : 1), 0);
  const center = (BOARD_SIZE - 1) >> 1;
  if (stones === 0) return { x: center, y: center };

  const roots = candidates(board, color, ctx, Math.max(level.width, 8));
  if (roots.length === 1) return roots[0];

  // 깊이를 1부터 늘려가며 탐색. 시간이 끝나면 마지막으로 끝낸 깊이의 결과를 쓴다.
  let scores: { p: Point; score: number }[] = roots.map((p) => ({ p, score: 0 }));
  for (let depth = 1; depth <= level.depth; depth++) {
    try {
      const current: { p: Point; score: number }[] = [];
      for (const p of roots) {
        board[idx(p.x, p.y)] = color;
        const score = checkWin(board, p.x, p.y, color, rule)
          ? WIN
          : -negamax(board, opponent(color), depth - 1, -Infinity, Infinity, 1, ctx);
        board[idx(p.x, p.y)] = EMPTY;
        current.push({ p, score });
      }
      scores = current;
      // 이기는 수를 찾았으면 더 볼 필요 없다
      if (scores.some((s) => s.score >= WIN / 2)) break;
    } catch (e) {
      if (e instanceof TimeUp) break;
      throw e;
    }
  }

  const noisy = scores.map((s) => ({ ...s, score: s.score + (rng() - 0.5) * 2 * level.noise }));
  noisy.sort((a, b) => b.score - a.score);

  // 약한 단계에서는 가끔 차선 수를 둔다. 이기는 수나 막아야 하는 수가 있으면 실수하지 않는다.
  const mustPlay = noisy[0].score >= WIN / 2 || noisy[0].score - (noisy[1]?.score ?? -Infinity) > 50_000;
  if (!mustPlay && rng() < level.blunder) {
    const pool = noisy.slice(0, Math.min(4, noisy.length));
    return pool[Math.floor(rng() * pool.length)].p;
  }
  return noisy[0].p;
}
