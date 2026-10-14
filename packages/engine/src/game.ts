import { checkWin, createBoard, idx, inBounds, isForbidden } from "./board";
import { BLACK, BOARD_SIZE, EMPTY, opponent, type Board, type Color, type Move, type Point, type Rule } from "./types";

export type GameStatus = "playing" | "won" | "draw";

export type PlayResult =
  | { ok: true }
  | { ok: false; reason: "out-of-bounds" | "occupied" | "game-over" | "forbidden" };

export class Game {
  readonly rule: Rule;
  readonly board: Board = createBoard();
  readonly moves: Move[] = [];
  turn: Color = BLACK;
  status: GameStatus = "playing";
  winner: Color | 0 = 0;
  /** 승리를 만든 다섯 돌 (승리했을 때만) */
  winLine: Point[] | null = null;

  constructor(rule: Rule = "renju") {
    this.rule = rule;
  }

  get lastMove(): Move | null {
    return this.moves.length ? this.moves[this.moves.length - 1] : null;
  }

  /** 지금 둘 차례인 사람이 둘 수 없는 칸인가? (렌주룰의 흑 금수) */
  isForbiddenFor(color: Color, x: number, y: number): boolean {
    return this.rule === "renju" && color === BLACK && isForbidden(this.board, x, y);
  }

  /** 현재 차례의 금수 위치 목록 (화면 표시용) */
  forbiddenPoints(): Point[] {
    if (this.status !== "playing" || this.rule !== "renju" || this.turn !== BLACK) return [];
    const result: Point[] = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (this.board[idx(x, y)] === EMPTY && isForbidden(this.board, x, y)) result.push({ x, y });
      }
    }
    return result;
  }

  play(x: number, y: number): PlayResult {
    if (this.status !== "playing") return { ok: false, reason: "game-over" };
    if (!inBounds(x, y)) return { ok: false, reason: "out-of-bounds" };
    if (this.board[idx(x, y)] !== EMPTY) return { ok: false, reason: "occupied" };
    if (this.isForbiddenFor(this.turn, x, y)) return { ok: false, reason: "forbidden" };

    const color = this.turn;
    this.board[idx(x, y)] = color;
    this.moves.push({ x, y, color });

    const line = checkWin(this.board, x, y, color, this.rule);
    if (line) {
      this.status = "won";
      this.winner = color;
      this.winLine = line;
    } else if (this.moves.length === BOARD_SIZE * BOARD_SIZE) {
      this.status = "draw";
    } else {
      this.turn = opponent(color);
    }
    return { ok: true };
  }

  /** 기권 / 시간 초과 등으로 상대가 이긴 것으로 처리 */
  resign(color: Color): void {
    if (this.status !== "playing") return;
    this.status = "won";
    this.winner = opponent(color);
  }

  /** 마지막 한 수 무르기 */
  undo(): Move | null {
    const move = this.moves.pop();
    if (!move) return null;
    this.board[idx(move.x, move.y)] = EMPTY;
    this.turn = move.color;
    this.status = "playing";
    this.winner = 0;
    this.winLine = null;
    return move;
  }
}
