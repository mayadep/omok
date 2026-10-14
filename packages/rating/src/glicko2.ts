/** Glicko-2 레이팅 (Glickman, 2013). 한 판이 끝날 때마다 바로 갱신하는 용도로 쓴다. */

export interface Rating {
  /** 레이팅 (표시용 점수) */
  rating: number;
  /** 레이팅 편차: 클수록 아직 실력을 모른다는 뜻 */
  rd: number;
  /** 변동성 */
  vol: number;
}

export interface GameResult {
  opponent: Rating;
  /** 1 승, 0.5 무, 0 패 */
  score: 0 | 0.5 | 1;
}

export const DEFAULT_RATING: Rating = { rating: 1200, rd: 350, vol: 0.06 };

const SCALE = 173.7178;
const TAU = 0.5;
const EPSILON = 1e-6;
const MIN_RD = 40;

const g = (phi: number) => 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
const expected = (mu: number, muJ: number, phiJ: number) => 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));

export function updateRating(player: Rating, results: GameResult[], tau = TAU): Rating {
  const mu = (player.rating - 1500) / SCALE;
  const phi = player.rd / SCALE;
  const sigma = player.vol;

  if (results.length === 0) {
    const phiStar = Math.sqrt(phi * phi + sigma * sigma);
    return { ...player, rd: Math.min(350, phiStar * SCALE) };
  }

  let vInv = 0;
  let deltaSum = 0;
  for (const r of results) {
    const muJ = (r.opponent.rating - 1500) / SCALE;
    const phiJ = r.opponent.rd / SCALE;
    const e = expected(mu, muJ, phiJ);
    vInv += g(phiJ) ** 2 * e * (1 - e);
    deltaSum += g(phiJ) * (r.score - e);
  }
  const v = 1 / vInv;
  const delta = v * deltaSum;

  // 새 변동성: Illinois 알고리즘으로 f(x) = 0 을 푼다
  const a = Math.log(sigma * sigma);
  const f = (x: number) => {
    const ex = Math.exp(x);
    const d2 = phi * phi + v + ex;
    return (ex * (delta * delta - phi * phi - v - ex)) / (2 * d2 * d2) - (x - a) / (tau * tau);
  };
  let A = a;
  let B: number;
  if (delta * delta > phi * phi + v) {
    B = Math.log(delta * delta - phi * phi - v);
  } else {
    let k = 1;
    while (f(a - k * tau) < 0) k++;
    B = a - k * tau;
  }
  let fA = f(A);
  let fB = f(B);
  while (Math.abs(B - A) > EPSILON) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA /= 2;
    }
    B = C;
    fB = fC;
  }
  const newSigma = Math.exp(A / 2);

  const phiStar = Math.sqrt(phi * phi + newSigma * newSigma);
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const newMu = mu + newPhi * newPhi * deltaSum;

  return {
    rating: newMu * SCALE + 1500,
    rd: Math.max(MIN_RD, newPhi * SCALE),
    vol: newSigma,
  };
}

/**
 * 한 판의 결과를 반영한다. weight 가 1보다 작으면 그만큼만 반영한다
 * (예: AI와 둔 판은 0.5 로 절반만 반영).
 */
export function applyGame(player: Rating, opponent: Rating, score: 0 | 0.5 | 1, weight = 1): Rating {
  const updated = updateRating(player, [{ opponent, score }]);
  return {
    rating: player.rating + (updated.rating - player.rating) * weight,
    rd: player.rd + (updated.rd - player.rd) * weight,
    vol: updated.vol,
  };
}
