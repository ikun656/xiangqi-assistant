//! 游戏状态与走法管理
//!
//! 纯内存实现，不依赖外部库。走法合法性校验预留接口。

use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub file: u32,
    pub rank: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Move {
    pub from: Position,
    pub to: Position,
    pub uci: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct GameSnapshot {
    pub fen: String,
    pub moves: Vec<Move>,
    pub active_color: String,
}

pub struct GameState {
    inner: Mutex<GameSnapshot>,
}

impl GameState {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(GameSnapshot {
                fen: "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1".into(),
                moves: Vec::new(),
                active_color: "red".into(),
            }),
        }
    }
}

impl Default for GameState {
    fn default() -> Self {
        Self::new()
    }
}

#[tauri::command]
pub fn new_game(app: AppHandle) -> GameSnapshot {
    let state = app.state::<GameState>();
    let mut g = state.inner.lock().unwrap();
    g.fen = "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1".into();
    g.moves.clear();
    g.active_color = "red".into();
    g.clone()
}

#[tauri::command]
pub fn make_move(from: Position, to: Position, app: AppHandle) -> Result<GameSnapshot, String> {
    let state = app.state::<GameState>();
    let mut g = state.inner.lock().unwrap();

    // TODO: 接入本地规则引擎（如基于位运算的象棋库）做合法性校验
    // 目前先记录走法，由前端控制
    let uci = format!(
        "{}{}{}{}",
        (b'a' + from.file as u8) as char,
        from.rank,
        (b'a' + to.file as u8) as char,
        to.rank
    );
    g.moves.push(Move { from, to, uci });
    g.active_color = if g.active_color == "red" { "black".into() } else { "red".into() };

    // TODO: 重新计算 FEN
    Ok(g.clone())
}

#[tauri::command]
pub fn get_fen(app: AppHandle) -> String {
    let state = app.state::<GameState>();
    state.inner.lock().unwrap().fen.clone()
}

#[tauri::command]
pub fn get_moves(app: AppHandle) -> Vec<Move> {
    let state = app.state::<GameState>();
    state.inner.lock().unwrap().moves.clone()
}

#[tauri::command]
pub fn undo_move(app: AppHandle) -> GameSnapshot {
    let state = app.state::<GameState>();
    let mut g = state.inner.lock().unwrap();
    g.moves.pop();
    g.active_color = if g.active_color == "red" { "black".into() } else { "red".into() };
    g.clone()
}
