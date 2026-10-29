import { readFileSync } from "node:fs";
import { AI_LEVELS, findMove } from "@omok/ai";
import { Game, type Board, type Color, type Rule } from "@omok/engine";
import { createWasmAi } from "./index";

/** 테스트용: 빌드된 omok_ai.wasm 을 읽어 Rust AI를 만든다 */
export const loadWasmAi = () => createWasmAi(readFileSync(new URL("../omok_ai.wasm", import.meta.url)));

export const seeded = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

/** 시간 제한 없이 끝까지 탐색하게 하는 시계 */
export const frozenClock = () => 0;

export interface Position {
  board: Board;
  color: Color;
  rule: Rule;
}

/** 약한 AI끼리 moves 수만큼 둔 국면 (끝난 대국은 건너뛴다) */
export function selfPlayPosition(seed: number, moves: number, rule: Rule = "renju"): Position | null {
  const game = new Game(rule);
  const rng = seeded(seed);
  const level = AI_LEVELS[0];
  while (game.status === "playing" && game.moves.length < moves) {
    const m = findMove(game.board, game.turn, game.rule, level, { rng, now: frozenClock });
    game.play(m.x, m.y);
  }
  return game.status === "playing" ? { board: game.board.slice(), color: game.turn, rule } : null;
}
