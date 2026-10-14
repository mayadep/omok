import { AI_LEVELS, findMove } from "@omok/ai";
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

scope.onmessage = (e) => {
  const { id, board, color, rule, level } = e.data;
  const move = findMove(board, color, rule, AI_LEVELS[level]);
  scope.postMessage({ id, x: move.x, y: move.y });
};
