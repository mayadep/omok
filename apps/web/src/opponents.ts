import { levelForRating, type AiLevel } from "@omok/ai";
import type { Rating } from "@omok/rating";

export interface Opponent {
  id: string;
  character: number;
  rating: Rating;
  isAI: boolean;
  level: AiLevel;
}

const NAMES = [
  "달빛바둑", "한수위", "초록별", "새벽의돌", "검은진주", "흰구름", "오목왕", "별빛고수",
  "산들바람", "청학동", "무적의흑", "느긋한백", "봄날", "소나무", "은하수", "조용한수",
  "빛나리", "도깨비", "바람의길", "서리꽃", "고요", "한밤", "여름밤", "푸른돌",
];

const randInt = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

/** 매칭이 안 됐을 때 내 실력에 맞춰 만드는 AI 상대 */
export function makeAiOpponent(mine: Rating): Opponent {
  const rating = Math.max(800, mine.rating + randInt(-60, 60));
  return {
    id: `${NAMES[randInt(0, NAMES.length - 1)]}${randInt(10, 99)}`,
    character: randInt(0, 5),
    rating: { rating, rd: 80, vol: 0.06 },
    isAI: true,
    level: levelForRating(rating),
  };
}

export interface RankingEntry {
  id: string;
  character: number;
  rating: number;
  isMe?: boolean;
}

/** 서버가 생기기 전까지 보여주는 임시 랭킹 (고정된 가상 유저) */
export function fakeRanking(): RankingEntry[] {
  let s = 20261014;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  return NAMES.map((name, i) => ({
    id: `${name}${10 + i * 3}`,
    character: Math.floor(rnd() * 6),
    rating: Math.round(3350 - i * 85 - rnd() * 60),
  }));
}
