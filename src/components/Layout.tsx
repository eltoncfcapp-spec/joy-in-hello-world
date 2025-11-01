import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, DollarSign, UsersRound, Shield, Menu, X, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Layout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/members', icon: Users, label: 'Members' },
    { to: '/events', icon: Calendar, label: 'Events' },
    { to: '/donations', icon: DollarSign, label: 'Donations' },
    { to: '/groups', icon: UsersRound, label: 'Groups' },
    { to: '/admin', icon: Shield, label: 'Admin' },
  ];

  return (
    <div className="min-h-screen gradient-bg flex">
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-primary/20 backdrop-blur-sm rounded-lg border border-primary/30"
      >
        {mobileMenuOpen ? <X className="h-6 w-6 text-primary-foreground" /> : <Menu className="h-6 w-6 text-primary-foreground" />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 bg-background/10 backdrop-blur-xl border-r border-primary/20
        transform transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6">
          <h1 className="text-2xl font-bold gradient-text mb-8">Church App</h1>
          
          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'text-foreground/70 hover:bg-primary/10 hover:text-foreground'
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="absolute bottom-6 left-6 right-6 space-y-3">
            <div className="px-4 py-3 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground">Logged in as</p>
              <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <Outlet />
      </main>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;
