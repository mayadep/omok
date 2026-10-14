import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { BLACK, Game, WHITE, type Color } from "@omok/engine";
import { BoardView } from "../board/BoardView";
import { BURST_GAP } from "../board/BoardRenderer";
import { TURN_SECONDS } from "../config";
import { PlayerPanel } from "../components/PlayerPanel";
import { ResultModal, type Reason } from "../components/ResultModal";
import type { Opponent } from "../opponents";
import { recordResult, useProfile, type Outcome } from "../profile";
import { isMuted, playResult, playStone, setMuted } from "../sound";
import type { AiRequest, AiResponse } from "../ai.worker";
import type { Rating } from "@omok/rating";

const TURN_MS = TURN_SECONDS * 1000;

interface Result {
  outcome: Outcome;
  reason: Reason;
  before: Rating;
  after: Rating;
}

interface Props {
  opponent: Opponent;
  onHome: () => void;
  onRematch: () => void;
}

export function GameScreen({ opponent, onHome, onRematch }: Props) {
  const profile = useProfile();
  // 대국 중에는 시작할 때의 레이팅을 보여준다 (끝나고 갱신됨)
  const myRating = useRef(profile.rating.rating).current;

  const gameRef = useRef<Game | null>(null);
  if (!gameRef.current) gameRef.current = new Game("renju");
  const game = gameRef.current;

  // 레이팅이 낮은 쪽이 흑, 같으면 무작위
  const [myColor] = useState<Color>(() =>
    myRating < opponent.rating.rating ? BLACK : myRating > opponent.rating.rating ? WHITE : Math.random() < 0.5 ? BLACK : WHITE,
  );
  const oppColor: Color = myColor === BLACK ? WHITE : BLACK;

  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const [now, setNow] = useState(() => Date.now());
  const turnStart = useRef(Date.now());
  const [result, setResult] = useState<Result | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmResign, setConfirmResign] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const finished = useRef(false);
  const workerRef = useRef<Worker | null>(null);
  const reqId = useRef(0);

  const moveCount = game.moves.length;
  const playing = game.status === "playing";
  const myTurn = playing && game.turn === myColor;

  // ───── 결과 처리 ─────
  const finish = (reason: Reason) => {
    if (finished.current) return;
    finished.current = true;
    const outcome: Outcome = game.status === "draw" ? "draw" : game.winner === myColor ? "win" : "loss";
    const delta = recordResult(outcome, opponent.rating, opponent.isAI ? 0.5 : 1);
    setTimeout(() => {
      playResult(outcome === "win");
      setResult({ outcome, reason: game.status === "draw" ? "draw" : reason, ...delta });
    }, reason === "five" ? (game.winLine?.length ?? 5) * BURST_GAP + 1600 : 1100);
  };

  const applyMove = (x: number, y: number) => {
    const res = game.play(x, y);
    if (!res.ok) {
      if (res.reason === "forbidden") showToast("금수 자리예요 (3-3, 4-4, 장목)");
      return;
    }
    playStone();
    turnStart.current = Date.now();
    rerender();
    if (game.status !== "playing") finish("five");
  };

  const showToast = (text: string) => {
    setToast(text);
    setTimeout(() => setToast((t) => (t === text ? null : t)), 1800);
  };

  // ───── AI 워커 ─────
  useEffect(() => {
    const worker = new Worker(new URL("../ai.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!playing || game.turn === myColor) return;
    const worker = workerRef.current;
    if (!worker) return;

    const id = ++reqId.current;
    const started = Date.now();
    const minThink = 500 + Math.random() * 900;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    worker.onmessage = (e: MessageEvent<AiResponse>) => {
      if (cancelled || e.data.id !== id) return;
      const wait = Math.max(0, minThink - (Date.now() - started));
      timer = setTimeout(() => {
        if (!cancelled) applyMove(e.data.x, e.data.y);
      }, wait);
    };
    const req: AiRequest = { id, board: game.board.slice(), color: game.turn, rule: game.rule, level: opponent.level.id };
    worker.postMessage(req);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // 수가 하나 둬질 때마다 한 번만 요청한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveCount, playing]);

  // ───── 제한 시간 ─────
  useEffect(() => {
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (game.status === "playing" && n - turnStart.current >= TURN_MS) {
        game.resign(game.turn);
        rerender();
        finish("timeout");
      }
    }, 200);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 금수 표시는 내가 흑이고 내 차례일 때만
  const forbidden = useMemo(
    () => (myTurn && myColor === BLACK ? game.forbiddenPoints() : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [myTurn, moveCount],
  );

  const elapsed = now - turnStart.current;
  const secondsLeft = Math.max(0, Math.ceil((TURN_MS - elapsed) / 1000));
  const ratio = 1 - elapsed / TURN_MS;
  const oppActive = playing && game.turn === oppColor;

  const resign = () => {
    if (!playing) return;
    if (!confirmResign) {
      setConfirmResign(true);
      setTimeout(() => setConfirmResign(false), 3000);
      return;
    }
    game.resign(myColor);
    rerender();
    finish("resign");
  };

  return (
    <main className="screen game">
      <PlayerPanel
        position="top"
        id={opponent.id}
        character={opponent.character}
        rating={opponent.rating.rating}
        color={oppColor}
        isAI={opponent.isAI}
        active={oppActive}
        timeRatio={ratio}
        secondsLeft={secondsLeft}
        note={oppActive ? "생각 중…" : undefined}
      />

      <div className="board-area">
        <div className="board-frame">
          <BoardView
            moves={game.moves.slice()}
            forbidden={forbidden}
            winLine={game.winLine}
            inputColor={myTurn ? myColor : null}
            onPlace={(x, y) => {
              if (game.status === "playing" && game.turn === myColor) applyMove(x, y);
            }}
          />
        </div>
        {toast && <div className="toast" role="status">{toast}</div>}
      </div>

      <PlayerPanel
        position="bottom"
        id={profile.id}
        character={profile.character}
        rating={myRating}
        color={myColor}
        active={myTurn}
        timeRatio={ratio}
        secondsLeft={secondsLeft}
        note={myTurn ? "내 차례" : undefined}
      />

      <div className="actions">
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
        <span className="move-count">{moveCount}수</span>
        <button className={`ghost-btn small${confirmResign ? " danger" : ""}`} onClick={resign} disabled={!playing}>
          {confirmResign ? "정말 기권할까요?" : "기권"}
        </button>
      </div>

      {result && (
        <ResultModal
          outcome={result.outcome}
          reason={result.reason}
          before={result.before}
          after={result.after}
          halfWeight={opponent.isAI}
          onRematch={onRematch}
          onHome={onHome}
        />
      )}
    </main>
  );
}
