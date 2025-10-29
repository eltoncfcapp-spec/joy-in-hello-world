import { Settings, Users, Database, Shield, Bell, Mail } from 'lucide-react';

const Admin = () => {
  const adminSections = [
    {
      icon: Settings,
      title: 'General Settings',
      description: 'Configure church information and preferences',
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: Users,
      title: 'User Management',
      description: 'Manage roles, permissions, and access control',
      color: 'from-purple-500 to-purple-600',
    },
    {
      icon: Database,
      title: 'Data Management',
      description: 'Backup, import, and export church data',
      color: 'from-green-500 to-green-600',
    },
    {
      icon: Shield,
      title: 'Security',
      description: 'Security settings and audit logs',
      color: 'from-red-500 to-red-600',
    },
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Configure email and push notifications',
      color: 'from-orange-500 to-orange-600',
    },
    {
      icon: Mail,
      title: 'Communication',
      description: 'Email templates and messaging settings',
      color: 'from-pink-500 to-pink-600',
    },
  ];

  const recentActivity = [
    { action: 'User "John Doe" updated profile', time: '5 minutes ago', type: 'info' },
    { action: 'New event "Youth Meeting" created', time: '15 minutes ago', type: 'success' },
    { action: 'System backup completed', time: '1 hour ago', type: 'success' },
    { action: 'Failed login attempt detected', time: '2 hours ago', type: 'warning' },
  ];

  const typeColors: Record<string, string> = {
    info: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-orange-500',
  };

  return (
    <div className="animate-fadeIn">
      <h1 className="text-4xl font-bold gradient-text mb-8">Admin Panel</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {adminSections.map((section) => (
          <button
            key={section.title}
            className="bg-background/10 backdrop-blur-xl border border-primary/20 rounded-xl p-6 hover:scale-105 transition-all duration-200 text-left"
          >
            <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${section.color} flex items-center justify-center mb-4`}>
              <section.icon className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">{section.title}</h3>
            <p className="text-foreground/60 text-sm">{section.description}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-background/10 backdrop-blur-xl border border-primary/20 rounded-xl p-6">
          <h2 className="text-2xl font-bold text-foreground mb-4">System Status</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-foreground/70">Database</span>
              <span className="flex items-center gap-2 text-green-400">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                Healthy
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-foreground/70">Storage</span>
              <span className="text-foreground">45% Used</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-foreground/70">Last Backup</span>
              <span className="text-foreground">1 hour ago</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-foreground/70">Active Users</span>
              <span className="text-foreground">12 online</span>
            </div>
          </div>
        </div>

        <div className="bg-background/10 backdrop-blur-xl border border-primary/20 rounded-xl p-6">
          <h2 className="text-2xl font-bold text-foreground mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full ${typeColors[activity.type]} mt-2`} />
                <div className="flex-1">
                  <p className="text-foreground/80 text-sm">{activity.action}</p>
                  <p className="text-foreground/50 text-xs">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
