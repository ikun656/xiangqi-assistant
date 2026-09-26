/** 棋子类型（与引擎无关的内部表示） */
export enum PieceType {
  KING = "K",      // 将/帅
  ADVISOR = "A",   // 士/仕
  ELEPHANT = "B",  // 象/相
  KNIGHT = "N",    // 马/傌
  ROOK = "R",      // 车/俥
  CANNON = "C",    // 炮/砲
  PAWN = "P",      // 兵/卒
}

/** 阵营 */
export enum Color {
  RED = "red",
  BLACK = "black",
}

/** 棋盘坐标：file 0-8（列），rank 0-9（行，0 = 黑方底线） */
export interface Position {
  file: number;
  rank: number;
}

/** 棋子 */
export interface Piece {
  type: PieceType;
  color: Color;
}

/** 一步走法 */
export interface Move {
  from: Position;
  to: Position;
  piece?: Piece;
  captured?: Piece;
  /** UCI 记谱法，如 "h2e2" */
  uci?: string;
}

/** 局面状态 */
export interface GameState {
  /** FEN 字符串（描述局面） */
  fen: string;
  /** 当前走子方 */
  activeColor: Color;
  /** 走子历史 */
  moves: Move[];
  /** 是否将军 */
  inCheck: boolean;
  /** 是否终局 */
  gameOver: boolean;
}

/** 引擎分析结果（单条变例） */
export interface EngineLine {
  /** 深度 */
  depth: number;
  /** 评分（厘兵值，正值对当前走子方有利） */
  scoreCp: number;
  /** 是否杀棋 */
  mate: boolean;
  /** 主变 */
  pv: Move[];
}

/** 引擎分析输出 */
export interface EngineAnalysis {
  fen: string;
  lines: EngineLine[];
  /** 引擎名 */
  engineName: string;
}
