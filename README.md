# 象棋辅助 (Xiangqi Assistant)

基于 **React + TypeScript + Vite + Tauri v2** 的中国象棋辅助分析工具。

## 与 chessboard 的差异

- **UI 全新设计**：React 函数组件 + SVG 矢量棋盘，可任意缩放
- **引擎可插拔**：通过 UCI 协议抽象层接入任意引擎（皮卡鱼、佳佳象棋等），不绑定单一引擎
- **联网功能**：预留云端棋谱同步、在线对战接口
- **代码独立**：前端无 Vue 依赖，后端 Rust 重新实现

## 技术栈

| 层级 | 技术 |
|---|---|
| 前端 | React 18 + TypeScript + Vite |
| 棋盘 | 纯 SVG 渲染，支持高亮、提示、翻转 |
| 桌面壳 | Tauri v2 |
| 引擎接口 | UCI 协议（Rust 实现） |
| 引擎 | 默认支持皮卡鱼（Pikafish），可配置其他 UCI 引擎 |

## 开发

```bash
# 安装依赖（需 Node.js + pnpm）
pnpm install

# 启动前端开发服务器
pnpm dev

# 启动 Tauri 桌面应用（需 Rust 工具链）
pnpm tauri dev
```

## 环境要求

- Node.js 18+
- pnpm（或 npm/yarn）
- Rust stable（用于 Tauri 编译）
- 可选：皮卡鱼引擎（UCI 兼容）

## 许可证

MIT
