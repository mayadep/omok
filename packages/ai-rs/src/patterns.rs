//! packages/ai/src/patterns.ts 의 Rust 판. 점수 계산 순서까지 같게 옮겨서 TS와 같은 수를 고른다.

use crate::engine::{idx, opponent, stone_at, Board, BOARD_SIZE, DIRECTIONS, EMPTY};

pub const FIVE_SCORE: f64 = 100_000.0;

#[derive(Clone, Copy, PartialEq)]
enum LineClass {
    Five,
    Four,
    Three,
    Other,
}

/// 연속 길이와 열린 끝의 수로 점수를 매긴다. 양쪽이 막혀 5목을 못 만드는 줄은 0점
fn pattern_score(len: i32, open: i32) -> f64 {
    if len >= 5 {
        return FIVE_SCORE;
    }
    if open == 0 {
        return 0.0;
    }
    let two = open == 2;
    match len {
        4 => if two { 10_000.0 } else { 1_500.0 },
        3 => if two { 1_000.0 } else { 100.0 },
        2 => if two { 100.0 } else { 10.0 },
        _ => if two { 5.0 } else { 1.0 },
    }
}

fn classify(len: i32, open: i32) -> LineClass {
    if len >= 5 {
        LineClass::Five
    } else if len == 4 && open >= 1 {
        LineClass::Four
    } else if len == 3 && open == 2 {
        LineClass::Three
    } else {
        LineClass::Other
    }
}

struct Side {
    n: i32,
    end_x: i32,
    end_y: i32,
    open: bool,
}

/// (x, y)에 color 돌을 둔다고 가정했을 때 한 방향의 가치.
/// 붙어 있는 줄뿐 아니라 한 칸 띄운 줄(XX.XX, X.XXX)도 본다.
fn direction_value(board: &Board, x: i32, y: i32, dx: i32, dy: i32, color: i8) -> (f64, LineClass) {
    // 앞쪽/뒤쪽으로 같은 색이 이어진 개수와, 그 끝 칸
    let scan = |sx: i32, sy: i32| {
        let mut n = 0;
        let mut cx = x + sx;
        let mut cy = y + sy;
        while stone_at(board, cx, cy) == color {
            n += 1;
            cx += sx;
            cy += sy;
        }
        Side { n, end_x: cx, end_y: cy, open: stone_at(board, cx, cy) == EMPTY }
    };
    let fwd = scan(dx, dy);
    let bwd = scan(-dx, -dy);

    let len = 1 + fwd.n + bwd.n;
    let open = fwd.open as i32 + bwd.open as i32;
    let mut best = (pattern_score(len, open), classify(len, open));

    // 한 칸 띄운 줄: 끝 빈 칸 너머에 같은 색이 더 있는 경우
    let mut jump = |side: &Side, sx: i32, sy: i32, other_open: bool, other_n: i32| {
        if !side.open {
            return;
        }
        let mut extra = 0;
        let mut cx = side.end_x + sx;
        let mut cy = side.end_y + sy;
        while stone_at(board, cx, cy) == color {
            extra += 1;
            cx += sx;
            cy += sy;
        }
        if extra == 0 {
            return;
        }
        let total = (1 + side.n + other_n + extra).min(4);
        let outer_open = other_open as i32 + (stone_at(board, cx, cy) == EMPTY) as i32;
        let score = pattern_score(total, outer_open) * 0.7;
        if score > best.0 {
            best = (score, classify(total, outer_open.max(1)));
        }
    };
    jump(&fwd, dx, dy, bwd.open, bwd.n);
    jump(&bwd, -dx, -dy, fwd.open, fwd.n);
    best
}

/// (x, y)에 color 돌을 두면 얻는 점수 (빈 칸 전제)
pub fn point_score(board: &Board, x: i32, y: i32, color: i8) -> f64 {
    let mut total = 0.0;
    let mut fours = 0;
    let mut threes = 0;
    for &(dx, dy) in &DIRECTIONS {
        let (score, cls) = direction_value(board, x, y, dx, dy, color);
        total += score;
        match cls {
            LineClass::Four => fours += 1,
            LineClass::Three => threes += 1,
            _ => {}
        }
    }
    if fours >= 2 {
        total += 20_000.0;
    } else if fours >= 1 && threes >= 1 {
        total += 15_000.0;
    } else if threes >= 2 {
        total += 5_000.0;
    }
    total
}

pub struct Heuristic {
    pub attack: f64,
    pub defense: f64,
    pub total: f64,
}

/// 수 정렬용 점수: 내 공격 + 상대 공격을 막는 가치 + 중앙 선호
pub fn move_heuristic(board: &Board, x: i32, y: i32, me: i8) -> Heuristic {
    let attack = point_score(board, x, y, me);
    let defense = point_score(board, x, y, opponent(me));
    let c = (BOARD_SIZE - 1) as f64 / 2.0;
    let center = 7.0 - (x as f64 - c).abs().max((y as f64 - c).abs());
    Heuristic { attack, defense, total: attack + defense * 0.95 + center }
}

/// 판 전체의 정적 평가: color 입장에서 (내 줄 점수 - 상대 줄 점수)
pub fn evaluate(board: &Board, color: i8) -> f64 {
    let mut mine = 0.0;
    let mut theirs = 0.0;
    for &(dx, dy) in &DIRECTIONS {
        for y in 0..BOARD_SIZE {
            for x in 0..BOARD_SIZE {
                let c = board[idx(x, y)];
                if c == EMPTY {
                    continue;
                }
                if stone_at(board, x - dx, y - dy) == c {
                    continue; // 줄의 시작점에서만 센다
                }
                let mut len = 1;
                let mut cx = x + dx;
                let mut cy = y + dy;
                while stone_at(board, cx, cy) == c {
                    len += 1;
                    cx += dx;
                    cy += dy;
                }
                let open = (stone_at(board, x - dx, y - dy) == EMPTY) as i32 + (stone_at(board, cx, cy) == EMPTY) as i32;
                let s = pattern_score(len, open);
                if c == color {
                    mine += s;
                } else {
                    theirs += s;
                }
            }
        }
    }
    mine - theirs * 1.05
}
