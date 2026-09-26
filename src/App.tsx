import { useState } from "react";
import { Chessboard } from "./components/Chessboard/Chessboard";
import { initialGameState } from "./utils/fen";
import { GameState, Position } from "./types/chess";
import { useEngine } from "./hooks/useEngine";

function App() {
  const [gameState, setGameState] = useState<GameState>(initialGameState());
  const { ready, analysis, thinking, initEngine, analyze, stop } = useEngine();

  const handleMove = (from: Position, to: Position) => {
    // TODO: 本地规则校验（合法走法判断）
    // TODO: 更新 FEN、切换走子方、记录历史
    console.log("move", from, to);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>象棋辅助</h1>
        <div>
          {thinking ? "分析中..." : ready ? "引擎就绪" : "引擎未启动"}
        </div>
      </header>

      <Chessboard
        state={gameState}
        onMove={handleMove}
        highlightLastMove
        hintMove={analysis?.lines[0]?.pv?.[0] ? {
          from: analysis.lines[0].pv[0].from,
          to: analysis.lines[0].pv[0].to,
        } : null}
      />

      <aside className="panel">
        <h2>分析</h2>
        {analysis ? (
          analysis.lines.map((line, i) => (
            <div key={i} className="analysis-line">
              <span className={line.scoreCp >= 0 ? "score-positive" : "score-negative"}>
                {line.mate ? `M${line.scoreCp}` : (line.scoreCp / 100).toFixed(2)}
              </span>
              {" 深度 " + line.depth}
            </div>
          ))
        ) : (
          <div>暂无分析数据</div>
        )}
      </aside>
    </div>
  );
}

export default App;
