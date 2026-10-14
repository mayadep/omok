export interface AiLevel {
  /** 0(가장 약함) ~ 8(가장 강함) */
  id: number;
  name: string;
  /** 탐색 깊이 (수) */
  depth: number;
  /** 각 노드에서 살펴보는 후보 수 */
  width: number;
  /** 한 수에 쓰는 최대 계산 시간 (ms) */
  timeMs: number;
  /** 최선이 아닌 수(상위 4개 중 무작위)를 둘 확률 */
  blunder: number;
  /** 점수에 섞는 무작위 흔들림 */
  noise: number;
}

export const AI_LEVELS: readonly AiLevel[] = [
  { id: 0, name: "입문", depth: 1, width: 6, timeMs: 200, blunder: 0.5, noise: 400 },
  { id: 1, name: "초보", depth: 1, width: 8, timeMs: 300, blunder: 0.3, noise: 200 },
  { id: 2, name: "초급", depth: 2, width: 8, timeMs: 500, blunder: 0.2, noise: 100 },
  { id: 3, name: "중급", depth: 2, width: 10, timeMs: 700, blunder: 0.1, noise: 50 },
  { id: 4, name: "중상급", depth: 3, width: 10, timeMs: 1000, blunder: 0.05, noise: 20 },
  { id: 5, name: "상급", depth: 4, width: 10, timeMs: 1500, blunder: 0, noise: 5 },
  { id: 6, name: "고급", depth: 4, width: 12, timeMs: 2000, blunder: 0, noise: 1 },
  { id: 7, name: "고수", depth: 6, width: 12, timeMs: 3000, blunder: 0, noise: 0 },
  { id: 8, name: "달인", depth: 8, width: 14, timeMs: 4000, blunder: 0, noise: 0 },
];

/** 레이팅 구간별 AI 난이도 (급수 체계와 맞춘다: 100점이 1급수) */
const RATING_STEPS = [1000, 1200, 1500, 1800, 2100, 2400, 2700, 3000];

export function levelForRating(rating: number): AiLevel {
  let id = 0;
  for (const step of RATING_STEPS) if (rating >= step) id++;
  return AI_LEVELS[id];
}
