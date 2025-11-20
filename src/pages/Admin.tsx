import { Settings, Users, Database, Shield, Bell, Mail, X, Search, Key, Copy, RefreshCw, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';

interface Member {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  admin_role: string; // Changed to match your schema
  pastor_role: boolean | null;
  deacon_role: boolean | null;
  group_leader: boolean | null;
  department_leader: boolean | null;
  permissions: string[];
  login_username: string | null;
  login_pin: string | null;
  assigned_groups: string[];
  assigned_departments: string[];
  can_add_members: boolean;
  can_edit_members: boolean;
  can_view_own_data: boolean;
  cell_group_id: string | null;
  status: string | null;
  created_at: string | null;
  is_admin: boolean | null; // Added this field
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  type: 'cell_group' | 'department';
}

// Helper function to get roles array from individual boolean fields
const getRolesFromMember = (member: Member): string[] => {
  const roles: string[] = [];
  
  if (member.admin_role && member.admin_role !== 'member') {
    roles.push(member.admin_role);
  }
  if (member.pastor_role) roles.push('pastor');
  if (member.deacon_role) roles.push('deacon');
  if (member.group_leader) roles.push('group_leader');
  if (member.department_leader) roles.push('department_leader');
  
  // If no specific roles, use admin_role or default to 'member'
  if (roles.length === 0) {
    roles.push(member.admin_role || 'member');
  }
  
  return roles;
};

// Helper function to set roles to individual boolean fields
const setRolesToMember = (roles: string[]): Partial<Member> => {
  const updateData: Partial<Member> = {
    pastor_role: false,
    deacon_role: false,
    group_leader: false,
    department_leader: false,
    is_admin: false
  };

  roles.forEach(role => {
    switch (role) {
      case 'admin':
        updateData.admin_role = 'admin';
        updateData.is_admin = true;
        break;
      case 'pastor':
        updateData.pastor_role = true;
        break;
      case 'deacon':
        updateData.deacon_role = true;
        break;
      case 'group_leader':
        updateData.group_leader = true;
        break;
      case 'department_leader':
        updateData.department_leader = true;
        break;
      case 'member':
        updateData.admin_role = 'member';
        break;
    }
  });

  // If no admin role specified, default to member
  if (!roles.includes('admin')) {
    updateData.admin_role = 'member';
  }

  return updateData;
};

// Cloud service functions using Supabase
const cloudService = {
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

      const members: Member[] = (data || []).map(member => ({
        id: member.id,
        name: member.name || '',
        surname: member.surname || '',
        email: member.email,
        phone: member.phone,
        admin_role: member.admin_role || 'member',
        pastor_role: member.pastor_role || false,
        deacon_role: member.deacon_role || false,
        group_leader: member.group_leader || false,
        department_leader: member.department_leader || false,
        is_admin: member.is_admin || false,
        permissions: Array.isArray(member.permissions) ? member.permissions : [],
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

  async getGroups(): Promise<Group[]> {
    try {
      const { data: cellGroupsData, error: cellGroupsError } = await supabase
        .from('cell_groups')
        .select('id, name, description')
        .order('name');

      if (cellGroupsError) {
        console.error('Supabase error fetching cell groups:', cellGroupsError);
        throw cellGroupsError;
      }

      const cellGroups: Group[] = (cellGroupsData || []).map(group => ({
        id: group.id,
        name: group.name || 'Unnamed Group',
        description: group.description,
        type: 'cell_group'
      }));

      // Get departments from your departments table
      const { data: departmentsData, error: departmentsError } = await supabase
        .from('departments')
        .select('id, name, description')
        .order('name');

      const departments: Group[] = (departmentsData || []).map(dept => ({
        id: dept.id,
        name: dept.name || 'Unnamed Department',
        description: dept.description,
        type: 'department'
      }));

      return [...cellGroups, ...departments];
    } catch (error) {
      console.error('Error fetching groups:', error);
      throw error;
    }
  },

  async updateMember(memberId: string, updates: Partial<Member>): Promise<Member> {
    try {
      console.log('Updating member:', memberId, updates);

      const updateData: any = {
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

      // Add role fields if they exist in updates
      if (updates.admin_role !== undefined) updateData.admin_role = updates.admin_role;
      if (updates.pastor_role !== undefined) updateData.pastor_role = updates.pastor_role;
      if (updates.deacon_role !== undefined) updateData.deacon_role = updates.deacon_role;
      if (updates.group_leader !== undefined) updateData.group_leader = updates.group_leader;
      if (updates.department_leader !== undefined) updateData.department_leader = updates.department_leader;
      if (updates.is_admin !== undefined) updateData.is_admin = updates.is_admin;

      console.log('Update data being sent:', updateData);

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

      const updatedMember: Member = {
        id: data.id,
        name: data.name || '',
        surname: data.surname || '',
        email: data.email,
        phone: data.phone,
        admin_role: data.admin_role || 'member',
        pastor_role: data.pastor_role || false,
        deacon_role: data.deacon_role || false,
        group_leader: data.group_leader || false,
        department_leader: data.department_leader || false,
        is_admin: data.is_admin || false,
        permissions: Array.isArray(data.permissions) ? data.permissions : [],
        login_username: data.login_username || null,
        login_pin: data.login_pin || null,
        assigned_groups: Array.isArray(data.assigned_groups) ? data.assigned_groups : [],
        assigned_departments: Array.isArray(data.assigned_departments) ? data.assigned_departments : [],
        can_add_members: Boolean(data.can_add_members),
        can_edit_members: Boolean(data.can_edit_members),
        can_view_own_data: Boolean(data.can_view_own_data),
        cell_group_id: data.cell_group_id,
        status: data.status,
        created_at: data.created_at
      };

      return updatedMember;
    } catch (error) {
      console.error('Error updating member:', error);
      throw error;
    }
  },

  async generateCredentials(memberId: string): Promise<{ username: string; pin: string }> {
    try {
      const username = `user${Date.now()}`;
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      
      console.log('Generating credentials for member:', memberId, { username, pin });

      await this.updateMember(memberId, {
        login_username: username,
        login_pin: pin
      });
      
      return { username, pin };
    } catch (error) {
      console.error('Error generating credentials:', error);
      throw error;
    }
  },

  async getCellGroupNameById(groupId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('cell_groups')
        .select('name')
        .eq('id', groupId)
        .single();

      if (error || !data) return null;
      return data.name;
    } catch (error) {
      console.error('Error fetching cell group name:', error);
      return null;
    }
  }
};

// Permission checking utility
const hasPermission = (userPermissions: string[] = [], requiredPermission: string): boolean => {
  return userPermissions.includes(requiredPermission) || userPermissions.includes('admin_access');
};

// Check if user has any of the target roles
const hasAnyRole = (member: Member, targetRoles: string[]): boolean => {
  const userRoles = getRolesFromMember(member);
  return userRoles.some(role => targetRoles.includes(role));
};

// Check if user is admin or pastor
const isAdminOrPastor = (member: Member): boolean => {
  return hasAnyRole(member, ['admin', 'pastor']) || member.is_admin === true;
};

// Check if user can manage groups
const canManageAllGroups = (permissions: string[] = []): boolean => {
  return hasPermission(permissions, 'manage_groups');
};

// Check if user is group leader
const isGroupLeader = (member: Member): boolean => {
  return member.group_leader === true;
};

// Check if user is department leader
const isDepartmentLeader = (member: Member): boolean => {
  return member.department_leader === true;
};

// Check if user is deacon
const isDeacon = (member: Member): boolean => {
  return member.deacon_role === true;
};

const Admin = () => {
  const { profile } = useAuth();
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
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [currentUserCellGroup, setCurrentUserCellGroup] = useState<string | null>(null);

  const [userFormData, setUserFormData] = useState<{
    roles: string[]; // Array of role strings
    permissions: string[];
    assigned_groups: string[];
    assigned_departments: string[];
    can_add_members: boolean;
    can_edit_members: boolean;
    can_view_own_data: boolean;
    login_username: string;
    login_pin: string;
  }>({
    roles: ['member'], // Default to array with 'member'
    permissions: [],
    assigned_groups: [],
    assigned_departments: [],
    can_add_members: false,
    can_edit_members: false,
    can_view_own_data: false,
    login_username: '',
    login_pin: ''
  });

  // Get role permissions for multiple roles
  const getRolePermissions = (roles: string[]): string[] => {
    const rolePermissions: Record<string, string[]> = {
      member: ['view_members', 'view_events', 'view_groups'],
      group_leader: ['view_members', 'add_members', 'edit_members', 'view_events', 'view_groups', 'manage_groups'],
      department_leader: ['view_members', 'add_members', 'edit_members', 'view_events', 'view_groups', 'manage_groups'],
      deacon: ['view_members', 'add_members', 'edit_members', 'view_events', 'view_groups', 'manage_groups', 'view_donations'],
      pastor: ['view_members', 'add_members', 'edit_members', 'view_events', 'manage_events', 'view_groups', 'manage_groups', 'view_donations', 'view_reports'],
      admin: ['admin_access']
    };

    // Combine permissions from all roles
    const combinedPermissions = new Set<string>();
    roles.forEach(role => {
      const permissions = rolePermissions[role] || [];
      permissions.forEach(permission => combinedPermissions.add(permission));
    });

    return Array.from(combinedPermissions);
  };

  // Check permissions and load data
  useEffect(() => {
    const checkAccessAndLoadData = async () => {
      if (!profile) {
        setHasAccess(false);
        setInitialLoad(false);
        return;
      }

      // Convert profile to Member-like structure for permission checking
      const currentUser: Member = {
        id: profile.id,
        name: profile.name || '',
        surname: profile.surname || '',
        email: profile.email,
        phone: profile.phone || null,
        admin_role: profile.admin_role || 'member',
        pastor_role: profile.pastor_role || false,
        deacon_role: profile.deacon_role || false,
        group_leader: profile.group_leader || false,
        department_leader: profile.department_leader || false,
        is_admin: profile.is_admin || false,
        permissions: profile.permissions || [],
        login_username: profile.login_username || null,
        login_pin: profile.login_pin || null,
        assigned_groups: profile.assigned_groups || [],
        assigned_departments: profile.assigned_departments || [],
        can_add_members: profile.can_add_members || false,
        can_edit_members: profile.can_edit_members || false,
        can_view_own_data: profile.can_view_own_data || false,
        cell_group_id: profile.cell_group_id,
        status: profile.status,
        created_at: profile.created_at
      };

      // Fetch current user's cell group name if they have a cell_group_id
      if (profile.cell_group_id) {
        const groupName = await cloudService.getCellGroupNameById(profile.cell_group_id);
        setCurrentUserCellGroup(groupName);
      }

      // Admin, Pastor, or users with manage_groups permission have full access
      const userHasAccess = 
        isAdminOrPastor(currentUser) || 
        canManageAllGroups(profile.permissions) ||
        hasPermission(profile.permissions, 'view_members');
      
      setHasAccess(userHasAccess);

      if (userHasAccess) {
        await loadData();
      } else {
        setInitialLoad(false);
      }
    };

    checkAccessAndLoadData();
  }, [profile]);

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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
      setInitialLoad(false);
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
      modal: 'general',
      permission: 'admin_access'
    },
    {
      icon: Users,
      title: 'User Management',
      description: 'Manage roles, permissions, and access control',
      color: 'from-purple-500 to-purple-600',
      modal: 'users',
      permission: 'view_members'
    },
    {
      icon: Database,
      title: 'Data Management',
      description: 'Backup, import, and export church data',
      color: 'from-green-500 to-green-600',
      modal: 'data',
      permission: 'admin_access'
    },
    {
      icon: Shield,
      title: 'Security',
      description: 'Security settings and audit logs',
      color: 'from-red-500 to-red-600',
      modal: 'security',
      permission: 'admin_access'
    },
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Configure email and push notifications',
      color: 'from-orange-500 to-orange-600',
      modal: 'notifications',
      permission: 'admin_access'
    },
    {
      icon: Mail,
      title: 'Communication',
      description: 'Email templates and messaging settings',
      color: 'from-pink-500 to-pink-600',
      modal: 'communication',
      permission: 'admin_access'
    },
  ];

  const handleGenerateCredentials = async () => {
    if (!selectedUser) return;
    
    // Convert profile to Member-like structure for permission checking
    const currentUser: Member = {
      id: profile!.id,
      name: profile!.name || '',
      surname: profile!.surname || '',
      email: profile!.email,
      phone: profile!.phone || null,
      admin_role: profile!.admin_role || 'member',
      pastor_role: profile!.pastor_role || false,
      deacon_role: profile!.deacon_role || false,
      group_leader: profile!.group_leader || false,
      department_leader: profile!.department_leader || false,
      is_admin: profile!.is_admin || false,
      permissions: profile!.permissions || [],
      login_username: profile!.login_username || null,
      login_pin: profile!.login_pin || null,
      assigned_groups: profile!.assigned_groups || [],
      assigned_departments: profile!.assigned_departments || [],
      can_add_members: profile!.can_add_members || false,
      can_edit_members: profile!.can_edit_members || false,
      can_view_own_data: profile!.can_view_own_data || false,
      cell_group_id: profile!.cell_group_id,
      status: profile!.status,
      created_at: profile!.created_at
    };
    
    if (!isAdminOrPastor(currentUser) && !hasPermission(profile!.permissions, 'edit_members')) {
      setError('You do not have permission to generate credentials');
      return;
    }
    
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
    // Convert profile to Member-like structure for permission checking
    const currentUser: Member = {
      id: profile!.id,
      name: profile!.name || '',
      surname: profile!.surname || '',
      email: profile!.email,
      phone: profile!.phone || null,
      admin_role: profile!.admin_role || 'member',
      pastor_role: profile!.pastor_role || false,
      deacon_role: profile!.deacon_role || false,
      group_leader: profile!.group_leader || false,
      department_leader: profile!.department_leader || false,
      is_admin: profile!.is_admin || false,
      permissions: profile!.permissions || [],
      login_username: profile!.login_username || null,
      login_pin: profile!.login_pin || null,
      assigned_groups: profile!.assigned_groups || [],
      assigned_departments: profile!.assigned_departments || [],
      can_add_members: profile!.can_add_members || false,
      can_edit_members: profile!.can_edit_members || false,
      can_view_own_data: profile!.can_view_own_data || false,
      cell_group_id: profile!.cell_group_id,
      status: profile!.status,
      created_at: profile!.created_at
    };

    if (modalType === 'users' && !isAdminOrPastor(currentUser) && !hasPermission(profile!.permissions, 'view_members')) {
      setError('You do not have permission to view user management');
      return;
    }
    
    if (user && !isAdminOrPastor(currentUser) && !hasPermission(profile!.permissions, 'edit_members')) {
      setError('You do not have permission to edit users');
      return;
    }
    
    setActiveModal(modalType);
    setError(null);
    
    if (user) {
      setSelectedUser(user);
      const userRoles = getRolesFromMember(user);
      setUserFormData({
        roles: userRoles,
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
      roles: ['member'],
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

    // Convert profile to Member-like structure for permission checking
    const currentUser: Member = {
      id: profile!.id,
      name: profile!.name || '',
      surname: profile!.surname || '',
      email: profile!.email,
      phone: profile!.phone || null,
      admin_role: profile!.admin_role || 'member',
      pastor_role: profile!.pastor_role || false,
      deacon_role: profile!.deacon_role || false,
      group_leader: profile!.group_leader || false,
      department_leader: profile!.department_leader || false,
      is_admin: profile!.is_admin || false,
      permissions: profile!.permissions || [],
      login_username: profile!.login_username || null,
      login_pin: profile!.login_pin || null,
      assigned_groups: profile!.assigned_groups || [],
      assigned_departments: profile!.assigned_departments || [],
      can_add_members: profile!.can_add_members || false,
      can_edit_members: profile!.can_edit_members || false,
      can_view_own_data: profile!.can_view_own_data || false,
      cell_group_id: profile!.cell_group_id,
      status: profile!.status,
      created_at: profile!.created_at
    };

    if (!isAdminOrPastor(currentUser) && !hasPermission(profile!.permissions, 'edit_members')) {
      setError('You do not have permission to update users');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('Starting user update for:', selectedUser.id);
      console.log('Update data:', userFormData);

      // Convert roles array to individual boolean fields
      const roleUpdates = setRolesToMember(userFormData.roles);

      const updatedMember = await cloudService.updateMember(selectedUser.id, {
        ...roleUpdates,
        permissions: userFormData.permissions,
        assigned_groups: userFormData.assigned_groups,
        assigned_departments: userFormData.assigned_departments,
        can_add_members: userFormData.can_add_members,
        can_edit_members: userFormData.can_edit_members,
        can_view_own_data: userFormData.can_view_own_data,
        login_username: userFormData.login_username,
        login_pin: userFormData.login_pin
      });

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

  const handleGroupToggle = (groupId: string) => {
    setUserFormData(prev => ({
      ...prev,
      assigned_groups: prev.assigned_groups.includes(groupId)
        ? prev.assigned_groups.filter(g => g !== groupId)
        : [...prev.assigned_groups, groupId]
    }));
  };

  const handleDepartmentToggle = (deptId: string) => {
    setUserFormData(prev => ({
      ...prev,
      assigned_departments: prev.assigned_departments.includes(deptId)
        ? prev.assigned_departments.filter(d => d !== deptId)
        : [...prev.assigned_departments, deptId]
    }));
  };

  const handleRoleToggle = (roleValue: string) => {
    setUserFormData(prev => {
      let newRoles: string[];
      
      if (prev.roles.includes(roleValue)) {
        // Remove role, but ensure at least one role remains
        if (prev.roles.length > 1) {
          newRoles = prev.roles.filter(r => r !== roleValue);
        } else {
          alert('User must have at least one role');
          return prev;
        }
      } else {
        // Add role
        newRoles = [...prev.roles, roleValue];
      }

      // Update permissions based on new roles
      const newPermissions = getRolePermissions(newRoles);

      return {
        ...prev,
        roles: newRoles,
        permissions: newPermissions
      };
    });
  };

  // CRITICAL: Filter members based on role and permissions
  const getFilteredMembers = () => {
    let filtered = members;

    // Apply search filter first
    if (searchTerm) {
      filtered = filtered.filter(member =>
        `${member.name} ${member.surname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        getRolesFromMember(member).some(role => role.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Convert profile to Member-like structure for permission checking
    const currentUser: Member = {
      id: profile!.id,
      name: profile!.name || '',
      surname: profile!.surname || '',
      email: profile!.email,
      phone: profile!.phone || null,
      admin_role: profile!.admin_role || 'member',
      pastor_role: profile!.pastor_role || false,
      deacon_role: profile!.deacon_role || false,
      group_leader: profile!.group_leader || false,
      department_leader: profile!.department_leader || false,
      is_admin: profile!.is_admin || false,
      permissions: profile!.permissions || [],
      login_username: profile!.login_username || null,
      login_pin: profile!.login_pin || null,
      assigned_groups: profile!.assigned_groups || [],
      assigned_departments: profile!.assigned_departments || [],
      can_add_members: profile!.can_add_members || false,
      can_edit_members: profile!.can_edit_members || false,
      can_view_own_data: profile!.can_view_own_data || false,
      cell_group_id: profile!.cell_group_id,
      status: profile!.status,
      created_at: profile!.created_at
    };

    // Admin and Pastor can see everyone
    if (isAdminOrPastor(currentUser)) {
      return filtered;
    }

    // Users with manage_groups permission can see everyone
    if (canManageAllGroups(profile!.permissions)) {
      return filtered;
    }

    // Group Leader: Only see members in their assigned groups
    if (isGroupLeader(currentUser) && profile!.assigned_groups && profile!.assigned_groups.length > 0) {
      filtered = filtered.filter(member => {
        // Check if member's cell_group_id matches any of the leader's assigned groups
        if (member.cell_group_id && profile!.assigned_groups.includes(member.cell_group_id)) {
          return true;
        }
        // Also check assigned_groups array
        if (member.assigned_groups && member.assigned_groups.some(group => profile!.assigned_groups.includes(group))) {
          return true;
        }
        return false;
      });
      return filtered;
    }

    // Department Leader: Only see members in their assigned departments
    if (isDepartmentLeader(currentUser) && profile!.assigned_departments && profile!.assigned_departments.length > 0) {
      filtered = filtered.filter(member => {
        if (member.assigned_departments && member.assigned_departments.some(dept => profile!.assigned_departments.includes(dept))) {
          return true;
        }
        return false;
      });
      return filtered;
    }

    // Regular Member: Only see members from their own cell group
    if (hasAnyRole(currentUser, ['member']) && currentUserCellGroup) {
      filtered = filtered.filter(member => 
        member.cell_group_id === profile!.cell_group_id
      );
      return filtered;
    }

    // If no specific rules apply and user has view_members permission, they can see all
    if (hasPermission(profile!.permissions, 'view_members')) {
      return filtered;
    }

    // Default: no access
    return [];
  };

  const filteredMembers = getFilteredMembers();
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
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (hasAccess === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to access the admin panel. Please contact an administrator.
          </p>
          <p className="text-sm text-gray-500">
            Your roles: {profile ? getRolesFromMember({
              id: profile.id,
              name: profile.name || '',
              surname: profile.surname || '',
              email: profile.email,
              phone: profile.phone || null,
              admin_role: profile.admin_role || 'member',
              pastor_role: profile.pastor_role || false,
              deacon_role: profile.deacon_role || false,
              group_leader: profile.group_leader || false,
              department_leader: profile.department_leader || false,
              is_admin: profile.is_admin || false,
              permissions: profile.permissions || [],
              login_username: profile.login_username || null,
              login_pin: profile.login_pin || null,
              assigned_groups: profile.assigned_groups || [],
              assigned_departments: profile.assigned_departments || [],
              can_add_members: profile.can_add_members || false,
              can_edit_members: profile.can_edit_members || false,
              can_view_own_data: profile.can_view_own_data || false,
              cell_group_id: profile.cell_group_id,
              status: profile.status,
              created_at: profile.created_at
            }).join(', ') : 'member'}
          </p>
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
            <p className="text-gray-600">
              {profile && (() => {
                const currentUser: Member = {
                  id: profile.id,
                  name: profile.name || '',
                  surname: profile.surname || '',
                  email: profile.email,
                  phone: profile.phone || null,
                  admin_role: profile.admin_role || 'member',
                  pastor_role: profile.pastor_role || false,
                  deacon_role: profile.deacon_role || false,
                  group_leader: profile.group_leader || false,
                  department_leader: profile.department_leader || false,
                  is_admin: profile.is_admin || false,
                  permissions: profile.permissions || [],
                  login_username: profile.login_username || null,
                  login_pin: profile.login_pin || null,
                  assigned_groups: profile.assigned_groups || [],
                  assigned_departments: profile.assigned_departments || [],
                  can_add_members: profile.can_add_members || false,
                  can_edit_members: profile.can_edit_members || false,
                  can_view_own_data: profile.can_view_own_data || false,
                  cell_group_id: profile.cell_group_id,
                  status: profile.status,
                  created_at: profile.created_at
                };
                
                if (isAdminOrPastor(currentUser)) return 'Full administrative access';
                if (canManageAllGroups(profile.permissions)) return 'Can manage all groups and members';
                if (isGroupLeader(currentUser)) return `Group Leader - Managing ${profile.assigned_groups?.length || 0} group(s)`;
                if (isDepartmentLeader(currentUser)) return `Department Leader - Managing ${profile.assigned_departments?.length || 0} department(s)`;
                if (hasAnyRole(currentUser, ['member'])) return `Viewing members in your cell group${currentUserCellGroup ? `: ${currentUserCellGroup}` : ''}`;
                return `Limited access - ${getRolesFromMember(currentUser).join(', ') || 'member'} role`;
              })()}
            </p>
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

        {/* Admin Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {adminSections.map((section) => {
            const currentUser: Member = {
              id: profile!.id,
              name: profile!.name || '',
              surname: profile!.surname || '',
              email: profile!.email,
              phone: profile!.phone || null,
              admin_role: profile!.admin_role || 'member',
              pastor_role: profile!.pastor_role || false,
              deacon_role: profile!.deacon_role || false,
              group_leader: profile!.group_leader || false,
              department_leader: profile!.department_leader || false,
              is_admin: profile!.is_admin || false,
              permissions: profile!.permissions || [],
              login_username: profile!.login_username || null,
              login_pin: profile!.login_pin || null,
              assigned_groups: profile!.assigned_groups || [],
              assigned_departments: profile!.assigned_departments || [],
              can_add_members: profile!.can_add_members || false,
              can_edit_members: profile!.can_edit_members || false,
              can_view_own_data: profile!.can_view_own_data || false,
              cell_group_id: profile!.cell_group_id,
              status: profile!.status,
              created_at: profile!.created_at
            };
            
            const sectionHasAccess = isAdminOrPastor(currentUser) || hasPermission(profile!.permissions, section.permission);
            
            return (
              <button
                key={section.title}
                onClick={() => sectionHasAccess ? openModal(section.modal) : setError('You do not have permission to access this section')}
                disabled={!sectionHasAccess}
                className={`bg-white border border-gray-200 rounded-2xl p-6 transition-all duration-200 text-left group ${
                  sectionHasAccess 
                    ? 'hover:scale-105 hover:shadow-xl cursor-pointer' 
                    : 'opacity-50 cursor-not-allowed'
                }`}
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <section.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{section.title}</h3>
                <p className="text-gray-600 text-sm">{section.description}</p>
                {!sectionHasAccess && (
                  <p className="text-xs text-red-600 mt-2">Permission required</p>
                )}
              </button>
            );
          })}
        </div>

        {/* User Management Section */}
        {profile && (() => {
          const currentUser: Member = {
            id: profile.id,
            name: profile.name || '',
            surname: profile.surname || '',
            email: profile.email,
            phone: profile.phone || null,
            admin_role: profile.admin_role || 'member',
            pastor_role: profile.pastor_role || false,
            deacon_role: profile.deacon_role || false,
            group_leader: profile.group_leader || false,
            department_leader: profile.department_leader || false,
            is_admin: profile.is_admin || false,
            permissions: profile.permissions || [],
            login_username: profile.login_username || null,
            login_pin: profile.login_pin || null,
            assigned_groups: profile.assigned_groups || [],
            assigned_departments: profile.assigned_departments || [],
            can_add_members: profile.can_add_members || false,
            can_edit_members: profile.can_edit_members || false,
            can_view_own_data: profile.can_view_own_data || false,
            cell_group_id: profile.cell_group_id,
            status: profile.status,
            created_at: profile.created_at
          };

          return (isAdminOrPastor(currentUser) || hasPermission(profile.permissions, 'view_members')) && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
                {(isAdminOrPastor(currentUser) || hasPermission(profile.permissions, 'add_members')) && (
                  <button
                    onClick={() => openModal('users')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                  >
                    <Users className="h-4 w-4" />
                    View All Users
                  </button>
                )}
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
                  <p className="text-gray-600">
                    {searchTerm 
                      ? 'No users found matching your search' 
                      : hasAnyRole(currentUser, ['member'])
                      ? 'No members found in your cell group'
                      : 'No users found in your assigned groups/departments'}
                  </p>
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
                            {member.email} • {getRolesFromMember(member).map(role => roles.find(r => r.value === role)?.label || role).join(', ')}
                          </p>
                          {member.cell_group_id && (
                            <p className="text-xs text-gray-500">
                              Cell Group ID: {member.cell_group_id}
                            </p>
                          )}
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
                        {(isAdminOrPastor(currentUser) || hasPermission(profile.permissions, 'edit_members')) && (
                          <button
                            onClick={() => openModal('userDetails', member)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                          >
                            Manage
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Stats Section */}
        {profile && (() => {
          const currentUser: Member = {
            id: profile.id,
            name: profile.name || '',
            surname: profile.surname || '',
            email: profile.email,
            phone: profile.phone || null,
            admin_role: profile.admin_role || 'member',
            pastor_role: profile.pastor_role || false,
            deacon_role: profile.deacon_role || false,
            group_leader: profile.group_leader || false,
            department_leader: profile.department_leader || false,
            is_admin: profile.is_admin || false,
            permissions: profile.permissions || [],
            login_username: profile.login_username || null,
            login_pin: profile.login_pin || null,
            assigned_groups: profile.assigned_groups || [],
            assigned_departments: profile.assigned_departments || [],
            can_add_members: profile.can_add_members || false,
            can_edit_members: profile.can_edit_members || false,
            can_view_own_data: profile.can_view_own_data || false,
            cell_group_id: profile.cell_group_id,
            status: profile.status,
            created_at: profile.created_at
          };

          return (isAdminOrPastor(currentUser) || hasPermission(profile.permissions, 'view_reports')) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Role Statistics</h2>
                <div className="space-y-4">
                  {roles.map(role => {
                    const count = filteredMembers.filter(m => 
                      getRolesFromMember(m).includes(role.value)
                    ).length;
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
                    <span className="text-gray-600">Visible Members</span>
                    <span className="text-gray-900 font-semibold">{filteredMembers.length}</span>
                  </div>
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
          );
        })()}

        {/* Modals */}
        {activeModal === 'users' && profile && (() => {
          const currentUser: Member = {
            id: profile.id,
            name: profile.name || '',
            surname: profile.surname || '',
            email: profile.email,
            phone: profile.phone || null,
            admin_role: profile.admin_role || 'member',
            pastor_role: profile.pastor_role || false,
            deacon_role: profile.deacon_role || false,
            group_leader: profile.group_leader || false,
            department_leader: profile.department_leader || false,
            is_admin: profile.is_admin || false,
            permissions: profile.permissions || [],
            login_username: profile.login_username || null,
            login_pin: profile.login_pin || null,
            assigned_groups: profile.assigned_groups || [],
            assigned_departments: profile.assigned_departments || [],
            can_add_members: profile.can_add_members || false,
            can_edit_members: profile.can_edit_members || false,
            can_view_own_data: profile.can_view_own_data || false,
            cell_group_id: profile.cell_group_id,
            status: profile.status,
            created_at: profile.created_at
          };

          return (isAdminOrPastor(currentUser) || hasPermission(profile.permissions, 'view_members')) && (
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
                    {filteredMembers.map((member) => (
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
                              {member.email} • {getRolesFromMember(member).map(role => roles.find(r => r.value === role)?.label || role).join(', ')}
                            </p>
                          </div>
                        </div>
                        {(isAdminOrPastor(currentUser) || hasPermission(profile.permissions, 'edit_members')) && (
                          <button
                            onClick={() => openModal('userDetails', member)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                          >
                            Manage
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Modal>
          );
        })()}

        {/* User Details Modal */}
        {activeModal === 'userDetails' && selectedUser && profile && (() => {
          const currentUser: Member = {
            id: profile.id,
            name: profile.name || '',
            surname: profile.surname || '',
            email: profile.email,
            phone: profile.phone || null,
            admin_role: profile.admin_role || 'member',
            pastor_role: profile.pastor_role || false,
            deacon_role: profile.deacon_role || false,
            group_leader: profile.group_leader || false,
            department_leader: profile.department_leader || false,
            is_admin: profile.is_admin || false,
            permissions: profile.permissions || [],
            login_username: profile.login_username || null,
            login_pin: profile.login_pin || null,
            assigned_groups: profile.assigned_groups || [],
            assigned_departments: profile.assigned_departments || [],
            can_add_members: profile.can_add_members || false,
            can_edit_members: profile.can_edit_members || false,
            can_view_own_data: profile.can_view_own_data || false,
            cell_group_id: profile.cell_group_id,
            status: profile.status,
            created_at: profile.created_at
          };

          return (isAdminOrPastor(currentUser) || hasPermission(profile.permissions, 'edit_members')) && (
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
                      {selectedUser.cell_group_id && (
                        <p className="text-sm text-gray-500">Cell Group ID: {selectedUser.cell_group_id}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* User Roles Section */}
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">
                      User Roles
                    </label>
                    <div className="grid grid-cols-1 gap-3">
                      {roles.map(role => (
                        <label
                          key={role.value}
                          className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={userFormData.roles.includes(role.value)}
                            onChange={() => handleRoleToggle(role.value)}
                            className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <span className="font-medium text-gray-900">{role.label}</span>
                            <p className="text-sm text-gray-500 mt-1">{role.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                    <p className="text-sm text-gray-500">
                      Selected: {userFormData.roles.map(role => 
                        roles.find(r => r.value === role)?.label || role
                      ).join(', ')}
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

                {(userFormData.roles.includes('group_leader') || userFormData.roles.includes('department_leader')) && (
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

                    {userFormData.roles.includes('group_leader') && (
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
                                checked={userFormData.assigned_groups.includes(group.id)}
                                onChange={() => handleGroupToggle(group.id)}
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

                    {userFormData.roles.includes('department_leader') && (
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
                                checked={userFormData.assigned_departments.includes(dept.id)}
                                onChange={() => handleDepartmentToggle(dept.id)}
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
          );
        })()}

        {/* Other modals for admin only */}
        {activeModal === 'data' && profile && (() => {
          const currentUser: Member = {
            id: profile.id,
            name: profile.name || '',
            surname: profile.surname || '',
            email: profile.email,
            phone: profile.phone || null,
            admin_role: profile.admin_role || 'member',
            pastor_role: profile.pastor_role || false,
            deacon_role: profile.deacon_role || false,
            group_leader: profile.group_leader || false,
            department_leader: profile.department_leader || false,
            is_admin: profile.is_admin || false,
            permissions: profile.permissions || [],
            login_username: profile.login_username || null,
            login_pin: profile.login_pin || null,
            assigned_groups: profile.assigned_groups || [],
            assigned_departments: profile.assigned_departments || [],
            can_add_members: profile.can_add_members || false,
            can_edit_members: profile.can_edit_members || false,
            can_view_own_data: profile.can_view_own_data || false,
            cell_group_id: profile.cell_group_id,
            status: profile.status,
            created_at: profile.created_at
          };

          return isAdminOrPastor(currentUser) && (
            <Modal title="Data Management">
              <div className="space-y-6">
                <div className="text-center py-8">
                  <Database className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Data Management</h3>
                  <p className="text-gray-600">Import, export, and manage church data</p>
                </div>
              </div>
            </Modal>
          );
        })()}

        {/* Similar pattern for other admin-only modals */}
        {activeModal === 'security' && profile && (() => {
          const currentUser: Member = {
            id: profile.id,
            name: profile.name || '',
            surname: profile.surname || '',
            email: profile.email,
            phone: profile.phone || null,
            admin_role: profile.admin_role || 'member',
            pastor_role: profile.pastor_role || false,
            deacon_role: profile.deacon_role || false,
            group_leader: profile.group_leader || false,
            department_leader: profile.department_leader || false,
            is_admin: profile.is_admin || false,
            permissions: profile.permissions || [],
            login_username: profile.login_username || null,
            login_pin: profile.login_pin || null,
            assigned_groups: profile.assigned_groups || [],
            assigned_departments: profile.assigned_departments || [],
            can_add_members: profile.can_add_members || false,
            can_edit_members: profile.can_edit_members || false,
            can_view_own_data: profile.can_view_own_data || false,
            cell_group_id: profile.cell_group_id,
            status: profile.status,
            created_at: profile.created_at
          };

          return isAdminOrPastor(currentUser) && (
            <Modal title="Security Settings">
              <div className="space-y-6">
                <div className="text-center py-8">
                  <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Security Settings</h3>
                  <p className="text-gray-600">Configure security preferences and audit logs</p>
                </div>
              </div>
            </Modal>
          );
        })()}

        {/* Add similar patterns for notifications, communication, and general modals */}
      </div>
    </div>
  );
}; 

export default Admin;
