#!/usr/bin/env bash
# LearnFlow — one-command dev launcher (backend + frontend)
# Usage:  ./dev.sh
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "🌊 LearnFlow 开发模式启动"
echo "========================"

# --- backend ---
echo "▶ 启动后端 (FastAPI @ :8000)..."
cd "$ROOT/backend"
if [ ! -d "venv" ]; then
  python -m venv venv 2>/dev/null || true
fi
# install deps if missing
if ! python -c "import fastapi" 2>/dev/null; then
  pip install -q -r requirements.txt
fi
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
echo "  后端 PID: $BACKEND_PID"

# --- frontend ---
echo "▶ 启动前端 (Vite @ :5173)..."
cd "$ROOT/frontend"
if [ ! -d "node_modules" ]; then
  npm install --no-audit --no-fund
fi
npm run dev &
FRONTEND_PID=$!
echo "  前端 PID: $FRONTEND_PID"

echo ""
echo "✅ 启动完成"
echo "   前端:  http://localhost:5173"
echo "   后端:  http://localhost:8000/docs"
echo "   按 Ctrl+C 停止所有服务"

trap "echo; echo '正在停止...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
