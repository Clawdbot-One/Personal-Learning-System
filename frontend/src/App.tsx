import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Plans from './pages/Plans'
import Focus from './pages/Focus'
import KnowledgeGraph from './pages/KnowledgeGraph'
import Reading from './pages/Reading'
import Practice from './pages/Practice'
import Critical from './pages/Critical'
import Action from './pages/Action'
import Rewards from './pages/Rewards'
import Analytics from './pages/Analytics'
import Agent from './pages/Agent'
import Social from './pages/Social'
import Settings from './pages/Settings'
import { useAuthStore } from './store/authStore'

function Protected({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="plans" element={<Plans />} />
        <Route path="focus" element={<Focus />} />
        <Route path="knowledge" element={<KnowledgeGraph />} />
        <Route path="reading" element={<Reading />} />
        <Route path="practice" element={<Practice />} />
        <Route path="critical" element={<Critical />} />
        <Route path="action" element={<Action />} />
        <Route path="rewards" element={<Rewards />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="agent" element={<Agent />} />
        <Route path="social" element={<Social />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
