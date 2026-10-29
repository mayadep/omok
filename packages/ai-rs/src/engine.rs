//! packages/engine/src/board.ts 의 Rust 판. AI가 쓰는 규칙(승리, 렌주 금수)만 옮겼다.

pub const BOARD_SIZE: i32 = 15;
pub const CELLS: usize = (BOARD_SIZE * BOARD_SIZE) as usize;

pub const EMPTY: i8 = 0;
pub const BLACK: i8 = 1;
pub const WHITE: i8 = 2;

pub type Board = [i8; CELLS];

/// 가로, 세로, 대각선 두 방향
pub const DIRECTIONS: [(i32, i32); 4] = [(1, 0), (0, 1), (1, 1), (1, -1)];

#[inline]
pub fn idx(x: i32, y: i32) -> usize {
    (y * BOARD_SIZE + x) as usize
}

#[inline]
pub fn in_bounds(x: i32, y: i32) -> bool {
    x >= 0 && y >= 0 && x < BOARD_SIZE && y < BOARD_SIZE
}

/// 좌표의 돌. 판 밖은 -1(벽)
#[inline]
pub fn stone_at(board: &Board, x: i32, y: i32) -> i8 {
    if in_bounds(x, y) {
        board[idx(x, y)]
    } else {
        -1
    }
}

#[inline]
pub fn opponent(color: i8) -> i8 {
    if color == BLACK {
        WHITE
    } else {
        BLACK
    }
}

/// (x, y)를 지나는 같은 색 연속 구간의 offset 범위 (start, end). (x, y)는 offset 0
fn run_extent(board: &Board, x: i32, y: i32, dx: i32, dy: i32, color: i8) -> (i32, i32) {
    let mut start = 0;
    let mut end = 0;
    while stone_at(board, x + (start - 1) * dx, y + (start - 1) * dy) == color {
        start -= 1;
    }
    while stone_at(board, x + (end + 1) * dx, y + (end + 1) * dy) == color {
        end += 1;
    }
    (start, end)
}

/// (x, y)에 color 돌이 놓인 상태에서, 한 방향의 연속 길이
pub fn line_length(board: &Board, x: i32, y: i32, dx: i32, dy: i32, color: i8) -> i32 {
    let (start, end) = run_extent(board, x, y, dx, dy, color);
    end - start + 1
}

/// 방금 (x, y)에 둔 color 돌로 승리했는지. 렌주룰의 흑은 정확히 5목일 때만 승리
pub fn check_win(board: &Board, x: i32, y: i32, color: i8, renju: bool) -> bool {
    let exact_only = renju && color == BLACK;
    DIRECTIONS.iter().any(|&(dx, dy)| {
        let len = line_length(board, x, y, dx, dy, color);
        if exact_only {
            len == 5
        } else {
            len >= 5
        }
    })
}

// ───────────────────────── 렌주룰 금수 판정 ─────────────────────────

/// 원점에 흑이 놓여 있을 때, 한 방향에서 두면 원점을 포함한 정확히 5목이 되는 빈 칸들의 offset
fn five_completions(board: &mut Board, ox: i32, oy: i32, dx: i32, dy: i32) -> ([i32; 9], usize) {
    let mut result = [0; 9];
    let mut n = 0;
    for t in -4..=4 {
        let qx = ox + t * dx;
        let qy = oy + t * dy;
        if stone_at(board, qx, qy) != EMPTY {
            continue;
        }
        board[idx(qx, qy)] = BLACK;
        let (start, end) = run_extent(board, qx, qy, dx, dy, BLACK);
        board[idx(qx, qy)] = EMPTY;
        // 원점이 같은 구간에 있어야 한다 (원점의 offset은 -t)
        if end - start + 1 == 5 && start <= -t && -t <= end {
            result[n] = t;
            n += 1;
        }
    }
    (result, n)
}

/// 한 방향이 만드는 4의 개수. 열린 4는 1개, 한 줄에 서로 다른 4가 둘이면 2개
fn count_fours(board: &mut Board, ox: i32, oy: i32, dx: i32, dy: i32) -> i32 {
    let (c, n) = five_completions(board, ox, oy, dx, dy);
    match n {
        0 => 0,
        1 => 1,
        2 if c[1] - c[0] == 5 => 1,
        _ => 2,
    }
}

/// 한 방향에 열린 3(한 수 더 두면 열린 4가 되는 3)이 있는지
fn has_open_three(board: &mut Board, ox: i32, oy: i32, dx: i32, dy: i32, depth: i32) -> bool {
    for t in -4..=4 {
        let qx = ox + t * dx;
        let qy = oy + t * dy;
        if stone_at(board, qx, qy) != EMPTY {
            continue;
        }
        board[idx(qx, qy)] = BLACK;
        let mut open = false;
        let (c, n) = five_completions(board, ox, oy, dx, dy);
        if n == 2 && c[1] - c[0] == 5 {
            // 열린 4를 만드는 그 수 자체가 금수라면 진짜 3이 아니다
            open = !forbidden_core(board, qx, qy, depth + 1);
        }
        board[idx(qx, qy)] = EMPTY;
        if open {
            return true;
        }
    }
    false
}

/// (x, y)에 흑이 이미 놓인 상태에서 금수인지 판정
fn forbidden_core(board: &mut Board, x: i32, y: i32, depth: i32) -> bool {
    let mut overline = false;
    for &(dx, dy) in &DIRECTIONS {
        let len = line_length(board, x, y, dx, dy, BLACK);
        if len == 5 {
            return false; // 정확히 5목이면 금수보다 승리가 우선
        }
        if len > 5 {
            overline = true;
        }
    }
    if overline {
        return true;
    }

    let mut fours = 0;
    for &(dx, dy) in &DIRECTIONS {
        fours += count_fours(board, x, y, dx, dy);
    }
    if fours >= 2 {
        return true; // 4-4
    }
    if fours == 1 || depth >= 3 {
        return false; // 4-3은 허용
    }

    let mut threes = 0;
    for &(dx, dy) in &DIRECTIONS {
        if has_open_three(board, x, y, dx, dy, depth) {
            threes += 1;
        }
    }
    threes >= 2 // 3-3
}

/// 흑이 (x, y)에 두면 금수(3-3, 4-4, 장목)인가? 빈 칸에 대해서만 의미가 있다.
pub fn is_forbidden(board: &mut Board, x: i32, y: i32) -> bool {
    if stone_at(board, x, y) != EMPTY {
        return false;
    }

    // 빠른 걸러내기: 금수는 최소 두 방향에 이웃 돌이 있어야 하고, 장목은 한 방향에 4개 이상 필요
    let mut busy_dirs = 0;
    let mut long_line = false;
    for &(dx, dy) in &DIRECTIONS {
        let mut others = 0;
        for t in -4..=4 {
            if t != 0 && stone_at(board, x + t * dx, y + t * dy) == BLACK {
                others += 1;
            }
        }
        if others >= 2 {
            busy_dirs += 1;
        }
        if others >= 4 {
            long_line = true;
        }
    }
    if busy_dirs < 2 && !long_line {
        return false;
    }

    board[idx(x, y)] = BLACK;
    let result = forbidden_core(board, x, y, 0);
    board[idx(x, y)] = EMPTY;
    result
}
