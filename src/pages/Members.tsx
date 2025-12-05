// Members.tsx - Updated with role-based access control
import { Search, Plus, Home, Phone, User, Check, X, MapPin, Edit2, Save, Trash2, Calendar, Droplets, Building, Users, Shield, Lock } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';

// Interfaces
export interface Member {
  id: string;
  name: string;
  surname: string;
  residence: string | null;
  phone: string | null;
  cell_group_id: string | null;
  ministry_group_id: string | null;
  gender: 'male' | 'female' | null;
  is_permanent_member: boolean | null;
  permanent_member_date: string | null;
  cell_groups: { name: string } | null;
  ministry_groups: { name: string } | null;
  status: 'newcomer' | 'signed_member' | 'not_attending' | null;
  status_date: string | null;
  not_attending_reason: string | null;
  created_at: string | null;
  invited_by: string | null;
  baptism: string | null;
  is_developer: boolean | null;
  is_admin: boolean | null;
  auth_user_id: string | null;
}

export interface CellGroup {
  id: string;
  name: string;
}

export interface MinistryGroup {
  id: string;
  name: string;
}

export interface MemberOption {
  id: string;
  name: string;
  surname: string;
  fullName: string;
  is_developer: boolean | null;
}

export interface UserRole {
  is_developer: boolean;
  is_admin: boolean;
  member_id: string | null;
  cell_group_id: string | null;
  ministry_group_id: string | null;
}

export const Members: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [cellGroups, setCellGroups] = useState<CellGroup[]>([]);
  const [ministryGroups, setMinistryGroups] = useState<MinistryGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    residence: '',
    phone: '',
    invited_by: '',
    cell_group_id: '',
    ministry_group_id: '',
    gender: '' as 'male' | 'female' | '',
    baptism: '',
    is_developer: false,
    is_admin: false,
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    surname: '',
    residence: '',
    phone: '',
    invited_by: '',
    cell_group_id: '',
    ministry_group_id: '',
    gender: '' as 'male' | 'female' | '',
    status: 'newcomer' as 'newcomer' | 'signed_member' | 'not_attending',
    status_date: '',
    not_attending_reason: '',
    baptism: '',
    is_developer: false,
    is_admin: false,
  });
  
  const [memberOptions, setMemberOptions] = useState<MemberOption[]>([]);
  const [showInvitedByDropdown, setShowInvitedByDropdown] = useState(false);
  const [invitedBySearch, setInvitedBySearch] = useState('');
  const invitedByDropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Fetch user role and data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) return;
      
      try {
        // Get user role from members table
        const { data: memberData, error: memberError } = await supabase
          .from('members')
          .select('id, is_developer, is_admin, cell_group_id, ministry_group_id')
          .eq('auth_user_id', user.id)
          .single();

        if (memberError && memberError.code !== 'PGRST116') {
          console.error('Error fetching member data:', memberError);
        }

        if (memberData) {
          setCurrentUserRole({
            is_developer: memberData.is_developer || false,
            is_admin: memberData.is_admin || false,
            member_id: memberData.id,
            cell_group_id: memberData.cell_group_id,
            ministry_group_id: memberData.ministry_group_id,
          });
        } else {
          // If not found in members table, check if they're a developer/admin via auth metadata
          setCurrentUserRole({
            is_developer: user.user_metadata?.is_developer || false,
            is_admin: user.user_metadata?.is_admin || false,
            member_id: null,
            cell_group_id: null,
            ministry_group_id: null,
          });
        }

        // Fetch data based on role
        await fetchDataBasedOnRole(memberData);
      } catch (error: any) {
        console.error('Error fetching user role:', error);
      }
    };

    fetchUserData();
    fetchCellGroups();
    fetchMinistryGroups();
  }, [user]);

  const fetchDataBasedOnRole = async (userMemberData: any) => {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('members')
        .select(`
          *,
          cell_groups!fk_cell_group(name),
          ministry_groups(name)
        `);

      // Apply filters based on user role
      if (currentUserRole?.is_developer) {
        // Developers can see everything
        console.log('Developer view: Showing all members');
      } else if (currentUserRole?.is_admin) {
        // Admins can see everything except developers
        query = query.or(`is_developer.is.false,is_developer.is.null`);
        console.log('Admin view: Showing all except developers');
      } else if (currentUserRole?.member_id) {
        // Normal members can see:
        // 1. Their own profile
        // 2. Members in their cell group
        // 3. Members in their ministry group
        const conditions = [`id.eq.${currentUserRole.member_id}`];
        
        if (userMemberData?.cell_group_id) {
          conditions.push(`cell_group_id.eq.${userMemberData.cell_group_id}`);
        }
        
        if (userMemberData?.ministry_group_id) {
          conditions.push(`ministry_group_id.eq.${userMemberData.ministry_group_id}`);
        }
        
        query = query.or(conditions.join(','));
        console.log('Member view: Limited access');
      } else {
        // No role or member ID, show empty
        setMembers([]);
        setLoading(false);
        return;
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      setMembers(data || []);
    } catch (error: any) {
      console.error('Error fetching members:', error);
      setError(error.message || 'Failed to load members.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch cell groups
  const fetchCellGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('cell_groups')
        .select('id, name')
        .order('name');

      if (error) {
        throw error;
      }

      setCellGroups(data || []);
    } catch (error: any) {
      console.error('Error fetching cell groups:', error);
      setError(error.message || 'Failed to load cell groups.');
    }
  };

  // Fetch ministry groups
  const fetchMinistryGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('ministry_groups')
        .select('id, name')
        .order('name');

      if (error) {
        throw error;
      }

      setMinistryGroups(data || []);
    } catch (error: any) {
      console.error('Error fetching ministry groups:', error);
      setError(error.message || 'Failed to load ministry groups.');
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (invitedByDropdownRef.current && !invitedByDropdownRef.current.contains(event.target as Node)) {
        setShowInvitedByDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Load member options for invited by dropdown
  useEffect(() => {
    if (members.length > 0) {
      const options = members.map(member => ({
        id: member.id,
        name: member.name,
        surname: member.surname,
        fullName: `${member.name} ${member.surname}`,
        is_developer: member.is_developer
      }));
      setMemberOptions(options);
    }
  }, [members]);

  // Check if user can edit/delete a member
  const canEditMember = (member: Member): boolean => {
    if (!currentUserRole) return false;
    
    if (currentUserRole.is_developer) return true;
    
    if (currentUserRole.is_admin) {
      return !member.is_developer; // Admins cannot edit developers
    }
    
    // Normal members can only edit themselves
    return currentUserRole.member_id === member.id;
  };

  // Check if user can mark as permanent
  const canMarkAsPermanent = (member: Member): boolean => {
    if (!currentUserRole) return false;
    
    if (currentUserRole.is_developer || currentUserRole.is_admin) {
      return !member.is_permanent_member;
    }
    
    return false; // Only developers and admins can mark as permanent
  };

  // Check if user can delete a member
  const canDeleteMember = (member: Member): boolean => {
    if (!currentUserRole) return false;
    
    if (currentUserRole.is_developer) return true;
    
    if (currentUserRole.is_admin) {
      return !member.is_developer; // Admins cannot delete developers
    }
    
    // Normal members cannot delete anyone
    return false;
  };

  // Check if user can add new members
  const canAddMembers = (): boolean => {
    if (!currentUserRole) return false;
    return currentUserRole.is_developer || currentUserRole.is_admin;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Check permissions
      if (!canAddMembers()) {
        throw new Error('You do not have permission to add members');
      }

      // Basic validation
      if (!formData.name.trim() || !formData.surname.trim()) {
        throw new Error('Name and surname are required');
      }

      const memberData = {
        name: formData.name.trim(),
        surname: formData.surname.trim(),
        residence: formData.residence.trim() || null,
        phone: formData.phone.trim() || null,
        cell_group_id: formData.cell_group_id || null,
        ministry_group_id: formData.ministry_group_id || null,
        gender: formData.gender || null,
        invited_by: formData.invited_by.trim() || null,
        baptism: formData.baptism || null,
        status: 'newcomer',
        status_date: new Date().toISOString(),
        is_developer: formData.is_developer,
        is_admin: formData.is_admin,
      };

      // Only developers can create developers
      if (memberData.is_developer && !currentUserRole?.is_developer) {
        throw new Error('Only developers can create developer accounts');
      }

      // Only developers/admins can create admins
      if (memberData.is_admin && !currentUserRole?.is_developer && !currentUserRole?.is_admin) {
        throw new Error('Only developers and admins can create admin accounts');
      }

      const { data, error } = await supabase
        .from('members')
        .insert([memberData])
        .select();

      if (error) {
        throw error;
      }

      setShowForm(false);
      resetForm();
      setSuccess('Member added successfully!');
      fetchDataBasedOnRole(currentUserRole);
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error adding member:', error);
      setError(error.message || 'Failed to add member. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditMember = (member: Member) => {
    if (!canEditMember(member)) {
      setError('You do not have permission to edit this member');
      return;
    }
    
    setEditingMember(member.id);
    setEditFormData({
      name: member.name,
      surname: member.surname,
      residence: member.residence || '',
      phone: member.phone || '',
      invited_by: member.invited_by || '',
      cell_group_id: member.cell_group_id || '',
      ministry_group_id: member.ministry_group_id || '',
      gender: member.gender || '',
      status: member.status || 'newcomer',
      status_date: member.status_date ? new Date(member.status_date).toISOString().split('T')[0] : '',
      not_attending_reason: member.not_attending_reason || '',
      baptism: member.baptism || '',
      is_developer: member.is_developer || false,
      is_admin: member.is_admin || false,
    });
  };

  const handleSaveMember = async (memberId: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const member = members.find(m => m.id === memberId);
      if (!member) {
        throw new Error('Member not found');
      }

      if (!canEditMember(member)) {
        throw new Error('You do not have permission to edit this member');
      }

      if (!editFormData.name.trim() || !editFormData.surname.trim() || !editFormData.gender) {
        setError('Name, surname, and gender are required fields.');
        setLoading(false);
        return;
      }

      const updateData: any = {
        name: editFormData.name.trim(),
        surname: editFormData.surname.trim(),
        residence: editFormData.residence.trim() || null,
        phone: editFormData.phone.trim() || null,
        cell_group_id: editFormData.cell_group_id || null,
        ministry_group_id: editFormData.ministry_group_id || null,
        gender: editFormData.gender || null,
        invited_by: editFormData.invited_by.trim() || null,
        status: editFormData.status,
        status_date: editFormData.status_date ? new Date(editFormData.status_date).toISOString() : new Date().toISOString(),
        baptism: editFormData.baptism || null,
      };

      // Only developers can change developer/admin status
      if (currentUserRole?.is_developer) {
        updateData.is_developer = editFormData.is_developer;
        updateData.is_admin = editFormData.is_admin;
      } else if (currentUserRole?.is_admin) {
        // Admins cannot change developer status, but can change admin status
        updateData.is_admin = editFormData.is_admin;
      }

      if (editFormData.status === 'not_attending') {
        updateData.not_attending_reason = editFormData.not_attending_reason.trim();
      } else {
        updateData.not_attending_reason = null;
      }

      const { error } = await supabase
        .from('members')
        .update(updateData)
        .eq('id', memberId);

      if (error) {
        throw error;
      }

      setEditingMember(null);
      setSuccess('Member details updated successfully!');
      fetchDataBasedOnRole(currentUserRole);
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error updating member:', error);
      setError(error.message || 'Failed to update member details.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingMember(null);
  };

  const handleMarkAsPermanent = async (memberId: string) => {
    try {
      const member = members.find(m => m.id === memberId);
      if (!member) {
        throw new Error('Member not found');
      }

      if (!canMarkAsPermanent(member)) {
        throw new Error('You do not have permission to mark this member as permanent');
      }

      setError(null);
      setSuccess(null);
      
      const { error } = await supabase
        .from('members')
        .update({
          is_permanent_member: true,
          permanent_member_date: new Date().toISOString(),
        })
        .eq('id', memberId);

      if (error) {
        throw error;
      }

      setSuccess('Member marked as permanent!');
      fetchDataBasedOnRole(currentUserRole);
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error marking as permanent:', error);
      setError(error.message || 'Failed to update member status.');
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) {
      setError('Member not found');
      return;
    }

    if (!canDeleteMember(member)) {
      setError('You do not have permission to delete this member');
      return;
    }

    if (!confirm('Are you sure you want to delete this member? This action cannot be undone.')) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', memberId);

      if (error) {
        throw error;
      }

      setSuccess('Member deleted successfully!');
      fetchDataBasedOnRole(currentUserRole);
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error deleting member:', error);
      setError(error.message || 'Failed to delete member.');
    }
  };

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.surname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.residence?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.cell_groups?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMemberOptions = memberOptions
    .filter(option =>
      option.fullName.toLowerCase().includes(invitedBySearch.toLowerCase())
    )
    .filter(option => 
      currentUserRole?.is_developer ? true : !option.is_developer
    );

  const handleSelectInvitedBy = (memberName: string) => {
    setFormData({ ...formData, invited_by: memberName });
    setShowInvitedByDropdown(false);
    setInvitedBySearch('');
  };

  const getInitials = (name: string, surname: string) => {
    return `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase();
  };

  const resetForm = () => {
    setFormData({ 
      name: '', 
      surname: '', 
      residence: '', 
      phone: '', 
      invited_by: '', 
      cell_group_id: '',
      ministry_group_id: '',
      gender: '',
      baptism: '',
      is_developer: false,
      is_admin: false,
    });
    setShowInvitedByDropdown(false);
    setInvitedBySearch('');
  };

  const getStatusBadge = (status: string | null) => {
    const badges = {
      newcomer: { 
        color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', 
        text: 'Newcomer' 
      },
      signed_member: { 
        color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300', 
        text: 'Signed Member' 
      },
      not_attending: { 
        color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300', 
        text: 'Not Attending' 
      },
    };
    return badges[(status as keyof typeof badges) || 'newcomer'] || badges.newcomer;
  };

  const getBaptismBadge = (baptism: string | null) => {
    if (!baptism) {
      return { color: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300', text: 'Not Baptised' };
    }
    
    const baptismDate = new Date(baptism);
    const now = new Date();
    const yearsDiff = now.getFullYear() - baptismDate.getFullYear();
    
    if (yearsDiff === 0) {
      return { color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300', text: 'Recently Baptised' };
    } else if (yearsDiff <= 5) {
      return { color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', text: `${yearsDiff} Year${yearsDiff > 1 ? 's' : ''} Since Baptism` };
    } else {
      return { color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300', text: `Baptised ${yearsDiff} Years Ago` };
    }
  };

  const getRoleBadge = (member: Member) => {
    if (member.is_developer) {
      return { 
        color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
        icon: <Shield className="h-3 w-3 inline mr-1" />,
        text: 'Developer' 
      };
    } else if (member.is_admin) {
      return { 
        color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
        icon: <Shield className="h-3 w-3 inline mr-1" />,
        text: 'Admin' 
      };
    }
    return null;
  };

  const getStatusCounts = () => {
    const visibleMembers = members.filter(member => {
      if (member.is_developer && !currentUserRole?.is_developer) {
        return false; // Hide developers from non-developers
      }
      return true;
    });

    return {
      total: visibleMembers.length,
      permanent: visibleMembers.filter(m => m.is_permanent_member).length,
      newcomer: visibleMembers.filter(m => m.status === 'newcomer').length,
      signed_member: visibleMembers.filter(m => m.status === 'signed_member').length,
      not_attending: visibleMembers.filter(m => m.status === 'not_attending').length,
      baptised: visibleMembers.filter(m => m.baptism).length,
      developers: visibleMembers.filter(m => m.is_developer).length,
      admins: visibleMembers.filter(m => m.is_admin && !m.is_developer).length,
    };
  };

  const statusCounts = getStatusCounts();

  const getUserRoleDisplay = () => {
    if (!currentUserRole) return 'Loading...';
    
    if (currentUserRole.is_developer) return 'Developer (Full Access)';
    if (currentUserRole.is_admin) return 'Administrator';
    if (currentUserRole.member_id) return 'Member (Limited Access)';
    return 'Guest (No Access)';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Members Directory
              </h1>
              <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium">
                {getUserRoleDisplay()}
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-400">Manage and view church members based on your access level</p>
          </div>
          {canAddMembers() && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium group"
            >
              <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
              {showForm ? 'Cancel' : 'Add Member'}
            </button>
          )}
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-xl text-green-700 dark:text-green-300">
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-xl text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Add Member Form - Only visible to developers and admins */}
        {showForm && canAddMembers() && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 mb-8 shadow-lg hover:shadow-xl transition-all duration-300">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Add New Member</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter first name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={formData.surname}
                    onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter last name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Residence
                  </label>
                  <input
                    type="text"
                    value={formData.residence}
                    onChange={(e) => setFormData({ ...formData, residence: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter residence address"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter phone number"
                  />
                </div>
                
                {/* Invited By Field with Dropdown */}
                <div className="space-y-2 relative" ref={invitedByDropdownRef}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Invited By
                  </label>
                  <div className="relative">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={formData.invited_by}
                        onChange={(e) => setFormData({ ...formData, invited_by: e.target.value })}
                        onFocus={() => setShowInvitedByDropdown(true)}
                        className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="Select member or type name"
                      />
                      <button
                        type="button"
                        onClick={() => setShowInvitedByDropdown(!showInvitedByDropdown)}
                        className="px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <Users className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      </button>
                    </div>
                    
                    {/* Dropdown for selecting members */}
                    {showInvitedByDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-auto">
                        {/* Search input inside dropdown */}
                        <div className="sticky top-0 bg-white dark:bg-gray-800 p-2 border-b border-gray-200 dark:border-gray-700">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                              type="text"
                              value={invitedBySearch}
                              onChange={(e) => setInvitedBySearch(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Search members..."
                              autoFocus
                            />
                          </div>
                        </div>
                        
                        {/* Member options */}
                        <div className="p-1">
                          {filteredMemberOptions.length === 0 ? (
                            <div className="px-3 py-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                              {invitedBySearch ? 'No members found' : 'No members available'}
                            </div>
                          ) : (
                            filteredMemberOptions.map((member) => (
                              <button
                                key={member.id}
                                type="button"
                                onClick={() => handleSelectInvitedBy(member.fullName)}
                                className="w-full px-3 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-3 transition-colors"
                              >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                                  {getInitials(member.name, member.surname)}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {member.fullName}
                                  </div>
                                  {member.is_developer && (
                                    <span className="text-xs text-purple-600 dark:text-purple-400">
                                      Developer
                                    </span>
                                  )}
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Select from existing members or type name manually
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Gender *
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' | '' })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Baptism Date
                  </label>
                  <input
                    type="date"
                    value={formData.baptism}
                    onChange={(e) => setFormData({ ...formData, baptism: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cell Group
                  </label>
                  <select
                    value={formData.cell_group_id}
                    onChange={(e) => setFormData({ ...formData, cell_group_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="">Select cell group</option>
                    {cellGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Ministry Group
                  </label>
                  <select
                    value={formData.ministry_group_id}
                    onChange={(e) => setFormData({ ...formData, ministry_group_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="">Select ministry group</option>
                    {ministryGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Developer and Admin fields - Only visible to developers */}
                {currentUserRole?.is_developer && (
                  <>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-purple-500" />
                        Developer Account
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={formData.is_developer}
                          onChange={(e) => setFormData({ ...formData, is_developer: e.target.checked })}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 dark:border-gray-600 rounded"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Grant developer access (full system permissions)
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-indigo-500" />
                        Admin Account
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={formData.is_admin}
                          onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Grant admin access (manage members, groups, etc.)
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* Admin field - Visible to developers and admins */}
                {(currentUserRole?.is_developer || currentUserRole?.is_admin) && !currentUserRole?.is_developer && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-indigo-500" />
                      Admin Account
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={formData.is_admin}
                        onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Grant admin access (manage members, groups, etc.)
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" />
                  {loading ? 'Adding Member...' : 'Add Member'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 mb-6 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search members by name, residence, phone, or cell group..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Access Warning for Normal Members */}
        {currentUserRole?.member_id && !currentUserRole?.is_admin && !currentUserRole?.is_developer && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-xl">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-300 mb-2">
              <Lock className="h-4 w-4" />
              <span className="font-medium">Limited Access</span>
            </div>
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              You can only view your own profile and members in your cell/ministry groups.
              Developer and admin profiles are hidden from your view.
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && members.length === 0 && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading members...</p>
          </div>
        )}

        {/* Members Grid */}
        <div className="grid gap-6">
          {!loading && filteredMembers.length === 0 ? (
            <div className="text-center py-12 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl">
              <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                {searchQuery ? 'No Members Found' : 'No Members Available'}
              </h3>
              <p className="text-gray-500 dark:text-gray-500">
                {searchQuery 
                  ? 'Try adjusting your search terms' 
                  : currentUserRole?.member_id && !currentUserRole?.is_admin && !currentUserRole?.is_developer
                    ? 'You can only view members in your groups'
                    : 'Add your first member to get started'}
              </p>
            </div>
          ) : (
            filteredMembers.map((member) => (
              <div 
                key={member.id} 
                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:border-gray-300/50 dark:hover:border-gray-600/50 group"
              >
                {editingMember === member.id ? (
                  // Edit Mode
                  <div className="space-y-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                          {getInitials(editFormData.name, editFormData.surname)}
                        </div>
                        <div>
                          <div className="flex gap-3 mb-2">
                            <input
                              type="text"
                              value={editFormData.name}
                              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                              className="text-2xl font-bold text-gray-900 dark:text-white bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 px-1"
                              placeholder="First Name"
                            />
                            <input
                              type="text"
                              value={editFormData.surname}
                              onChange={(e) => setEditFormData({ ...editFormData, surname: e.target.value })}
                              className="text-2xl font-bold text-gray-900 dark:text-white bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 px-1"
                              placeholder="Last Name"
                            />
                          </div>
                          <div className="flex gap-2">
                            <select
                              value={editFormData.status}
                              onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                              className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(editFormData.status).color} border-none focus:ring-2 focus:ring-blue-500`}
                            >
                              <option value="newcomer">Newcomer</option>
                              <option value="signed_member">Signed Member</option>
                              <option value="not_attending">Not Attending</option>
                            </select>
                            {editFormData.baptism && (
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getBaptismBadge(editFormData.baptism).color}`}>
                                {getBaptismBadge(editFormData.baptism).text}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Home className="h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={editFormData.residence}
                          onChange={(e) => setEditFormData({ ...editFormData, residence: e.target.value })}
                          className="flex-1 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 px-1 text-gray-600 dark:text-gray-400"
                          placeholder="Residence address"
                        />
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <input
                          type="tel"
                          value={editFormData.phone}
                          onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                          className="flex-1 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 px-1 text-gray-600 dark:text-gray-400"
                          placeholder="Phone number"
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <select
                          value={editFormData.cell_group_id}
                          onChange={(e) => setEditFormData({ ...editFormData, cell_group_id: e.target.value })}
                          className="flex-1 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 px-1 text-gray-600 dark:text-gray-400"
                        >
                          <option value="">Select cell group</option>
                          {cellGroups.map((group) => (
                            <option key={group.id} value={group.id}>
                              {group.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-3">
                        <Building className="h-4 w-4 text-gray-400" />
                        <select
                          value={editFormData.ministry_group_id}
                          onChange={(e) => setEditFormData({ ...editFormData, ministry_group_id: e.target.value })}
                          className="flex-1 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 px-1 text-gray-600 dark:text-gray-400"
                        >
                          <option value="">Select ministry group</option>
                          {ministryGroups.map((group) => (
                            <option key={group.id} value={group.id}>
                              {group.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-3">
                        <Droplets className="h-4 w-4 text-gray-400" />
                        <input
                          type="date"
                          value={editFormData.baptism}
                          onChange={(e) => setEditFormData({ ...editFormData, baptism: e.target.value })}
                          className="flex-1 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 px-1 text-gray-600 dark:text-gray-400"
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={editFormData.invited_by}
                          onChange={(e) => setEditFormData({ ...editFormData, invited_by: e.target.value })}
                          className="flex-1 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 px-1 text-gray-600 dark:text-gray-400"
                          placeholder="Invited by"
                        />
                      </div>

                      {/* Role editing - Only visible to developers */}
                      {currentUserRole?.is_developer && (
                        <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                          <h4 className="font-semibold text-gray-900 dark:text-white">Roles</h4>
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={editFormData.is_developer}
                              onChange={(e) => setEditFormData({ ...editFormData, is_developer: e.target.checked })}
                              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 dark:border-gray-600 rounded"
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              Developer Access (Full system permissions)
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={editFormData.is_admin}
                              onChange={(e) => setEditFormData({ ...editFormData, is_admin: e.target.checked })}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              Admin Access (Manage members, groups, etc.)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Status</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-600 dark:text-gray-400 min-w-20">Status:</span>
                          <select
                            value={editFormData.status}
                            onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="newcomer">Newcomer</option>
                            <option value="signed_member">Signed Member</option>
                            <option value="not_attending">Not Attending</option>
                          </select>
                        </div>
                        
                        {(editFormData.status === 'signed_member' || editFormData.status === 'not_attending') && (
                          <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-400 min-w-32">Date Became Member:</span>
                            <input
                              type="date"
                              value={editFormData.status_date}
                              onChange={(e) => setEditFormData({ ...editFormData, status_date: e.target.value })}
                              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        )}
                        
                        {editFormData.status === 'not_attending' && (
                          <div className="flex items-start gap-3">
                            <span className="text-sm text-gray-600 dark:text-gray-400 min-w-20 mt-2">Reason:</span>
                            <textarea
                              value={editFormData.not_attending_reason}
                              onChange={(e) => setEditFormData({ ...editFormData, not_attending_reason: e.target.value })}
                              placeholder="Reason for not attending..."
                              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              rows={3}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => handleSaveMember(member.id)}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 transition-all duration-200"
                      >
                        <Save className="h-4 w-4" />
                        {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex flex-col lg:flex-row justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                          {getInitials(member.name, member.surname)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                              {member.name} {member.surname}
                            </h3>
                            {member.is_permanent_member && (
                              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium flex items-center gap-1">
                                <Check className="h-3 w-3" />
                                Permanent Member
                              </span>
                            )}
                            {getRoleBadge(member) && (
                              <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getRoleBadge(member)!.color}`}>
                                {getRoleBadge(member)!.icon}
                                {getRoleBadge(member)!.text}
                              </span>
                            )}
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(member.status).color}`}>
                              {getStatusBadge(member.status).text}
                            </span>
                            {member.baptism && (
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getBaptismBadge(member.baptism).color}`}>
                                <Droplets className="h-3 w-3 inline mr-1" />
                                {getBaptismBadge(member.baptism).text}
                              </span>
                            )}
                          </div>
                          
                          <div className="space-y-3 text-gray-600 dark:text-gray-400">
                            {member.residence && (
                              <div className="flex items-center gap-3">
                                <Home className="h-4 w-4" />
                                <span className="font-medium">{member.residence}</span>
                              </div>
                            )}
                            {member.phone && (
                              <div className="flex items-center gap-3">
                                <Phone className="h-4 w-4" />
                                <span className="font-medium">{member.phone}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-3">
                              <MapPin className="h-4 w-4" />
                              <span className="font-medium">{member.cell_groups?.name || 'No Cell Group Assigned'}</span>
                            </div>
                            {member.ministry_groups?.name && (
                              <div className="flex items-center gap-3">
                                <Building className="h-4 w-4" />
                                <span className="font-medium">{member.ministry_groups.name}</span>
                              </div>
                            )}
                            {member.baptism && (
                              <div className="flex items-center gap-3 text-sm">
                                <Droplets className="h-4 w-4" />
                                <span>Baptised: {new Date(member.baptism).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}</span>
                              </div>
                            )}
                            {member.invited_by && (
                              <div className="flex items-center gap-3 text-sm">
                                <User className="h-4 w-4" />
                                <span>Invited by: {member.invited_by}</span>
                              </div>
                            )}
                            {member.permanent_member_date && (
                              <div className="text-sm text-green-600 dark:text-green-400">
                                Permanent since: {new Date(member.permanent_member_date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col justify-between items-end gap-4">
                      <div className="flex flex-col gap-3">
                        {canEditMember(member) && (
                          <button
                            onClick={() => handleEditMember(member)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium group"
                          >
                            <Edit2 className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                            Edit Details
                          </button>
                        )}
                        {canMarkAsPermanent(member) && !member.is_permanent_member && (
                          <button
                            onClick={() => handleMarkAsPermanent(member.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium group"
                          >
                            <Check className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                            Mark as Permanent
                          </button>
                        )}
                        {canDeleteMember(member) && (
                          <button
                            onClick={() => handleDeleteMember(member.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium group"
                          >
                            <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                            Delete
                          </button>
                        )}
                      </div>
                      {member.status_date && member.status === 'signed_member' && (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Member since: {new Date(member.status_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                      )}
                      {member.not_attending_reason && member.status === 'not_attending' && (
                        <div className="text-sm text-red-600 dark:text-red-400 max-w-xs">
                          Reason: {member.not_attending_reason}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Stats Summary */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-8 gap-6">
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{statusCounts.total}</div>
            <div className="text-gray-600 dark:text-gray-400 font-medium">Total Members</div>
          </div>
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{statusCounts.permanent}</div>
            <div className="text-gray-600 dark:text-gray-400 font-medium">Permanent Members</div>
          </div>
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{statusCounts.newcomer}</div>
            <div className="text-gray-600 dark:text-gray-400 font-medium">Newcomers</div>
          </div>
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{statusCounts.signed_member}</div>
            <div className="text-gray-600 dark:text-gray-400 font-medium">Signed Members</div>
          </div>
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{statusCounts.baptised}</div>
            <div className="text-gray-600 dark:text-gray-400 font-medium flex items-center justify-center gap-1">
              <Droplets className="h-4 w-4" />
              Baptised
            </div>
          </div>
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{cellGroups.length}</div>
            <div className="text-gray-600 dark:text-gray-400 font-medium">Cell Groups</div>
          </div>
          {currentUserRole?.is_developer && (
            <>
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 text-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{statusCounts.developers}</div>
                <div className="text-gray-600 dark:text-gray-400 font-medium flex items-center justify-center gap-1">
                  <Shield className="h-4 w-4 text-purple-500" />
                  Developers
                </div>
              </div>
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 text-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{statusCounts.admins}</div>
                <div className="text-gray-600 dark:text-gray-400 font-medium flex items-center justify-center gap-1">
                  <Shield className="h-4 w-4 text-indigo-500" />
                  Admins
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Members;
