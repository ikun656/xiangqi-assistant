import { useMemo, useState } from "react";
import { GameState, Piece, Position } from "../../types/chess";
import { parseFen } from "../../utils/fen";
import { PieceIcon } from "./PieceIcon";
import "./chessboard.css";

/**
 * SVG 矢量棋盘 —— 可任意缩放、支持高亮、可走子提示。
 * 坐标系：file 0-8（从左到右）、rank 0-9（从下到上，红方视角）。
 */

interface Props {
  state: GameState;
  /** 翻转视角（执黑时） */
  flipped?: boolean;
  /** 允许用户走子回调 */
  onMove?: (from: Position, to: Position) => void;
  /** 最后一步高亮 */
  highlightLastMove?: boolean;
  /** 引擎推荐走法提示 */
  hintMove?: { from: Position; to: Position } | null;
}

const CELL = 60;        // 每格像素
const MARGIN = 40;      // 边距
const WIDTH = MARGIN * 2 + CELL * 8;
const HEIGHT = MARGIN * 2 + CELL * 9;

/** 棋盘坐标 → SVG 像素 */
function toPixel(pos: Position, flipped: boolean) {
  const f = flipped ? 8 - pos.file : pos.file;
  const r = flipped ? pos.rank : 9 - pos.rank;
  return {
    x: MARGIN + f * CELL,
    y: MARGIN + r * CELL,
  };
}

export function Chessboard({
  state,
  flipped = false,
  onMove,
  highlightLastMove = true,
  hintMove = null,
}: Props) {
  const board = useMemo(() => parseFen(state.fen), [state.fen]);
  const [selected, setSelected] = useState<Position | null>(null);

  const lastMove = state.moves[state.moves.length - 1];

  const handleClick = (pos: Position) => {
    const piece = board[pos.rank][pos.file];
    if (selected) {
      if (selected.file === pos.file && selected.rank === pos.rank) {
        setSelected(null);
        return;
      }
      if (piece && piece.color === state.activeColor) {
        setSelected(pos);
        return;
      }
      onMove?.(selected, pos);
      setSelected(null);
    } else if (piece && piece.color === state.activeColor) {
      setSelected(pos);
    }
  };

  const renderGrid = () => {
    const lines: JSX.Element[] = [];
    // 横线
    for (let r = 0; r < 10; r++) {
      lines.push(
        <line
          key={`h${r}`}
          x1={MARGIN}
          y1={MARGIN + r * CELL}
          x2={MARGIN + 8 * CELL}
          y2={MARGIN + r * CELL}
          className="board-line"
        />
      );
    }
    // 竖线（左右两侧全贯通，中间分段留楚河汉界）
    for (let f = 0; f < 9; f++) {
      if (f === 0 || f === 8) {
        lines.push(
          <line
            key={`v${f}`}
            x1={MARGIN + f * CELL}
            y1={MARGIN}
            x2={MARGIN + f * CELL}
            y2={MARGIN + 9 * CELL}
            className="board-line"
          />
        );
      } else {
        // 上半（黑方）
        lines.push(
          <line
            key={`v${f}t`}
            x1={MARGIN + f * CELL}
            y1={MARGIN}
            x2={MARGIN + f * CELL}
            y2={MARGIN + 4 * CELL}
            className="board-line"
          />
        );
        // 下半（红方）
        lines.push(
          <line
            key={`v${f}b`}
            x1={MARGIN + f * CELL}
            y1={MARGIN + 5 * CELL}
            x2={MARGIN + f * CELL}
            y2={MARGIN + 9 * CELL}
            className="board-line"
          />
        );
      }
    }
    // 九宫斜线
    const palace: [Position, Position][] = [
      [{ file: 3, rank: 0 }, { file: 5, rank: 2 }],
      [{ file: 5, rank: 0 }, { file: 3, rank: 2 }],
      [{ file: 3, rank: 7 }, { file: 5, rank: 9 }],
      [{ file: 5, rank: 7 }, { file: 3, rank: 9 }],
    ];
    palace.forEach(([a, b], i) => {
      const pa = toPixel(a, flipped);
      const pb = toPixel(b, flipped);
      lines.push(
        <line
          key={`p${i}`}
          x1={pa.x}
          y1={pa.y}
          x2={pb.x}
          y2={pb.y}
          className="board-line"
        />
      );
    });
    return lines;
  };

  const renderRiver = () => {
    const y = MARGIN + 4 * CELL + CELL / 2;
    return (
      <g className="river-text">
        <text x={MARGIN + CELL * 2} y={y} textAnchor="middle" dominantBaseline="central">
          楚 河
        </text>
        <text x={MARGIN + CELL * 6} y={y} textAnchor="middle" dominantBaseline="central">
          汉 界
        </text>
      </g>
    );
  };

  const renderPieces = () => {
    const nodes: JSX.Element[] = [];
    for (let r = 0; r < 10; r++) {
      for (let f = 0; f < 9; f++) {
        const piece: Piece | null = board[r][f];
        if (!piece) continue;
        const { x, y } = toPixel({ file: f, rank: r }, flipped);
        nodes.push(
          <g key={`${f}-${r}`} transform={`translate(${x - CELL / 2}, ${y - CELL / 2})`}>
            <PieceIcon type={piece.type} color={piece.color} size={CELL * 0.85} />
          </g>
        );
      }
    }
    return nodes;
  };

  const renderMarkers = () => {
    const marks: JSX.Element[] = [];
    if (highlightLastMove && lastMove) {
      [lastMove.from, lastMove.to].forEach((pos, i) => {
        const p = toPixel(pos, flipped);
        marks.push(
          <circle
            key={`last${i}`}
            cx={p.x}
            cy={p.y}
            r={CELL * 0.46}
            className="mark-last"
          />
        );
      });
    }
    if (selected) {
      const p = toPixel(selected, flipped);
      marks.push(
        <circle key="sel" cx={p.x} cy={p.y} r={CELL * 0.46} className="mark-selected" />
      );
    }
    if (hintMove) {
      [hintMove.from, hintMove.to].forEach((pos, i) => {
        const p = toPixel(pos, flipped);
        marks.push(
          <circle
            key={`hint${i}`}
            cx={p.x}
            cy={p.y}
            r={CELL * 0.46}
            className="mark-hint"
          />
        );
      });
    }
    return marks;
  };

  const renderClickLayer = () => {
    const nodes: JSX.Element[] = [];
    for (let r = 0; r < 10; r++) {
      for (let f = 0; f < 9; f++) {
        const pos: Position = { file: f, rank: r };
        const p = toPixel(pos, flipped);
        nodes.push(
          <rect
            key={`c${f}-${r}`}
            x={p.x - CELL / 2}
            y={p.y - CELL / 2}
            width={CELL}
            height={CELL}
            fill="transparent"
            onClick={() => handleClick(pos)}
          />
        );
      }
    }
    return nodes;
  };

  return (
    <div className="chessboard-container">
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <rect
          x={0}
          y={0}
          width={WIDTH}
          height={HEIGHT}
          className="board-bg"
          rx={8}
        />
        {renderGrid()}
        {renderRiver()}
        {renderMarkers()}
        {renderPieces()}
        {renderClickLayer()}
      </svg>
    </div>
  );
}
