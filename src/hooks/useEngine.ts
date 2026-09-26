import { useCallback, useEffect, useRef, useState } from "react";
import { EngineAnalysis } from "../types/chess";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

/**
 * 引擎 Hook：与 Rust 后端通信，管理 UCI 引擎生命周期。
 *
 * 设计要点（与 chessboard 区别）：
 * - 引擎配置完全外置（可换 exe、换权重、换参数）
 * - 通过 Tauri 事件推送分析结果，支持多 PV 变例
 * - 引擎抽象在 Rust 侧，前端只发 FEN 收分析
 */

export interface EngineConfig {
  /** 引擎可执行文件路径 */
  enginePath: string;
  /** NNUE 权重文件（可选） */
  nnuePath?: string;
  /** 搜索线程数 */
  threads?: number;
  /** Hash 大小（MB） */
  hashSize?: number;
}

export function useEngine() {
  const [ready, setReady] = useState(false);
  const [analysis, setAnalysis] = useState<EngineAnalysis | null>(null);
  const [thinking, setThinking] = useState(false);
  const unlistenRef = useRef<(() => void) | null>(null);

  /** 初始化引擎 */
  const initEngine = useCallback(async (config: EngineConfig) => {
    await invoke("engine_init", { config });
    setReady(true);
  }, []);

  /** 请求分析某个局面 */
  const analyze = useCallback(
    async (fen: string, depth = 20, multiPv = 3) => {
      if (!ready) return;
      setThinking(true);
      await invoke("engine_analyze", { fen, depth, multiPv });
    },
    [ready]
  );

  /** 停止分析 */
  const stop = useCallback(async () => {
    await invoke("engine_stop");
    setThinking(false);
  }, []);

  /** 订阅后端推送的分析事件 */
  useEffect(() => {
    let mounted = true;
    (async () => {
      const un = await listen<EngineAnalysis>("engine-analysis", (event) => {
        if (!mounted) return;
        setAnalysis(event.payload);
      });
      const unDone = await listen("engine-bestmove", () => {
        if (!mounted) return;
        setThinking(false);
      });
      unlistenRef.current = () => {
        un();
        unDone();
      };
    })();
    return () => {
      mounted = false;
      unlistenRef.current?.();
    };
  }, []);

  /** 卸载时停止引擎 */
  useEffect(() => {
    return () => {
      invoke("engine_shutdown").catch(() => {});
    };
  }, []);

  return { ready, analysis, thinking, initEngine, analyze, stop };
}
