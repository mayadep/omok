export const BOARD_SIZE = 15;

export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;

export type Cell = 0 | 1 | 2;
export type Color = 1 | 2;
export type Board = Int8Array;

/** renju: 흑만 3-3, 4-4, 장목(6목 이상) 금지. free: 제한 없음 (5목 이상이면 승리). */
export type Rule = "renju" | "free";

export interface Point {
  x: number;
  y: number;
}

export interface Move extends Point {
  color: Color;
}

/** 가로, 세로, 대각선 두 방향 */
export const DIRECTIONS: readonly (readonly [number, number])[] = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

export const opponent = (color: Color): Color => (color === BLACK ? WHITE : BLACK);
