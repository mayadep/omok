import { describe, expect, it } from "vitest";
import { BLACK, WHITE, Game, createBoard, idx, type Board } from "@omok/engine";
import { AI_LEVELS, findMove, levelForRating } from "./index";

function place(rows: string[], ox = 3, oy = 3): Board {
  const board = createBoard();
  rows.forEach((row, r) =>
    [...row].forEach((ch, c) => {
      if (ch === "X") board[idx(ox + c, oy + r)] = BLACK;
      if (ch === "O") board[idx(ox + c, oy + r)] = WHITE;
    }),
  );
  return board;
}

const strong = AI_LEVELS[5];
const seeded = () => {
  let s = 12345;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
};

describe("AI", () => {
  it("빈 판에서는 천원(가운데)에 둔다", () => {
    expect(findMove(createBoard(), BLACK, "renju", strong)).toEqual({ x: 7, y: 7 });
  });

  it("바로 이길 수 있으면 이긴다", () => {
    const b = place(["OXXXX.", "OOO..."], 2, 3); // 왼쪽이 막힌 흑 4목: 오른쪽 끝(7,3)만 5목
    expect(findMove(b, BLACK, "renju", strong, { rng: seeded() })).toEqual({ x: 7, y: 3 });
  });

  it("상대의 4를 막는다", () => {
    const b = place(["XOOOO.", ".XX..."], 2, 3); // 왼쪽이 막힌 백 4목: 오른쪽 끝(7,3)을 막아야 한다
    for (const level of AI_LEVELS) {
      expect(findMove(b, BLACK, "renju", level, { rng: seeded() })).toEqual({ x: 7, y: 3 });
    }
  });

  it("열린 3을 그냥 두지 않는다 (열린 4를 막을 수 없게 되므로)", () => {
    const b = place(["...", ".OOO.", "....", "X.X.."], 3, 3);
    const m = findMove(b, BLACK, "renju", AI_LEVELS[5], { rng: seeded() });
    // 가로로 이어진 백 3목의 양 끝 중 하나를 막아야 한다
    expect([`${m.x},${m.y}`]).toSatisfy(([k]: string[]) => k === "3,4" || k === "7,4" || k === "8,4" || k === "2,4");
  });

  it("흑 AI는 금수 자리에 두지 않는다", () => {
    const b = place(["...X", "...X", "...X", "XXX."]);
    for (let seed = 1; seed <= 3; seed++) {
      const m = findMove(b, BLACK, "renju", AI_LEVELS[3], { rng: seeded() });
      expect(m).not.toEqual({ x: 6, y: 6 });
    }
  });

  it("두 AI끼리 끝까지 둘 수 있고 규칙을 어기지 않는다", () => {
    const game = new Game("renju");
    const fast = { ...AI_LEVELS[3], timeMs: 150 };
    const rng = seeded();
    let guard = 0;
    while (game.status === "playing" && guard++ < 225) {
      const m = findMove(game.board, game.turn, game.rule, fast, { rng });
      expect(game.play(m.x, m.y)).toEqual({ ok: true });
    }
    expect(game.moves.length).toBeGreaterThan(9);
  }, 60_000);

  it("강한 AI가 약한 AI를 이긴다", () => {
    const weak = { ...AI_LEVELS[0], timeMs: 100 };
    const hard = { ...AI_LEVELS[4], timeMs: 200 };
    let hardWins = 0;
    for (const hardIsBlack of [true, false]) {
      const game = new Game("renju");
      const rng = seeded();
      while (game.status === "playing") {
        const isHardTurn = (game.turn === BLACK) === hardIsBlack;
        const m = findMove(game.board, game.turn, game.rule, isHardTurn ? hard : weak, { rng });
        game.play(m.x, m.y);
      }
      if (game.winner === (hardIsBlack ? BLACK : WHITE)) hardWins++;
    }
    expect(hardWins).toBe(2);
  }, 120_000);

  it("레이팅에 따라 난이도가 올라간다", () => {
    expect(levelForRating(500).id).toBe(0);
    expect(levelForRating(1200).id).toBe(2);
    expect(levelForRating(2800).id).toBe(7);
    expect(levelForRating(5000).id).toBe(8);
  });
});
