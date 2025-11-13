import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Events from './pages/Events';
import CellGroups from './pages/CellGroups';
import Departments from './pages/Departments';
import Trends from './pages/Trends';
import Analytics from './pages/Analytics';
import Admin from './pages/Admin';
import Login from './pages/Login';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="members" element={<Members />} />
            <Route path="events" element={<Events />} />
            <Route path="cell-groups" element={<CellGroups />} />
            <Route path="departments" element={<Departments />} />
            <Route path="trends" element={<Trends />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="admin" element={<Admin />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
