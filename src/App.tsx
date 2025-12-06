import { BrowserRouter, Routes, Route, Link, useLocation, Outlet, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
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
  Building,
  BookOpen,
  Shield
} from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import churchLogo from '@/assets/church-logo.png';

// Import DeveloperTools component
import DeveloperTools from './components/DeveloperTools';

// Lazy load pages for better performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Members = lazy(() => import('./pages/Members'));
const Events = lazy(() => import('./pages/Events'));
const Groups = lazy(() => import('./pages/Groups'));
const Departments = lazy(() => import('./pages/Departments'));
const Trends = lazy(() => import('./pages/Trends'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Admin = lazy(() => import('./pages/Admin'));
const UserManual = lazy(() => import('./pages/UserManual'));
const Login = lazy(() => import('./pages/Login'));
const DeveloperDashboard = lazy(() => import('./pages/DeveloperDashboard'));
const Unauthorized = lazy(() => import('./pages/Unauthorized'));

// Loading spinner for lazy-loaded pages
const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

// Role-based route access configuration
type RouteAccess = 'all' | 'admin_only' | 'no_settings' | 'developer_only';

// Protected Route component with role-based access
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!profile) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
};

const RouteGuard: React.FC<{ 
  children: React.ReactNode; 
  access: RouteAccess;
}> = ({ children, access }) => {
  const { profile, isDeveloper, isAdmin } = useAuth();

  if (!profile) {
    return <Navigate to="/login" />;
  }

  // Developer has access to everything
  if (isDeveloper()) {
    return <>{children}</>;
  }

  // Check access based on role
  switch (access) {
    case 'developer_only':
      if (!isDeveloper()) {
        return <Navigate to="/unauthorized" />;
      }
      break;
    
    case 'admin_only':
      // Only developer and admin can access settings/admin page
      // Pastor cannot access admin/settings
      if (!isAdmin() && !isDeveloper()) {
        return <Navigate to="/unauthorized" />;
      }
      break;
    
    case 'no_settings':
      // Pastor can access but not settings - this is handled in the admin page itself
      break;
    
    case 'all':
    default:
      // Everyone can access
      break;
  }

  return <>{children}</>;
};

// Layout component with responsive sidebar and role-based navigation
const Layout = () => {
  const location = useLocation();
  const { logout, profile, isDeveloper, isAdmin, isPastor, isDeacon, isGroupLeader, isDepartmentLeader } = useAuth();
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

  // Build navigation items based on user role
  const getNavigationItems = () => {
    const items = [
      { path: '/', icon: Home, label: 'Dashboard' },
      { path: '/trends', icon: TrendingUp, label: 'Trends' },
    ];

    // Developer and Admin see everything
    if (isDeveloper() || isAdmin()) {
      items.push(
        { path: '/members', icon: Users, label: 'Members' },
        { path: '/groups', icon: Users, label: 'Cell Groups' },
        { path: '/departments', icon: Building, label: 'Departments' },
        { path: '/events', icon: Calendar, label: 'Events' },
        { path: '/analytics', icon: BarChart3, label: 'Analytics' },
        { path: '/admin', icon: Settings, label: 'Admin' }
      );
    } 
    // Pastor sees everything except admin/settings
    else if (isPastor()) {
      items.push(
        { path: '/members', icon: Users, label: 'Members' },
        { path: '/groups', icon: Users, label: 'Cell Groups' },
        { path: '/departments', icon: Building, label: 'Departments' },
        { path: '/events', icon: Calendar, label: 'Events' },
        { path: '/analytics', icon: BarChart3, label: 'Analytics' }
      );
    }
    // Deacon sees everything but can only edit where they are leader
    else if (isDeacon()) {
      items.push(
        { path: '/members', icon: Users, label: 'Members' },
        { path: '/groups', icon: Users, label: 'Cell Groups' },
        { path: '/departments', icon: Building, label: 'Departments' },
        { path: '/events', icon: Calendar, label: 'Events' },
        { path: '/analytics', icon: BarChart3, label: 'Analytics' }
      );
    }
    // Group/Department leaders see their allocated areas
    else if (isGroupLeader() || isDepartmentLeader()) {
      if (isGroupLeader()) {
        items.push({ path: '/groups', icon: Users, label: 'Cell Groups' });
      }
      if (isDepartmentLeader()) {
        items.push({ path: '/departments', icon: Building, label: 'Departments' });
      }
      items.push(
        { path: '/members', icon: Users, label: 'Members' },
        { path: '/events', icon: Calendar, label: 'Events' }
      );
    }
    // Regular members see limited views
    else {
      items.push(
        { path: '/groups', icon: Users, label: 'Cell Groups' },
        { path: '/departments', icon: Building, label: 'Departments' },
        { path: '/events', icon: Calendar, label: 'Events' }
      );
    }

    // User manual for everyone
    items.push({ path: '/manual', icon: BookOpen, label: 'User Manual' });

    // Developer dashboard only for developers
    if (isDeveloper()) {
      items.push({ path: '/developer', icon: Shield, label: 'Developer' });
    }

    return items;
  };

  const navigationItems = getNavigationItems();

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
    if (profile.is_developer) return 'Developer';
    if (profile.admin_role === 'super_admin') return 'Super Admin';
    if (profile.admin_role === 'admin') return 'Administrator';
    if (profile.pastor_role) return 'Pastor';
    if (profile.deacon_role) return 'Deacon';
    if (profile.group_leader) return 'Group Leader';
    if (profile.department_leader) return 'Department Leader';
    if (profile.is_permanent_member) return 'Permanent Member';
    return 'Member';
  };

  const getStatusColor = () => {
    if (!profile) return 'text-gray-500';
    if (profile.is_developer) return 'text-purple-600 dark:text-purple-400';
    if (profile.admin_role === 'super_admin') return 'text-red-600 dark:text-red-400';
    if (profile.admin_role === 'admin') return 'text-blue-600 dark:text-blue-400';
    if (profile.pastor_role) return 'text-indigo-600 dark:text-indigo-400';
    if (profile.deacon_role) return 'text-green-600 dark:text-green-400';
    return 'text-gray-600 dark:text-gray-400';
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
              {profile.is_developer && (
                <span className="ml-2 text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                  DEV
                </span>
              )}
            </div>
            <div className={`text-xs mt-1 font-medium ${getStatusColor()}`}>
              {getUserRoleDisplay()}
            </div>
            {profile.phone && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {profile.phone}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
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
                <Icon className="h-5 w-5" />
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
        {isMobile && (
          <div className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-center">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {navigationItems.find(item => item.path === location.pathname)?.label || 'Church App'}
            </h1>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
          <div className="max-w-7xl mx-auto">
            <Outlet />
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
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="members" element={<Members />} />
              <Route path="events" element={<Events />} />
              <Route path="groups" element={<Groups />} />
              <Route path="departments" element={<Departments />} />
              <Route path="trends" element={<Trends />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="admin" element={
                <RouteGuard access="admin_only">
                  <Admin />
                </RouteGuard>
              } />
              <Route path="manual" element={<UserManual />} />
              <Route path="developer" element={
                <RouteGuard access="developer_only">
                  <DeveloperDashboard />
                </RouteGuard>
              } />
            </Route>
          </Routes>
        </Suspense>
        
        {/* Developer Tools (floating button for developer) */}
        <DeveloperTools />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;