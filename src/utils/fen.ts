import { Color, GameState, Move, Piece, PieceType, Position } from "../types/chess";

/**
 * 象棋 FEN 解析与生成。
 * 格式参考 UCCI/UCI 扩展：
 *   "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1"
 * 小写 = 黑方，大写 = 红方；w = 红走，b = 黑走。
 */

const PIECE_MAP: Record<string, Piece> = {};
const PIECE_LETTERS: Record<string, { type: PieceType; color: Color }> = {
  k: { type: PieceType.KING, color: Color.BLACK },
  a: { type: PieceType.ADVISOR, color: Color.BLACK },
  b: { type: PieceType.ELEPHANT, color: Color.BLACK },
  n: { type: PieceType.KNIGHT, color: Color.BLACK },
  r: { type: PieceType.ROOK, color: Color.BLACK },
  c: { type: PieceType.CANNON, color: Color.BLACK },
  p: { type: PieceType.PAWN, color: Color.BLACK },
  K: { type: PieceType.KING, color: Color.RED },
  A: { type: PieceType.ADVISOR, color: Color.RED },
  B: { type: PieceType.ELEPHANT, color: Color.RED },
  N: { type: PieceType.KNIGHT, color: Color.RED },
  R: { type: PieceType.ROOK, color: Color.RED },
  C: { type: PieceType.CANNON, color: Color.RED },
  P: { type: PieceType.PAWN, color: Color.RED },
};

for (const [letter, def] of Object.entries(PIECE_LETTERS)) {
  PIECE_MAP[letter] = { type: def.type, color: def.color };
}

/** 初始局面 FEN */
export const INITIAL_FEN =
  "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1";

/** 解析 FEN 到二维棋盘数组 [rank][file]，rank 0 为黑方底线（第 10 行） */
export function parseFen(fen: string): (Piece | null)[][] {
  const board: (Piece | null)[][] = Array.from({ length: 10 }, () =>
    Array(9).fill(null)
  );
  const rows = fen.split(" ")[0].split("/");
  for (let r = 0; r < 10; r++) {
    const row = rows[r];
    let file = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) {
        file += parseInt(ch, 10);
      } else {
        // FEN 第一行是黑方底行（rank 9）
        board[9 - r][file] = PIECE_MAP[ch] ?? null;
        file++;
      }
    }
  }
  return board;
}

/** 根据棋盘数组生成 FEN */
export function boardToFen(board: (Piece | null)[][], active: Color): string {
  const rows: string[] = [];
  for (let r = 9; r >= 0; r--) {
    let row = "";
    let empty = 0;
    for (let f = 0; f < 9; f++) {
      const p = board[r][f];
      if (p === null) {
        empty++;
      } else {
        if (empty > 0) {
          row += empty.toString();
          empty = 0;
        }
        const letter = Object.entries(PIECE_LETTERS).find(
          ([_, v]) => v.type === p.type && v.color === p.color
        )?.[0];
        row += letter ?? "?";
      }
    }
    if (empty > 0) row += empty.toString();
    rows.push(row);
  }
  return rows.join("/") + (active === Color.RED ? " w" : " b") + " - - 0 1";
}

/** UCI 记谱 "h2e2" → Position 对 */
export function uciToPositions(uci: string): { from: Position; to: Position } {
  const fileLetter = (c: string) => c.charCodeAt(0) - "a".charCodeAt(0);
  const rankNum = (c: string) => parseInt(c, 10);
  return {
    from: { file: fileLetter(uci[0]), rank: rankNum(uci[1]) },
    to: { file: fileLetter(uci[2]), rank: rankNum(uci[3]) },
  };
}

/** 初始游戏状态 */
export function initialGameState(): GameState {
  return {
    fen: INITIAL_FEN,
    activeColor: Color.RED,
    moves: [],
    inCheck: false,
    gameOver: false,
  };
}
