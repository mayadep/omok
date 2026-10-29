import { describe, expect, it } from "vitest";
import { AI_LEVELS, findMove } from "@omok/ai";
import { BLACK, createBoard, idx, type Board } from "@omok/engine";
import { frozenClock, loadWasmAi, seeded, selfPlayPosition, type Position } from "./testing";

const wasm = await loadWasmAi();

function place(rows: string[], ox = 3, oy = 3): Board {
  const board = createBoard();
  rows.forEach((row, r) =>
    [...row].forEach((ch, c) => {
      if (ch === "X") board[idx(ox + c, oy + r)] = BLACK;
      if (ch === "O") board[idx(ox + c, oy + r)] = 2;
    }),
  );
  return board;
}

const positions: Position[] = [];
for (let seed = 1; positions.length < 24; seed++) {
  const p = selfPlayPosition(seed, 4 + (seed % 5) * 6, seed % 4 === 0 ? "free" : "renju");
  if (p) positions.push(p);
}

describe("Rust(WASM) AI", () => {
  it("시간 제한이 없으면 모든 난이도에서 TS AI와 같은 수를 둔다", () => {
    for (const level of AI_LEVELS.slice(0, 6)) {
      positions.forEach((p, i) => {
        const ts = findMove(p.board, p.color, p.rule, level, { rng: seeded(i), now: frozenClock });
        const rs = wasm.findMove(p.board, p.color, p.rule, level, { rng: seeded(i), now: frozenClock });
        expect(rs, `${level.name} 국면 ${i}`).toEqual(ts);
      });
    }
  }, 120_000);

  it("넘겨준 판을 바꾸지 않는다", () => {
    const p = positions[5];
    const before = p.board.slice();
    wasm.findMove(p.board, p.color, p.rule, AI_LEVELS[4]);
    expect(p.board).toEqual(before);
  });

  it("바로 이길 수 있으면 이기고, 상대의 4는 막는다", () => {
    expect(wasm.findMove(place(["OXXXX.", "OOO..."], 2, 3), BLACK, "renju", AI_LEVELS[5])).toEqual({ x: 7, y: 3 });
    for (const level of AI_LEVELS) {
      expect(wasm.findMove(place(["XOOOO.", ".XX..."], 2, 3), BLACK, "renju", level)).toEqual({ x: 7, y: 3 });
    }
  });

  it("시간 제한을 지킨다", () => {
    const p = positions.find((q) => q.board.filter((c) => c !== 0).length > 15)!;
    const start = performance.now();
    wasm.findMove(p.board, p.color, p.rule, { ...AI_LEVELS[8], timeMs: 100 });
    expect(performance.now() - start).toBeLessThan(400);
  });
});
