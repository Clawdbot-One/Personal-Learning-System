import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import Layout from "@/components/Layout";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Plans from "@/pages/Plans";
import Practice from "@/pages/Practice";
import Reader from "@/pages/Reader";
import DeepWork from "@/pages/DeepWork";
import KnowledgeGraph from "@/pages/KnowledgeGraph";
import CriticalThinking from "@/pages/CriticalThinking";
import Rewards from "@/pages/Rewards";
import Agent from "@/pages/Agent";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, initialized } = useAuthStore();
  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-ink-400">加载中...</div>
      </div>
    );
  }
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Auth />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/plans"
          element={
            <ProtectedRoute>
              <Layout>
                <Plans />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/practice"
          element={
            <ProtectedRoute>
              <Layout>
                <Practice />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reader"
          element={
            <ProtectedRoute>
              <Layout>
                <Reader />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/deep-work"
          element={
            <ProtectedRoute>
              <Layout>
                <DeepWork />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/knowledge"
          element={
            <ProtectedRoute>
              <Layout>
                <KnowledgeGraph />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/critical"
          element={
            <ProtectedRoute>
              <Layout>
                <CriticalThinking />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/rewards"
          element={
            <ProtectedRoute>
              <Layout>
                <Rewards />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/agent"
          element={
            <ProtectedRoute>
              <Layout>
                <Agent />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}
