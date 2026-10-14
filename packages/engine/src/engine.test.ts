import { describe, expect, it } from "vitest";
import { BLACK, WHITE, Game, checkWin, createBoard, idx, isForbidden, type Board } from "./index";

/** 'X' 흑, 'O' 백, '.' 빈 칸. 판의 왼쪽 위에서 (ox, oy)만큼 떨어진 곳에 배치 */
function place(rows: string[], ox = 3, oy = 3): Board {
  const board = createBoard();
  rows.forEach((row, r) => {
    [...row].forEach((ch, c) => {
      if (ch === "X") board[idx(ox + c, oy + r)] = BLACK;
      if (ch === "O") board[idx(ox + c, oy + r)] = WHITE;
    });
  });
  return board;
}

describe("승리 판정", () => {
  it("가로 5목", () => {
    const g = new Game("renju");
    for (let i = 0; i < 4; i++) {
      g.play(i, 0); // 흑
      g.play(i, 5); // 백
    }
    g.play(4, 0);
    expect(g.status).toBe("won");
    expect(g.winner).toBe(BLACK);
    expect(g.winLine).toHaveLength(5);
  });

  it("대각선 5목", () => {
    const b = place(["X....", ".X...", "..X..", "...X.", "....X"]);
    expect(checkWin(b, 7, 7, BLACK, "renju")).not.toBeNull();
  });

  it("렌주룰에서 흑 6목은 승리가 아니다", () => {
    const b = place(["XXXXXX"]);
    expect(checkWin(b, 5, 3, BLACK, "renju")).toBeNull();
    expect(checkWin(b, 5, 3, BLACK, "free")).not.toBeNull();
  });

  it("백은 6목도 승리", () => {
    const b = place(["OOOOOO"]);
    expect(checkWin(b, 5, 3, WHITE, "renju")).not.toBeNull();
  });

  it("차례가 번갈아 간다 / 이미 둔 곳은 둘 수 없다", () => {
    const g = new Game();
    expect(g.play(7, 7)).toEqual({ ok: true });
    expect(g.turn).toBe(WHITE);
    expect(g.play(7, 7)).toEqual({ ok: false, reason: "occupied" });
    expect(g.play(-1, 0)).toEqual({ ok: false, reason: "out-of-bounds" });
  });

  it("무르기", () => {
    const g = new Game();
    g.play(7, 7);
    g.play(8, 8);
    g.undo();
    expect(g.turn).toBe(WHITE);
    expect(g.board[idx(8, 8)]).toBe(0);
  });
});

describe("렌주룰 금수 (흑)", () => {
  it("장목(6목)은 금수", () => {
    const b = place(["XX.XXX"]);
    expect(isForbidden(b, 5, 3)).toBe(true);
  });

  it("정확히 5목이 되면 금수가 아니다", () => {
    const b = place(["XXXX."]);
    expect(isForbidden(b, 7, 3)).toBe(false);
  });

  it("3-3은 금수 (가로 3 + 한 칸 띄운 세로 3)", () => {
    const b = place([
      "..X..",
      "..X..",
      ".....",
      "XX...",
    ]);
    expect(isForbidden(b, 5, 6)).toBe(true);
  });

  it("3 하나만 만들면 금수가 아니다", () => {
    const b = place(["XX...", "....."]);
    expect(isForbidden(b, 5, 3)).toBe(false);
  });

  it("4-4는 금수", () => {
    const b = place([
      "...X",
      "...X",
      "...X",
      "XXX.",
    ]);
    expect(isForbidden(b, 6, 6)).toBe(true);
  });

  it("한 줄에 두 개의 4가 생기는 4-4도 금수 (X.XXX.X 꼴)", () => {
    const b = place(["X.X.X.X"]);
    expect(isForbidden(b, 6, 3)).toBe(true); // 가운데에 두면 X.XXX.X
  });

  it("4-3은 허용", () => {
    const b = place([
      "...X",
      "...X",
      "....",
      "XXX.",
    ]);
    expect(isForbidden(b, 6, 6)).toBe(false);
  });

  it("백에 막힌 3은 3으로 세지 않는다", () => {
    const b = place([
      "..X..",
      "..X..",
      ".....",
      "OXX..",
    ]);
    expect(isForbidden(b, 5, 6)).toBe(false);
  });

  it("게임에서 흑은 금수 칸에 둘 수 없고, 백은 둘 수 있다", () => {
    const g = new Game("renju");
    g.board.set(place(["...X", "...X", "...X", "XXX."]));
    g.turn = BLACK;
    expect(g.forbiddenPoints()).toContainEqual({ x: 6, y: 6 });
    expect(g.play(6, 6)).toEqual({ ok: false, reason: "forbidden" });
    expect(g.turn).toBe(BLACK);

    g.turn = WHITE;
    expect(g.play(6, 6)).toEqual({ ok: true });
  });

  it("free 룰에서는 금수가 없다", () => {
    const g = new Game("free");
    g.board.set(place(["...X", "...X", "...X", "XXX."]));
    expect(g.forbiddenPoints()).toEqual([]);
    expect(g.play(6, 6)).toEqual({ ok: true });
  });
});
