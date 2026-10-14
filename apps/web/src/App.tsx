import { useState } from "react";
import { Home } from "./screens/Home";
import { Matching } from "./screens/Matching";
import { GameScreen } from "./screens/GameScreen";
import type { Opponent } from "./opponents";

type Screen = { name: "home" } | { name: "matching" } | { name: "game"; opponent: Opponent; round: number };

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: "home" });

  return (
    <div className="app">
      {screen.name === "home" && <Home onStart={() => setScreen({ name: "matching" })} />}
      {screen.name === "matching" && (
        <Matching
          onCancel={() => setScreen({ name: "home" })}
          onMatched={(opponent) => setScreen({ name: "game", opponent, round: 1 })}
        />
      )}
      {screen.name === "game" && (
        <GameScreen
          key={screen.round}
          opponent={screen.opponent}
          onHome={() => setScreen({ name: "home" })}
          onRematch={() => setScreen({ name: "matching" })}
        />
      )}
    </div>
  );
}
