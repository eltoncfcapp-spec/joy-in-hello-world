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
  role: string | null;
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
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  type: 'cell_group' | 'department';
}

interface CellGroup {
  id: string;
  name: string;
  description: string | null;
  leader_id: string | null;
  location: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  current_member_count: number;
  status: string;
  login_username: string | null;
  created_at: string;
  updated_at: string;
}

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
        role: member.role,
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

  async getCellGroups(): Promise<CellGroup[]> {
    try {
      const { data, error } = await supabase
        .from('cell_groups')
        .select('*')
        .order('name');

      if (error) {
        console.error('Supabase error fetching cell groups:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching cell groups:', error);
      throw error;
    }
  },

  async getActiveCellGroups(): Promise<CellGroup[]> {
    try {
      const { data, error } = await supabase
        .from('cell_groups')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) {
        console.error('Supabase error fetching active cell groups:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching active cell groups:', error);
      throw error;
    }
  },

  async updateMember(memberId: string, updates: Partial<Member>): Promise<Member> {
    try {
      console.log('Updating member:', memberId, updates);

      // Handle empty string for UUID fields - convert to null
      const updateData: any = {
        name: updates.name,
        surname: updates.surname,
        email: updates.email,
        phone: updates.phone,
        role: updates.role,
        permissions: updates.permissions || [],
        assigned_groups: updates.assigned_groups || [],
        assigned_departments: updates.assigned_departments || [],
        can_add_members: Boolean(updates.can_add_members),
        can_edit_members: Boolean(updates.can_edit_members),
        can_view_own_data: Boolean(updates.can_view_own_data),
        login_username: updates.login_username || null,
        login_pin: updates.login_pin || null,
        cell_group_id: updates.cell_group_id === '' ? null : updates.cell_group_id,
        status: updates.status,
        updated_at: new Date().toISOString()
      };

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
        role: data.role,
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

  async generateCellGroupCredentials(groupId: string): Promise<{ username: string }> {
    try {
      const username = `group${Date.now()}`;
      
      console.log('Generating credentials for cell group:', groupId, { username });

      const { data, error } = await supabase
        .from('cell_groups')
        .update({
          login_username: username,
          updated_at: new Date().toISOString()
        })
        .eq('id', groupId)
        .select('login_username')
        .single();

      if (error) {
        console.error('Supabase error updating cell group:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from cell group update');
      }
      
      return { username: data.login_username };
    } catch (error) {
      console.error('Error generating cell group credentials:', error);
      throw error;
    }
  },

  async updateCellGroup(groupId: string, updates: Partial<CellGroup>): Promise<CellGroup> {
    try {
      const updateData: any = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      // Remove id from updates if present to avoid conflicts
      delete updateData.id;

      const { data, error } = await supabase
        .from('cell_groups')
        .update(updateData)
        .eq('id', groupId)
        .select()
        .single();

      if (error) {
        console.error('Supabase error updating cell group:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from cell group update');
      }

      return data;
    } catch (error) {
      console.error('Error updating cell group:', error);
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
  },

  async assignUserToGroup(memberId: string, groupName: string): Promise<void> {
    try {
      // Get current assigned groups
      const { data: member, error: fetchError } = await supabase
        .from('members')
        .select('assigned_groups')
        .eq('id', memberId)
        .single();

      if (fetchError) {
        console.error('Error fetching member:', fetchError);
        throw fetchError;
      }

      const currentGroups = member?.assigned_groups || [];
      
      // Add group if not already assigned
      if (!currentGroups.includes(groupName)) {
        const updatedGroups = [...currentGroups, groupName];
        
        const { error: updateError } = await supabase
          .from('members')
          .update({
            assigned_groups: updatedGroups,
            updated_at: new Date().toISOString()
          })
          .eq('id', memberId);

        if (updateError) {
          console.error('Error updating assigned groups:', updateError);
          throw updateError;
        }

        console.log(`Successfully assigned user ${memberId} to group: ${groupName}`);
      }
    } catch (error) {
      console.error('Error assigning user to group:', error);
      throw error;
    }
  },

  async removeUserFromGroup(memberId: string, groupName: string): Promise<void> {
    try {
      // Get current assigned groups
      const { data: member, error: fetchError } = await supabase
        .from('members')
        .select('assigned_groups')
        .eq('id', memberId)
        .single();

      if (fetchError) {
        console.error('Error fetching member:', fetchError);
        throw fetchError;
      }

      const currentGroups = member?.assigned_groups || [];
      
      // Remove group if assigned
      const updatedGroups = currentGroups.filter(group => group !== groupName);
      
      const { error: updateError } = await supabase
        .from('members')
        .update({
          assigned_groups: updatedGroups,
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId);

      if (updateError) {
        console.error('Error updating assigned groups:', updateError);
        throw updateError;
      }

      console.log(`Successfully removed user ${memberId} from group: ${groupName}`);
    } catch (error) {
      console.error('Error removing user from group:', error);
      throw error;
    }
  }
};

// Permission checking utility
const hasPermission = (userPermissions: string[] = [], requiredPermission: string): boolean => {
  return userPermissions.includes(requiredPermission) || userPermissions.includes('admin_access');
};

// Check if user is admin or pastor
const isAdminOrPastor = (role: string): boolean => {
  return role === 'admin' || role === 'pastor';
};

// Check if user can manage groups
const canManageAllGroups = (permissions: string[] = []): boolean => {
  return hasPermission(permissions, 'manage_groups');
};

const Admin = () => {
  const { profile } = useAuth();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [cellGroups, setCellGroups] = useState<CellGroup[]>([]);
  const [activeCellGroups, setActiveCellGroups] = useState<CellGroup[]>([]);
  const [selectedUser, setSelectedUser] = useState<Member | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<CellGroup | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{username: string; pin: string} | null>(null);
  const [showGroupCredentials, setShowGroupCredentials] = useState(false);
  const [generatedGroupCredentials, setGeneratedGroupCredentials] = useState<{username: string} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [currentUserCellGroup, setCurrentUserCellGroup] = useState<string | null>(null);

  const [userFormData, setUserFormData] = useState<{
    name: string;
    surname: string;
    email: string;
    phone: string;
    role: string;
    permissions: string[];
    assigned_groups: string[];
    assigned_departments: string[];
    can_add_members: boolean;
    can_edit_members: boolean;
    can_view_own_data: boolean;
    login_username: string;
    login_pin: string;
    cell_group_id: string;
    status: string;
  }>({
    name: '',
    surname: '',
    email: '',
    phone: '',
    role: 'member',
    permissions: [],
    assigned_groups: [],
    assigned_departments: [],
    can_add_members: false,
    can_edit_members: false,
    can_view_own_data: false,
    login_username: '',
    login_pin: '',
    cell_group_id: '',
    status: 'active'
  });

  const [groupFormData, setGroupFormData] = useState<{
    name: string;
    description: string;
    location: string;
    meeting_day: string;
    meeting_time: string;
    login_username: string;
    status: string;
  }>({
    name: '',
    description: '',
    location: '',
    meeting_day: '',
    meeting_time: '',
    login_username: '',
    status: 'active'
  });

  // Check permissions and load data
  useEffect(() => {
    const checkAccessAndLoadData = async () => {
      if (!profile) {
        setHasAccess(false);
        setInitialLoad(false);
        return;
      }

      // Fetch current user's cell group name if they have a cell_group_id
      if (profile.cell_group_id) {
        const groupName = await cloudService.getCellGroupNameById(profile.cell_group_id);
        setCurrentUserCellGroup(groupName);
      }

      // Admin, Pastor, or users with manage_groups permission have full access
      const userHasAccess = 
        isAdminOrPastor(profile.role) || 
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
      const [membersData, groupsData, cellGroupsData, activeCellGroupsData] = await Promise.all([
        cloudService.getMembers(),
        cloudService.getGroups(),
        cloudService.getCellGroups(),
        cloudService.getActiveCellGroups()
      ]);
      
      console.log('Data loaded:', { 
        members: membersData.length, 
        groups: groupsData.length,
        cellGroups: cellGroupsData.length,
        activeCellGroups: activeCellGroupsData.length
      });
      setMembers(membersData);
      setGroups(groupsData);
      setCellGroups(cellGroupsData);
      setActiveCellGroups(activeCellGroupsData);
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
    
    if (!isAdminOrPastor(profile?.role || '') && !hasPermission(profile?.permissions, 'edit_members')) {
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

  const handleGenerateGroupCredentials = async (group: CellGroup) => {
    if (!isAdminOrPastor(profile?.role || '') && !hasPermission(profile?.permissions, 'manage_groups')) {
      setError('You do not have permission to generate group credentials');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const credentials = await cloudService.generateCellGroupCredentials(group.id);
      
      setGroupFormData(prev => ({
        ...prev,
        login_username: credentials.username
      }));
      
      setGeneratedGroupCredentials(credentials);
      setShowGroupCredentials(true);
      
      // Refresh groups data
      const groupsData = await cloudService.getCellGroups();
      setCellGroups(groupsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate group credentials';
      setError(errorMessage);
      console.error('Error generating group credentials:', err);
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

  const handleCopyGroupCredentials = () => {
    if (generatedGroupCredentials) {
      const text = `Group Username: ${generatedGroupCredentials.username}`;
      navigator.clipboard.writeText(text);
      alert('Group credentials copied to clipboard!');
    }
  };

  const handleAssignToGroup = async (memberId: string, groupName: string) => {
    if (!isAdminOrPastor(profile?.role || '') && !hasPermission(profile?.permissions, 'edit_members')) {
      setError('You do not have permission to assign users to groups');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await cloudService.assignUserToGroup(memberId, groupName);
      
      // Refresh data
      await loadData();
      alert(`User successfully assigned to ${groupName}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign user to group';
      setError(errorMessage);
      console.error('Error assigning user to group:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromGroup = async (memberId: string, groupName: string) => {
    if (!isAdminOrPastor(profile?.role || '') && !hasPermission(profile?.permissions, 'edit_members')) {
      setError('You do not have permission to remove users from groups');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await cloudService.removeUserFromGroup(memberId, groupName);
      
      // Refresh data
      await loadData();
      alert(`User successfully removed from ${groupName}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove user from group';
      setError(errorMessage);
      console.error('Error removing user from group:', err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (modalType: string, user?: Member, group?: CellGroup) => {
    if (modalType === 'users' && !isAdminOrPastor(profile?.role || '') && !hasPermission(profile?.permissions, 'view_members')) {
      setError('You do not have permission to view user management');
      return;
    }
    
    if (user && !isAdminOrPastor(profile?.role || '') && !hasPermission(profile?.permissions, 'edit_members')) {
      setError('You do not have permission to edit users');
      return;
    }

    if (group && !isAdminOrPastor(profile?.role || '') && !hasPermission(profile?.permissions, 'manage_groups')) {
      setError('You do not have permission to manage groups');
      return;
    }
    
    setActiveModal(modalType);
    setError(null);
    
    if (user) {
      setSelectedUser(user);
      setUserFormData({
        name: user.name || '',
        surname: user.surname || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'member',
        permissions: user.permissions || [],
        assigned_groups: user.assigned_groups || [],
        assigned_departments: user.assigned_departments || [],
        can_add_members: user.can_add_members || false,
        can_edit_members: user.can_edit_members || false,
        can_view_own_data: user.can_view_own_data || false,
        login_username: user.login_username || '',
        login_pin: user.login_pin || '',
        cell_group_id: user.cell_group_id || '',
        status: user.status || 'active'
      });
      setShowCredentials(false);
      setGeneratedCredentials(null);
    }

    if (group) {
      setSelectedGroup(group);
      setGroupFormData({
        name: group.name || '',
        description: group.description || '',
        location: group.location || '',
        meeting_day: group.meeting_day || '',
        meeting_time: group.meeting_time || '',
        login_username: group.login_username || '',
        status: group.status || 'active'
      });
      setShowGroupCredentials(false);
      setGeneratedGroupCredentials(null);
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedUser(null);
    setSelectedGroup(null);
    setUserFormData({
      name: '',
      surname: '',
      email: '',
      phone: '',
      role: 'member',
      permissions: [],
      assigned_groups: [],
      assigned_departments: [],
      can_add_members: false,
      can_edit_members: false,
      can_view_own_data: false,
      login_username: '',
      login_pin: '',
      cell_group_id: '',
      status: 'active'
    });
    setGroupFormData({
      name: '',
      description: '',
      location: '',
      meeting_day: '',
      meeting_time: '',
      login_username: '',
      status: 'active'
    });
    setShowCredentials(false);
    setShowGroupCredentials(false);
    setGeneratedCredentials(null);
    setGeneratedGroupCredentials(null);
    setError(null);
  };

  const handleUserUpdate = async () => {
    if (!selectedUser) return;

    if (!isAdminOrPastor(profile?.role || '') && !hasPermission(profile?.permissions, 'edit_members')) {
      setError('You do not have permission to update users');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('Starting user update for:', selectedUser.id);
      console.log('Update data:', userFormData);

      const updatedMember = await cloudService.updateMember(selectedUser.id, {
        name: userFormData.name,
        surname: userFormData.surname,
        email: userFormData.email,
        phone: userFormData.phone,
        role: userFormData.role,
        permissions: userFormData.permissions,
        assigned_groups: userFormData.assigned_groups,
        assigned_departments: userFormData.assigned_departments,
        can_add_members: userFormData.can_add_members,
        can_edit_members: userFormData.can_edit_members,
        can_view_own_data: userFormData.can_view_own_data,
        login_username: userFormData.login_username,
        login_pin: userFormData.login_pin,
        cell_group_id: userFormData.cell_group_id,
        status: userFormData.status
      });

      // Replace the existing member data with the updated one
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

  const handleGroupUpdate = async () => {
    if (!selectedGroup) return;

    if (!isAdminOrPastor(profile?.role || '') && !hasPermission(profile?.permissions, 'manage_groups')) {
      setError('You do not have permission to update groups');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const updatedGroup = await cloudService.updateCellGroup(selectedGroup.id, {
        name: groupFormData.name,
        description: groupFormData.description,
        location: groupFormData.location,
        meeting_day: groupFormData.meeting_day,
        meeting_time: groupFormData.meeting_time,
        login_username: groupFormData.login_username,
        status: groupFormData.status
      });

      // Replace the existing group data with the updated one
      setCellGroups(prev => prev.map(g => 
        g.id === selectedGroup.id ? updatedGroup : g
      ));

      // Also update active cell groups if needed
      setActiveCellGroups(prev => prev.map(g => 
        g.id === selectedGroup.id ? updatedGroup : g
      ));
      
      alert('Group updated successfully!');
      closeModal();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update group';
      setError(errorMessage);
      console.error('Error updating group:', err);
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

  // CRITICAL: Filter members based on role and permissions
  const getFilteredMembers = () => {
    let filtered = members;

    // Apply search filter first
    if (searchTerm) {
      filtered = filtered.filter(member =>
        `${member.name} ${member.surname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (member.role && member.role.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Admin and Pastor can see everyone
    if (isAdminOrPastor(profile?.role || '')) {
      return filtered;
    }

    // Users with manage_groups permission can see everyone
    if (canManageAllGroups(profile?.permissions)) {
      return filtered;
    }

    // Group Leader: Only see members in their assigned groups
    if (profile?.role === 'group_leader' && profile?.assigned_groups && profile.assigned_groups.length > 0) {
      filtered = filtered.filter(member => {
        // Check if member's cell_group_id matches any of the leader's assigned groups
        if (member.cell_group_id && profile.assigned_groups.includes(member.cell_group_id)) {
          return true;
        }
        // Also check assigned_groups array
        if (member.assigned_groups && member.assigned_groups.some(group => profile.assigned_groups.includes(group))) {
          return true;
        }
        return false;
      });
      return filtered;
    }

    // Regular Member: Only see members from their own cell group
    if (profile?.role === 'member' && currentUserCellGroup) {
      filtered = filtered.filter(member => 
        member.cell_group_id === currentUserCellGroup
      );
      return filtered;
    }

    // If no specific rules apply and user has view_members permission, they can see all
    if (hasPermission(profile?.permissions, 'view_members')) {
      return filtered;
    }

    // Default: no access
    return [];
  };

  const filteredMembers = getFilteredMembers();
  const cellGroupsList = groups.filter(g => g.type === 'cell_group');
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
            Your role: {profile?.role || 'member'}
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
              {isAdminOrPastor(profile?.role || '') 
                ? 'Full administrative access' 
                : canManageAllGroups(profile?.permissions)
                ? 'Can manage all groups and members'
                : profile?.role === 'group_leader'
                ? `Group Leader - Managing ${profile?.assigned_groups?.length || 0} group(s)`
                : profile?.role === 'member'
                ? `Viewing members in your cell group${currentUserCellGroup ? `: ${currentUserCellGroup}` : ''}`
                : `Limited access - ${profile?.role} role`
              }
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
            const sectionHasAccess = isAdminOrPastor(profile?.role || '') || hasPermission(profile?.permissions, section.permission);
            
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

        {/* Active Groups Management Section */}
        {(isAdminOrPastor(profile?.role || '') || hasPermission(profile?.permissions, 'manage_groups')) && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Active Cell Groups</h2>
              <div className="text-sm text-gray-500">
                {activeCellGroups.length} active groups
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading active groups...</p>
              </div>
            ) : activeCellGroups.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No active cell groups found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeCellGroups.map((group) => (
                  <div
                    key={group.id}
                    className="flex flex-col justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">
                        {group.name}
                      </h4>
                      <p className="text-sm text-gray-500 mb-2">{group.description}</p>
                      <p className="text-xs text-gray-500">
                        {group.meeting_day} at {group.meeting_time}
                      </p>
                      <p className="text-xs text-gray-500">{group.location}</p>
                      <p className="text-xs text-gray-500">
                        Members: {group.current_member_count || 0}
                      </p>
                      {group.login_username && (
                        <p className="text-xs text-blue-600 mt-2">
                          <Key className="h-3 w-3 inline mr-1" />
                          Group Login: {group.login_username}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => openModal('groupDetails', undefined, group)}
                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                      >
                        Manage
                      </button>
                      {!group.login_username && (
                        <button
                          onClick={() => handleGenerateGroupCredentials(group)}
                          disabled={loading}
                          className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                        >
                          <Key className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* User Management Section */}
        {(isAdminOrPastor(profile?.role || '') || hasPermission(profile?.permissions, 'view_members')) && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
              {(isAdminOrPastor(profile?.role || '') || hasPermission(profile?.permissions, 'add_members')) && (
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
                    : profile?.role === 'member'
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
                          {member.email} • {roles.find(r => r.value === member.role)?.label || member.role || 'member'}
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
                        {member.assigned_groups && member.assigned_groups.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500">Assigned Groups:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {member.assigned_groups.map((group, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs"
                                >
                                  {group}
                                  <button
                                    onClick={() => handleRemoveFromGroup(member.id, group)}
                                    className="text-green-600 hover:text-green-800"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
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
                      
                      {/* Quick Assign to Active Groups */}
                      <div className="flex flex-col gap-1">
                        {activeCellGroups.slice(0, 2).map(group => (
                          <button
                            key={group.id}
                            onClick={() => handleAssignToGroup(member.id, group.name)}
                            disabled={loading || member.assigned_groups.includes(group.name)}
                            className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            + {group.name}
                          </button>
                        ))}
                      </div>

                      {(isAdminOrPastor(profile?.role || '') || hasPermission(profile?.permissions, 'edit_members')) && (
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
        )}

        {/* Stats Section */}
        {(isAdminOrPastor(profile?.role || '') || hasPermission(profile?.permissions, 'view_reports')) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Role Statistics</h2>
              <div className="space-y-4">
                {roles.map(role => {
                  const count = filteredMembers.filter(m => m.role === role.value).length;
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
                  <span className="text-gray-900 font-semibold">{activeCellGroups.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">All Groups</span>
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
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Groups with Login</span>
                  <span className="text-gray-900 font-semibold">
                    {cellGroups.filter(g => g.login_username).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

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
                            {member.email} • {roles.find(r => r.value === member.role)?.label || member.role || 'member'}
                          </p>
                          {member.assigned_groups && member.assigned_groups.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {member.assigned_groups.map((group, index) => (
                                <span
                                  key={index}
                                  className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs"
                                >
                                  {group}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {(isAdminOrPastor(profile?.role || '') || hasPermission(profile?.permissions, 'edit_members')) && (
                          <>
                            <button
                              onClick={() => openModal('userDetails', member)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                            >
                              Manage
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Modal>
        )}

        {/* User Details Modal */}
        {activeModal === 'userDetails' && selectedUser && (isAdminOrPastor(profile?.role || '') || hasPermission(profile?.permissions, 'edit_members')) && (
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
                    {selectedUser.assigned_groups && selectedUser.assigned_groups.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-700 font-medium">Assigned Groups:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedUser.assigned_groups.map((group, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs"
                            >
                              {group}
                              <button
                                onClick={() => handleRemoveFromGroup(selectedUser.id, group)}
                                className="text-green-600 hover:text-green-800"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    type="text"
                    value={userFormData.name}
                    onChange={(e) => setUserFormData(prev => ({...prev, name: e.target.value}))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Surname
                  </label>
                  <input
                    type="text"
                    value={userFormData.surname}
                    onChange={(e) => setUserFormData(prev => ({...prev, surname: e.target.value}))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData(prev => ({...prev, email: e.target.value}))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={userFormData.phone}
                    onChange={(e) => setUserFormData(prev => ({...prev, phone: e.target.value}))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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
                    Status
                  </label>
                  <select
                    value={userFormData.status}
                    onChange={(e) => setUserFormData(prev => ({...prev, status: e.target.value}))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Cell Group ID
                  </label>
                  <input
                    type="text"
                    value={userFormData.cell_group_id}
                    onChange={(e) => setUserFormData(prev => ({...prev, cell_group_id: e.target.value}))}
                    placeholder="Enter cell group ID (leave empty for none)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500">
                    Leave empty if the user doesn't belong to any cell group
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Login Username
                  </label>
                  <input
                    type="text"
                    value={userFormData.login_username}
                    onChange={(e) => setUserFormData(prev => ({...prev, login_username: e.target.value}))}
                    placeholder="Manual username input"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Login PIN
                  </label>
                  <input
                    type="text"
                    value={userFormData.login_pin}
                    onChange={(e) => setUserFormData(prev => ({...prev, login_pin: e.target.value}))}
                    placeholder="Manual PIN input"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Quick Group Assignment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Quick Group Assignment
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeCellGroups.map(group => (
                    <button
                      key={group.id}
                      onClick={() => handleAssignToGroup(selectedUser.id, group.name)}
                      disabled={loading || userFormData.assigned_groups.includes(group.name)}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div>
                        <span className="font-medium text-gray-900">{group.name}</span>
                        <p className="text-xs text-gray-500">{group.description}</p>
                      </div>
                      {userFormData.assigned_groups.includes(group.name) ? (
                        <span className="text-green-600 text-sm font-medium">✓ Assigned</span>
                      ) : (
                        <span className="text-blue-600 text-sm font-medium">+ Assign</span>
                      )}
                    </button>
                  ))}
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
                        {cellGroupsList.map(group => (
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

        {/* Group Details Modal */}
        {activeModal === 'groupDetails' && selectedGroup && (isAdminOrPastor(profile?.role || '') || hasPermission(profile?.permissions, 'manage_groups')) && (
          <Modal title={`Manage Group - ${selectedGroup.name}`}>
            <div className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-red-700 font-medium">{error}</p>
                </div>
              )}

              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    {selectedGroup.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">
                      {selectedGroup.name}
                    </h4>
                    <p className="text-gray-600">{selectedGroup.description}</p>
                    <p className="text-sm text-gray-500">
                      {selectedGroup.meeting_day} at {selectedGroup.meeting_time} • {selectedGroup.location}
                    </p>
                    <p className="text-sm text-gray-500">
                      Members: {selectedGroup.current_member_count || 0} • Status: {selectedGroup.status}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Group Name
                  </label>
                  <input
                    type="text"
                    value={groupFormData.name}
                    onChange={(e) => setGroupFormData(prev => ({...prev, name: e.target.value}))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={groupFormData.location}
                    onChange={(e) => setGroupFormData(prev => ({...prev, location: e.target.value}))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={groupFormData.description}
                  onChange={(e) => setGroupFormData(prev => ({...prev, description: e.target.value}))}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meeting Day
                  </label>
                  <input
                    type="text"
                    value={groupFormData.meeting_day}
                    onChange={(e) => setGroupFormData(prev => ({...prev, meeting_day: e.target.value}))}
                    placeholder="e.g., Monday, Tuesday"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meeting Time
                  </label>
                  <input
                    type="text"
                    value={groupFormData.meeting_time}
                    onChange={(e) => setGroupFormData(prev => ({...prev, meeting_time: e.target.value}))}
                    placeholder="e.g., 18:00, 7:00 PM"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={groupFormData.status}
                    onChange={(e) => setGroupFormData(prev => ({...prev, status: e.target.value}))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Group Login Credentials
                  </label>
                  
                  {!selectedGroup.login_username && (
                    <button
                      onClick={() => handleGenerateGroupCredentials(selectedGroup)}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors font-medium disabled:opacity-50"
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                      {loading ? 'Generating...' : 'Generate Group Login Credentials'}
                    </button>
                  )}
                  
                  {showGroupCredentials && generatedGroupCredentials && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-green-900">Generated Group Credentials</span>
                        <button
                          onClick={handleCopyGroupCredentials}
                          className="flex items-center gap-1 text-green-700 hover:text-green-900"
                        >
                          <Copy className="h-4 w-4" />
                          <span className="text-xs">Copy</span>
                        </button>
                      </div>
                      <div>
                        <span className="text-xs text-green-700">Group Username:</span>
                        <p className="font-mono font-semibold text-green-900">{generatedGroupCredentials.username}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Username
                </label>
                <input
                  type="text"
                  value={groupFormData.login_username}
                  onChange={(e) => setGroupFormData(prev => ({...prev, login_username: e.target.value}))}
                  placeholder="Group login username"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleGroupUpdate}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 font-medium disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Group'}
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

        {/* Other modals for admin only */}
        {activeModal === 'data' && isAdminOrPastor(profile?.role || '') && (
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

        {activeModal === 'security' && isAdminOrPastor(profile?.role || '') && (
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

        {activeModal === 'notifications' && isAdminOrPastor(profile?.role || '') && (
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

        {activeModal === 'communication' && isAdminOrPastor(profile?.role || '') && (
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

        {activeModal === 'general' && isAdminOrPastor(profile?.role || '') && (
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
