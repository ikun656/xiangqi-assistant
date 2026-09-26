//! UCI 引擎抽象层
//!
//! 通过标准 UCI 协议与外部引擎（皮卡鱼、佳佳象棋等）通信。
//! 引擎路径、权重、参数均可配置，支持热插拔。

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::Stdio;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use thiserror::Error;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, ChildStdin, ChildStdout, Command};
use tokio::sync::{oneshot, Mutex};

#[derive(Error, Debug)]
pub enum EngineError {
    #[error("引擎未初始化")]
    NotInitialized,
    #[error("引擎启动失败: {0}")]
    SpawnFailed(String),
    #[error("IO 错误: {0}")]
    Io(#[from] std::io::Error),
    #[error("协议错误: {0}")]
    Protocol(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineConfig {
    pub engine_path: String,
    pub nnue_path: Option<String>,
    pub threads: Option<u32>,
    pub hash_size: Option<u32>,
}

#[derive(Debug, Clone, Serialize)]
pub struct EngineLine {
    pub depth: u32,
    pub score_cp: i32,
    pub mate: bool,
    pub pv: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct AnalysisPayload {
    pub fen: String,
    pub lines: Vec<EngineLine>,
    pub engine_name: String,
}

struct EngineInner {
    _child: Child,
    stdin: ChildStdin,
    stdout: BufReader<ChildStdout>,
    name: String,
}

pub struct EngineState {
    inner: Arc<Mutex<Option<EngineInner>>>,
}

impl EngineState {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(None)),
        }
    }
}

impl Default for EngineState {
    fn default() -> Self {
        Self::new()
    }
}

async fn read_line(stdout: &mut BufReader<ChildStdout>) -> Result<String, EngineError> {
    let mut line = String::new();
    let n = stdout.read_line(&mut line).await?;
    if n == 0 {
        return Err(EngineError::Protocol("引擎进程已退出".into()));
    }
    Ok(line.trim().to_string())
}

async fn send_cmd(stdin: &mut ChildStdin, cmd: &str) -> Result<(), EngineError> {
    stdin.write_all(cmd.as_bytes()).await?;
    stdin.write_all(b"\n").await?;
    stdin.flush().await?;
    Ok(())
}

#[tauri::command]
pub async fn init_engine(
    config: EngineConfig,
    app: AppHandle,
) -> Result<(), EngineError> {
    let state = app.state::<EngineState>();
    let mut guard = state.inner.lock().await;

    // 关闭旧引擎
    if let Some(mut old) = guard.take() {
        let _ = old.stdin.write_all(b"quit\n").await;
    }

    let mut cmd = Command::new(&config.engine_path);
    cmd.stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .kill_on_drop(true);

    // 附加参数（如 --nnue）
    if let Some(nnue) = &config.nnue_path {
        cmd.arg("--nnue").arg(nnue);
    }

    let mut child = cmd
        .spawn()
        .map_err(|e| EngineError::SpawnFailed(e.to_string()))?;

    let stdin = child.stdin.take().ok_or(EngineError::Protocol("无法获取 stdin".into()))?;
    let stdout = child.stdout.take().ok_or(EngineError::Protocol("无法获取 stdout".into()))?;

    let mut inner = EngineInner {
        _child: child,
        stdin,
        stdout: BufReader::new(stdout),
        name: "unknown".to_string(),
    };

    // UCI 握手
    send_cmd(&mut inner.stdin, "uci").await?;
    loop {
        let line = read_line(&mut inner.stdout).await?;
        if line.starts_with("id name") {
            inner.name = line.trim_start_matches("id name").trim().to_string();
        }
        if line == "uciok" {
            break;
        }
    }

    // 设置选项
    if let Some(threads) = config.threads {
        send_cmd(&mut inner.stdin, &format!("setoption name Threads value {}", threads)).await?;
    }
    if let Some(hash) = config.hash_size {
        send_cmd(&mut inner.stdin, &format!("setoption name Hash value {}", hash)).await?;
    }

    send_cmd(&mut inner.stdin, "isready").await?;
    loop {
        let line = read_line(&mut inner.stdout).await?;
        if line == "readyok" {
            break;
        }
    }

    *guard = Some(inner);
    Ok(())
}

#[tauri::command]
pub async fn analyze(
    fen: String,
    depth: u32,
    multi_pv: u32,
    app: AppHandle,
) -> Result<(), EngineError> {
    let state = app.state::<EngineState>();
    let mut guard = state.inner.lock().await;
    let inner = guard.as_mut().ok_or(EngineError::NotInitialized)?;

    // 设置 MultiPV
    send_cmd(&mut inner.stdin, &format!("setoption name MultiPV value {}", multi_pv)).await?;

    // 设置局面
    send_cmd(&mut inner.stdin, &format!("position fen {}", fen)).await?;

    // 开始搜索
    send_cmd(&mut inner.stdin, &format!("go depth {}", depth)).await?;

    let engine_name = inner.name.clone();
    let app_handle = app.clone();
    let fen_clone = fen.clone();

    // 启动后台任务读取分析结果
    tokio::spawn(async move {
        let mut lines: HashMap<u32, EngineLine> = HashMap::new();

        loop {
            let line = match read_line(&mut inner.stdout).await {
                Ok(l) => l,
                Err(_) => break,
            };

            if line.starts_with("info") {
                // 解析 info depth X score cp Y multipv Z pv ...
                if let Some(parsed) = parse_info(&line) {
                    let idx = parsed.multipv.unwrap_or(1);
                    let entry = lines.entry(idx).or_insert(EngineLine {
                        depth: parsed.depth.unwrap_or(0),
                        score_cp: parsed.score_cp.unwrap_or(0),
                        mate: parsed.mate,
                        pv: parsed.pv.clone(),
                    });
                    // 更新到最新深度
                    if parsed.depth.unwrap_or(0) >= entry.depth {
                        *entry = EngineLine {
                            depth: parsed.depth.unwrap_or(0),
                            score_cp: parsed.score_cp.unwrap_or(0),
                            mate: parsed.mate,
                            pv: parsed.pv.clone(),
                        };
                    }

                    // 推送当前快照
                    let mut snapshot: Vec<_> = lines.values().cloned().collect();
                    snapshot.sort_by_key(|l| std::cmp::Reverse(l.depth));
                    let _ = app_handle.emit(
                        "engine-analysis",
                        AnalysisPayload {
                            fen: fen_clone.clone(),
                            lines: snapshot,
                            engine_name: engine_name.clone(),
                        },
                    );
                }
            } else if line.starts_with("bestmove") {
                let _ = app_handle.emit("engine-bestmove", line);
                break;
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn stop(app: AppHandle) -> Result<(), EngineError> {
    let state = app.state::<EngineState>();
    let mut guard = state.inner.lock().await;
    if let Some(inner) = guard.as_mut() {
        send_cmd(&mut inner.stdin, "stop").await?;
    }
    Ok(())
}

#[tauri::command]
pub async fn shutdown(app: AppHandle) -> Result<(), EngineError> {
    let state = app.state::<EngineState>();
    let mut guard = state.inner.lock().await;
    if let Some(mut inner) = guard.take() {
        let _ = inner.stdin.write_all(b"quit\n").await;
    }
    Ok(())
}

// ---------- 内部解析 ----------

struct InfoParsed {
    depth: Option<u32>,
    score_cp: Option<i32>,
    mate: bool,
    multipv: Option<u32>,
    pv: Vec<String>,
}

fn parse_info(line: &str) -> Option<InfoParsed> {
    let mut result = InfoParsed {
        depth: None,
        score_cp: None,
        mate: false,
        multipv: None,
        pv: Vec::new(),
    };

    let mut tokens = line.split_whitespace().peekable();
    while let Some(tok) = tokens.next() {
        match tok {
            "depth" => result.depth = tokens.next()?.parse().ok(),
            "score" => {
                let kind = tokens.next()?;
                let value: i32 = tokens.next()?.parse().ok()?;
                match kind {
                    "cp" => result.score_cp = Some(value),
                    "mate" => {
                        result.mate = true;
                        result.score_cp = Some(value);
                    }
                    _ => {}
                }
            }
            "multipv" => result.multipv = tokens.next()?.parse().ok(),
            "pv" => {
                result.pv = tokens.map(|s| s.to_string()).collect();
                break;
            }
            _ => {}
        }
    }

    if result.depth.is_some() || !result.pv.is_empty() {
        Some(result)
    } else {
        None
    }
}
