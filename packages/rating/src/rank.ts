/** 급수 체계: 18급 ~ 1급, 1단 ~ 9단. 1000점 미만이 18급이고 100점마다 한 단계 오른다. */

export interface Rank {
  /** 화면에 표시하는 이름: "12급", "3단" */
  label: string;
  kind: "kyu" | "dan";
  /** 급 또는 단의 숫자 */
  number: number;
  /** 0(18급) ~ 26(9단) */
  index: number;
  /** 현재 급수 안에서 다음 급수까지 얼마나 왔는지 0 ~ 1 */
  progress: number;
}

export const MAX_RANK_INDEX = 26;
const KYU_COUNT = 18;

export function rankFromRating(rating: number): Rank {
  const raw = rating < 1000 ? 0 : Math.floor((rating - 1000) / 100) + 1;
  const index = Math.min(MAX_RANK_INDEX, raw);
  const progress = index === MAX_RANK_INDEX || rating < 1000 ? (index === 0 ? Math.max(0, Math.min(1, (rating - 900) / 100)) : 1) : ((rating - 1000) % 100) / 100;
  return rankFromIndex(index, progress);
}

export function rankFromIndex(index: number, progress = 0): Rank {
  if (index < KYU_COUNT) {
    const number = KYU_COUNT - index;
    return { label: `${number}급`, kind: "kyu", number, index, progress };
  }
  const number = index - KYU_COUNT + 1;
  return { label: `${number}단`, kind: "dan", number, index, progress };
}
