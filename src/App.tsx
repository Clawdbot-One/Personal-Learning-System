/**
 * LearnFlow 应用路由
 * 认证守卫 + 主布局嵌套路由
 */
import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Plans from '@/pages/Plans'
import DeepWork from '@/pages/DeepWork'
import KnowledgeGraph from '@/pages/KnowledgeGraph'
import Rewards from '@/pages/Rewards'
import Agent from '@/pages/Agent'
import Reader from '@/pages/Reader'

/** 认证守卫：未登录跳转登录页 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, initialized, fetchUser } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    if (!initialized) fetchUser()
  }, [initialized, fetchUser])

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 mx-auto mb-3 animate-pulse" />
          <p className="text-sm text-ink-400">加载中...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Layout>{children}</Layout>
}

/** 已登录时访问登录页则跳转仪表盘 */
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, initialized, fetchUser } = useAuthStore()
  useEffect(() => {
    if (!initialized) fetchUser()
  }, [initialized, fetchUser])

  if (initialized && user) {
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/plans" element={<ProtectedRoute><Plans /></ProtectedRoute>} />
        <Route path="/deep-work" element={<ProtectedRoute><DeepWork /></ProtectedRoute>} />
        <Route path="/knowledge" element={<ProtectedRoute><KnowledgeGraph /></ProtectedRoute>} />
        <Route path="/rewards" element={<ProtectedRoute><Rewards /></ProtectedRoute>} />
        <Route path="/agent" element={<ProtectedRoute><Agent /></ProtectedRoute>} />
        <Route path="/reader" element={<ProtectedRoute><Reader /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  )
}
