import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Groups from './pages/Groups';
import CellGroups from './pages/CellGroups';
import Events from './pages/Events';
import Analytics from './pages/Analytics';
import Trends from './pages/Trends';
import Admin from './pages/Admin';
import Index from './pages/Index';
import Departments from './pages/Departments';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/welcome" element={<Index />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="members" element={<Members />} />
            <Route path="groups" element={<Groups />} />
            <Route path="cell-groups" element={<CellGroups />} />
            <Route path="departments" element={<Departments />} />
            <Route path="events" element={<Events />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="trends" element={<Trends />} />
            <Route path="admin" element={<Admin />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
