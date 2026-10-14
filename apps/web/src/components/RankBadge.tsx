import { rankFromRating } from "@omok/rating";

export function RankBadge({ rating, compact = false }: { rating: number; compact?: boolean }) {
  const rank = rankFromRating(rating);
  return (
    <span className={`rank-badge ${rank.kind}${compact ? " compact" : ""}`} title={`레이팅 ${Math.round(rating)}`}>
      {rank.label}
    </span>
  );
}
