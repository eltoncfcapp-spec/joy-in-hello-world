import { Settings, Users, Database, Shield, Bell, Mail, X, Search, Key, Copy, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';

interface Member {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  role: string;
  permissions: string[];
  is_active: boolean;
  cell_group: string | null;
  department: string | null;
  login_username: string | null;
  login_pin: string | null;
  assigned_groups: string[];
  assigned_departments: string[];
  can_add_members: boolean;
  can_edit_members: boolean;
  can_view_own_data: boolean;
  cell_group_id?: string | null;
  status?: string | null;
  created_at?: string | null;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  type: 'cell_group' | 'department';
}

// Cloud service functions using Supabase
const cloudService = {
  // Fetch members from Supabase
  async getMembers(): Promise<Member[]> {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching members:', error);
        throw error;
      }

      // Transform the data to match the Member interface with safe defaults
      const members: Member[] = (data || []).map(member => ({
        id: member.id,
        name: member.name || '',
        surname: member.surname || '',
        email: member.email,
        phone: member.phone,
        role: member.role || 'member',
        permissions: Array.isArray(member.permissions) ? member.permissions : [],
        is_active: member.is_active !== false,
        cell_group: member.cell_group || null,
        department: member.department || null,
        login_username: member.login_username || null,
        login_pin: member.login_pin || null,
        assigned_groups: Array.isArray(member.assigned_groups) ? member.assigned_groups : [],
        assigned_departments: Array.isArray(member.assigned_departments) ? member.assigned_departments : [],
        can_add_members: Boolean(member.can_add_members),
        can_edit_members: Boolean(member.can_edit_members),
        can_view_own_data: Boolean(member.can_view_own_data),
        cell_group_id: member.cell_group_id,
        status: member.status,
        created_at: member.created_at
      }));

      return members;
    } catch (error) {
      console.error('Error fetching members:', error);
      throw error;
    }
  },

  // Fetch groups from Supabase
  async getGroups(): Promise<Group[]> {
    try {
      // Get cell groups
      const { data: cellGroupsData, error: cellGroupsError } = await supabase
        .from('cell_groups')
        .select('id, name, description')
        .order('name');

      if (cellGroupsError) {
        console.error('Supabase error fetching cell groups:', cellGroupsError);
        throw cellGroupsError;
      }

      // Transform cell groups
      const cellGroups: Group[] = (cellGroupsData || []).map(group => ({
        id: group.id,
        name: group.name || 'Unnamed Group',
        description: group.description,
        type: 'cell_group'
      }));

      // For departments, we'll create them from cell groups for now
      // You might want to create a separate departments table later
      const departments: Group[] = (cellGroupsData || []).map(group => ({
        id: `dept-${group.id}`,
        name: `${group.name || 'Unnamed'} Department`,
        description: group.description,
        type: 'department'
      }));

      return [...cellGroups, ...departments];
    } catch (error) {
      console.error('Error fetching groups:', error);
      throw error;
    }
  },

  // Update member in Supabase
  async updateMember(memberId: string, updates: Partial<Member>): Promise<Member> {
    try {
      console.log('Updating member:', memberId, updates);

      // Prepare the update data - only include fields that exist in the database
      const updateData: any = {
        role: updates.role,
        permissions: updates.permissions || [],
        assigned_groups: updates.assigned_groups || [],
        assigned_departments: updates.assigned_departments || [],
        can_add_members: Boolean(updates.can_add_members),
        can_edit_members: Boolean(updates.can_edit_members),
        can_view_own_data: Boolean(updates.can_view_own_data),
        login_username: updates.login_username || null,
        login_pin: updates.login_pin || null,
        updated_at: new Date().toISOString()
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const { data, error } = await supabase
        .from('members')
        .update(updateData)
        .eq('id', memberId)
        .select()
        .single();

      if (error) {
        console.error('Supabase update error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned from update');
      }

      // Transform the response
      const updatedMember: Member = {
        id: data.id,
        name: data.name || '',
        surname: data.surname || '',
        email: data.email,
        phone: data.phone,
        role: data.role || 'member',
        permissions: Array.isArray(data.permissions) ? data.permissions : [],
        is_active: data.is_active !== false,
        cell_group: data.cell_group || null,
        department: data.department || null,
        login_username: data.login_username || null,
        login_pin: data.login_pin || null,
        assigned_groups: Array.isArray(data.assigned_groups) ? data.assigned_groups : [],
        assigned_departments: Array.isArray(data.assigned_departments) ? data.assigned_departments : [],
        can_add_members: Boolean(data.can_add_members),
        can_edit_members: Boolean(data.can_edit_members),
        can_view_own_data: Boolean(data.can_view_own_data)
      };

      return updatedMember;
    } catch (error) {
      console.error('Error updating member:', error);
      throw error;
    }
  },

  // Generate credentials
  async generateCredentials(memberId: string): Promise<{ username: string; pin: string }> {
    try {
      // Generate random credentials
      const username = `user${Date.now()}`;
      const pin = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit PIN
      
      console.log('Generating credentials for member:', memberId, { username, pin });

      // Update member with new credentials
      await this.updateMember(memberId, {
        login_username: username,
        login_pin: pin
      });
      
      return { username, pin };
    } catch (error) {
      console.error('Error generating credentials:', error);
      throw error;
    }
  }
};

const Admin = () => {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedUser, setSelectedUser] = useState<Member | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{username: string; pin: string} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);

  const [userFormData, setUserFormData] = useState<{
    role: string;
    permissions: string[];
    assigned_groups: string[];
    assigned_departments: string[];
    can_add_members: boolean;
    can_edit_members: boolean;
    can_view_own_data: boolean;
    login_username: string;
    login_pin: string;
  }>({
    role: 'member',
    permissions: [],
    assigned_groups: [],
    assigned_departments: [],
    can_add_members: false,
    can_edit_members: false,
    can_view_own_data: false,
    login_username: '',
    login_pin: ''
  });

  // Load data from Supabase on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Loading admin data...');
      const [membersData, groupsData] = await Promise.all([
        cloudService.getMembers(),
        cloudService.getGroups()
      ]);
      
      console.log('Data loaded:', { members: membersData.length, groups: groupsData.length });
      setMembers(membersData);
      setGroups(groupsData);
      setInitialLoad(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
      console.error('Error loading data:', err);
      setInitialLoad(false);
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { value: 'member', label: 'Member', description: 'Basic access to personal profile' },
    { value: 'group_leader', label: 'Group Leader', description: 'Can manage assigned groups and view members' },
    { value: 'department_leader', label: 'Department Leader', description: 'Can manage assigned departments' },
    { value: 'deacon', label: 'Deacon', description: 'Extended access to ministry areas' },
    { value: 'pastor', label: 'Pastor', description: 'Full administrative access' },
    { value: 'admin', label: 'Administrator', description: 'Complete system access' },
  ];

  const permissions = [
    { value: 'view_members', label: 'View Members', description: 'Can see member directory' },
    { value: 'add_members', label: 'Add Members', description: 'Can add new members' },
    { value: 'edit_members', label: 'Edit Members', description: 'Can modify member information' },
    { value: 'delete_members', label: 'Delete Members', description: 'Can remove members' },
    { value: 'view_groups', label: 'View Groups', description: 'Can see all groups' },
    { value: 'manage_groups', label: 'Manage Groups', description: 'Can create and edit groups' },
    { value: 'view_events', label: 'View Events', description: 'Can see event calendar' },
    { value: 'manage_events', label: 'Manage Events', description: 'Can create and edit events' },
    { value: 'view_donations', label: 'View Donations', description: 'Can see donation records' },
    { value: 'manage_donations', label: 'Manage Donations', description: 'Can record and edit donations' },
    { value: 'view_reports', label: 'View Reports', description: 'Can access analytics and reports' },
    { value: 'admin_access', label: 'Admin Access', description: 'Full system administration' },
  ];

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

  const handleGenerateCredentials = async () => {
    if (!selectedUser) return;
    
    setLoading(true);
    setError(null);
    try {
      const credentials = await cloudService.generateCredentials(selectedUser.id);
      
      setUserFormData(prev => ({
        ...prev,
        login_username: credentials.username,
        login_pin: credentials.pin
      }));
      
      setGeneratedCredentials(credentials);
      setShowCredentials(true);
      
      // Refresh the members list to show updated credentials
      await loadData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate credentials';
      setError(errorMessage);
      console.error('Error generating credentials:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    if (generatedCredentials) {
      const text = `Username: ${generatedCredentials.username}\nPIN: ${generatedCredentials.pin}`;
      navigator.clipboard.writeText(text);
      alert('Credentials copied to clipboard!');
    }
  };

  const openModal = (modalType: string, user?: Member) => {
    setActiveModal(modalType);
    setError(null);
    
    if (user) {
      setSelectedUser(user);
      setUserFormData({
        role: user.role || 'member',
        permissions: user.permissions || [],
        assigned_groups: user.assigned_groups || [],
        assigned_departments: user.assigned_departments || [],
        can_add_members: user.can_add_members || false,
        can_edit_members: user.can_edit_members || false,
        can_view_own_data: user.can_view_own_data || false,
        login_username: user.login_username || '',
        login_pin: user.login_pin || ''
      });
      setShowCredentials(false);
      setGeneratedCredentials(null);
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedUser(null);
    setUserFormData({
      role: 'member',
      permissions: [],
      assigned_groups: [],
      assigned_departments: [],
      can_add_members: false,
      can_edit_members: false,
      can_view_own_data: false,
      login_username: '',
      login_pin: ''
    });
    setShowCredentials(false);
    setGeneratedCredentials(null);
    setError(null);
  };

  const handleUserUpdate = async () => {
    if (!selectedUser) return;

    setLoading(true);
    setError(null);
    
    try {
      console.log('Starting user update for:', selectedUser.id);
      console.log('Update data:', userFormData);

      const updatedMember = await cloudService.updateMember(selectedUser.id, {
        role: userFormData.role,
        permissions: userFormData.permissions,
        assigned_groups: userFormData.assigned_groups,
        assigned_departments: userFormData.assigned_departments,
        can_add_members: userFormData.can_add_members,
        can_edit_members: userFormData.can_edit_members,
        can_view_own_data: userFormData.can_view_own_data,
        login_username: userFormData.login_username,
        login_pin: userFormData.login_pin
      });

      // Update local state
      setMembers(prev => prev.map(m => 
        m.id === selectedUser.id ? updatedMember : m
      ));
      
      alert('User updated successfully!');
      closeModal();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user';
      setError(errorMessage);
      console.error('Error updating user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (permission: string) => {
    setUserFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  const handleGroupToggle = (groupName: string) => {
    setUserFormData(prev => ({
      ...prev,
      assigned_groups: prev.assigned_groups.includes(groupName)
        ? prev.assigned_groups.filter(g => g !== groupName)
        : [...prev.assigned_groups, groupName]
    }));
  };

  const handleDepartmentToggle = (deptName: string) => {
    setUserFormData(prev => ({
      ...prev,
      assigned_departments: prev.assigned_departments.includes(deptName)
        ? prev.assigned_departments.filter(d => d !== deptName)
        : [...prev.assigned_departments, deptName]
    }));
  };

  const getRolePermissions = (role: string): string[] => {
    const rolePermissions: Record<string, string[]> = {
      member: ['view_members', 'view_events', 'view_groups'],
      group_leader: ['view_members', 'add_members', 'edit_members', 'view_events', 'view_groups', 'manage_groups'],
      department_leader: ['view_members', 'add_members', 'edit_members', 'view_events', 'view_groups', 'manage_groups'],
      deacon: ['view_members', 'add_members', 'edit_members', 'view_events', 'view_groups', 'manage_groups', 'view_donations'],
      pastor: ['view_members', 'add_members', 'edit_members', 'view_events', 'manage_events', 'view_groups', 'manage_groups', 'view_donations', 'view_reports'],
      admin: ['admin_access']
    };
    return rolePermissions[role] || [];
  };

  const filteredMembers = members.filter(member =>
    `${member.name} ${member.surname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    member.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const cellGroups = groups.filter(g => g.type === 'cell_group');
  const departments = groups.filter(g => g.type === 'department');

  const Modal = ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
          <button 
            onClick={closeModal}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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

  if (initialLoad) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Admin Panel
            </h1>
            <p className="text-gray-600">Manage system settings and user permissions</p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <p className="text-red-700 font-medium">{error}</p>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {adminSections.map((section) => (
            <button
              key={section.title}
              onClick={() => openModal(section.modal)}
              className="bg-white border border-gray-200 rounded-2xl p-6 hover:scale-105 transition-all duration-200 hover:shadow-xl text-left group"
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center mb-4 shadow-lg`}>
                <section.icon className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{section.title}</h3>
              <p className="text-gray-600 text-sm">{section.description}</p>
            </button>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
            <button
              onClick={() => openModal('users')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              <Users className="h-4 w-4" />
              Manage All Users
            </button>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading users...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No users found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {member.name.charAt(0)}{member.surname.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {member.name} {member.surname}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {member.email} • {roles.find(r => r.value === member.role)?.label || member.role}
                      </p>
                      {member.login_username && (
                        <p className="text-xs text-blue-600 mt-1">
                          <Key className="h-3 w-3 inline mr-1" />
                          Login: {member.login_username}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {member.assigned_groups.length > 0 && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        {member.assigned_groups.length} Group{member.assigned_groups.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {member.assigned_departments.length > 0 && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        {member.assigned_departments.length} Dept{member.assigned_departments.length > 1 ? 's' : ''}
                      </span>
                    )}
                    <button
                      onClick={() => openModal('userDetails', member)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                    >
                      Manage
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Role Statistics</h2>
            <div className="space-y-4">
              {roles.map(role => {
                const count = members.filter(m => m.role === role.value).length;
                return (
                  <div key={role.value} className="flex justify-between items-center">
                    <span className="text-gray-600">{role.label}</span>
                    <span className="text-gray-900 font-semibold">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Stats</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Members</span>
                <span className="text-gray-900 font-semibold">{members.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Active Groups</span>
                <span className="text-gray-900 font-semibold">{cellGroups.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Departments</span>
                <span className="text-gray-900 font-semibold">{departments.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Users with Login</span>
                <span className="text-gray-900 font-semibold">
                  {members.filter(m => m.login_username).length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        {activeModal === 'users' && (
          <Modal title="User Management">
            <div className="space-y-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by name, email, or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading users...</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {member.name.charAt(0)}{member.surname.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {member.name} {member.surname}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {member.email} • {roles.find(r => r.value === member.role)?.label || member.role}
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
              )}
            </div>
          </Modal>
        )}

        {activeModal === 'userDetails' && selectedUser && (
          <Modal title={`Manage User - ${selectedUser.name} ${selectedUser.surname}`}>
            <div className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-red-700 font-medium">{error}</p>
                </div>
              )}

              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    {selectedUser.name.charAt(0)}{selectedUser.surname.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">
                      {selectedUser.name} {selectedUser.surname}
                    </h4>
                    <p className="text-gray-600">{selectedUser.email}</p>
                    <p className="text-sm text-gray-500">{selectedUser.phone}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {roles.map(role => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-500">
                    {roles.find(r => r.value === userFormData.role)?.description}
                  </p>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Login Credentials
                  </label>
                  <button
                    onClick={handleGenerateCredentials}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors font-medium disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Generating...' : 'Generate Login Credentials'}
                  </button>
                  
                  {showCredentials && generatedCredentials && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-green-900">Generated Credentials</span>
                        <button
                          onClick={handleCopyCredentials}
                          className="flex items-center gap-1 text-green-700 hover:text-green-900"
                        >
                          <Copy className="h-4 w-4" />
                          <span className="text-xs">Copy</span>
                        </button>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs text-green-700">Username:</span>
                          <p className="font-mono font-semibold text-green-900">{generatedCredentials.username}</p>
                        </div>
                        <div>
                          <span className="text-xs text-green-700">PIN:</span>
                          <p className="font-mono font-semibold text-green-900 text-2xl tracking-wider">{generatedCredentials.pin}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {(userFormData.role === 'group_leader' || userFormData.role === 'department_leader') && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Leadership Permissions</h4>
                    <p className="text-sm text-blue-700 mb-4">
                      Configure what this leader can do within their assigned groups/departments
                    </p>
                    
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={userFormData.can_add_members}
                          onChange={(e) => setUserFormData(prev => ({...prev, can_add_members: e.target.checked}))}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <div>
                          <span className="font-medium text-gray-900">Can Add Members</span>
                          <p className="text-xs text-gray-500">Allow adding new members to assigned groups</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={userFormData.can_edit_members}
                          onChange={(e) => setUserFormData(prev => ({...prev, can_edit_members: e.target.checked}))}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <div>
                          <span className="font-medium text-gray-900">Can Edit Members</span>
                          <p className="text-xs text-gray-500">Allow editing member information in assigned groups</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={userFormData.can_view_own_data}
                          onChange={(e) => setUserFormData(prev => ({...prev, can_view_own_data: e.target.checked}))}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <div>
                          <span className="font-medium text-gray-900">Can View & Edit Own Group/Department Data</span>
                          <p className="text-xs text-gray-500">Full access to view and edit all data within assigned areas</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {userFormData.role === 'group_leader' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Assigned Cell Groups
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {cellGroups.map(group => (
                          <label
                            key={group.id}
                            className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={userFormData.assigned_groups.includes(group.name)}
                              onChange={() => handleGroupToggle(group.name)}
                              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <div>
                              <span className="font-medium text-gray-900">{group.name}</span>
                              <p className="text-xs text-gray-500">{group.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {userFormData.role === 'department_leader' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Assigned Departments
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {departments.map(dept => (
                          <label
                            key={dept.id}
                            className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={userFormData.assigned_departments.includes(dept.name)}
                              onChange={() => handleDepartmentToggle(dept.name)}
                              className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                            />
                            <div>
                              <span className="font-medium text-gray-900">{dept.name}</span>
                              <p className="text-xs text-gray-500">{dept.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  System Permissions
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-2">
                  {permissions.map(permission => (
                    <label
                      key={permission.value}
                      className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={userFormData.permissions.includes(permission.value)}
                        onChange={() => handlePermissionToggle(permission.value)}
                        className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">{permission.label}</span>
                        <p className="text-xs text-gray-500">{permission.description}</p>
                      </div>
                    </label>
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
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Other modals */}
        {activeModal === 'data' && (
          <Modal title="Data Management">
            <div className="space-y-6">
              <div className="text-center py-8">
                <Database className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Data Management</h3>
                <p className="text-gray-600">Import, export, and manage church data</p>
              </div>
            </div>
          </Modal>
        )}

        {activeModal === 'security' && (
          <Modal title="Security Settings">
            <div className="space-y-6">
              <div className="text-center py-8">
                <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Security Settings</h3>
                <p className="text-gray-600">Configure security preferences and audit logs</p>
              </div>
            </div>
          </Modal>
        )}

        {activeModal === 'notifications' && (
          <Modal title="Notification Settings">
            <div className="space-y-6">
              <div className="text-center py-8">
                <Bell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Notification Settings</h3>
                <p className="text-gray-600">Configure email and push notifications</p>
              </div>
            </div>
          </Modal>
        )}

        {activeModal === 'communication' && (
          <Modal title="Communication Settings">
            <div className="space-y-6">
              <div className="text-center py-8">
                <Mail className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Communication Settings</h3>
                <p className="text-gray-600">Email templates and messaging settings</p>
              </div>
            </div>
          </Modal>
        )}

        {activeModal === 'general' && (
          <Modal title="General Settings">
            <div className="space-y-6">
              <div className="text-center py-8">
                <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">General Settings</h3>
                <p className="text-gray-600">Configure church information and preferences</p>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default Admin;
