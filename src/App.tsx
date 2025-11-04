import { BrowserRouter, Routes, Route, Link, useLocation, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Events from './pages/Events';
import Groups from './pages/Groups';
import Trends from './pages/Trends';
import Analytics from './pages/Analytics';
import Admin from './pages/Admin';
import Login from './pages/Login';
import { 
  Home, 
  Users, 
  Calendar, 
  BarChart3, 
  TrendingUp, 
  Settings,
  LogOut
} from 'lucide-react';
import { useAuth } from './contexts/AuthContext';

// Layout component with navigation
const Layout = () => {
  const location = useLocation();
  const { signOut } = useAuth();

  const navigationItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/members', icon: Users, label: 'Members' },
    { path: '/groups', icon: Users, label: 'Groups' },
    { path: '/events', icon: Calendar, label: 'Events' },
    { path: '/trends', icon: TrendingUp, label: 'Trends' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/admin', icon: Settings, label: 'Admin' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Top Navigation */}
      <nav className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link to="/" className="font-bold text-xl text-gray-900 dark:text-white">
                Church App
              </Link>
              <div className="flex space-x-1">
                {navigationItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
};

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
            <Route path="groups" element={<Groups />} />
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
