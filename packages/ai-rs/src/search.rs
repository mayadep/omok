//! packages/ai/src/search.ts 의 Rust 판. 무작위 값을 쓰는 순서까지 같게 옮겼다.

use std::cmp::Ordering;

use crate::engine::{check_win, idx, is_forbidden, opponent, stone_at, Board, BLACK, BOARD_SIZE, CELLS, EMPTY};
use crate::patterns::{evaluate, move_heuristic, FIVE_SCORE};

const WIN: f64 = 10_000_000.0;

/// AI 난이도. packages/ai/src/levels.ts 의 AiLevel 과 같은 뜻
pub struct Level {
    pub depth: i32,
    pub width: usize,
    pub time_ms: f64,
    pub blunder: f64,
    pub noise: f64,
}

/// 마지막 탐색에서 끝까지 본 깊이와 방문한 노드 수
#[derive(Default)]
pub struct Stats {
    pub depth: i32,
    pub nodes: u64,
}

struct TimeUp;

struct Ctx<'a> {
    renju: bool,
    width: usize,
    deadline: f64,
    nodes: u64,
    now: &'a mut dyn FnMut() -> f64,
}

type Point = (i32, i32);

/// 내림차순 비교. JS의 (a, b) => b - a 처럼 -0과 0을 같게 본다
fn desc(a: f64, b: f64) -> Ordering {
    b.partial_cmp(&a).unwrap_or(Ordering::Equal)
}

/// 돌 주변 2칸 안의 빈 칸
fn nearby_empty(board: &Board) -> Vec<Point> {
    let mut seen = [false; CELLS];
    let mut result = Vec::new();
    for y in 0..BOARD_SIZE {
        for x in 0..BOARD_SIZE {
            if board[idx(x, y)] == EMPTY {
                continue;
            }
            for dy in -2..=2 {
                for dx in -2..=2 {
                    let nx = x + dx;
                    let ny = y + dy;
                    if stone_at(board, nx, ny) != EMPTY || seen[idx(nx, ny)] {
                        continue;
                    }
                    seen[idx(nx, ny)] = true;
                    result.push((nx, ny));
                }
            }
        }
    }
    result
}

/// 후보 수를 점수순으로 정렬해 돌려준다.
/// 바로 이길 수 있으면 그 수만, 상대가 바로 이기는 자리가 있으면 그 자리들만 돌려준다.
fn candidates(board: &mut Board, color: i8, renju: bool, limit: usize) -> Vec<Point> {
    let cells = nearby_empty(board);
    if cells.is_empty() {
        let c = (BOARD_SIZE - 1) >> 1;
        return vec![(c, c)];
    }

    let mut scored = Vec::with_capacity(cells.len());
    for p in cells {
        if color == BLACK && renju && is_forbidden(board, p.0, p.1) {
            continue;
        }
        scored.push((p, move_heuristic(board, p.0, p.1, color)));
    }
    // 안정 정렬이라 점수가 같으면 TS(Array.prototype.sort)와 순서가 같다
    scored.sort_by(|a, b| desc(a.1.total, b.1.total));

    if let Some((p, _)) = scored.iter().find(|s| s.1.attack >= FIVE_SCORE) {
        return vec![*p];
    }
    let blocks: Vec<Point> = scored.iter().filter(|s| s.1.defense >= FIVE_SCORE).map(|s| s.0).collect();
    if !blocks.is_empty() {
        return blocks;
    }
    scored.iter().take(limit).map(|s| s.0).collect()
}

fn negamax(board: &mut Board, color: i8, depth: i32, mut alpha: f64, beta: f64, ply: i32, ctx: &mut Ctx) -> Result<f64, TimeUp> {
    ctx.nodes += 1;
    if ctx.nodes & 127 == 0 && (ctx.now)() > ctx.deadline {
        return Err(TimeUp);
    }
    if depth == 0 {
        return Ok(evaluate(board, color));
    }

    let moves = candidates(board, color, ctx.renju, ctx.width);
    if moves.is_empty() {
        return Ok(evaluate(board, color));
    }

    let mut best = f64::NEG_INFINITY;
    for (x, y) in moves {
        board[idx(x, y)] = color;
        let score = if check_win(board, x, y, color, ctx.renju) {
            Ok(WIN - ply as f64)
        } else {
            negamax(board, opponent(color), depth - 1, -beta, -alpha, ply + 1, ctx).map(|s| -s)
        };
        board[idx(x, y)] = EMPTY;
        let score = score?;

        if score > best {
            best = score;
        }
        if best > alpha {
            alpha = best;
        }
        if alpha >= beta {
            break;
        }
    }
    Ok(best)
}

/// color가 둘 다음 수를 고른다. board_in은 건드리지 않는다.
pub fn find_move(
    board_in: &Board,
    color: i8,
    renju: bool,
    level: &Level,
    rng: &mut dyn FnMut() -> f64,
    now: &mut dyn FnMut() -> f64,
    stats: &mut Stats,
) -> Point {
    let mut board = *board_in;
    let deadline = now() + level.time_ms;
    let mut ctx = Ctx { renju, width: level.width, deadline, nodes: 0, now };
    *stats = Stats::default();

    let center = (BOARD_SIZE - 1) >> 1;
    if board.iter().all(|&c| c == EMPTY) {
        return (center, center);
    }

    let roots = candidates(&mut board, color, renju, level.width.max(8));
    match roots.len() {
        0 => {
            // 둘 곳이 금수뿐인 경우. 남은 빈 칸 아무 데나 둔다
            let i = board.iter().position(|&c| c == EMPTY).unwrap_or(0) as i32;
            return (i % BOARD_SIZE, i / BOARD_SIZE);
        }
        1 => return roots[0],
        _ => {}
    }

    // 깊이를 1부터 늘려가며 탐색. 시간이 끝나면 마지막으로 끝낸 깊이의 결과를 쓴다.
    let mut scores: Vec<(Point, f64)> = roots.iter().map(|&p| (p, 0.0)).collect();
    'deepen: for depth in 1..=level.depth {
        let mut current = Vec::with_capacity(roots.len());
        for &(x, y) in &roots {
            board[idx(x, y)] = color;
            let score = if check_win(&board, x, y, color, renju) {
                Ok(WIN)
            } else {
                negamax(&mut board, opponent(color), depth - 1, f64::NEG_INFINITY, f64::INFINITY, 1, &mut ctx).map(|s| -s)
            };
            board[idx(x, y)] = EMPTY;
            match score {
                Ok(s) => current.push(((x, y), s)),
                Err(TimeUp) => break 'deepen,
            }
        }
        scores = current;
        stats.depth = depth;
        // 이기는 수를 찾았으면 더 볼 필요 없다
        if scores.iter().any(|s| s.1 >= WIN / 2.0) {
            break;
        }
    }
    stats.nodes = ctx.nodes;

    let mut noisy: Vec<(Point, f64)> = scores.iter().map(|&(p, s)| (p, s + (rng() - 0.5) * 2.0 * level.noise)).collect();
    noisy.sort_by(|a, b| desc(a.1, b.1));

    // 약한 단계에서는 가끔 차선 수를 둔다. 이기는 수나 막아야 하는 수가 있으면 실수하지 않는다.
    let second = noisy.get(1).map_or(f64::NEG_INFINITY, |s| s.1);
    let must_play = noisy[0].1 >= WIN / 2.0 || noisy[0].1 - second > 50_000.0;
    if !must_play && rng() < level.blunder {
        let pool = &noisy[..noisy.len().min(4)];
        return pool[(rng() * pool.len() as f64).floor() as usize].0;
    }
    noisy[0].0
}
