import { BrowserRouter, Routes, Route, Link, useLocation, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { lazy, Suspense, useState, useEffect } from 'react';
import { 
  Home, 
  Users, 
  Calendar, 
  BarChart3, 
  TrendingUp, 
  Settings,
  LogOut,
  Menu,
  X,
  Building
} from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import churchLogo from '@/assets/church-logo.png';

// Lazy load pages for better performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Members = lazy(() => import('./pages/Members'));
const Events = lazy(() => import('./pages/Events'));
const Groups = lazy(() => import('./pages/Groups'));
const Departments = lazy(() => import('./pages/Departments'));
const Trends = lazy(() => import('./pages/Trends'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Admin = lazy(() => import('./pages/Admin'));
const Login = lazy(() => import('./pages/Login'));
const Install = lazy(() => import('./pages/Install'));

// Loading spinner for lazy-loaded pages
const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

// Note: ErrorFallback is handled by the catch-all route redirecting to login

// Layout component with responsive sidebar
const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle navigation errors
  useEffect(() => {
    const handleNavigationError = () => {
      navigate('/login', { replace: true });
    };

    window.addEventListener('unhandledrejection', handleNavigationError);
    return () => window.removeEventListener('unhandledrejection', handleNavigationError);
  }, [navigate]);

  const navigationItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/members', icon: Users, label: 'Members' },
    { path: '/groups', icon: Users, label: 'Cell Groups' },
    { path: '/departments', icon: Building, label: 'Departments' },
    { path: '/events', icon: Calendar, label: 'Events' },
    { path: '/trends', icon: TrendingUp, label: 'Trends' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/admin', icon: Settings, label: 'Admin' },
  ];

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const getUserRoleDisplay = () => {
    if (!profile) return 'Guest';
    if (profile.admin_role === 'admin' || profile.pastor_role) return 'Administrator';
    if (profile.deacon_role) return 'Deacon';
    if (profile.group_leader) return 'Group Leader';
    if (profile.department_leader) return 'Department Leader';
    return 'Member';
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile menu button */}
      <button
        onClick={toggleSidebar}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Sidebar Overlay for mobile */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-40
        w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <Link 
            to="/" 
            className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white"
            onClick={closeSidebar}
          >
            <img src={churchLogo} alt="CFC Logo" className="h-12 w-auto object-contain" />
            <span className="text-xs leading-tight">
              <span className="block font-bold">Christian Family</span>
              <span className="block">Church</span>
            </span>
          </Link>
        </div>

        {/* User Info */}
        {profile && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">Welcome back,</div>
            <div className="font-medium text-gray-900 dark:text-white">
              {profile.name} {profile.surname}
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {getUserRoleDisplay()}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)]">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeSidebar}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                  ${isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-r-2 border-blue-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                  }
                `}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              closeSidebar();
              logout();
            }}
            className="flex items-center gap-3 w-full px-4 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-all duration-200"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden md:ml-0">
        {/* Top Bar for mobile */}
        <div className="md:hidden h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-center">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            {navigationItems.find(item => item.path === location.pathname)?.label || 'Church App'}
          </h1>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
          <div className="max-w-7xl mx-auto">
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/install" element={<Install />} />
            
            {/* Protected routes */}
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="members" element={<Members />} />
              <Route path="events" element={<Events />} />
              <Route path="groups" element={<Groups />} />
              <Route path="departments" element={<Departments />} />
              <Route path="trends" element={<Trends />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="admin" element={<Admin />} />
            </Route>
            
            {/* Catch-all route - redirect to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
