import { useSyncExternalStore } from "react";
import { DEFAULT_RATING, applyGame, type Rating } from "@omok/rating";

export interface Profile {
  id: string;
  character: number;
  rating: Rating;
  wins: number;
  losses: number;
  draws: number;
}

const KEY = "omok.profile.v1";

function createProfile(): Profile {
  return {
    id: `손님${1000 + Math.floor(Math.random() * 9000)}`,
    character: Math.floor(Math.random() * 6),
    rating: { ...DEFAULT_RATING },
    wins: 0,
    losses: 0,
    draws: 0,
  };
}

function load(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...createProfile(), ...JSON.parse(raw) };
  } catch {
    // 저장소를 못 쓰는 환경에서는 매번 새 프로필로 시작한다
  }
  return createProfile();
}

let state = load();
const listeners = new Set<() => void>();

function commit(next: Profile) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // 무시
  }
  listeners.forEach((l) => l());
}

export const getProfile = () => state;
export const useProfile = () =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getProfile,
  );

export const setCharacter = (character: number) => commit({ ...state, character });

export type Outcome = "win" | "loss" | "draw";

/** 한 판의 결과를 레이팅과 전적에 반영한다. weight: AI와 둔 판은 일부만 반영. */
export function recordResult(outcome: Outcome, opponent: Rating, weight: number) {
  const before = state.rating;
  const score = outcome === "win" ? 1 : outcome === "loss" ? 0 : 0.5;
  const after = applyGame(before, opponent, score, weight);
  commit({
    ...state,
    rating: after,
    wins: state.wins + (outcome === "win" ? 1 : 0),
    losses: state.losses + (outcome === "loss" ? 1 : 0),
    draws: state.draws + (outcome === "draw" ? 1 : 0),
  });
  return { before, after };
}
