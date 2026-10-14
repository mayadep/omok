import { useState } from "react";
import { rankFromRating } from "@omok/rating";
import { Avatar, CHARACTERS } from "../components/Avatar";
import { RankBadge } from "../components/RankBadge";
import { fakeRanking } from "../opponents";
import { setCharacter, useProfile } from "../profile";
import { isMuted, setMuted } from "../sound";

export function Home({ onStart }: { onStart: () => void }) {
  const profile = useProfile();
  const [tab, setTab] = useState<"play" | "ranking">("play");
  const [muted, setMutedState] = useState(isMuted());
  const rank = rankFromRating(profile.rating.rating);
  const total = profile.wins + profile.losses + profile.draws;

  return (
    <main className="screen home">
      <header className="home-top">
        <div className="logo">
          <span className="logo-stone black" />
          <span className="logo-stone white" />
          <h1>오목</h1>
        </div>
        <button
          className="icon-btn"
          aria-label={muted ? "소리 켜기" : "소리 끄기"}
          onClick={() => {
            setMuted(!muted);
            setMutedState(!muted);
          }}
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </header>

      <section className="profile-card">
        <div className="profile-main">
          <Avatar character={profile.character} size={72} ring="rgba(243,201,105,0.7)" />
          <div className="profile-info">
            <div className="profile-id">{profile.id}</div>
            <div className="profile-rank">
              <RankBadge rating={profile.rating.rating} />
              <span className="muted">레이팅 {Math.round(profile.rating.rating)}</span>
            </div>
          </div>
        </div>
        <div className="rank-progress" aria-label={`${rank.label} 진행도`}>
          <div className="rank-progress-fill" style={{ width: `${Math.round(rank.progress * 100)}%` }} />
        </div>
        <div className="record">
          <span>{total}전</span>
          <span className="win">{profile.wins}승</span>
          <span className="loss">{profile.losses}패</span>
          {profile.draws > 0 && <span>{profile.draws}무</span>}
        </div>
        <div className="char-picker" role="radiogroup" aria-label="캐릭터 선택">
          {CHARACTERS.map((c, i) => (
            <button
              key={c.name}
              role="radio"
              aria-checked={profile.character === i}
              className={profile.character === i ? "selected" : ""}
              onClick={() => setCharacter(i)}
            >
              <Avatar character={i} size={38} />
            </button>
          ))}
        </div>
      </section>

      <nav className="tabs">
        <button className={tab === "play" ? "active" : ""} onClick={() => setTab("play")}>대전</button>
        <button className={tab === "ranking" ? "active" : ""} onClick={() => setTab("ranking")}>랭킹</button>
      </nav>

      {tab === "play" ? (
        <section className="play-section">
          <p className="hint">비슷한 실력의 상대를 찾아요. 15초 안에 상대가 없으면 내 급수에 맞는 AI와 대국해요.</p>
          <button className="primary-btn" onClick={onStart}>
            대전 시작
          </button>
        </section>
      ) : (
        <Ranking />
      )}
    </main>
  );
}

function Ranking() {
  const profile = useProfile();
  const list = [
    ...fakeRanking(),
    { id: profile.id, character: profile.character, rating: profile.rating.rating, isMe: true },
  ].sort((a, b) => b.rating - a.rating);

  return (
    <section className="ranking">
      <ol>
        {list.slice(0, 30).map((r, i) => (
          <li key={r.id} className={r.isMe ? "me" : ""}>
            <span className="pos">{i + 1}</span>
            <Avatar character={r.character} size={32} />
            <span className="name">{r.id}</span>
            <RankBadge rating={r.rating} compact />
            <span className="muted pts">{Math.round(r.rating)}</span>
          </li>
        ))}
      </ol>
      <p className="hint small">임시 랭킹이에요. 서버가 연결되면 실제 유저 순위로 바뀌어요.</p>
    </section>
  );
}
