/** 상대를 기다리는 시간(초). 주소에 ?match=3 을 붙이면 3초로 줄여서 확인해 볼 수 있다. */
export const MATCH_SECONDS = (() => {
  const v = Number(new URLSearchParams(location.search).get("match"));
  return v > 0 ? v : 5;
})();

/** 한 수를 두는 제한 시간(초) */
export const TURN_SECONDS = 12;

/** 남은 시간이 이 값 이하이면 빨갛게 표시 */
export const URGENT_SECONDS = 4;
