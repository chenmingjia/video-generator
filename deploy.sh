#!/bin/bash

# ==============================================================================
# Video Generator 一键部署/重启脚本
# 用法: 
#   ./deploy.sh
# 作用: 
#   1. 拉取最新代码
#   2. 更新前后端依赖
#   3. 重新构建前端
#   4. 重启 PM2 前后端服务
# ==============================================================================

# 遇到错误即停止执行
set -e

echo "🚀 开始部署更新 [Video Generator]..."

# 1. 拉取最新代码
echo "📦 正在拉取最新代码..."
git pull origin main || git pull origin master

# 2. 更新后端依赖并重启
echo "⚙️ 正在更新后端..."
cd backend
pnpm install
echo "🔄 重启后端服务 (video-backend)..."
# 如果进程存在则重启，不存在则启动
pm2 restart video-backend || pm2 start src/index.js --name "video-backend"
cd ..

# 3. 更新前端依赖、构建并重启
echo "🎨 正在更新前端..."
cd frontend
pnpm install
echo "🏗️ 正在构建前端生产代码..."
pnpm run build
echo "🔄 重启前端服务 (video-frontend)..."
# 如果进程存在则重启，不存在则启动
pm2 restart video-frontend || pm2 start "pnpm run preview -- --host" --name "video-frontend"
cd ..

# 4. 保存 PM2 状态
echo "💾 保存 PM2 状态..."
pm2 save

echo "✅ 部署完成！"
echo "📊 当前运行状态："
pm2 list
