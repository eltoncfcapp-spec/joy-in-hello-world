import { Settings, Users, Database, Shield, Bell, Mail, X, Search, Edit, Trash2, Eye, EyeOff, UserPlus, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Member {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  role: string;
  permissions: string[];
  is_active: boolean;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
}

const Admin = () => {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedUser, setSelectedUser] = useState<Member | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const [userFormData, setUserFormData] = useState({
    role: 'member',
    permissions: [] as string[],
    assignedGroups: [] as string[],
  });

  const adminSections = [
    {
      icon: Settings,
      title: 'General Settings',
      description: 'Configure church information and preferences',
      color: 'from-blue-500 to-blue-600',
      modal: 'general'
    },
    {
      icon: Users,
      title: 'User Management',
      description: 'Manage roles, permissions, and access control',
      color: 'from-purple-500 to-purple-600',
      modal: 'users'
    },
    {
      icon: Database,
      title: 'Data Management',
      description: 'Backup, import, and export church data',
      color: 'from-green-500 to-green-600',
      modal: 'data'
    },
    {
      icon: Shield,
      title: 'Security',
      description: 'Security settings and audit logs',
      color: 'from-red-500 to-red-600',
      modal: 'security'
    },
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Configure email and push notifications',
      color: 'from-orange-500 to-orange-600',
      modal: 'notifications'
    },
    {
      icon: Mail,
      title: 'Communication',
      description: 'Email templates and messaging settings',
      color: 'from-pink-500 to-pink-600',
      modal: 'communication'
    },
  ];

  const roles = [
    { value: 'member', label: 'Member', description: 'Basic access to personal profile' },
    { value: 'leader', label: 'Group Leader', description: 'Can manage assigned groups and view members' },
    { value: 'deacon', label: 'Deacon', description: 'Extended access to ministry areas' },
    { value: 'pastor', label: 'Pastor', description: 'Full administrative access' },
    { value: 'admin', label: 'Administrator', description: 'Complete system access' },
  ];

  const permissions = [
    { value: 'view_members', label: 'View Members', description: 'Can see member directory' },
    { value: 'edit_members', label: 'Edit Members', description: 'Can modify member information' },
    { value: 'view_groups', label: 'View Groups', description: 'Can see all groups' },
    { value: 'manage_groups', label: 'Manage Groups', description: 'Can create and edit groups' },
    { value: 'view_events', label: 'View Events', description: 'Can see event calendar' },
    { value: 'manage_events', label: 'Manage Events', description: 'Can create and edit events' },
    { value: 'view_donations', label: 'View Donations', description: 'Can see donation records' },
    { value: 'manage_donations', label: 'Manage Donations', description: 'Can record and edit donations' },
    { value: 'view_reports', label: 'View Reports', description: 'Can access analytics and reports' },
    { value: 'admin_access', label: 'Admin Access', description: 'Full system administration' },
  ];

  const pageAccess = [
    { value: 'dashboard', label: 'Dashboard', description: 'Main dashboard overview' },
    { value: 'members', label: 'Members', description: 'Member directory and management' },
    { value: 'events', label: 'Events', description: 'Event calendar and management' },
    { value: 'groups', label: 'Groups', description: 'Groups and ministries' },
    { value: 'donations', label: 'Donations', description: 'Donation tracking' },
    { value: 'reports', label: 'Reports', description: 'Analytics and reporting' },
    { value: 'admin', label: 'Admin', description: 'Administration panel' },
  ];

  useEffect(() => {
    fetchMembers();
    fetchGroups();
  }, []);

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching members:', error);
    } else {
      // Initialize with default roles and permissions
      const membersWithRoles = data?.map(member => ({
        ...member,
        role: (member as any).role || 'member',
        permissions: (member as any).permissions || [],
        is_active: (member as any).is_active !== false
      })) || [];
      setMembers(membersWithRoles);
    }
  };

  const fetchGroups = async () => {
    const { data, error } = await supabase
      .from('cell_groups')
      .select('id, name, description')
      .order('name');

    if (error) {
      console.error('Error fetching groups:', error);
    } else {
      setGroups(data || []);
    }
  };

  const openModal = (modalType: string, user?: Member) => {
    setActiveModal(modalType);
    if (user) {
      setSelectedUser(user);
      setUserFormData({
        role: user.role || 'member',
        permissions: user.permissions || [],
        assignedGroups: [], // This would come from group_members table
      });
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedUser(null);
    setUserFormData({
      role: 'member',
      permissions: [],
      assignedGroups: [],
    });
  };

  const handleUserUpdate = async () => {
    if (!selectedUser) return;

    setLoading(true);
    const { error } = await supabase
      .from('members')
      .update({
        role: userFormData.role,
        permissions: userFormData.permissions,
        // Note: Group assignments would be handled in group_members table
      })
      .eq('id', selectedUser.id);

    if (error) {
      console.error('Error updating user:', error);
      alert('Error updating user');
    } else {
      fetchMembers();
      closeModal();
      alert('User updated successfully!');
    }
    setLoading(false);
  };

  const handlePermissionToggle = (permission: string) => {
    setUserFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  const getRolePermissions = (role: string) => {
    const rolePermissions: Record<string, string[]> = {
      member: ['view_members', 'view_events', 'view_groups'],
      leader: ['view_members', 'view_events', 'view_groups', 'manage_groups'],
      deacon: ['view_members', 'edit_members', 'view_events', 'view_groups', 'manage_groups', 'view_donations'],
      pastor: ['view_members', 'edit_members', 'view_events', 'manage_events', 'view_groups', 'manage_groups', 'view_donations', 'view_reports'],
      admin: ['admin_access']
    };
    return rolePermissions[role] || [];
  };

  const filteredMembers = members.filter(member =>
    `${member.name} ${member.surname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const Modal = ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h3>
          <button 
            onClick={closeModal}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 animate-fadeIn">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Admin Panel
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Manage system settings and user permissions</p>
          </div>
        </div>

        {/* Admin Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {adminSections.map((section) => (
            <button
              key={section.title}
              onClick={() => openModal(section.modal)}
              className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 hover:scale-105 transition-all duration-200 hover:shadow-xl text-left group"
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center mb-4 shadow-lg`}>
                <section.icon className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{section.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{section.description}</p>
            </button>
          ))}
        </div>

        {/* System Status Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">System Status</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Database</span>
                <span className="flex items-center gap-2 text-green-500">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Healthy
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Storage</span>
                <span className="text-gray-900 dark:text-white">45% Used</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Last Backup</span>
                <span className="text-gray-900 dark:text-white">1 hour ago</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Active Users</span>
                <span className="text-gray-900 dark:text-white">12 online</span>
              </div>
            </div>
          </div>

          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Quick Stats</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Total Members</span>
                <span className="text-gray-900 dark:text-white">{members.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Active Groups</span>
                <span className="text-gray-900 dark:text-white">{groups.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Leaders</span>
                <span className="text-gray-900 dark:text-white">
                  {members.filter(m => m.role === 'leader').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Pastors</span>
                <span className="text-gray-900 dark:text-white">
                  {members.filter(m => m.role === 'pastor').length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        {activeModal === 'users' && (
          <Modal title="User Management">
            <div className="space-y-6">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by name, email, or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Users List */}
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {member.name.charAt(0)}{member.surname.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {member.name} {member.surname}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {member.email} • {member.role}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => openModal('userDetails', member)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                    >
                      Manage
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </Modal>
        )}

        {activeModal === 'userDetails' && selectedUser && (
          <Modal title={`Manage User - ${selectedUser.name} ${selectedUser.surname}`}>
            <div className="space-y-6">
              {/* User Info */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {selectedUser.name.charAt(0)}{selectedUser.surname.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                      {selectedUser.name} {selectedUser.surname}
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400">{selectedUser.email}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{selectedUser.phone}</p>
                  </div>
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  User Role
                </label>
                <select
                  value={userFormData.role}
                  onChange={(e) => {
                    const newRole = e.target.value;
                    setUserFormData({
                      ...userFormData,
                      role: newRole,
                      permissions: getRolePermissions(newRole)
                    });
                  }}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {roles.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {roles.find(r => r.value === userFormData.role)?.description}
                </p>
              </div>

              {/* Page Access for Pastors */}
              {userFormData.role === 'pastor' && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Page Access Control
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {pageAccess.map(page => (
                      <div key={page.value} className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg">
                        <input
                          type="checkbox"
                          checked={userFormData.permissions.includes(`view_${page.value}`)}
                          onChange={() => handlePermissionToggle(`view_${page.value}`)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white text-sm">
                            {page.label}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {page.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Group Management for Leaders */}
              {userFormData.role === 'leader' && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Assigned Groups
                  </label>
                  <div className="space-y-3">
                    {groups.map(group => (
                      <div key={group.id} className="flex items-center justify-between p-3 border border-gray-300 dark:border-gray-600 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {group.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {group.description}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors">
                            <UserPlus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Permissions */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Permissions
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {permissions.map(permission => (
                    <div key={permission.value} className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg">
                      <input
                        type="checkbox"
                        checked={userFormData.permissions.includes(permission.value)}
                        onChange={() => handlePermissionToggle(permission.value)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white text-sm">
                          {permission.label}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {permission.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleUserUpdate}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 font-medium disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update User'}
                </button>
                <button
                  onClick={closeModal}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Add other modals for different sections */}
        {activeModal === 'general' && (
          <Modal title="General Settings">
            <div className="space-y-6">
              <p className="text-gray-600 dark:text-gray-400">Church information and system preferences coming soon...</p>
            </div>
          </Modal>
        )}

        {/* Add similar modals for other sections: data, security, notifications, communication */}
      </div>
    </div>
  );
};

export default Admin;
