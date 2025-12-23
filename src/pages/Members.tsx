import { Search, Plus, Mail, Phone, User, Check, X, MapPin, Edit2, Save, Trash2, Calendar, Droplets, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';

interface Member {
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
  baptism: string | null;
  cell_groups: { name: string } | null;
  ministry_groups: { name: string } | null;
  status: string | null;
  status_date: string | null;
  not_attending_reason: string | null;
  created_at: string | null;
  invited_by: string | null;
  is_hidden: boolean | null;
}

interface CellGroup {
  id: string;
  name: string;
}

interface MinistryGroup {
  id: string;
  name: string;
}

const Members = () => {
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
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const [showHiddenMembers, setShowHiddenMembers] = useState(false);
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
    baptism: '',
    status: 'newcomer',
    status_date: '',
    not_attending_reason: '',
    is_hidden: false,
  });

  // Define statuses that should be hidden
  const NOT_ATTENDING_STATUSES = ['inactive', 'stopped attending', 'not attending', 'left'];
  const ACTIVE_STATUSES = ['newcomer', 'member', 'signed member', 'permanent', 'active'];

  // Helper function to check if status should be hidden
  const shouldBeHidden = (status: string | null): boolean => {
    if (!status) return false;
    const statusLower = status.toLowerCase();
    return NOT_ATTENDING_STATUSES.some(notAttendingStatus => 
      statusLower.includes(notAttendingStatus.toLowerCase())
    );
  };

  // Helper function to check if status should be shown (unhidden)
  const shouldBeShown = (status: string | null): boolean => {
    if (!status) return true;
    const statusLower = status.toLowerCase();
    return ACTIVE_STATUSES.some(activeStatus => 
      statusLower.includes(activeStatus.toLowerCase())
    );
  };

  useEffect(() => {
    fetchMembers();
    fetchHiddenMembers();
    fetchCellGroups();
    fetchMinistryGroups();
  }, []);

  useEffect(() => {
    if (members.length > 0) {
      const statuses = Array.from(new Set(members
        .map(m => m.status)
        .filter((status): status is string => status !== null && status !== '')
      ));
      setAvailableStatuses(statuses);
      
      if (!statuses.includes('newcomer')) {
        setAvailableStatuses(prev => ['newcomer', ...prev]);
      }
      if (!statuses.includes('inactive')) {
        setAvailableStatuses(prev => [...prev, 'inactive']);
      }
    }
  }, [members]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('members')
        .select(`
          *,
          cell_groups!fk_cell_group(name),
          ministry_groups(name)
        `)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setMembers(data || []);
    } catch (error: any) {
      console.error('Error fetching members:', error);
      setError(error.message || 'Failed to load members. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchHiddenMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select(`
          *,
          cell_groups!fk_cell_group(name),
          ministry_groups(name)
        `)
        .eq('is_hidden', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setHiddenMembers(data || []);
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
      setError(error.message || 'Failed to load cell groups.');
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
      setError(error.message || 'Failed to load ministry groups.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    if (!formData.name.trim() || !formData.surname.trim() || !formData.residence.trim() || !formData.gender) {
      setError('Name, surname, residence, and gender are required fields.');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('members')
        .insert([{
          name: formData.name.trim(),
          surname: formData.surname.trim(),
          residence: formData.residence.trim(),
          phone: formData.phone.trim() || null,
          cell_group_id: formData.cell_group_id || null,
          ministry_group_id: formData.ministry_group_id || null,
          gender: formData.gender || null,
          invited_by: formData.invited_by.trim() || null,
          baptism: formData.baptism || null,
          status: 'newcomer',
          status_date: new Date().toISOString(),
          is_permanent_member: false,
          is_hidden: false, // New members are always shown
          not_attending_reason: null,
        }])
        .select();

      if (error) {
        throw error;
      }

      setShowForm(false);
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
      });
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

  const handleEditMember = (member: Member) => {
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
      baptism: member.baptism || '',
      status: member.status || 'newcomer',
      status_date: member.status_date ? new Date(member.status_date).toISOString().split('T')[0] : '',
      not_attending_reason: member.not_attending_reason || '',
      is_hidden: member.is_hidden || false,
    });
  };

  const handleSaveMember = async (memberId: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (!editFormData.name.trim() || !editFormData.surname.trim() || !editFormData.residence.trim() || !editFormData.gender) {
        setError('Name, surname, residence, and gender are required fields.');
        setLoading(false);
        return;
      }

      // Check if status should automatically hide/show member
      const shouldHide = shouldBeHidden(editFormData.status);
      const shouldShow = shouldBeShown(editFormData.status);
      
      // Determine if member should be hidden based on status
      const is_hidden = shouldHide || (editFormData.is_hidden && !shouldShow);
      
      // Set not_attending_reason if status indicates not attending
      const not_attending_reason = shouldHide 
        ? (editFormData.not_attending_reason || 'Member stopped attending')
        : null;

      const updateData: any = {
        name: editFormData.name.trim(),
        surname: editFormData.surname.trim(),
        residence: editFormData.residence.trim(),
        phone: editFormData.phone.trim() || null,
        cell_group_id: editFormData.cell_group_id || null,
        ministry_group_id: editFormData.ministry_group_id || null,
        gender: editFormData.gender || null,
        invited_by: editFormData.invited_by.trim() || null,
        baptism: editFormData.baptism || null,
        status: editFormData.status,
        status_date: editFormData.status_date ? new Date(editFormData.status_date).toISOString() : new Date().toISOString(),
        is_permanent_member: editFormData.status.toLowerCase().includes('permanent'),
        not_attending_reason,
        is_hidden,
      };

      if (editFormData.status.toLowerCase().includes('permanent')) {
        updateData.permanent_member_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('members')
        .update(updateData)
        .eq('id', memberId);

      if (error) {
        throw error;
      }

      setEditingMember(null);
      setSuccess(`Member details updated successfully! ${shouldHide ? 'Member has been automatically hidden.' : shouldShow ? 'Member is now visible.' : ''}`);
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
      invited_by: '',
      cell_group_id: '',
      ministry_group_id: '',
      gender: '',
      baptism: '',
      status: 'newcomer',
      status_date: '',
      not_attending_reason: '',
      is_hidden: false,
    });
  };

  const handleHideMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to hide this member? They will no longer appear in the main members list.')) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      
      const { error: hideError } = await supabase
        .from('members')
        .update({ 
          is_hidden: true,
          status: 'inactive',
          status_date: new Date().toISOString(),
          not_attending_reason: 'Member stopped attending'
        })
        .eq('id', memberId);

      if (hideError) {
        throw hideError;
      }
      
      setSuccess('Member hidden successfully. They can be restored from the hidden members section.');
      fetchMembers();
      fetchHiddenMembers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error hiding member:', error);
      setError(error.message || 'Failed to hide member.');
    }
  };

  const handleRestoreMember = async (memberId: string, currentStatus: string | null = null) => {
    if (!confirm('Restore this member? They will appear in the main members list again.')) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      
      // Determine new status - if current status is not attending, change to newcomer
      let newStatus = currentStatus || 'newcomer';
      let not_attending_reason = null;
      
      if (shouldBeHidden(currentStatus)) {
        newStatus = 'newcomer';
      }
      
      const { error: restoreError } = await supabase
        .from('members')
        .update({ 
          is_hidden: false,
          status: newStatus,
          status_date: new Date().toISOString(),
          not_attending_reason
        })
        .eq('id', memberId);

      if (restoreError) {
        throw restoreError;
      }
      
      setSuccess('Member restored successfully!');
      fetchMembers();
      fetchHiddenMembers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error restoring member:', error);
      setError(error.message || 'Failed to restore member.');
    }
  };

  const handlePermanentDeleteMember = async (memberId: string) => {
    if (!confirm('⚠️ WARNING: This will permanently delete the member and all associated data. This action cannot be undone. Are you absolutely sure?')) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      
      const { error: deleteError } = await supabase
        .from('members')
        .delete()
        .eq('id', memberId);

      if (deleteError) {
        throw deleteError;
      }
      
      setSuccess('Member permanently deleted.');
      fetchMembers();
      fetchHiddenMembers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error deleting member:', error);
      setError(error.message || 'Cannot delete member. They may have records in other tables.');
    }
  };

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.surname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.residence?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.cell_groups?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.baptism?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredHiddenMembers = hiddenMembers.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.surname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.residence?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone?.toLowerCase().includes(searchQuery.toLowerCase())
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
      invited_by: '', 
      cell_group_id: '',
      ministry_group_id: '',
      gender: '',
      baptism: '',
    });
    setShowForm(false);
    setError(null);
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return { color: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300', text: 'No Status' };
    
    const statusLower = status.toLowerCase();
    
    if (shouldBeHidden(status)) {
      return { color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300', text: status };
    } else if (statusLower.includes('newcomer')) {
      return { color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', text: status };
    } else if (statusLower.includes('member') && !statusLower.includes('signed') && !statusLower.includes('permanent')) {
      return { color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300', text: status };
    } else if (statusLower.includes('signed')) {
      return { color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300', text: status };
    } else if (statusLower.includes('permanent')) {
      return { color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300', text: status };
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
                  {availableStatuses.length > 0 ? (
                    availableStatuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))
                  ) : (
                    <>
                      <option value="newcomer">Newcomer</option>
                      <option value="member">Member</option>
                      <option value="signed_member">Signed Member</option>
                      <option value="permanent">Permanent</option>
                      <option value="inactive">Inactive</option>
                      <option value="stopped attending">Stopped Attending</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={editFormData.residence}
                onChange={(e) => setEditFormData({ ...editFormData, residence: e.target.value })}
                className="flex-1 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 px-1 text-gray-600 dark:text-gray-400"
                placeholder="Residence address"
                required
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
              <input
                type="text"
                value={editFormData.invited_by}
                onChange={(e) => setEditFormData({ ...editFormData, invited_by: e.target.value })}
                className="flex-1 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 px-1 text-gray-600 dark:text-gray-400"
                placeholder="Invited by"
              />
            </div>

            {isHidden && (
              <div className="flex items-center gap-3">
                <EyeOff className="h-4 w-4 text-red-400 flex-shrink-0" />
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_hidden"
                    checked={editFormData.is_hidden}
                    onChange={(e) => setEditFormData({ ...editFormData, is_hidden: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    disabled={shouldBeHidden(editFormData.status)}
                  />
                  <label htmlFor="is_hidden" className={`text-sm ${shouldBeHidden(editFormData.status) ? 'text-gray-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    {shouldBeHidden(editFormData.status) ? 'Automatically hidden due to status' : 'Hidden Member'}
                  </label>
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
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableStatuses.length > 0 ? (
                    availableStatuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))
                  ) : (
                    <>
                      <option value="newcomer">Newcomer</option>
                      <option value="member">Member</option>
                      <option value="signed_member">Signed Member</option>
                      <option value="permanent">Permanent</option>
                      <option value="inactive">Inactive</option>
                      <option value="stopped attending">Stopped Attending</option>
                      <option value="not attending">Not Attending</option>
                      <option value="left">Left</option>
                    </>
                  )}
                </select>
                {shouldBeHidden(editFormData.status) && (
                  <span className="text-xs text-red-600 dark:text-red-400">
                    (Will auto-hide)
                  </span>
                )}
                {shouldBeShown(editFormData.status) && isHidden && (
                  <span className="text-xs text-green-600 dark:text-green-400">
                    (Will auto-show)
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400 min-w-20">Reason:</span>
                <input
                  type="text"
                  value={editFormData.not_attending_reason}
                  onChange={(e) => setEditFormData({ ...editFormData, not_attending_reason: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Reason for not attending (if applicable)"
                />
              </div>
              
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
                </div>
                
                <div className="space-y-3 text-gray-600 dark:text-gray-400">
                  {member.residence && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      <span className="font-medium break-all">{member.residence}</span>
                    </div>
                  )}
                  {member.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span className="font-medium">{member.phone}</span>
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
                    <span className="font-medium">{member.cell_groups?.name || 'No Cell Group Assigned'}</span>
                  </div>
                  {member.ministry_groups?.name && (
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 flex-shrink-0" />
                      <span className="font-medium">{member.ministry_groups.name}</span>
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
              <button
                onClick={() => handleEditMember(member)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium group"
              >
                <Edit2 className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                <span className="hidden sm:inline">Edit</span>
              </button>
              {isHidden ? (
                <>
                  <button
                    onClick={() => handleRestoreMember(member.id, member.status)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium group"
                  >
                    <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-200" />
                    <span className="hidden sm:inline">Restore</span>
                  </button>
                  <button
                    onClick={() => handlePermanentDeleteMember(member.id)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium group"
                  >
                    <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleHideMember(member.id)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium group"
                >
                  <EyeOff className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                  <span className="hidden sm:inline">Hide</span>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6 animate-fadeIn">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Members Directory
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Manage and view all church members</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={() => setShowHiddenMembers(!showHiddenMembers)}
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
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium group"
            >
              <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
              {showForm ? 'Cancel' : 'Add Member'}
            </button>
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
                    placeholder="Select baptism date"
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

        {/* Search Bar */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 mb-6 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder={`Search ${showHiddenMembers ? 'hidden' : 'active'} members by name, residence, phone...`}
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
                    Members who are no longer attending. You can restore them when they start attending again.
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
                    {searchQuery ? 'Try adjusting your search terms' : 'All members are currently active'}
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

            {/* Stats Summary */}
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
          </>
        )}
      </div>
    </div>
  );
};

export default Members;
