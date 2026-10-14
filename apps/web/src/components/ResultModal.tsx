import { rankFromRating, type Rating } from "@omok/rating";
import type { Outcome } from "../profile";

export type Reason = "five" | "timeout" | "resign" | "draw";

const TITLE: Record<Outcome, string> = { win: "승리!", loss: "패배", draw: "무승부" };
const REASON: Record<Reason, Record<Outcome, string>> = {
  five: { win: "오목을 완성했어요", loss: "상대가 오목을 완성했어요", draw: "" },
  timeout: { win: "상대가 시간 안에 두지 못했어요", loss: "제한 시간이 지났어요", draw: "" },
  resign: { win: "상대가 기권했어요", loss: "기권했어요", draw: "" },
  draw: { win: "", loss: "", draw: "판이 가득 찼어요" },
};

interface Props {
  outcome: Outcome;
  reason: Reason;
  before: Rating;
  after: Rating;
  halfWeight: boolean;
  onRematch: () => void;
  onHome: () => void;
}

export function ResultModal({ outcome, reason, before, after, halfWeight, onRematch, onHome }: Props) {
  const rb = rankFromRating(before.rating);
  const ra = rankFromRating(after.rating);
  const diff = Math.round(after.rating) - Math.round(before.rating);
  const rankChanged = rb.index !== ra.index;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="대국 결과">
      <div className={`modal ${outcome}`}>
        <h2>{TITLE[outcome]}</h2>
        <p className="reason">{REASON[reason][outcome]}</p>

        <div className="rating-change">
          <div className="rating-num">
            {Math.round(before.rating)} <span className="arrow">→</span> <strong>{Math.round(after.rating)}</strong>
          </div>
          <div className={`rating-diff ${diff > 0 ? "up" : diff < 0 ? "down" : ""}`}>
            {diff > 0 ? `+${diff}` : diff}
          </div>
        </div>
        {rankChanged && (
          <div className={`rank-change ${ra.index > rb.index ? "up" : "down"}`}>
            {rb.label} → {ra.label} {ra.index > rb.index ? "승급!" : "강등"}
          </div>
        )}
        {halfWeight && <p className="hint small">AI와 둔 판은 점수가 절반만 반영돼요.</p>}

        <div className="modal-actions">
          <button className="primary-btn" onClick={onRematch}>
            다시 대전
          </button>
          <button className="ghost-btn" onClick={onHome}>
            홈으로
          </button>
        </div>
      </div>
    </div>
  );
}
