import { describe, expect, it } from "vitest";
import { applyGame, rankFromRating, updateRating, DEFAULT_RATING } from "./index";

describe("Glicko-2", () => {
  it("Glickman 논문의 예제와 같은 값이 나온다", () => {
    const player = { rating: 1500, rd: 200, vol: 0.06 };
    const next = updateRating(player, [
      { opponent: { rating: 1400, rd: 30, vol: 0.06 }, score: 1 },
      { opponent: { rating: 1550, rd: 100, vol: 0.06 }, score: 0 },
      { opponent: { rating: 1700, rd: 300, vol: 0.06 }, score: 0 },
    ]);
    expect(next.rating).toBeCloseTo(1464.06, 1);
    expect(next.rd).toBeCloseTo(151.52, 1);
    expect(next.vol).toBeCloseTo(0.05999, 4);
  });

  it("이기면 오르고 지면 내려간다", () => {
    const opp = { rating: 1200, rd: 100, vol: 0.06 };
    expect(applyGame(DEFAULT_RATING, opp, 1).rating).toBeGreaterThan(1200);
    expect(applyGame(DEFAULT_RATING, opp, 0).rating).toBeLessThan(1200);
  });

  it("신규 유저(RD가 큼)는 크게 움직이고, 판 수가 쌓이면 안정된다", () => {
    const opp = { rating: 1200, rd: 50, vol: 0.06 };
    const first = applyGame(DEFAULT_RATING, opp, 1);
    const many = Array.from({ length: 20 }).reduce<typeof first>((r) => applyGame(r, opp, 1), first);
    const jump1 = first.rating - 1200;
    const next = applyGame(many, opp, 1);
    expect(jump1).toBeGreaterThan(next.rating - many.rating);
    expect(many.rd).toBeLessThan(DEFAULT_RATING.rd);
  });

  it("weight 0.5 이면 절반만 반영", () => {
    const opp = { rating: 1200, rd: 100, vol: 0.06 };
    const full = applyGame(DEFAULT_RATING, opp, 1).rating - 1200;
    const half = applyGame(DEFAULT_RATING, opp, 1, 0.5).rating - 1200;
    expect(half).toBeCloseTo(full / 2, 5);
  });
});

describe("급수", () => {
  it.each([
    [500, "18급"],
    [999, "18급"],
    [1000, "17급"],
    [1200, "15급"],
    [2599, "2급"],
    [2600, "1급"],
    [2700, "1단"],
    [3499, "8단"],
    [3500, "9단"],
    [9999, "9단"],
  ])("레이팅 %i 는 %s", (rating, label) => {
    expect(rankFromRating(rating).label).toBe(label);
  });

  it("급수 안의 진행도", () => {
    expect(rankFromRating(1250).progress).toBeCloseTo(0.5, 5);
  });
});
