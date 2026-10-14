import { BOARD_SIZE, DIRECTIONS, EMPTY, idx, stoneAt, type Board, type Color } from "@omok/engine";
import { opponent } from "@omok/engine";

export const FIVE_SCORE = 100_000;

type LineClass = "five" | "four" | "three" | "other";

/** 연속 길이와 열린 끝의 수로 점수를 매긴다. 양쪽이 막혀 5목을 못 만드는 줄은 0점 */
function patternScore(len: number, open: number): number {
  if (len >= 5) return FIVE_SCORE;
  if (open === 0) return 0;
  switch (len) {
    case 4:
      return open === 2 ? 10_000 : 1_500;
    case 3:
      return open === 2 ? 1_000 : 100;
    case 2:
      return open === 2 ? 100 : 10;
    default:
      return open === 2 ? 5 : 1;
  }
}

function classify(len: number, open: number): LineClass {
  if (len >= 5) return "five";
  if (len === 4 && open >= 1) return "four";
  if (len === 3 && open === 2) return "three";
  return "other";
}

interface DirResult {
  score: number;
  cls: LineClass;
}

/**
 * (x, y)에 color 돌을 둔다고 가정했을 때 한 방향의 가치.
 * 붙어 있는 줄뿐 아니라 한 칸 띄운 줄(XX.XX, X.XXX)도 본다.
 */
function directionValue(board: Board, x: number, y: number, dx: number, dy: number, color: Color): DirResult {
  // 앞쪽/뒤쪽으로 같은 색이 이어진 개수와, 그 끝 칸
  const scan = (sx: number, sy: number) => {
    let n = 0;
    let cx = x + sx;
    let cy = y + sy;
    while (stoneAt(board, cx, cy) === color) {
      n++;
      cx += sx;
      cy += sy;
    }
    return { n, endX: cx, endY: cy, open: stoneAt(board, cx, cy) === EMPTY };
  };
  const fwd = scan(dx, dy);
  const bwd = scan(-dx, -dy);

  const len = 1 + fwd.n + bwd.n;
  const open = (fwd.open ? 1 : 0) + (bwd.open ? 1 : 0);
  let best: DirResult = { score: patternScore(len, open), cls: classify(len, open) };

  // 한 칸 띄운 줄: 끝 빈 칸 너머에 같은 색이 더 있는 경우
  const jump = (side: typeof fwd, sx: number, sy: number, otherOpen: boolean, otherN: number) => {
    if (!side.open) return;
    let extra = 0;
    let cx = side.endX + sx;
    let cy = side.endY + sy;
    while (stoneAt(board, cx, cy) === color) {
      extra++;
      cx += sx;
      cy += sy;
    }
    if (extra === 0) return;
    const total = Math.min(1 + side.n + otherN + extra, 4);
    const outerOpen = (otherOpen ? 1 : 0) + (stoneAt(board, cx, cy) === EMPTY ? 1 : 0);
    const score = patternScore(total, outerOpen) * 0.7;
    if (score > best.score) best = { score, cls: classify(total, Math.max(outerOpen, 1)) };
  };
  jump(fwd, dx, dy, bwd.open, bwd.n);
  jump(bwd, -dx, -dy, fwd.open, fwd.n);
  return best;
}

/** (x, y)에 color 돌을 두면 얻는 점수 (빈 칸 전제) */
export function pointScore(board: Board, x: number, y: number, color: Color): number {
  let total = 0;
  let fours = 0;
  let threes = 0;
  for (const [dx, dy] of DIRECTIONS) {
    const { score, cls } = directionValue(board, x, y, dx, dy, color);
    total += score;
    if (cls === "four") fours++;
    else if (cls === "three") threes++;
  }
  if (fours >= 2) total += 20_000;
  else if (fours >= 1 && threes >= 1) total += 15_000;
  else if (threes >= 2) total += 5_000;
  return total;
}

/** 수 정렬용 점수: 내 공격 + 상대 공격을 막는 가치 + 중앙 선호 */
export function moveHeuristic(board: Board, x: number, y: number, me: Color): { attack: number; defense: number; total: number } {
  const attack = pointScore(board, x, y, me);
  const defense = pointScore(board, x, y, opponent(me));
  const c = (BOARD_SIZE - 1) / 2;
  const center = 7 - Math.max(Math.abs(x - c), Math.abs(y - c));
  return { attack, defense, total: attack + defense * 0.95 + center };
}

/** 판 전체의 정적 평가: color 입장에서 (내 줄 점수 - 상대 줄 점수) */
export function evaluate(board: Board, color: Color): number {
  let mine = 0;
  let theirs = 0;
  for (const [dx, dy] of DIRECTIONS) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const c = board[idx(x, y)];
        if (c === EMPTY) continue;
        if (stoneAt(board, x - dx, y - dy) === c) continue; // 줄의 시작점에서만 센다
        let len = 1;
        let cx = x + dx;
        let cy = y + dy;
        while (stoneAt(board, cx, cy) === c) {
          len++;
          cx += dx;
          cy += dy;
        }
        const open = (stoneAt(board, x - dx, y - dy) === EMPTY ? 1 : 0) + (stoneAt(board, cx, cy) === EMPTY ? 1 : 0);
        const s = patternScore(len, open);
        if (c === color) mine += s;
        else theirs += s;
      }
    }
  }
  return mine - theirs * 1.05;
}
