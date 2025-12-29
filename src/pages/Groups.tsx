import { Search, Plus, Mail, Phone, User, Check, X, MapPin, Edit2, Save, Trash2, Calendar, Droplets, Eye, EyeOff, RefreshCw, Download, Filter, Shield, Users, Key } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Member {
  id: string;
  name: string;
  surname: string;
  residence: string | null;
  phone: string | null;
  cell_group_id: string | null;
  gender: 'male' | 'female' | null;
  is_permanent_member: boolean | null;
  permanent_member_date: string | null;
  baptism: string | null;
  cell_groups: { name: string } | null;
  ministry_groups: { name: string } | null;
  status: string | null;
  status_date: string | null;
  not_attending_reason: string | null;
  created_at: string | null;
  invited_by: string | null;
  is_hidden: boolean | null;
  email: string | null;
  birth_date: string | null;
  occupation: string | null;
}

interface CellGroup {
  id: string;
  name: string;
}

interface MinistryGroup {
  id: string;
  name: string;
}

const NOT_ATTENDING_STATUSES = ['inactive', 'stopped attending', 'not attending', 'left'];
const ATTENDING_STATUSES = ['newcomer', 'member', 'signed member', 'permanent', 'active'];
const VALID_STATUSES = [...ATTENDING_STATUSES, ...NOT_ATTENDING_STATUSES];

// Audit log function
const logAudit = async (
  tableName: string,
  recordId: string,
  action: 'INSERT' | 'UPDATE' | 'DELETE',
  oldData?: any,
  newData?: any
) => {
  try {
    // Get current user from Supabase auth
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('audit_logs').insert({
      table_name: tableName,
      record_id: recordId,
      action: action,
      old_data: oldData,
      new_data: newData,
      user_id: user?.id || null
    });
  } catch (error) {
    console.error('Error logging audit:', error);
  }
};

const Members = () => {
  const { 
    profile, 
    loading: authLoading, 
    isAdmin, 
    isPastor, 
    isDeacon, 
    isGroupLeader, 
    isMember,
    canViewAllMembers,
    canEditMember,
    canDeleteMember,
    canCreateMember,
    canExportMembers
  } = useAuth();
  const navigate = useNavigate();
  
  const [showForm, setShowForm] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [hiddenMembers, setHiddenMembers] = useState<Member[]>([]);
  const [cellGroups, setCellGroups] = useState<CellGroup[]>([]);
  const [ministryGroups, setMinistryGroups] = useState<MinistryGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>(VALID_STATUSES);
  const [showHiddenMembers, setShowHiddenMembers] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Separate state for ministry group selection
  const [selectedMinistryGroup, setSelectedMinistryGroup] = useState('');
  const [editSelectedMinistryGroup, setEditSelectedMinistryGroup] = useState('');
  
  // Filter states
  const [selectedCellGroup, setSelectedCellGroup] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedGender, setSelectedGender] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    residence: '',
    phone: '',
    email: '',
    birth_date: '',
    occupation: '',
    invited_by: '',
    cell_group_id: '',
    gender: '' as 'male' | 'female' | '',
    baptism: '',
  });
  
  const [editFormData, setEditFormData] = useState<{
    name: string;
    surname: string;
    residence: string;
    phone: string;
    email: string;
    birth_date: string;
    occupation: string;
    invited_by: string;
    cell_group_id: string;
    gender: 'male' | 'female' | '';
    baptism: string;
    status: string;
    status_date: string;
    not_attending_reason: string;
    is_hidden: boolean;
  }>({
    name: '',
    surname: '',
    residence: '',
    phone: '',
    email: '',
    birth_date: '',
    occupation: '',
    invited_by: '',
    cell_group_id: '',
    gender: '',
    baptism: '',
    status: 'newcomer',
    status_date: '',
    not_attending_reason: '',
    is_hidden: false,
  });

  // Check if user can access members page
  useEffect(() => {
    if (!authLoading && !profile) {
      navigate('/login');
    }
  }, [authLoading, profile, navigate]);

  // Permission checks for hidden members
  const canViewHiddenMembers = () => {
    return isAdmin() || isPastor() || isDeacon();
  };

  const getVisibleCellGroupFilter = () => {
    // Admin, Pastor, and Deacon can see all members
    if (isAdmin() || isPastor() || isDeacon()) {
      return null;
    }
    
    // Group leader can only see members in their cell group
    if (isGroupLeader()) {
      return profile?.cell_group_id || null;
    }
    
    // Regular member can only see themselves
    if (isMember() && profile?.id) {
      return profile.id;
    }
    
    return null;
  };

  const isNotAttendingStatus = (status: string | null): boolean => {
    if (!status) return false;
    const statusLower = status.toLowerCase();
    return NOT_ATTENDING_STATUSES.some(notAttendingStatus => 
      statusLower.includes(notAttendingStatus.toLowerCase())
    );
  };

  const isAttendingStatus = (status: string | null): boolean => {
    if (!status) return false;
    const statusLower = status.toLowerCase();
    return ATTENDING_STATUSES.some(attendingStatus => 
      statusLower.includes(attendingStatus.toLowerCase())
    );
  };

  useEffect(() => {
    if (profile) {
      fetchMembers();
      fetchCellGroups();
      fetchMinistryGroups();
    }
  }, [profile]);

  const fetchMembers = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('members')
        .select(`
          *,
          cell_groups!fk_cell_group(name)
        `);

      // Apply role-based filtering
      const visibleCellGroup = getVisibleCellGroupFilter();
      
      if (visibleCellGroup) {
        if (isMember()) {
          // Regular members can only see themselves
          query = query.eq('id', visibleCellGroup);
        } else if (isGroupLeader()) {
          // Group leaders can see members in their cell group
          query = query.eq('cell_group_id', visibleCellGroup);
        }
      } else if (!isAdmin() && !isPastor() && !isDeacon()) {
        // If no visible cell group and not admin/pastor/deacon, show nothing
        setMembers([]);
        setLoading(false);
        return;
      }

      // Always exclude hidden members by default (unless showing hidden)
      if (!showHiddenMembers) {
        query = query.eq('is_hidden', false);
      }

      const { data: membersData, error: membersError } = await query
        .order('created_at', { ascending: false });

      if (membersError) {
        throw membersError;
      }

      // Handle single member case (for regular members)
      const membersArray = Array.isArray(membersData) ? membersData : (membersData ? [membersData] : []);

      // Get ministry group memberships
      const memberIds = membersArray?.map(m => m.id) || [];
      let ministryGroupsMap: Record<string, { name: string }> = {};

      if (memberIds.length > 0) {
        const { data: ministryData, error: ministryError } = await supabase
          .from('ministry_membership')
          .select('member_id, ministry_group_name')
          .in('member_id', memberIds);

        if (!ministryError && ministryData) {
          ministryData.forEach(item => {
            ministryGroupsMap[item.member_id] = { name: item.ministry_group_name };
          });
        }
      }

      const membersWithMinistryGroups = membersArray?.map(member => ({
        ...member,
        ministry_groups: ministryGroupsMap[member.id] || null
      })) || [];

      setMembers(membersWithMinistryGroups);
    } catch (error: any) {
      console.error('Error fetching members:', error);
      setError(error.message || 'Failed to load members.');
    } finally {
      setLoading(false);
    }
  };

  const fetchHiddenMembers = async () => {
    if (!canViewHiddenMembers()) return;

    try {
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select(`
          *,
          cell_groups!fk_cell_group(name)
        `)
        .eq('is_hidden', true)
        .order('created_at', { ascending: false });

      if (membersError) {
        throw membersError;
      }

      // Get ministry group memberships
      const memberIds = membersData?.map(m => m.id) || [];
      let ministryGroupsMap: Record<string, { name: string }> = {};

      if (memberIds.length > 0) {
        const { data: ministryData, error: ministryError } = await supabase
          .from('ministry_membership')
          .select('member_id, ministry_group_name')
          .in('member_id', memberIds);

        if (!ministryError && ministryData) {
          ministryData.forEach(item => {
            ministryGroupsMap[item.member_id] = { name: item.ministry_group_name };
          });
        }
      }

      const membersWithMinistryGroups = membersData?.map(member => ({
        ...member,
        ministry_groups: ministryGroupsMap[member.id] || null
      })) || [];

      setHiddenMembers(membersWithMinistryGroups);
    } catch (error: any) {
      console.error('Error fetching hidden members:', error);
    }
  };

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
    }
  };

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
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canCreateMember()) {
      setError('You do not have permission to add members.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    
    if (!formData.name.trim() || !formData.surname.trim() || !formData.residence.trim() || !formData.gender) {
      setError('Name, surname, residence, and gender are required fields.');
      setLoading(false);
      return;
    }

    try {
      const newMemberData = {
        name: formData.name.trim(),
        surname: formData.surname.trim(),
        residence: formData.residence.trim(),
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        birth_date: formData.birth_date || null,
        occupation: formData.occupation.trim() || null,
        cell_group_id: formData.cell_group_id || null,
        gender: formData.gender || null,
        invited_by: formData.invited_by.trim() || null,
        baptism: formData.baptism || null,
        status: 'newcomer',
        status_date: new Date().toISOString(),
        is_permanent_member: false,
        is_hidden: false,
        not_attending_reason: null,
      };

      // First, create the member
      const { data: newMember, error: memberError } = await supabase
        .from('members')
        .insert([newMemberData])
        .select()
        .single();

      if (memberError) {
        throw memberError;
      }

      // Log the audit
      await logAudit('members', newMember.id, 'INSERT', null, newMemberData);

      // Then, add to ministry group if selected
      if (selectedMinistryGroup && newMember) {
        const ministryData = {
          member_id: newMember.id,
          ministry_group_id: selectedMinistryGroup,
          role: 'member'
        };

        const { error: ministryError } = await supabase
          .from('ministry_group_members')
          .insert([ministryData]);

        if (ministryError) {
          console.error('Error adding to ministry group:', ministryError);
          // Log the error but don't stop the process
          await logAudit('ministry_group_members', newMember.id, 'INSERT', null, {
            ...ministryData,
            error: ministryError.message
          });
        } else {
          await logAudit('ministry_group_members', newMember.id, 'INSERT', null, ministryData);
        }
      }

      setShowForm(false);
      resetForm();
      setSuccess('Member added successfully as a newcomer!');
      fetchMembers();
      fetchHiddenMembers();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error adding member:', error);
      setError(error.message || 'Failed to add member. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditMember = async (member: Member) => {
    if (!canEditMember(member.cell_group_id)) {
      setError('You do not have permission to edit this member.');
      return;
    }

    setEditingMember(member.id);
    setEditFormData({
      name: member.name,
      surname: member.surname,
      residence: member.residence || '',
      phone: member.phone || '',
      email: member.email || '',
      birth_date: member.birth_date || '',
      occupation: member.occupation || '',
      invited_by: member.invited_by || '',
      cell_group_id: member.cell_group_id || '',
      gender: member.gender || '',
      baptism: member.baptism || '',
      status: member.status || 'newcomer',
      status_date: member.status_date ? new Date(member.status_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      not_attending_reason: member.not_attending_reason || '',
      is_hidden: member.is_hidden || false,
    });
    
    // Fetch current ministry group for this member
    if (member.id) {
      try {
        const { data: ministryData, error } = await supabase
          .from('ministry_membership')
          .select('ministry_group_id')
          .eq('member_id', member.id)
          .maybeSingle();
        
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching ministry group:', error);
        }
        
        setEditSelectedMinistryGroup(ministryData?.ministry_group_id || '');
      } catch (error) {
        console.error('Error fetching ministry group:', error);
        setEditSelectedMinistryGroup('');
      }
    }
  };

  const handleSaveMember = async (memberId: string) => {
    if (!canEditMember()) {
      setError('You do not have permission to edit members.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (!editFormData.name.trim() || !editFormData.surname.trim() || !editFormData.residence.trim() || !editFormData.gender) {
        setError('Name, surname, residence, and gender are required fields.');
        setLoading(false);
        return;
      }

      // Validate status
      const status = editFormData.status.toLowerCase();
      if (!VALID_STATUSES.some(validStatus => status.includes(validStatus.toLowerCase()))) {
        setError(`Invalid status. Please use one of: ${VALID_STATUSES.join(', ')}`);
        setLoading(false);
        return;
      }

      // Determine if status is not attending
      const isNotAttending = isNotAttendingStatus(editFormData.status);
      const isAttending = isAttendingStatus(editFormData.status);
      
      // Auto-set is_hidden based on status
      const shouldBeHidden = isNotAttending;
      
      // Set not_attending_reason if status indicates not attending
      const not_attending_reason = isNotAttending 
        ? (editFormData.not_attending_reason || 'Member stopped attending')
        : null;

      const updateData: any = {
        name: editFormData.name.trim(),
        surname: editFormData.surname.trim(),
        residence: editFormData.residence.trim(),
        phone: editFormData.phone.trim() || null,
        email: editFormData.email.trim() || null,
        birth_date: editFormData.birth_date || null,
        occupation: editFormData.occupation.trim() || null,
        cell_group_id: editFormData.cell_group_id || null,
        gender: editFormData.gender || null,
        invited_by: editFormData.invited_by.trim() || null,
        baptism: editFormData.baptism || null,
        status: editFormData.status,
        status_date: editFormData.status_date ? new Date(editFormData.status_date).toISOString() : new Date().toISOString(),
        is_permanent_member: editFormData.status.toLowerCase().includes('permanent'),
        not_attending_reason,
        is_hidden: shouldBeHidden,
      };

      if (editFormData.status.toLowerCase().includes('permanent')) {
        updateData.permanent_member_date = new Date().toISOString();
      }

      // First get the old data for audit log
      const { data: oldMemberData } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberId)
        .single();

      // Update member
      const { error: memberError } = await supabase
        .from('members')
        .update(updateData)
        .eq('id', memberId);

      if (memberError) {
        throw memberError;
      }

      // Log the audit
      await logAudit('members', memberId, 'UPDATE', oldMemberData, updateData);

      // Handle ministry group separately
      // Remove from all ministry groups first
      const { data: oldMinistryData } = await supabase
        .from('ministry_group_members')
        .select('*')
        .eq('member_id', memberId);

      if (oldMinistryData && oldMinistryData.length > 0) {
        await supabase
          .from('ministry_group_members')
          .delete()
          .eq('member_id', memberId);

        // Log the deletion
        await logAudit('ministry_group_members', memberId, 'DELETE', oldMinistryData, null);
      }
      
      // Add to selected ministry group if one is selected
      if (editSelectedMinistryGroup) {
        const newMinistryData = {
          member_id: memberId,
          ministry_group_id: editSelectedMinistryGroup,
          role: 'member'
        };

        await supabase
          .from('ministry_group_members')
          .insert([newMinistryData]);

        // Log the insertion
        await logAudit('ministry_group_members', memberId, 'INSERT', null, newMinistryData);
      }

      setEditingMember(null);
      setEditSelectedMinistryGroup('');
      
      // Show appropriate success message
      let message = 'Member details updated successfully!';
      if (isNotAttending) {
        message += ' Member has been automatically hidden due to not attending status.';
      } else if (isAttending && editFormData.is_hidden) {
        message += ' Member is now visible due to attending status.';
      }
      
      setSuccess(message);
      fetchMembers();
      fetchHiddenMembers();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error updating member:', error);
      setError(error.message || 'Failed to update member details. Please check if the status value is valid.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingMember(null);
    setEditFormData({
      name: '',
      surname: '',
      residence: '',
      phone: '',
      email: '',
      birth_date: '',
      occupation: '',
      invited_by: '',
      cell_group_id: '',
      gender: '',
      baptism: '',
      status: 'newcomer',
      status_date: '',
      not_attending_reason: '',
      is_hidden: false,
    });
    setEditSelectedMinistryGroup('');
  };

  const handleRestoreMember = async (memberId: string) => {
    if (!canEditMember()) {
      setError('You do not have permission to restore members.');
      return;
    }

    if (!confirm('Restore this member? They will appear in the main members list again as a newcomer.')) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      
      // First get the old data for audit log
      const { data: oldMemberData } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberId)
        .single();

      const updateData = { 
        is_hidden: false,
        status: 'newcomer',
        status_date: new Date().toISOString(),
        not_attending_reason: null
      };

      const { error: restoreError } = await supabase
        .from('members')
        .update(updateData)
        .eq('id', memberId);

      if (restoreError) {
        throw restoreError;
      }

      // Log the audit
      await logAudit('members', memberId, 'UPDATE', oldMemberData, updateData);
      
      setSuccess('Member restored successfully as a newcomer!');
      fetchMembers();
      fetchHiddenMembers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error restoring member:', error);
      setError(error.message || 'Failed to restore member.');
    }
  };

  const handlePermanentDeleteMember = async (memberId: string, memberName: string) => {
    if (!canDeleteMember()) {
      setError('You do not have permission to delete members.');
      return;
    }

    if (!confirm(`⚠️ WARNING: This will permanently delete ${memberName}. This action cannot be undone. Are you absolutely sure?`)) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      
      // First get all related data for audit logs
      const { data: memberData } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberId)
        .single();

      const { data: ministryData } = await supabase
        .from('ministry_group_members')
        .select('*')
        .eq('member_id', memberId);

      // First, remove from ministry groups
      await supabase
        .from('ministry_group_members')
        .delete()
        .eq('member_id', memberId);

      // Log ministry group deletions
      if (ministryData && ministryData.length > 0) {
        for (const ministry of ministryData) {
          await logAudit('ministry_group_members', ministry.id, 'DELETE', ministry, null);
        }
      }
      
      // Then delete the member
      const { error: deleteError } = await supabase
        .from('members')
        .delete()
        .eq('id', memberId);

      if (deleteError) {
        throw deleteError;
      }

      // Log the member deletion
      await logAudit('members', memberId, 'DELETE', memberData, null);
      
      setSuccess('Member permanently deleted.');
      fetchMembers();
      fetchHiddenMembers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error deleting member:', error);
      setError(error.message || 'Cannot delete member. They may have records in other tables.');
    }
  };

  const handleExportMembers = async () => {
    if (!canExportMembers()) {
      setError('You do not have permission to export members.');
      return;
    }

    setExporting(true);
    try {
      const exportData = members.map(member => ({
        Name: member.name,
        Surname: member.surname,
        Email: member.email,
        Phone: member.phone,
        Residence: member.residence,
        Gender: member.gender,
        Status: member.status,
        'Cell Group': member.cell_groups?.name,
        'Ministry Group': member.ministry_groups?.name,
        'Baptism Date': member.baptism,
        'Birth Date': member.birth_date,
        Occupation: member.occupation,
        'Invited By': member.invited_by,
        'Member Since': member.created_at,
        'Permanent Member': member.is_permanent_member ? 'Yes' : 'No',
        'Permanent Since': member.permanent_member_date,
      }));

      const csvContent = [
        Object.keys(exportData[0] || {}).join(','),
        ...exportData.map(row => Object.values(row).map(val => 
          `"${val ? val.toString().replace(/"/g, '""') : ''}"`
        ).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `members_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccess('Members exported successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error exporting members:', error);
      setError('Failed to export members.');
    } finally {
      setExporting(false);
    }
  };

  const filteredMembers = members.filter((member) => {
    const matchesSearch = 
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.surname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.residence?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.cell_groups?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.baptism?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.ministry_groups?.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCellGroup = !selectedCellGroup || member.cell_group_id === selectedCellGroup;
    const matchesStatus = !selectedStatus || member.status === selectedStatus;
    const matchesGender = !selectedGender || member.gender === selectedGender;

    return matchesSearch && matchesCellGroup && matchesStatus && matchesGender;
  });

  const filteredHiddenMembers = hiddenMembers.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.surname.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string, surname: string) => {
    return `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase();
  };

  const resetForm = () => {
    setFormData({ 
      name: '', 
      surname: '', 
      residence: '', 
      phone: '', 
      email: '',
      birth_date: '',
      occupation: '',
      invited_by: '', 
      cell_group_id: '',
      gender: '',
      baptism: '',
    });
    setSelectedMinistryGroup('');
    setShowForm(false);
    setError(null);
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return { color: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300', text: 'No Status' };
    
    const statusLower = status.toLowerCase();
    
    if (isNotAttendingStatus(status)) {
      return { color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300', text: status };
    } else if (statusLower.includes('newcomer')) {
      return { color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', text: status };
    } else if (statusLower.includes('member') && !statusLower.includes('signed') && !statusLower.includes('permanent')) {
      return { color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300', text: status };
    } else if (statusLower.includes('signed')) {
      return { color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300', text: status };
    } else if (statusLower.includes('permanent')) {
      return { color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300', text: status };
    } else if (statusLower.includes('active')) {
      return { color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300', text: status };
    } else {
      return { color: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300', text: status };
    }
  };

  const getStatusCounts = () => {
    const counts: Record<string, number> = {};
    
    members.forEach(member => {
      const status = member.status || 'No Status';
      counts[status] = (counts[status] || 0) + 1;
    });
    
    return {
      total: members.length,
      ...counts,
      baptized: members.filter(m => m.baptism && m.baptism.trim() !== '').length,
      hidden: hiddenMembers.length,
    };
  };

  const statusCounts = getStatusCounts();

  // Render role badge
  const renderRoleBadge = () => {
    if (!profile) return null;
    
    if (isAdmin()) {
      return (
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 flex items-center gap-1">
          <Shield className="h-3 w-3" />
          Admin
        </span>
      );
    } else if (isPastor()) {
      return (
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 flex items-center gap-1">
          <User className="h-3 w-3" />
          Pastor
        </span>
      );
    } else if (isDeacon()) {
      return (
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex items-center gap-1">
          <Users className="h-3 w-3" />
          Deacon
        </span>
      );
    } else if (isGroupLeader()) {
      return (
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 flex items-center gap-1">
          <Key className="h-3 w-3" />
          Group Leader
        </span>
      );
    } else {
      return (
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 flex items-center gap-1">
          <User className="h-3 w-3" />
          Member
        </span>
      );
    }
  };

  const renderMemberCard = (member: Member, isHidden: boolean = false) => (
    <div 
      key={member.id} 
      className={`bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border rounded-2xl p-4 md:p-6 hover:shadow-xl transition-all duration-300 group ${
        isHidden 
          ? 'border-red-200/50 dark:border-red-700/50 hover:border-red-300/50 dark:hover:border-red-600/50' 
          : 'border-gray-200/50 dark:border-gray-700/50 hover:border-gray-300/50 dark:hover:border-gray-600/50'
      }`}
    >
      {editingMember === member.id ? (
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                {getInitials(editFormData.name, editFormData.surname)}
              </div>
              <div>
                <div className="flex flex-col sm:flex-row gap-3 mb-2">
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 px-1"
                    placeholder="First Name"
                  />
                  <input
                    type="text"
                    value={editFormData.surname}
                    onChange={(e) => setEditFormData({ ...editFormData, surname: e.target.value })}
                    className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 px-1"
                    placeholder="Last Name"
                  />
                </div>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(editFormData.status).color} border-none focus:ring-2 focus:ring-blue-500`}
                >
                  {availableStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="flex-1 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 px-1 text-gray-600 dark:text-gray-400"
                  placeholder="Email address"
                />
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <input
                  type="tel"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="flex-1 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 px-1 text-gray-600 dark:text-gray-400"
                  placeholder="Phone number"
                />
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={editFormData.residence}
                  onChange={(e) => setEditFormData({ ...editFormData, residence: e.target.value })}
                  className="flex-1 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 px-1 text-gray-600 dark:text-gray-400"
                  placeholder="Residence"
                  required
                />
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <input
                  type="date"
                  value={editFormData.birth_date}
                  onChange={(e) => setEditFormData({ ...editFormData, birth_date: e.target.value })}
                  className="flex-1 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 px-1 text-gray-600 dark:text-gray-400"
                  placeholder="Birth date"
                />
              </div>
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={editFormData.occupation}
                  onChange={(e) => setEditFormData({ ...editFormData, occupation: e.target.value })}
                  className="flex-1 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 px-1 text-gray-600 dark:text-gray-400"
                  placeholder="Occupation"
                />
              </div>
              <div className="flex items-center gap-3">
                <Droplets className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <input
                  type="date"
                  value={editFormData.baptism}
                  onChange={(e) => setEditFormData({ ...editFormData, baptism: e.target.value })}
                  className="flex-1 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 px-1 text-gray-600 dark:text-gray-400"
                />
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
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
                <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <select
                  value={editFormData.gender}
                  onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value as 'male' | 'female' | '' })}
                  className="flex-1 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 px-1 text-gray-600 dark:text-gray-400"
                  required
                >
                  <option value="">Select gender *</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={editFormData.invited_by}
                  onChange={(e) => setEditFormData({ ...editFormData, invited_by: e.target.value })}
                  className="flex-1 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 px-1 text-gray-600 dark:text-gray-400"
                  placeholder="Invited by"
                />
              </div>
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <select
                  value={editSelectedMinistryGroup}
                  onChange={(e) => setEditSelectedMinistryGroup(e.target.value)}
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
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Status</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400 min-w-20">Status:</span>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                {isNotAttendingStatus(editFormData.status) && (
                  <span className="text-xs text-red-600 dark:text-red-400">
                    (Will auto-hide)
                  </span>
                )}
                {isAttendingStatus(editFormData.status) && (
                  <span className="text-xs text-green-600 dark:text-green-400">
                    (Will auto-show)
                  </span>
                )}
              </div>
              
              {isNotAttendingStatus(editFormData.status) && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400 min-w-20">Reason:</span>
                  <input
                    type="text"
                    value={editFormData.not_attending_reason}
                    onChange={(e) => setEditFormData({ ...editFormData, not_attending_reason: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Reason for not attending"
                  />
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-600 dark:text-gray-400 sm:min-w-32">Status Date:</span>
                <input
                  type="date"
                  value={editFormData.status_date}
                  onChange={(e) => setEditFormData({ ...editFormData, status_date: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              onClick={() => handleSaveMember(member.id)}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 transition-all duration-200"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={handleCancelEdit}
              className="flex-1 px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 text-center"
            >
              Cancel
            </button>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-600 overflow-hidden">
            Member ID: {member.id.slice(0, 8)}...
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-start gap-4 mb-4">
              <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg ${
                isHidden 
                  ? 'bg-gradient-to-br from-red-500 to-orange-500' 
                  : 'bg-gradient-to-br from-blue-500 to-purple-500'
              }`}>
                {getInitials(member.name, member.surname)}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                    {member.name} {member.surname}
                  </h3>
                  <span className={`px-2 md:px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(member.status).color}`}>
                    {getStatusBadge(member.status).text}
                  </span>
                  {isHidden && (
                    <span className="px-2 md:px-3 py-1 rounded-full text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 flex items-center gap-1">
                      <EyeOff className="h-3 w-3" />
                      Hidden
                    </span>
                  )}
                  {member.is_permanent_member && (
                    <span className="px-2 md:px-3 py-1 rounded-full text-sm font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 flex items-center gap-1">
                      Permanent
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-600 dark:text-gray-400">
                  {member.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      <span className="font-medium break-all">{member.email}</span>
                    </div>
                  )}
                  {member.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span className="font-medium">{member.phone}</span>
                    </div>
                  )}
                  {member.residence && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="font-medium break-all">{member.residence}</span>
                    </div>
                  )}
                  {member.birth_date && (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span className="font-medium">
                        {new Date(member.birth_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  )}
                  {member.occupation && (
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 flex-shrink-0" />
                      <span className="font-medium">{member.occupation}</span>
                    </div>
                  )}
                  {member.baptism && (
                    <div className="flex items-start gap-3">
                      <Droplets className="h-4 w-4 flex-shrink-0 mt-1" />
                      <span className="font-medium text-blue-600 dark:text-blue-400 break-all">
                        Baptized: {new Date(member.baptism).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="font-medium">{member.cell_groups?.name || 'No Cell Group'}</span>
                  </div>
                  {member.ministry_groups?.name && (
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 flex-shrink-0" />
                      <span className="font-medium">{member.ministry_groups.name}</span>
                    </div>
                  )}
                  {member.gender && (
                    <div className="flex items-center gap-3 text-sm">
                      <User className="h-4 w-4 flex-shrink-0" />
                      <span>Gender: {member.gender}</span>
                    </div>
                  )}
                  {member.invited_by && (
                    <div className="flex items-center gap-3 text-sm">
                      <User className="h-4 w-4 flex-shrink-0" />
                      <span>Invited by: {member.invited_by}</span>
                    </div>
                  )}
                  {member.permanent_member_date && (
                    <div className="text-sm text-purple-600 dark:text-purple-400">
                      Permanent since: {new Date(member.permanent_member_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col justify-between items-stretch lg:items-end gap-4">
            <div className="grid grid-cols-2 lg:flex lg:flex-col gap-3">
              {canEditMember(member.cell_group_id) && (
                <button
                  onClick={() => handleEditMember(member)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium group"
                >
                  <Edit2 className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
              )}
              {isHidden ? (
                <>
                  {canEditMember(null) && (
                    <button
                      onClick={() => handleRestoreMember(member.id)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium group"
                    >
                      <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-200" />
                      <span className="hidden sm:inline">Restore</span>
                    </button>
                  )}
                  {canDeleteMember() && (
                    <button
                      onClick={() => handlePermanentDeleteMember(member.id, `${member.name} ${member.surname}`)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium group"
                    >
                      <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  )}
                </>
              ) : canDeleteMember() && (
                <button
                  onClick={() => handlePermanentDeleteMember(member.id, `${member.name} ${member.surname}`)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium group"
                >
                  <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              )}
            </div>
            <div className="space-y-2">
              {member.status_date && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {member.status ? `${member.status} since: ` : 'Member since: '}
                  {new Date(member.status_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
              )}
              {member.not_attending_reason && (
                <div className="text-sm text-red-600 dark:text-red-400 max-w-xs break-words">
                  Reason: {member.not_attending_reason}
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 overflow-hidden">
              ID: {member.id.slice(0, 8)}...
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // If user is a regular member (with no special roles), show their profile only
  if (isMember() && !isAdmin() && !isPastor() && !isDeacon() && !isGroupLeader()) {
    const memberProfile = members.find(m => m.id === profile.id);
    
    if (!memberProfile) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    My Profile
                  </h1>
                  {renderRoleBadge()}
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  View your member profile information
                </p>
              </div>
            </div>

            <div className="text-center py-12 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl">
              <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                Profile Not Found
              </h3>
              <p className="text-gray-500 dark:text-gray-500">
                Your member profile could not be loaded. Please contact an administrator.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6 animate-fadeIn">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  My Profile
                </h1>
                {renderRoleBadge()}
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                View your member profile information
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:gap-6">
            {renderMemberCard(memberProfile, false)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6 animate-fadeIn">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Members Directory
              </h1>
              {renderRoleBadge()}
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              {isGroupLeader() ? 'View and manage members in your cell group' :
               isDeacon() ? 'View all members' :
               'Manage and view all church members'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {canViewHiddenMembers() && (
              <button
                onClick={() => {
                  fetchHiddenMembers();
                  setShowHiddenMembers(!showHiddenMembers);
                }}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium group"
              >
                {showHiddenMembers ? (
                  <>
                    <Eye className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                    Show Active Members
                  </>
                ) : (
                  <>
                    <EyeOff className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                    Show Hidden Members ({hiddenMembers.length})
                  </>
                )}
              </button>
            )}
            {canCreateMember() && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium group"
              >
                <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
                {showForm ? 'Cancel' : 'Add Member'}
              </button>
            )}
            {canExportMembers() && (
              <button
                onClick={handleExportMembers}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium group disabled:opacity-50"
              >
                <Download className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                {exporting ? 'Exporting...' : 'Export CSV'}
              </button>
            )}
          </div>
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

        {/* Add Member Form */}
        {showForm && (
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 md:p-6 mb-8 shadow-lg hover:shadow-xl transition-all duration-300">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Add New Member</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter email address"
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
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Residence *
                  </label>
                  <input
                    type="text"
                    value={formData.residence}
                    onChange={(e) => setFormData({ ...formData, residence: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter residence address"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Birth Date
                  </label>
                  <input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Occupation
                  </label>
                  <input
                    type="text"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter occupation"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Invited By
                  </label>
                  <input
                    type="text"
                    value={formData.invited_by}
                    onChange={(e) => setFormData({ ...formData, invited_by: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Who invited this member?"
                  />
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
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Ministry Group
                  </label>
                  <select
                    value={selectedMinistryGroup}
                    onChange={(e) => setSelectedMinistryGroup(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="">Select ministry group (optional)</option>
                    {ministryGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" />
                  {loading ? 'Adding Member...' : 'Add Member'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 sm:flex-none px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium text-center"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 mb-6 shadow-sm">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${showHiddenMembers ? 'hidden' : 'active'} members...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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
            
            {!isMember() && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Filter className="h-4 w-4" />
                    Cell Group
                  </label>
                  <select
                    value={selectedCellGroup}
                    onChange={(e) => setSelectedCellGroup(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Groups</option>
                    {cellGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Filter className="h-4 w-4" />
                    Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Statuses</option>
                    {VALID_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Filter className="h-4 w-4" />
                    Gender
                  </label>
                  <select
                    value={selectedGender}
                    onChange={(e) => setSelectedGender(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Genders</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && members.length === 0 && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading members...</p>
          </div>
        )}

        {/* Hidden Members Section */}
        {showHiddenMembers ? (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-700/50 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <EyeOff className="h-6 w-6 text-red-500" />
                    Hidden Members
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Members with "not attending" status are automatically hidden.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400">{hiddenMembers.length}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Hidden Members</div>
                </div>
              </div>
              
              {filteredHiddenMembers.length === 0 ? (
                <div className="text-center py-12">
                  <EyeOff className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                    {searchQuery ? 'No Hidden Members Found' : 'No Hidden Members'}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-500">
                    {searchQuery ? 'Try adjusting your search terms' : 'All members are currently attending'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:gap-6">
                  {filteredHiddenMembers.map((member) => renderMemberCard(member, true))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Active Members Grid */}
            <div className="grid gap-4 md:gap-6">
              {!loading && filteredMembers.length === 0 ? (
                <div className="text-center py-12 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl">
                  <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                    {searchQuery ? 'No Members Found' : 'No Members Yet'}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-500">
                    {searchQuery ? 'Try adjusting your search terms' : 'Add your first member to get started'}
                  </p>
                </div>
              ) : (
                filteredMembers.map((member) => renderMemberCard(member, false))
              )}
            </div>

            {/* Stats Summary - Only show for admins, pastors, and deacons */}
            {(isAdmin() || isPastor() || isDeacon()) && (
              <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 md:gap-6">
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 md:p-6 text-center">
                  <div className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">{statusCounts.total}</div>
                  <div className="text-sm md:text-base text-gray-600 dark:text-gray-400 font-medium">Total Active</div>
                </div>
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 md:p-6 text-center">
                  <div className="text-2xl md:text-3xl font-bold text-red-600 dark:text-red-400 mb-2">{statusCounts.hidden}</div>
                  <div className="text-sm md:text-base text-gray-600 dark:text-gray-400 font-medium">Hidden</div>
                </div>
                {Object.entries(statusCounts)
                  .filter(([key]) => key !== 'total' && key !== 'baptized' && key !== 'hidden')
                  .slice(0, 4)
                  .map(([status, count]) => (
                    <div key={status} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 md:p-6 text-center">
                      <div className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">{count}</div>
                      <div className="text-sm md:text-base text-gray-600 dark:text-gray-400 font-medium truncate" title={status}>
                        {status === 'baptized' ? 'Baptized' : status}
                      </div>
                    </div>
                  ))}
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 md:p-6 text-center">
                  <div className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">{statusCounts.baptized}</div>
                  <div className="text-sm md:text-base text-gray-600 dark:text-gray-400 font-medium">Baptized</div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Members;
