import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import EntryPage from './pages/EntryPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import ReportsPage from './pages/ReportsPage';
import Layout from './components/Layout';

const ProtectedRoute = ({ children, pageName }) => {
  const { user, loading, checkPermission } = useAuth();
  
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  
  if (pageName && !checkPermission(pageName, 'view')) {
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute pageName="dashboard">
            <Layout>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/entry" element={
          <ProtectedRoute pageName="entryform">
            <Layout>
              <EntryPage />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/reports" element={
          <ProtectedRoute pageName="reports">
            <Layout>
              <ReportsPage />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute pageName="settings">
            <Layout>
              <SettingsPage />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;
