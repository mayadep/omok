import { BOARD_SIZE, type Board, type Color, type Point, type Rule } from "@omok/engine";
import type { AiLevel, FindMoveOptions } from "@omok/ai";

/** src/lib.rs 의 wasm 모듈이 내보내는 것 */
interface Exports {
  memory: WebAssembly.Memory;
  board_ptr(): number;
  find_move(color: number, renju: number, depth: number, width: number, timeMs: number, blunder: number, noise: number): number;
  last_depth(): number;
  last_nodes(): number;
}

export interface WasmAi {
  /** @omok/ai 의 findMove 와 같은 동작 (같은 rng, now면 같은 수를 고른다) */
  findMove(board: Board, color: Color, rule: Rule, level: AiLevel, options?: FindMoveOptions): Point;
  /** 마지막 탐색에서 끝까지 본 깊이와 방문한 노드 수 */
  lastStats(): { depth: number; nodes: number };
}

/** omok_ai.wasm 의 바이트로 Rust AI를 만든다 */
export async function createWasmAi(bytes: BufferSource): Promise<WasmAi> {
  // wasm이 부르는 시계와 난수. findMove 호출마다 options 값으로 바꿔 끼운다
  let rng = Math.random;
  let now = () => Date.now();
  const { instance } = await WebAssembly.instantiate(bytes, {
    env: { now: () => now(), random: () => rng() },
  });
  const ex = instance.exports as unknown as Exports;

  return {
    findMove(board, color, rule, level, options = {}) {
      rng = options.rng ?? Math.random;
      now = options.now ?? (() => Date.now());
      new Int8Array(ex.memory.buffer, ex.board_ptr(), BOARD_SIZE * BOARD_SIZE).set(board);
      const i = ex.find_move(color, rule === "renju" ? 1 : 0, level.depth, level.width, level.timeMs, level.blunder, level.noise);
      return { x: i % BOARD_SIZE, y: Math.floor(i / BOARD_SIZE) };
    },
    lastStats: () => ({ depth: ex.last_depth(), nodes: ex.last_nodes() }),
  };
}
