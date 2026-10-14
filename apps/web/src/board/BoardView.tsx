import { useEffect, useRef } from "react";
import type { Color } from "@omok/engine";
import { playBurst } from "../sound";
import { BoardRenderer, type BoardState } from "./BoardRenderer";

interface Props extends BoardState {
  /** 지금 사람이 둘 수 있으면 그 색, 아니면 null */
  inputColor: Color | null;
  onPlace: (x: number, y: number) => void;
}

export function BoardView({ moves, forbidden, winLine, inputColor, onPlace }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<BoardRenderer | null>(null);
  const placeRef = useRef(onPlace);
  placeRef.current = onPlace;
  const latest = useRef({ moves, forbidden, winLine, inputColor });
  latest.current = { moves, forbidden, winLine, inputColor };

  useEffect(() => {
    const host = hostRef.current!;
    let cancelled = false;
    BoardRenderer.create(host, { onPlace: (x, y) => placeRef.current(x, y), onBurst: playBurst }).then((r) => {
      if (cancelled) {
        r.destroy();
        return;
      }
      rendererRef.current = r;
      const s = latest.current;
      r.setState({ moves: s.moves, forbidden: s.forbidden, winLine: s.winLine });
      r.setInput(s.inputColor);
    });
    return () => {
      cancelled = true;
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.setState({ moves, forbidden, winLine });
  }, [moves, forbidden, winLine]);

  useEffect(() => {
    rendererRef.current?.setInput(inputColor);
  }, [inputColor]);

  return <div ref={hostRef} className="board-host" />;
}
