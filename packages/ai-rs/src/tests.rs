//! engine.test.ts, ai.test.ts 의 핵심 사례를 Rust 쪽에서도 확인한다.
//! TS와 같은 수를 두는지는 src/parity.test.ts 가 확인한다.

use crate::engine::*;
use crate::search::{find_move, Level, Stats};

/// 'X' 흑, 'O' 백, '.' 빈 칸. 판의 왼쪽 위에서 (ox, oy)만큼 떨어진 곳에 배치
fn place(rows: &[&str], ox: i32, oy: i32) -> Board {
    let mut board = [EMPTY; CELLS];
    for (r, row) in rows.iter().enumerate() {
        for (c, ch) in row.chars().enumerate() {
            let i = idx(ox + c as i32, oy + r as i32);
            match ch {
                'X' => board[i] = BLACK,
                'O' => board[i] = WHITE,
                _ => {}
            }
        }
    }
    board
}

fn strong() -> Level {
    Level { depth: 4, width: 10, time_ms: 1500.0, blunder: 0.0, noise: 5.0 }
}

fn play(board: &Board, color: i8, level: &Level) -> (i32, i32) {
    let start = std::time::Instant::now();
    let mut seed: u32 = 12345;
    let mut rng = move || {
        seed = seed.wrapping_mul(1664525).wrapping_add(1013904223);
        seed as f64 / 4294967296.0
    };
    let mut now = move || start.elapsed().as_secs_f64() * 1000.0;
    find_move(board, color, true, level, &mut rng, &mut now, &mut Stats::default())
}

#[test]
fn renju_six_is_not_a_win_for_black() {
    let b = place(&["XXXXXX"], 3, 3);
    assert!(!check_win(&b, 5, 3, BLACK, true));
    assert!(check_win(&b, 5, 3, BLACK, false));
}

#[test]
fn forbidden_moves() {
    assert!(is_forbidden(&mut place(&["XX.XXX"], 3, 3), 5, 3), "장목");
    assert!(!is_forbidden(&mut place(&["XXXX."], 3, 3), 7, 3), "정확히 5목");
    assert!(is_forbidden(&mut place(&["..X..", "..X..", ".....", "XX..."], 3, 3), 5, 6), "3-3");
    assert!(is_forbidden(&mut place(&["...X", "...X", "...X", "XXX."], 3, 3), 6, 6), "4-4");
    assert!(is_forbidden(&mut place(&["X.X.X.X"], 3, 3), 6, 3), "한 줄 4-4");
    assert!(!is_forbidden(&mut place(&["...X", "...X", "....", "XXX."], 3, 3), 6, 6), "4-3 허용");
    assert!(!is_forbidden(&mut place(&["..X..", "..X..", ".....", "OXX.."], 3, 3), 5, 6), "막힌 3");
}

#[test]
fn empty_board_plays_center() {
    assert_eq!(play(&[EMPTY; CELLS], BLACK, &strong()), (7, 7));
}

#[test]
fn takes_the_win() {
    let b = place(&["OXXXX.", "OOO..."], 2, 3);
    assert_eq!(play(&b, BLACK, &strong()), (7, 3));
}

#[test]
fn blocks_four() {
    let b = place(&["XOOOO.", ".XX..."], 2, 3);
    assert_eq!(play(&b, BLACK, &strong()), (7, 3));
}

#[test]
fn black_avoids_forbidden_point() {
    let b = place(&["...X", "...X", "...X", "XXX."], 3, 3);
    let level = Level { depth: 2, width: 10, time_ms: 700.0, blunder: 0.1, noise: 50.0 };
    assert_ne!(play(&b, BLACK, &level), (6, 6));
}
