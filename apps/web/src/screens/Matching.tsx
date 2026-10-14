import { useEffect, useState } from "react";
import { Avatar } from "../components/Avatar";
import { RankBadge } from "../components/RankBadge";
import { makeAiOpponent, type Opponent } from "../opponents";
import { useProfile } from "../profile";

/** 상대를 기다리는 시간. 주소에 ?match=3 을 붙이면 3초로 줄여서 확인해 볼 수 있다. */
const MATCH_SECONDS = (() => {
  const v = Number(new URLSearchParams(location.search).get("match"));
  return v > 0 ? v : 15;
})();

export function Matching({ onCancel, onMatched }: { onCancel: () => void; onMatched: (o: Opponent) => void }) {
  const profile = useProfile();
  const [elapsed, setElapsed] = useState(0);
  const [found, setFound] = useState<Opponent | null>(null);

  useEffect(() => {
    if (found) return;
    const start = Date.now();
    const timer = setInterval(() => {
      const t = (Date.now() - start) / 1000;
      setElapsed(t);
      // 서버가 생기면 여기서 사람 상대를 먼저 찾는다. 지금은 시간이 다 되면 AI가 들어온다.
      if (t >= MATCH_SECONDS) {
        clearInterval(timer);
        setFound(makeAiOpponent(profile.rating));
      }
    }, 100);
    return () => clearInterval(timer);
  }, [found, profile.rating]);

  useEffect(() => {
    if (!found) return;
    const t = setTimeout(() => onMatched(found), 1600);
    return () => clearTimeout(t);
  }, [found, onMatched]);

  const left = Math.max(0, Math.ceil(MATCH_SECONDS - elapsed));
  const range = 100 + Math.floor(elapsed / 3) * 100;

  return (
    <main className="screen matching">
      <div className="vs">
        <div className="vs-side">
          <Avatar character={profile.character} size={84} ring="rgba(243,201,105,0.7)" />
          <div className="vs-name">{profile.id}</div>
          <RankBadge rating={profile.rating.rating} />
        </div>
        <div className="vs-mid">VS</div>
        <div className={`vs-side ${found ? "found" : "unknown"}`}>
          {found ? (
            <>
              <Avatar character={found.character} size={84} ring="rgba(243,201,105,0.7)" />
              <div className="vs-name">
                {found.id} <span className="ai-tag">AI</span>
              </div>
              <RankBadge rating={found.rating.rating} />
            </>
          ) : (
            <>
              <div className="radar" aria-hidden>
                <span /><span /><span />
              </div>
              <div className="vs-name muted">상대를 찾는 중</div>
            </>
          )}
        </div>
      </div>

      <div className="match-status">
        {found ? (
          <p className="found-text">상대를 찾았어요!</p>
        ) : (
          <>
            <div className="count">{left}</div>
            <p className="hint">비슷한 실력의 상대를 찾고 있어요 (±{range}점)</p>
            <p className="hint small">{MATCH_SECONDS}초 안에 못 찾으면 내 급수에 맞는 AI가 상대해요</p>
          </>
        )}
      </div>

      {!found && (
        <button className="ghost-btn" onClick={onCancel}>
          취소
        </button>
      )}
    </main>
  );
}
