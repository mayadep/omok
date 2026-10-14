import { BLACK, BOARD_SIZE, DIRECTIONS, EMPTY, type Board, type Color, type Point, type Rule } from "./types";

export const idx = (x: number, y: number): number => y * BOARD_SIZE + x;

export const inBounds = (x: number, y: number): boolean =>
  x >= 0 && y >= 0 && x < BOARD_SIZE && y < BOARD_SIZE;

export const createBoard = (): Board => new Int8Array(BOARD_SIZE * BOARD_SIZE);

/** 좌표의 돌. 판 밖은 -1(벽) */
export const stoneAt = (board: Board, x: number, y: number): number =>
  inBounds(x, y) ? board[idx(x, y)] : -1;

/** (x, y)를 지나는 같은 색 연속 구간의 offset 범위 [start, end]. (x, y)는 offset 0 */
function runExtent(board: Board, x: number, y: number, dx: number, dy: number, color: Color) {
  let start = 0;
  let end = 0;
  while (stoneAt(board, x + (start - 1) * dx, y + (start - 1) * dy) === color) start--;
  while (stoneAt(board, x + (end + 1) * dx, y + (end + 1) * dy) === color) end++;
  return { start, end };
}

/** (x, y)에 color 돌이 놓인 상태에서, 한 방향의 연속 길이 */
export function lineLength(board: Board, x: number, y: number, dx: number, dy: number, color: Color): number {
  const { start, end } = runExtent(board, x, y, dx, dy, color);
  return end - start + 1;
}

/**
 * 방금 (x, y)에 둔 color 돌로 승리했는지 확인하고, 이겼다면 승리를 만든 돌들을 돌려준다.
 * 렌주룰의 흑은 정확히 5목일 때만 승리 (6목 이상은 장목 금수).
 */
export function checkWin(board: Board, x: number, y: number, color: Color, rule: Rule): Point[] | null {
  const exactOnly = rule === "renju" && color === BLACK;
  for (const [dx, dy] of DIRECTIONS) {
    const { start, end } = runExtent(board, x, y, dx, dy, color);
    const len = end - start + 1;
    if (exactOnly ? len === 5 : len >= 5) {
      const line: Point[] = [];
      for (let t = start; t <= end; t++) line.push({ x: x + t * dx, y: y + t * dy });
      return line;
    }
  }
  return null;
}

// ───────────────────────── 렌주룰 금수 판정 ─────────────────────────

/**
 * 원점(ox, oy)에 흑이 놓여 있을 때, 한 방향에서 "여기 두면 원점을 포함한 정확히 5목이 되는" 빈 칸들.
 * 즉 이 방향의 4(사)를 이루는 완성 지점.
 */
function fiveCompletions(board: Board, ox: number, oy: number, dx: number, dy: number): number[] {
  const result: number[] = [];
  for (let t = -4; t <= 4; t++) {
    const qx = ox + t * dx;
    const qy = oy + t * dy;
    if (stoneAt(board, qx, qy) !== EMPTY) continue;
    board[idx(qx, qy)] = BLACK;
    const { start, end } = runExtent(board, qx, qy, dx, dy, BLACK);
    board[idx(qx, qy)] = EMPTY;
    // 원점이 같은 구간에 있어야 한다 (원점의 offset은 -t)
    if (end - start + 1 === 5 && start <= -t && -t <= end) result.push(t);
  }
  return result;
}

/** 한 방향이 만드는 4의 개수. 열린 4(양쪽 완성)는 1개, 한 줄에 서로 다른 4가 둘이면 2개 */
function countFours(board: Board, ox: number, oy: number, dx: number, dy: number): number {
  const c = fiveCompletions(board, ox, oy, dx, dy);
  if (c.length === 0) return 0;
  if (c.length === 1) return 1;
  if (c.length === 2 && c[1] - c[0] === 5) return 1;
  return 2;
}

/** 한 방향에 열린 3(한 수 더 두면 열린 4가 되는 3)이 있는지 */
function hasOpenThree(board: Board, ox: number, oy: number, dx: number, dy: number, depth: number): boolean {
  for (let t = -4; t <= 4; t++) {
    const qx = ox + t * dx;
    const qy = oy + t * dy;
    if (stoneAt(board, qx, qy) !== EMPTY) continue;
    board[idx(qx, qy)] = BLACK;
    let open = false;
    const c = fiveCompletions(board, ox, oy, dx, dy);
    if (c.length === 2 && c[1] - c[0] === 5) {
      // 열린 4를 만드는 그 수 자체가 금수라면 진짜 3이 아니다
      open = !forbiddenCore(board, qx, qy, depth + 1);
    }
    board[idx(qx, qy)] = EMPTY;
    if (open) return true;
  }
  return false;
}

/** (x, y)에 흑이 이미 놓인 상태에서 금수인지 판정 */
function forbiddenCore(board: Board, x: number, y: number, depth: number): boolean {
  let overline = false;
  for (const [dx, dy] of DIRECTIONS) {
    const len = lineLength(board, x, y, dx, dy, BLACK);
    if (len === 5) return false; // 정확히 5목이면 금수보다 승리가 우선
    if (len > 5) overline = true;
  }
  if (overline) return true;

  let fours = 0;
  for (const [dx, dy] of DIRECTIONS) fours += countFours(board, x, y, dx, dy);
  if (fours >= 2) return true; // 4-4
  if (fours === 1 || depth >= 3) return false; // 4-3은 허용

  let threes = 0;
  for (const [dx, dy] of DIRECTIONS) if (hasOpenThree(board, x, y, dx, dy, depth)) threes++;
  return threes >= 2; // 3-3
}

/** 흑이 (x, y)에 두면 금수(3-3, 4-4, 장목)인가? 빈 칸에 대해서만 의미가 있다. */
export function isForbidden(board: Board, x: number, y: number): boolean {
  if (stoneAt(board, x, y) !== EMPTY) return false;

  // 빠른 걸러내기: 금수는 최소 두 방향에 이웃 돌이 있어야 하고, 장목은 한 방향에 4개 이상 필요
  let busyDirs = 0;
  let longLine = false;
  for (const [dx, dy] of DIRECTIONS) {
    let others = 0;
    for (let t = -4; t <= 4; t++) {
      if (t !== 0 && stoneAt(board, x + t * dx, y + t * dy) === BLACK) others++;
    }
    if (others >= 2) busyDirs++;
    if (others >= 4) longLine = true;
  }
  if (busyDirs < 2 && !longLine) return false;

  board[idx(x, y)] = BLACK;
  const result = forbiddenCore(board, x, y, 0);
  board[idx(x, y)] = EMPTY;
  return result;
}
