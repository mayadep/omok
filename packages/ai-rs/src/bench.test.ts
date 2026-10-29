import { it } from "vitest";
import { AI_LEVELS, findMove } from "@omok/ai";
import { frozenClock, loadWasmAi, selfPlayPosition } from "./testing";

// BENCH=1 pnpm vitest run packages/ai-rs/src/bench.test.ts
it.skipIf(!process.env.BENCH)("TS AI vs Rust(WASM) AI 속도 비교", async () => {
  const wasm = await loadWasmAi();
  const base = { ...AI_LEVELS[8], blunder: 0, noise: 0 };
  // 둘 곳이 금방 하나로 좁혀지는 국면은 탐색량이 적으므로, 깊이 6 탐색량이 가장 많은 국면을 고른다
  let p = selfPlayPosition(1, 10)!;
  let most = -1;
  for (let seed = 1; seed <= 60; seed++) {
    const q = selfPlayPosition(seed, 8 + (seed % 4) * 4);
    if (!q) continue;
    wasm.findMove(q.board, q.color, q.rule, { ...base, depth: 6 }, { now: frozenClock });
    if (wasm.lastStats().nodes > most) [p, most] = [q, wasm.lastStats().nodes];
  }
  const time = (fn: () => void) => {
    const start = performance.now();
    fn();
    return performance.now() - start;
  };

  console.log("고정 깊이 탐색 시간 (중반 국면, 시간 제한 없음)");
  let tsSkip = false;
  for (let depth = 2; depth <= 8; depth++) {
    const level = { ...base, depth };
    const rs = time(() => wasm.findMove(p.board, p.color, p.rule, level, { now: frozenClock }));
    const ts = tsSkip ? NaN : time(() => findMove(p.board, p.color, p.rule, level, { now: frozenClock }));
    if (ts > 20_000) tsSkip = true;
    const ratio = Number.isNaN(ts) ? "-" : `${(ts / rs).toFixed(1)}배`;
    console.log(`깊이 ${depth}: TS ${Number.isNaN(ts) ? "(생략)" : `${ts.toFixed(0)}ms`}, Rust ${rs.toFixed(0)}ms, ${ratio}`);
  }

  console.log("난이도별 실제 시간 제한 안에서 Rust가 끝까지 본 깊이");
  for (const level of AI_LEVELS.slice(4)) {
    wasm.findMove(p.board, p.color, p.rule, level);
    const { depth, nodes } = wasm.lastStats();
    console.log(`${level.name}: 목표 깊이 ${level.depth}, 도달 ${depth}, 노드 ${nodes}`);
  }
}, 600_000);
