import { AI_LEVELS, findMove } from "@omok/ai";
import { createWasmAi, type WasmAi } from "@omok/ai-rs";
import wasmUrl from "@omok/ai-rs/omok_ai.wasm?url";
import type { Color, Rule } from "@omok/engine";

export interface AiRequest {
  id: number;
  board: Int8Array;
  color: Color;
  rule: Rule;
  level: number;
}

export interface AiResponse {
  id: number;
  x: number;
  y: number;
}

// AI 계산은 화면이 멈추지 않도록 워커에서 돌린다
const scope = self as unknown as {
  onmessage: ((e: MessageEvent<AiRequest>) => void) | null;
  postMessage: (msg: AiResponse) => void;
};

// Rust(WASM) AI를 쓴다. 불러오지 못하면 같은 알고리즘의 TS AI로 둔다
const wasmAi: Promise<WasmAi | null> = fetch(wasmUrl)
  .then((r) => r.arrayBuffer())
  .then(createWasmAi)
  .catch((err) => {
    console.warn("WASM AI를 불러오지 못해 TS AI를 씁니다", err);
    return null;
  });

scope.onmessage = async (e) => {
  const { id, board, color, rule, level } = e.data;
  const ai = (await wasmAi) ?? { findMove };
  const move = ai.findMove(board, color, rule, AI_LEVELS[level]);
  scope.postMessage({ id, x: move.x, y: move.y });
};
