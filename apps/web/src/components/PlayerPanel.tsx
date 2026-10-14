import { BLACK, type Color } from "@omok/engine";
import { URGENT_SECONDS } from "../config";
import { Avatar } from "./Avatar";
import { RankBadge } from "./RankBadge";

interface Props {
  position: "top" | "bottom";
  id: string;
  character: number;
  rating: number;
  color: Color;
  isAI?: boolean;
  active: boolean;
  /** 남은 시간 비율 0~1, 초 */
  timeRatio: number;
  secondsLeft: number;
  note?: string;
}

export function PlayerPanel({ position, id, character, rating, color, isAI, active, timeRatio, secondsLeft, note }: Props) {
  const urgent = active && secondsLeft <= URGENT_SECONDS;
  return (
    <section className={`player-panel ${position}${active ? " active" : ""}${urgent ? " urgent" : ""}`} aria-label={position === "top" ? "상대" : "나"}>
      <div className="avatar-wrap">
        <Avatar character={character} size={52} ring={active ? "rgba(243,201,105,0.95)" : undefined} />
        <span className={`stone-dot ${color === BLACK ? "black" : "white"}`} title={color === BLACK ? "흑" : "백"} />
      </div>
      <div className="player-info">
        <div className="player-line">
          <span className="player-name">{id}</span>
          {isAI && <span className="ai-tag">AI</span>}
          <RankBadge rating={rating} compact />
          {active && note && <span className="thinking">{note}</span>}
        </div>
        <div className="timer-row">
          <div className="timer-bar">
            <div className="timer-fill" style={{ width: `${active ? Math.max(0, timeRatio) * 100 : 100}%` }} />
          </div>
          <span className="timer-text">{active ? `${secondsLeft}초` : note ?? (color === BLACK ? "흑 · 선공" : "백")}</span>
        </div>
      </div>
    </section>
  );
}
