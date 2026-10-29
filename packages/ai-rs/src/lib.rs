//! 오목 AI의 Rust 판. 브라우저에서는 WebAssembly로 컴파일해 쓴다 (src/index.ts).

pub mod engine;
pub mod patterns;
pub mod search;

#[cfg(test)]
mod tests;

/// WASM 인터페이스. 판은 board_ptr() 위치의 225바이트에 JS가 직접 써 넣는다.
/// 시계와 난수는 JS에서 받는다 (env.now, env.random).
#[cfg(target_arch = "wasm32")]
mod wasm {
    use crate::engine::{idx, Board, CELLS};
    use crate::search::{find_move as search, Level, Stats};
    use core::ptr::{addr_of, addr_of_mut};

    #[link(wasm_import_module = "env")]
    extern "C" {
        fn now() -> f64;
        fn random() -> f64;
    }

    // WASM은 스레드가 하나라 static mut 를 써도 동시에 접근할 일이 없다
    static mut BOARD: Board = [0; CELLS];
    static mut STATS: Stats = Stats { depth: 0, nodes: 0 };

    #[no_mangle]
    pub extern "C" fn board_ptr() -> *mut i8 {
        addr_of_mut!(BOARD) as *mut i8
    }

    /// 고른 수의 칸 번호(y * 15 + x)를 돌려준다
    #[no_mangle]
    pub extern "C" fn find_move(color: i32, renju: i32, depth: i32, width: i32, time_ms: f64, blunder: f64, noise: f64) -> i32 {
        let level = Level { depth, width: width as usize, time_ms, blunder, noise };
        let (board, stats) = unsafe { (&*addr_of!(BOARD), &mut *addr_of_mut!(STATS)) };
        let (x, y) = search(board, color as i8, renju != 0, &level, &mut || unsafe { random() }, &mut || unsafe { now() }, stats);
        idx(x, y) as i32
    }

    #[no_mangle]
    pub extern "C" fn last_depth() -> i32 {
        unsafe { (*addr_of!(STATS)).depth }
    }

    #[no_mangle]
    pub extern "C" fn last_nodes() -> f64 {
        unsafe { (*addr_of!(STATS)).nodes as f64 }
    }
}
