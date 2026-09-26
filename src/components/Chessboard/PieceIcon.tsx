import { Color, PieceType } from "../../types/chess";

/**
 * SVG 棋子组件：完全矢量绘制，可任意缩放（区别于 chessboard 的图片贴图）。
 * 使用系统字体渲染汉字，配合阴影实现立体感。
 */

interface Props {
  type: PieceType;
  color: Color;
  size?: number;
}

const RED_GLYPH: Record<PieceType, string> = {
  [PieceType.KING]: "帅",
  [PieceType.ADVISOR]: "仕",
  [PieceType.ELEPHANT]: "相",
  [PieceType.KNIGHT]: "傌",
  [PieceType.ROOK]: "俥",
  [PieceType.CANNON]: "炮",
  [PieceType.PAWN]: "兵",
};

const BLACK_GLYPH: Record<PieceType, string> = {
  [PieceType.KING]: "将",
  [PieceType.ADVISOR]: "士",
  [PieceType.ELEPHANT]: "象",
  [PieceType.KNIGHT]: "马",
  [PieceType.ROOK]: "车",
  [PieceType.CANNON]: "砲",
  [PieceType.PAWN]: "卒",
};

export function PieceIcon({ type, color, size = 40 }: Props) {
  const glyph = color === Color.RED ? RED_GLYPH[type] : BLACK_GLYPH[type];
  const pieceColor = color === Color.RED ? "#c0392b" : "#2c3e50";
  const r = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <radialGradient id={`grad-${color}-${type}`} cx="35%" cy="30%">
          <stop offset="0%" stopColor="#fdf5e6" />
          <stop offset="70%" stopColor="#f0dcb8" />
          <stop offset="100%" stopColor="#d9c193" />
        </radialGradient>
      </defs>
      {/* 外圈 */}
      <circle
        cx={r}
        cy={r}
        r={r - 1}
        fill={`url(#grad-${color}-${type})`}
        stroke={pieceColor}
        strokeWidth={size * 0.04}
      />
      {/* 内圈装饰 */}
      <circle
        cx={r}
        cy={r}
        r={r * 0.78}
        fill="none"
        stroke={pieceColor}
        strokeWidth={size * 0.015}
        opacity={0.5}
      />
      {/* 汉字 */}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size * 0.5}
        fontWeight="bold"
        fill={pieceColor}
        fontFamily="'KaiTi','STKaiti','楷体',serif"
      >
        {glyph}
      </text>
    </svg>
  );
}
