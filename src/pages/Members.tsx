import { Search, Plus, Mail, Phone, User, Check, X, MapPin, Edit2, Save, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';

interface Member {
  id: string;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  cell_group_id: string | null;
  is_permanent_member: boolean | null;
  permanent_member_date: string | null;
  cell_groups: { name: string } | null;
  status: 'newcomer' | 'signed_member' | 'not_attending' | null;
  status_date: string | null;
  not_attending_reason: string | null;
  created_at: string | null;
  invited_by: string | null;
}

interface CellGroup {
  id: string;
  name: string;
}

const Members = () => {
  const [showForm, setShowForm] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [cellGroups, setCellGroups] = useState<CellGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFormData, setStatusFormData] = useState({
    status: 'newcomer' as 'newcomer' | 'signed_member' | 'not_attending',
    status_date: '',
    not_attending_reason: '',
  });
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    phone: '',
    invited_by: '',
    cell_group_id: '',
  });

  useEffect(() => {
    fetchMembers();
    fetchCellGroups();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('members')
        .select(`
          *,
          cell_groups!fk_cell_group(name)
        `)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const { error } = await supabase
        .from('members')
        .insert([{
          name: formData.name.trim(),
          surname: formData.surname.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          cell_group_id: formData.cell_group_id || null,
          invited_by: formData.invited_by.trim() || null,
          status: 'newcomer',
          status_date: new Date().toISOString(),
        }])
        .select();

      if (error) {
        throw error;
      }

      setShowForm(false);
      setFormData({ 
        name: '', 
        surname: '', 
        email: '', 
        phone: '', 
        invited_by: '', 
        cell_group_id: '' 
      });
      setSuccess('Member added successfully!');
      fetchMembers();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error adding member:', error);
      setError(error.message || 'Failed to add member. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPermanent = async (memberId: string) => {
    try {
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
      fetchMembers();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error marking as permanent:', error);
      setError(error.message || 'Failed to update member status.');
    }
  };

  const handleEditStatus = (member: Member) => {
    setEditingStatus(member.id);
    setStatusFormData({
      status: member.status || 'newcomer',
      status_date: member.status_date ? new Date(member.status_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      not_attending_reason: member.not_attending_reason || '',
    });
  };

  const handleSaveStatus = async (memberId: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const updateData: any = {
        status: statusFormData.status,
        status_date: statusFormData.status_date ? new Date(statusFormData.status_date).toISOString() : new Date().toISOString(),
      };

      if (statusFormData.status === 'not_attending') {
        updateData.not_attending_reason = statusFormData.not_attending_reason.trim();
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

      setEditingStatus(null);
      setSuccess('Member status updated successfully!');
      fetchMembers();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error updating status:', error);
      setError(error.message || 'Failed to update member status.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
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
      fetchMembers();
      
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
      member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.cell_groups?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string, surname: string) => {
    return `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase();
  };

  const resetForm = () => {
    setFormData({ 
      name: '', 
      surname: '', 
      email: '', 
      phone: '', 
      invited_by: '', 
      cell_group_id: '' 
    });
    setShowForm(false);
    setError(null);
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

  const getStatusCounts = () => {
    return {
      total: members.length,
      permanent: members.filter(m => m.is_permanent_member).length,
      newcomer: members.filter(m => m.status === 'newcomer').length,
      signed_member: members.filter(m => m.status === 'signed_member').length,
      not_attending: members.filter(m => m.status === 'not_attending').length,
    };
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 animate-fadeIn">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Members Directory
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Manage and view all church members</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 font-medium group"
          >
            <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
            {showForm ? 'Cancel' : 'Add Member'}
          </button>
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
                    Email
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
                  onClick={resetForm}
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
              placeholder="Search members by name, email, phone, or cell group..."
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
                {searchQuery ? 'No Members Found' : 'No Members Yet'}
              </h3>
              <p className="text-gray-500 dark:text-gray-500">
                {searchQuery ? 'Try adjusting your search terms' : 'Add your first member to get started'}
              </p>
            </div>
          ) : (
            filteredMembers.map((member) => (
              <div 
                key={member.id} 
                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:border-gray-300/50 dark:hover:border-gray-600/50 hover:scale-[1.02] group"
              >
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
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(member.status).color}`}>
                            {getStatusBadge(member.status).text}
                          </span>
                        </div>
                        
                        <div className="space-y-3 text-gray-600 dark:text-gray-400">
                          {member.email && (
                            <div className="flex items-center gap-3">
                              <Mail className="h-4 w-4" />
                              <span className="font-medium">{member.email}</span>
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
                    {editingStatus === member.id ? (
                      <div className="space-y-4 w-full max-w-xs">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                          <select
                            value={statusFormData.status}
                            onChange={(e) => setStatusFormData({ ...statusFormData, status: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          >
                            <option value="newcomer">Newcomer</option>
                            <option value="signed_member">Signed Member</option>
                            <option value="not_attending">Not Attending</option>
                          </select>
                        </div>
                        {statusFormData.status === 'signed_member' && (
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date Became Member</label>
                            <input
                              type="date"
                              value={statusFormData.status_date}
                              onChange={(e) => setStatusFormData({ ...statusFormData, status_date: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            />
                          </div>
                        )}
                        {statusFormData.status === 'not_attending' && (
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Reason</label>
                            <textarea
                              value={statusFormData.not_attending_reason}
                              onChange={(e) => setStatusFormData({ ...statusFormData, not_attending_reason: e.target.value })}
                              placeholder="Reason for not attending..."
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                              rows={3}
                            />
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveStatus(member.id)}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                          >
                            <Save className="h-4 w-4" />
                            Save
                          </button>
                          <button
                            onClick={() => setEditingStatus(null)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <button
                          onClick={() => handleEditStatus(member)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium group"
                        >
                          <Edit2 className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                          Edit Status
                        </button>
                        {!member.is_permanent_member && (
                          <button
                            onClick={() => handleMarkAsPermanent(member.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium group"
                          >
                            <Check className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                            Mark as Permanent
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteMember(member.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium group"
                        >
                          <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                          Delete
                        </button>
                      </div>
                    )}
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
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Member ID: {member.id.slice(0, 8)}...
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Stats Summary */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{cellGroups.length}</div>
            <div className="text-gray-600 dark:text-gray-400 font-medium">Cell Groups</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Members;
