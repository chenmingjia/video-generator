# e-video-generator

AI 短剧生成平台（示例骨架，已包含前后端与 4 个顶部 Tab）。

## 目录结构
- `backend/`：Express 后端（AI 生成接口占位）
- `frontend/`：Vite + React 前端（4 个模块 Tab + 调用后端接口）

## 本地启动（需要安装依赖）
1. 安装后端依赖
   - `cd backend`
   - `npm install`
   - `npm run dev`
2. 安装前端依赖
   - `cd frontend`
   - `npm install`
   - `npm run dev`

前端默认运行在 `http://localhost:5173`，后端默认运行在 `http://localhost:3001`。

## 功能说明（占位逻辑）
- `AI 编剧`：生成短剧标题与分段脚本
- `AI 短视频生成`：根据脚本生成分镜计划
- `AI 音乐`：根据情绪生成音乐计划
- `AI 剪辑`：根据分镜与音乐生成剪辑计划（输出占位）

