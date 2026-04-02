import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout       from './components/layout/Layout';
import AuthPage     from './components/auth/AuthPage';
import Dashboard    from './components/quiz/Dashboard';
import ExamList     from './components/quiz/ExamList';
import QuizInterface from './components/quiz/QuizInterface';
import ProgressPage from './components/quiz/ProgressPage';
import BulkImport   from './components/admin/BulkImport';
import UserManagement from './components/admin/UserManagement';
import AuditLogs    from './components/admin/AuditLogs';

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <span className="spinner w-7 h-7" />
    </div>
  );
}

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading)           return <Spinner />;
  if (!user)             return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user)    return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><AuthPage /></PublicRoute>} />
          <Route path="/"      element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/exams"     element={<ProtectedRoute><ExamList /></ProtectedRoute>} />
          <Route path="/exams/:id" element={<ProtectedRoute><QuizInterface /></ProtectedRoute>} />
          <Route path="/progress"  element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />

          <Route path="/admin/import" element={<ProtectedRoute adminOnly><BulkImport /></ProtectedRoute>} />
          <Route path="/admin/users"  element={<ProtectedRoute adminOnly><UserManagement /></ProtectedRoute>} />
          <Route path="/admin/logs"   element={<ProtectedRoute adminOnly><AuditLogs /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
